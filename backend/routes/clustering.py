from flask import Blueprint, request, jsonify
from services.dataset_service import load_dataset_df, save_analysis_run, sanitize_for_json
from algorithms.clustering import run_kmeans, run_dbscan

clustering_bp = Blueprint('clustering', __name__)


@clustering_bp.route('/<int:dataset_id>/kmeans', methods=['POST'])
def kmeans_clustering(dataset_id):
    try:
        df, _ = load_dataset_df(dataset_id, use_preprocessed=True, apply_mapping=True)

        body = request.get_json() or {}
        features = body.get('features', ['traffic_volume', 'average_speed'])
        n_clusters = int(body.get('n_clusters', 3))
        random_state = int(body.get('random_state', 42))

        result = run_kmeans(
            df=df,
            features=features,
            n_clusters=n_clusters,
            random_state=random_state
        )

        save_analysis_run(
            dataset_id=dataset_id,
            analysis_type="clustering",
            parameters={
                "algorithm": "kmeans",
                "features": features,
                "n_clusters": n_clusters,
                "random_state": random_state
            },
            results={
                "algorithm": "kmeans",
                "n_clusters": n_clusters,
                "silhouette_score": result.get("silhouette_score"),
                "inertia": result.get("inertia"),
                "cluster_sizes": [c["size"] for c in result.get("clusters", [])]
            }
        )

        return jsonify(sanitize_for_json(result))
    except Exception as e:
        return jsonify({"error": f"K-Means clustering failed: {str(e)}"}), 500


@clustering_bp.route('/<int:dataset_id>/dbscan', methods=['POST'])
def dbscan_clustering(dataset_id):
    try:
        df, _ = load_dataset_df(dataset_id, use_preprocessed=True, apply_mapping=True)

        body = request.get_json() or {}
        features = body.get('features', ['traffic_volume', 'average_speed'])
        eps = float(body.get('eps', 0.5))
        min_samples = int(body.get('min_samples', 5))

        result = run_dbscan(
            df=df,
            features=features,
            eps=eps,
            min_samples=min_samples
        )

        save_analysis_run(
            dataset_id=dataset_id,
            analysis_type="clustering",
            parameters={
                "algorithm": "dbscan",
                "features": features,
                "eps": eps,
                "min_samples": min_samples
            },
            results={
                "algorithm": "dbscan",
                "n_clusters": result.get("n_clusters"),
                "noise_count": result.get("noise_count"),
                "noise_pct": result.get("noise_pct"),
                "silhouette_score": result.get("silhouette_score")
            }
        )

        return jsonify(sanitize_for_json(result))
    except Exception as e:
        return jsonify({"error": f"DBSCAN clustering failed: {str(e)}"}), 500
