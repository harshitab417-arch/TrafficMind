import numpy as np
import pandas as pd
from sklearn.cluster import KMeans, DBSCAN
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import silhouette_score
from services.dataset_service import sanitize_for_json


def run_kmeans(df, features=None, n_clusters=3, random_state=42):
    """
    Fits KMeans on chosen numeric features. Scales features, computes silhouette score,
    characterizes each cluster with original-scale centroids and labels.
    """
    if not features:
        features = ['traffic_volume', 'average_speed']

    valid_features = [f for f in features if f in df.columns and pd.api.types.is_numeric_dtype(df[f])]
    if len(valid_features) < 1:
        raise ValueError(f"No valid numeric features found in dataset matching {features}")

    sub_df = df[valid_features].dropna()
    if len(sub_df) < n_clusters:
        raise ValueError(f"Dataset has {len(sub_df)} valid rows, but {n_clusters} clusters requested.")

    X = sub_df[valid_features].values
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    kmeans = KMeans(n_clusters=int(n_clusters), random_state=int(random_state), n_init=10)
    cluster_labels = kmeans.fit_predict(X_scaled)

    # Compute silhouette score if n_clusters >= 2
    sil_score = None
    if 2 <= n_clusters < len(X_scaled):
        try:
            # Sample for silhouette if dataset is very large
            if len(X_scaled) > 3000:
                indices = np.random.RandomState(42).choice(len(X_scaled), 3000, replace=False)
                sil_score = float(silhouette_score(X_scaled[indices], cluster_labels[indices]))
            else:
                sil_score = float(silhouette_score(X_scaled, cluster_labels))
            sil_score = round(sil_score, 4)
        except Exception:
            sil_score = None

    # Calculate cluster statistics and descriptions in original scale
    sub_df_copy = sub_df.copy()
    sub_df_copy['cluster'] = cluster_labels
    if 'record_id' in df.columns:
        sub_df_copy['record_id'] = df.loc[sub_df.index, 'record_id']
    else:
        sub_df_copy['record_id'] = sub_df.index

    clusters_info = []
    # Rank clusters by traffic volume or first feature
    cluster_means = sub_df_copy.groupby('cluster')[valid_features].mean()

    for c_id in range(n_clusters):
        c_subset = sub_df_copy[sub_df_copy['cluster'] == c_id]
        c_size = int(len(c_subset))
        centroid_dict = {}
        char_parts = []
        for feat in valid_features:
            avg_val = round(float(c_subset[feat].mean()), 2)
            centroid_dict[feat] = avg_val
            char_parts.append(f"{feat}: {avg_val}")

        # Derive human-friendly label
        label = f"Cluster {c_id}"
        if 'traffic_volume' in centroid_dict and 'average_speed' in centroid_dict:
            vol = centroid_dict['traffic_volume']
            spd = centroid_dict['average_speed']
            if vol >= 110 or spd <= 25:
                label = f"High Congestion (Cluster {c_id})"
            elif vol <= 50 and spd >= 45:
                label = f"Free Flow (Cluster {c_id})"
            else:
                label = f"Moderate Flow (Cluster {c_id})"

        pct = round(float((c_size / max(1, len(sub_df_copy))) * 100), 1)
        clusters_info.append({
            "id": int(c_id),
            "cluster_id": int(c_id),
            "size": c_size,
            "percentage": pct,
            "centroid": centroid_dict,
            "characteristics": ", ".join(char_parts),
            "label": label
        })

    # Prepare scatter data (sample up to 1000 points)
    sample_size = min(1000, len(sub_df_copy))
    sample_df = sub_df_copy.sample(n=sample_size, random_state=42) if len(sub_df_copy) > sample_size else sub_df_copy

    x_feat = valid_features[0]
    y_feat = valid_features[1] if len(valid_features) > 1 else valid_features[0]

    scatter_data = []
    for _, row in sample_df.iterrows():
        scatter_data.append({
            "x": round(float(row[x_feat]), 2),
            "y": round(float(row[y_feat]), 2),
            "cluster": int(row['cluster']),
            "record_id": int(row['record_id']) if pd.api.types.is_numeric_dtype(type(row['record_id'])) else str(row['record_id'])
        })

    return sanitize_for_json({
        "clusters": clusters_info,
        "silhouette_score": sil_score,
        "scatter_data": scatter_data,
        "inertia": round(float(kmeans.inertia_), 2),
        "n_clusters": int(n_clusters),
        "features": valid_features,
        "x_feature": x_feat,
        "y_feature": y_feat
    })


