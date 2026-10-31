from flask import Blueprint, request, jsonify
from services.dataset_service import load_dataset_df, save_analysis_run, sanitize_for_json
from algorithms.prediction import run_prediction

prediction_bp = Blueprint('prediction', __name__)


@prediction_bp.route('/<int:dataset_id>/run', methods=['POST'])
def run_traffic_prediction(dataset_id):
    try:
        df, _ = load_dataset_df(dataset_id, use_preprocessed=True, apply_mapping=True)

        body = request.get_json() or {}
        algorithm = body.get('algorithm', 'random_forest')
        target = body.get('target', 'traffic_volume')
        features = body.get('features')
        location = body.get('location')
        forecast_steps = int(body.get('forecast_steps', 10))

        result = run_prediction(
            df=df,
            algorithm=algorithm,
            target=target,
            features=features,
            location=location,
            forecast_steps=forecast_steps
        )

        save_analysis_run(
            dataset_id=dataset_id,
            analysis_type="prediction",
            parameters={
                "algorithm": algorithm,
                "target": target,
                "location": location,
                "forecast_steps": forecast_steps
            },
            results={
                "algorithm": algorithm,
                "target": target,
                "location": location,
                "mae": result.get("mae"),
                "rmse": result.get("rmse"),
                "r2": result.get("r2")
            }
        )

        return jsonify(sanitize_for_json(result))
    except Exception as e:
        return jsonify({"error": f"Prediction failed: {str(e)}"}), 500
