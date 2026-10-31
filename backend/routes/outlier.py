from flask import Blueprint, request, jsonify
from services.dataset_service import load_dataset_df, save_analysis_run, sanitize_for_json
from algorithms.outlier_detection import detect_outliers

outlier_bp = Blueprint('outlier', __name__)


@outlier_bp.route('/<int:dataset_id>/run', methods=['POST'])
def run_outlier_detection(dataset_id):
    try:
        df, _ = load_dataset_df(dataset_id, use_preprocessed=True, apply_mapping=True)

        body = request.get_json() or {}
        method = body.get('method', 'all')
        if method == 'z_score':
            method = 'zscore'
        features = body.get('features', ['traffic_volume', 'average_speed'])
        zscore_threshold = float(body.get('zscore_threshold', body.get('z_threshold', 3.0)))
        lof_neighbors = int(body.get('lof_neighbors', 20))
        contamination = float(body.get('contamination', 0.05))

        result = detect_outliers(
            df=df,
            method=method,
            features=features,
            zscore_threshold=zscore_threshold,
            lof_neighbors=lof_neighbors,
            contamination=contamination
        )

        save_analysis_run(
            dataset_id=dataset_id,
            analysis_type="outlier",
            parameters={
                "method": method,
                "features": features,
                "zscore_threshold": zscore_threshold,
                "lof_neighbors": lof_neighbors,
                "contamination": contamination
            },
            results={
                "total_outliers": result.get("total_outliers"),
                "outlier_pct": result.get("outlier_pct"),
                "method_comparison": result.get("method_comparison")
            }
        )

        return jsonify(sanitize_for_json(result))
    except Exception as e:
        return jsonify({"error": f"Outlier detection failed: {str(e)}"}), 500