def run_dbscan(df, features=None, eps=0.5, min_samples=5):
    """
    Fits DBSCAN on selected numeric features. Computes noise percentage,
    identifies density-based clusters, and computes silhouette score for non-noise points.
    """
    if not features:
        features = ['traffic_volume', 'average_speed']

    valid_features = [f for f in features if f in df.columns and pd.api.types.is_numeric_dtype(df[f])]
    if len(valid_features) < 1:
        raise ValueError(f"No valid numeric features found matching {features}")

    sub_df = df[valid_features].dropna()
    if len(sub_df) < int(min_samples):
        raise ValueError(f"Dataset has {len(sub_df)} rows, less than min_samples={min_samples}.")

    X = sub_df[valid_features].values
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    dbscan = DBSCAN(eps=float(eps), min_samples=int(min_samples))
    labels = dbscan.fit_predict(X_scaled)

    sub_df_copy = sub_df.copy()
    sub_df_copy['cluster'] = labels
    if 'record_id' in df.columns:
        sub_df_copy['record_id'] = df.loc[sub_df.index, 'record_id']
    else:
        sub_df_copy['record_id'] = sub_df.index

    noise_mask = (labels == -1)
    noise_count = int(np.sum(noise_mask))
    total_points = len(labels)
    noise_pct = round(float((noise_count / total_points) * 100), 2)

    unique_clusters = sorted([c for c in set(labels) if c != -1])
    n_clusters = len(unique_clusters)

    sil_score = None
    if n_clusters >= 2 and total_points - noise_count > n_clusters:
        try:
            non_noise_indices = np.where(labels != -1)[0]
            if len(non_noise_indices) > 3000:
                sampled_non_noise = np.random.RandomState(42).choice(non_noise_indices, 3000, replace=False)
                sil_score = float(silhouette_score(X_scaled[sampled_non_noise], labels[sampled_non_noise]))
            else:
                sil_score = float(silhouette_score(X_scaled[non_noise_indices], labels[non_noise_indices]))
            sil_score = round(sil_score, 4)
        except Exception:
            sil_score = None

    clusters_info = []
    for c_id in unique_clusters:
        c_subset = sub_df_copy[sub_df_copy['cluster'] == c_id]
        c_size = int(len(c_subset))
        centroid_dict = {}
        char_parts = []
        for feat in valid_features:
            avg_val = round(float(c_subset[feat].mean()), 2)
            centroid_dict[feat] = avg_val
            char_parts.append(f"{feat}: {avg_val}")

        pct = round(float((c_size / max(1, len(sub_df_copy))) * 100), 1)
        clusters_info.append({
            "id": int(c_id),
            "cluster_id": int(c_id),
            "size": c_size,
            "percentage": pct,
            "centroid": centroid_dict,
            "characteristics": ", ".join(char_parts),
            "label": f"Dense Traffic Cluster {c_id}"
        })

    sample_size = min(1000, len(sub_df_copy))
    sample_df = sub_df_copy.sample(n=sample_size, random_state=42) if len(sub_df_copy) > sample_size else sub_df_copy

    x_feat = valid_features[0]
    y_feat = valid_features[1] if len(valid_features) > 1 else valid_features[0]

    scatter_data = []
    for _, row in sample_df.iterrows():
        scatter_data.append({
            "x": round(float(row[x_feat]), 2),
            "y": round(float(row[y_feat]), 2),
            "cluster": int(row['cluster']),
            "is_noise": bool(row['cluster'] == -1),
            "record_id": int(row['record_id']) if pd.api.types.is_numeric_dtype(type(row['record_id'])) else str(row['record_id'])
        })

    return sanitize_for_json({
        "clusters": clusters_info,
        "n_clusters": n_clusters,
        "noise_count": noise_count,
        "noise_points": noise_count,
        "noise_pct": noise_pct,
        "noise_percentage": noise_pct,
        "silhouette_score": sil_score,
        "scatter_data": scatter_data,
        "features": valid_features,
        "x_feature": x_feat,
        "y_feature": y_feat
    })
