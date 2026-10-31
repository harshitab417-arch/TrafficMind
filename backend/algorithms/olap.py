import pandas as pd
import numpy as np
from services.dataset_service import sanitize_for_json


def execute_olap_query(df, operation="rollup", dimension="time", measure="traffic_volume", time_grain="hourly", filters=None):
    """
    Executes OLAP multi-dimensional queries: rollup, drilldown, slice, dice.
    Supports time, location, road_type, and weather dimensions with volume, speed,
    and congestion measures.
    """
    df_clean = df.copy()

    # Apply filters if provided
    if filters and isinstance(filters, dict):
        for col, val in filters.items():
            if val is not None and val != '' and col in df_clean.columns:
                if isinstance(val, list):
                    df_clean = df_clean[df_clean[col].isin(val)]
                elif col in ['date_from', 'start_date']:
                    val_str = str(val)[:10]
                    if 'date' in df_clean.columns:
                        df_clean = df_clean[df_clean['date'].astype(str).str[:10] >= val_str]
                    elif 'timestamp' in df_clean.columns:
                        df_clean = df_clean[pd.to_datetime(df_clean['timestamp'], errors='coerce') >= pd.to_datetime(val_str)]
                elif col in ['date_to', 'end_date']:
                    val_str = str(val)[:10]
                    if 'date' in df_clean.columns:
                        df_clean = df_clean[df_clean['date'].astype(str).str[:10] <= val_str]
                    elif 'timestamp' in df_clean.columns:
                        df_clean = df_clean[pd.to_datetime(df_clean['timestamp'], errors='coerce') <= pd.to_datetime(val_str + ' 23:59:59')]
                else:
                    val_str = str(val).strip()
                    # Try exact match first
                    exact_match = df_clean[df_clean[col].astype(str).str.lower() == val_str.lower()]
                    if not exact_match.empty:
                        df_clean = exact_match
                    else:
                        # Try substring match
                        sub_match = df_clean[df_clean[col].astype(str).str.lower().str.contains(val_str.lower(), regex=False)]
                        if not sub_match.empty:
                            df_clean = sub_match

    if df_clean.empty:
        return {
            "data": [],
            "columns": ["dimension_value", "measure_value", "count"],
            "chart_data": [],
            "summary": "No records matched the filter criteria in the OLAP cube.",
            "message": "No data matching the specified filters."
        }

    # Ensure timestamp is parsed for time dimension
    if 'timestamp' in df_clean.columns:
        dt_series = pd.to_datetime(df_clean['timestamp'], errors='coerce')
    elif 'date' in df_clean.columns and 'time' in df_clean.columns:
        dt_series = pd.to_datetime(df_clean['date'].astype(str) + ' ' + df_clean['time'].astype(str), errors='coerce')
    elif 'date' in df_clean.columns:
        dt_series = pd.to_datetime(df_clean['date'], errors='coerce')
    else:
        now_anchor = pd.Timestamp.now() - pd.Timedelta(days=max(1, len(df_clean) // 96))
        dt_series = pd.date_range(start=now_anchor, periods=len(df_clean), freq='15min')

    df_clean['parsed_datetime'] = dt_series

    op = str(operation).lower().strip()
    dim = str(dimension).lower().strip()
    meas = str(measure).lower().strip()
    grain = str(time_grain).lower().strip()

    # Determine grouping column based on dimension and operation
    group_col = None

    # Handle Hierarchy Rollup & Drilldown
    if op == 'rollup':
        if dim == 'time':
            # Rollup time to daily or monthly
            if grain == 'hourly':
                group_col = 'date_daily'
                df_clean[group_col] = df_clean['parsed_datetime'].dt.strftime('%Y-%m-%d')
            elif grain == 'daily':
                group_col = 'date_monthly'
                df_clean[group_col] = df_clean['parsed_datetime'].dt.strftime('%Y-%m')
            else:
                group_col = 'date_monthly'
                df_clean[group_col] = df_clean['parsed_datetime'].dt.strftime('%Y-%m')
        elif dim == 'location':
            # Rollup location to road_type
            group_col = 'road_type' if 'road_type' in df_clean.columns else 'location'
        else:
            group_col = dim if dim in df_clean.columns else 'location'

    elif op == 'drilldown':
        if dim == 'time':
            # Drill down from coarse to fine grain
            if grain == 'monthly':
                group_col = 'date_daily'
                df_clean[group_col] = df_clean['parsed_datetime'].dt.strftime('%Y-%m-%d')
            elif grain == 'daily':
                group_col = 'time_hourly'
                df_clean[group_col] = df_clean['parsed_datetime'].dt.strftime('%Y-%m-%d %H:00')
            else:
                group_col = 'time_interval'
                df_clean[group_col] = df_clean['parsed_datetime'].dt.strftime('%H:%M')
        elif dim in ['road_type', 'location']:
            # Drill down road_type to location
            group_col = 'location' if 'location' in df_clean.columns else 'road_type'
        else:
            group_col = dim if dim in df_clean.columns else 'location'

    else:
        # slice or dice or standard dimension query
        if dim == 'time':
            if grain == 'monthly':
                group_col = 'time_grain'
                df_clean[group_col] = df_clean['parsed_datetime'].dt.strftime('%Y-%m')
            elif grain == 'weekly':
                group_col = 'time_grain'
                df_clean[group_col] = df_clean['parsed_datetime'].dt.strftime('%Y-W%W')
            elif grain == 'daily':
                group_col = 'time_grain'
                df_clean[group_col] = df_clean['parsed_datetime'].dt.strftime('%Y-%m-%d')
            else:
                group_col = 'time_grain'
                df_clean[group_col] = df_clean['parsed_datetime'].dt.strftime('%H:00')
        else:
            group_col = dim if dim in df_clean.columns else 'location'

    if group_col not in df_clean.columns:
        group_col = 'location' if 'location' in df_clean.columns else df_clean.columns[0]

    # Perform aggregation
    agg_funcs = {}
    if meas == 'congestion_count':
        df_clean['is_high_congestion'] = (df_clean.get('congestion_level', '') == 'High').astype(int)
        grouped = df_clean.groupby(group_col).agg(
            total_records=('parsed_datetime', 'count'),
            high_congestion_count=('is_high_congestion', 'sum'),
            high_congestion_pct=('is_high_congestion', lambda x: round(float(x.mean() * 100), 2))
        ).reset_index()
        chart_val_col = 'high_congestion_count'
    elif meas == 'average_speed':
        if 'average_speed' not in df_clean.columns:
            df_clean['average_speed'] = 35.0
        grouped = df_clean.groupby(group_col).agg(
            avg_speed=('average_speed', lambda x: round(float(x.mean()), 2)),
            min_speed=('average_speed', lambda x: round(float(x.min()), 2)),
            max_speed=('average_speed', lambda x: round(float(x.max()), 2)),
            record_count=('average_speed', 'count')
        ).reset_index()
        chart_val_col = 'avg_speed'
    else:
        # Default traffic_volume
        if 'traffic_volume' not in df_clean.columns:
            df_clean['traffic_volume'] = 50.0
        grouped = df_clean.groupby(group_col).agg(
            avg_volume=('traffic_volume', lambda x: round(float(x.mean()), 2)),
            total_volume=('traffic_volume', lambda x: round(float(x.sum()), 2)),
            max_volume=('traffic_volume', lambda x: round(float(x.max()), 2)),
            min_volume=('traffic_volume', lambda x: round(float(x.min()), 2)),
            record_count=('traffic_volume', 'count')
        ).reset_index()
        chart_val_col = 'avg_volume'

    # Sort if date/time or by measure descending
    if 'time' in group_col or 'date' in group_col:
        grouped = grouped.sort_values(by=group_col)
    else:
        grouped = grouped.sort_values(by=chart_val_col, ascending=False)

    data_records = grouped.head(200).to_dict(orient='records')
    for row in data_records:
        row['dimension_value'] = str(row.get(group_col, ''))
        row['measure_value'] = row.get(chart_val_col, 0)
        row['count'] = row.get('record_count', 0)

    columns = list(grouped.columns)
    if 'dimension_value' not in columns:
        columns = ['dimension_value', 'measure_value', 'count'] + columns

    chart_data = [
        {
            "label": str(row[group_col]),
            "dimension_value": str(row[group_col]),
            "value": row[chart_val_col],
            "measure_value": row[chart_val_col]
        }
        for row in data_records[:50]
    ]

    summary_text = f"OLAP {op.upper()} along {dim.replace('_', ' ')}: aggregated {len(data_records)} cells by {meas.replace('_', ' ')}."

    return sanitize_for_json({
        "data": data_records,
        "columns": columns,
        "chart_data": chart_data,
        "dimension": dim,
        "measure": meas,
        "operation": op,
        "group_by": group_col,
        "summary": summary_text
    })
