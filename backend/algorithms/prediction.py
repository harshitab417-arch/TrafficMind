import pandas as pd
import numpy as np
from datetime import timedelta
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from services.dataset_service import sanitize_for_json


def run_prediction(df, algorithm="random_forest", target="traffic_volume", features=None, location=None, forecast_steps=10):
    """
    Performs chronological time-series regression for traffic volume or speed.
    Splits 80/20 chronologically, trains model, tests prediction accuracy,
    and produces a multi-step future forecast.
    """
    df_clean = df.copy()

    # Filter location if specified
    if location and 'location' in df_clean.columns:
        loc_df = df_clean[df_clean['location'] == location]
        if len(loc_df) >= 30:
            df_clean = loc_df

    # Parse and sort chronologically by timestamp
    if 'timestamp' in df_clean.columns:
        df_clean['parsed_dt'] = pd.to_datetime(df_clean['timestamp'], errors='coerce')
    elif 'date' in df_clean.columns and 'time' in df_clean.columns:
        df_clean['parsed_dt'] = pd.to_datetime(
            df_clean['date'].astype(str) + ' ' + df_clean['time'].astype(str),
            errors='coerce'
        )
    elif 'date' in df_clean.columns:
        df_clean['parsed_dt'] = pd.to_datetime(df_clean['date'], errors='coerce')
    else:
        now_anchor = pd.Timestamp.now() - pd.Timedelta(days=max(1, len(df_clean) // 96))
        df_clean['parsed_dt'] = pd.date_range(start=now_anchor, periods=len(df_clean), freq='15min')

    df_clean = df_clean.dropna(subset=['parsed_dt'])
    df_clean = df_clean.sort_values(by='parsed_dt').reset_index(drop=True)

    if target not in df_clean.columns:
        target = 'traffic_volume' if 'traffic_volume' in df_clean.columns else df_clean.columns[0]

    df_clean[target] = pd.to_numeric(df_clean[target], errors='coerce')
    df_clean = df_clean.dropna(subset=[target])

    if len(df_clean) < 50:
        raise ValueError(f"Insufficient data points for prediction ({len(df_clean)} records). Minimum 50 required.")

    # Feature engineering for time series
    df_clean['hour'] = df_clean['parsed_dt'].dt.hour
    df_clean['day_of_week_num'] = df_clean['parsed_dt'].dt.dayofweek
    df_clean['month'] = df_clean['parsed_dt'].dt.month

    # Generate lag features
    df_clean['target_lag_1'] = df_clean[target].shift(1)
    df_clean['target_lag_2'] = df_clean[target].shift(2)
    df_clean['target_lag_4'] = df_clean[target].shift(4)
    df_clean['target_rolling_mean_4'] = df_clean[target].shift(1).rolling(4).mean()

    # Drop rows with NaN caused by shifting
    df_model = df_clean.dropna(subset=['target_lag_1', 'target_lag_2', 'target_lag_4', 'target_rolling_mean_4']).copy()
    df_model = df_model.reset_index(drop=True)

    model_features = ['hour', 'day_of_week_num', 'month', 'target_lag_1', 'target_lag_2', 'target_lag_4', 'target_rolling_mean_4']

    # Optional additional features
    if 'temperature' in df_model.columns and pd.api.types.is_numeric_dtype(df_model['temperature']):
        model_features.append('temperature')

    X = df_model[model_features]
    y = df_model[target]

    # Chronological 80/20 train/test split
    split_idx = int(len(df_model) * 0.8)
    X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
    y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]
    dates_test = df_model['parsed_dt'].iloc[split_idx:]

    algo = str(algorithm).lower().strip()
    if algo == 'linear_regression':
        model = LinearRegression()
    else:
        # Default RandomForest
        model = RandomForestRegressor(n_estimators=100, max_depth=12, random_state=42)

    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)

    # Calculate metrics
    mae = round(float(mean_absolute_error(y_test, y_pred)), 2)
    rmse = round(float(np.sqrt(mean_squared_error(y_test, y_pred))), 2)
    r2 = round(float(r2_score(y_test, y_pred)), 4)

    # Test sample for chart display (take last up to 100 points)
    display_limit = min(100, len(y_test))
    chart_y_actual = [round(float(v), 2) for v in y_test.iloc[-display_limit:].values]
    chart_y_pred = [round(float(v), 2) for v in y_pred[-display_limit:]]
    chart_dates = [d.strftime('%Y-%m-%d %H:%M') for d in dates_test.iloc[-display_limit:]]

    # Multi-step future forecast
    forecast_steps = max(1, min(int(forecast_steps), 50))
    future_forecast = []
    future_dates = []

    last_row = df_model.iloc[-1].copy()
    current_dt = last_row['parsed_dt']

    # Determine time step delta (median interval between records)
    time_diffs = df_model['parsed_dt'].diff().dropna()
    median_delta = time_diffs.median() if not time_diffs.empty else timedelta(minutes=15)
    if not isinstance(median_delta, timedelta) or median_delta.total_seconds() <= 0:
        median_delta = timedelta(minutes=15)

    recent_values = list(y_test.iloc[-4:].values)
    current_temp = float(last_row['temperature']) if 'temperature' in model_features else 60.0

    for step in range(1, forecast_steps + 1):
        step_dt = current_dt + (step * median_delta)
        step_hour = step_dt.hour
        step_dow = step_dt.dayofweek
        step_month = step_dt.month

        # Rolling values from predictions or history
        lag_1 = recent_values[-1]
        lag_2 = recent_values[-2] if len(recent_values) >= 2 else lag_1
        lag_4 = recent_values[-4] if len(recent_values) >= 4 else lag_1
        rolling_4 = float(np.mean(recent_values[-4:]))

        row_dict = {
            'hour': step_hour,
            'day_of_week_num': step_dow,
            'month': step_month,
            'target_lag_1': lag_1,
            'target_lag_2': lag_2,
            'target_lag_4': lag_4,
            'target_rolling_mean_4': rolling_4
        }
        if 'temperature' in model_features:
            row_dict['temperature'] = current_temp

        step_X = pd.DataFrame([row_dict])[model_features]
        step_pred = max(0.0, float(model.predict(step_X)[0]))

        future_forecast.append(round(step_pred, 2))
        future_dates.append(step_dt.strftime('%Y-%m-%d %H:%M'))
        recent_values.append(step_pred)

    historical_test = [
        {
            "date": dt,
            "actual": act,
            "predicted": pred
        }
        for dt, act, pred in zip(chart_dates, chart_y_actual, chart_y_pred)
    ]

    formatted_future = [
        {
            "date": dt,
            "predicted": val
        }
        for dt, val in zip(future_dates, future_forecast)
    ]

    summary_text = (
        f"{algo.replace('_', ' ').title()} achieved MAE of {mae:.2f} and R² score of {r2:.3f} "
        f"on held-out chronological test horizon ({len(historical_test)} steps)."
    )

    return sanitize_for_json({
        "algorithm": algo,
        "target": target,
        "location": location,
        "mae": mae,
        "rmse": rmse,
        "r2": r2,
        "metrics": {
            "mae": mae,
            "rmse": rmse,
            "r2": r2
        },
        "historical_test": historical_test,
        "actual": chart_y_actual,
        "predicted": chart_y_pred,
        "dates": chart_dates,
        "future_forecast": formatted_future,
        "future_dates": future_dates,
        "summary": summary_text
    })
