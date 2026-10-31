import numpy as np
import pandas as pd
from sklearn.neighbors import LocalOutlierFactor
from sklearn.ensemble import IsolationForest
from services.dataset_service import sanitize_for_json


def detect_outliers(df, method="all", features=None, zscore_threshold=3.0, lof_neighbors=20, contamination=0.05):
    """
    Detects traffic anomalies using Z-score, Local Outlier Factor, and/or Isolation Forest.
    Classifies anomaly severity (Low, Medium, High) and returns chart-ready scatter data.
    """
    if not features:
        features = ['traffic_volume', 'average_speed']

    valid_features = [f for f in features if f in df.columns and pd.api.types.is_numeric_dtype(df[f])]
    if not valid_features:
        raise ValueError(f"No valid numeric features found in dataset for outlier detection from {features}")

    sub_df = df[valid_features].dropna()
    if len(sub_df) < 20:
        raise ValueError(f"Dataset has only {len(sub_df)} valid numeric rows. At least 20 required.")

    X = sub_df.values
    n_samples = len(X)
    thresh = float(zscore_threshold)
    k_neighbors = min(int(lof_neighbors), n_samples - 1)
    contam = min(0.4, max(0.01, float(contamination)))

    # 1. Z-Score
    mean_vals = np.mean(X, axis=0)
    std_vals = np.std(X, axis=0) + 1e-9
    z_matrix = np.abs((X - mean_vals) / std_vals)
    z_scores = np.max(z_matrix, axis=1)
    z_outliers = z_scores > thresh

    # 2. Local Outlier Factor (LOF)
    try:
        lof = LocalOutlierFactor(n_neighbors=k_neighbors, contamination=contam)
        lof_labels = lof.fit_predict(X)
        lof_outliers = (lof_labels == -1)
        lof_scores = -lof.negative_outlier_factor_
    except Exception:
        lof_outliers = np.zeros(n_samples, dtype=bool)
        lof_scores = np.ones(n_samples)

    # 3. Isolation Forest
    try:
        iso = IsolationForest(contamination=contam, random_state=42)
        iso_labels = iso.fit_predict(X)
        iso_outliers = (iso_labels == -1)
        iso_scores = -iso.score_samples(X)
    except Exception:
        iso_outliers = np.zeros(n_samples, dtype=bool)
        iso_scores = np.zeros(n_samples)

    method_str = str(method).lower().strip().replace('-', '_')
    if method_str in ['zscore', 'z_score']:
        is_outlier = z_outliers
        final_scores = z_scores
        def get_severity(score):
            if score >= thresh * 1.5:
                return "High"
            elif score >= thresh * 1.2:
                return "Medium"
            return "Low"
    elif method_str == 'lof':
        is_outlier = lof_outliers
        final_scores = lof_scores
        def get_severity(score):
            if score >= 2.0:
                return "High"
            elif score >= 1.5:
                return "Medium"
            return "Low"
    elif method_str in ['isolation_forest', 'isolationforest', 'iforest']:
        is_outlier = iso_outliers
        final_scores = iso_scores
        def get_severity(score):
            if score >= 0.70:
                return "High"
            elif score >= 0.60:
                return "Medium"
            return "Low"
    else:
        # "all" consensus: outlier if flagged by at least 2 methods, or strong z-score
        consensus = (z_outliers.astype(int) + lof_outliers.astype(int) + iso_outliers.astype(int)) >= 2
        is_outlier = consensus | (z_scores > (thresh * 1.5))
        final_scores = z_scores
        def get_severity(score):
            if score >= thresh * 1.5:
                return "High"
            elif score >= thresh * 1.2:
                return "Medium"
            return "Low"

    method_comparison_dict = {
        "zscore": int(np.sum(z_outliers)),
        "lof": int(np.sum(lof_outliers)),
        "isolation_forest": int(np.sum(iso_outliers))
    }

    method_comparison_list = [
        {"method": "Z-Score", "count": int(np.sum(z_outliers)), "percentage": round(float((np.sum(z_outliers) / n_samples) * 100), 2)},
        {"method": "Local Outlier Factor (LOF)", "count": int(np.sum(lof_outliers)), "percentage": round(float((np.sum(lof_outliers) / n_samples) * 100), 2)},
        {"method": "Isolation Forest", "count": int(np.sum(iso_outliers)), "percentage": round(float((np.sum(iso_outliers) / n_samples) * 100), 2)}
    ]

    total_outliers = int(np.sum(is_outlier))
    outlier_pct = round(float((total_outliers / n_samples) * 100), 2)

    # Build outlier records list
    outliers_list = []
    outlier_indices = np.where(is_outlier)[0]

    for idx in outlier_indices:
        original_idx = sub_df.index[idx]
        orig_row = df.loc[original_idx]
        feat_dict = {f: round(float(orig_row[f]), 2) for f in valid_features}

        rec_id = orig_row['record_id'] if 'record_id' in df.columns else original_idx
        dt_val = str(orig_row['date']) if 'date' in df.columns else ''
        tm_val = str(orig_row['time']) if 'time' in df.columns else ''
        loc_val = str(orig_row['location']) if 'location' in df.columns else ''

        score_val = round(float(final_scores[idx]), 3)
        severity = get_severity(score_val)

        vol_val = round(float(orig_row['traffic_volume']), 1) if 'traffic_volume' in orig_row else 0.0
        spd_val = round(float(orig_row['average_speed']), 1) if 'average_speed' in orig_row else 0.0
        ts_val = str(orig_row.get('timestamp') or f"{dt_val} {tm_val}").strip()

        outliers_list.append({
            "record_id": int(rec_id) if pd.api.types.is_numeric_dtype(type(rec_id)) else str(rec_id),
            "id": int(rec_id) if pd.api.types.is_numeric_dtype(type(rec_id)) else str(rec_id),
            "date": dt_val,
            "time": tm_val,
            "timestamp": ts_val,
            "location": loc_val or "Monitored Corridor",
            "volume": vol_val,
            "traffic_volume": vol_val,
            "speed": spd_val,
            "average_speed": spd_val,
            "score": score_val,
            "severity": severity,
            "features": feat_dict
        })

    # Sort outliers by severity / score descending
    severity_order = {"High": 3, "Medium": 2, "Low": 1}
    outliers_list.sort(key=lambda o: (severity_order.get(o["severity"], 0), o["score"]), reverse=True)

    # Construct chart scatter points
    x_feat = valid_features[0]
    y_feat = valid_features[1] if len(valid_features) > 1 else valid_features[0]

    normal_indices = np.where(~is_outlier)[0]
    if len(normal_indices) > 500:
        sampled_normal_indices = np.random.RandomState(42).choice(normal_indices, 500, replace=False)
    else:
        sampled_normal_indices = normal_indices

    chart_normal = []
    for idx in sampled_normal_indices:
        orig_idx = sub_df.index[idx]
        r_id = df.loc[orig_idx, 'record_id'] if 'record_id' in df.columns else orig_idx
        chart_normal.append({
            "x": round(float(sub_df.iloc[idx][x_feat]), 2),
            "y": round(float(sub_df.iloc[idx][y_feat]), 2),
            "record_id": int(r_id) if pd.api.types.is_numeric_dtype(type(r_id)) else str(r_id)
        })

    chart_anomalous = []
    for idx in outlier_indices:
        orig_idx = sub_df.index[idx]
        r_id = df.loc[orig_idx, 'record_id'] if 'record_id' in df.columns else orig_idx
        score_val = round(float(final_scores[idx]), 3)
        chart_anomalous.append({
            "x": round(float(sub_df.iloc[idx][x_feat]), 2),
            "y": round(float(sub_df.iloc[idx][y_feat]), 2),
            "record_id": int(r_id) if pd.api.types.is_numeric_dtype(type(r_id)) else str(r_id),
            "score": score_val,
            "severity": get_severity(score_val)
        })

    scatter_points = []
    for pt in chart_normal:
        scatter_points.append({
            "x": pt["x"],
            "y": pt["y"],
            "record_id": pt["record_id"],
            "is_anomaly": False
        })
    for pt in chart_anomalous:
        scatter_points.append({
            "x": pt["x"],
            "y": pt["y"],
            "record_id": pt["record_id"],
            "score": pt.get("score"),
            "severity": pt.get("severity"),
            "is_anomaly": True
        })

    return sanitize_for_json({
        "total_outliers": total_outliers,
        "anomaly_count": total_outliers,
        "total_evaluated": n_samples,
        "outlier_pct": outlier_pct,
        "anomaly_percentage": outlier_pct,
        "method": method_str,
        "scatter_points": scatter_points,
        "outliers": outliers_list,
        "anomalies": outliers_list,
        "method_comparison": method_comparison_list,
        "method_comparison_dict": method_comparison_dict,
        "chart_data": {
            "x_feature": x_feat,
            "y_feature": y_feat,
            "normal": chart_normal,
            "anomalous": chart_anomalous
        }
    })
