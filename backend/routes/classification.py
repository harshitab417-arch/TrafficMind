from flask import Blueprint, request, jsonify
from services.dataset_service import load_dataset_df, save_analysis_run, sanitize_for_json
from algorithms.classification import train_classifier, train_all_classifiers

classification_bp = Blueprint('classification', __name__)


@classification_bp.route('/<int:dataset_id>/train', methods=['POST'])
def train_model(dataset_id):
    try:
        df, _ = load_dataset_df(dataset_id, use_preprocessed=True, apply_mapping=True)

        body = request.get_json() or {}
        algorithm = body.get('algorithm', 'decision_tree')
        features = body.get('features')
        target = body.get('target', 'congestion_level')
        test_size = float(body.get('test_size', 0.2))
        params = body.get('params', {})

        result = train_classifier(
            df=df,
            algorithm=algorithm,
            features=features,
            target=target,
            test_size=test_size,
            params=params
        )

        save_analysis_run(
            dataset_id=dataset_id,
            analysis_type="classification",
            parameters={
                "algorithm": algorithm,
                "features": features,
                "target": target,
                "test_size": test_size,
                "params": params
            },
            results={
                "algorithm": algorithm,
                "accuracy": result.get("accuracy"),
                "precision": result.get("precision"),
                "recall": result.get("recall"),
                "f1": result.get("f1")
            }
        )

        return jsonify(sanitize_for_json(result))
    except Exception as e:
        return jsonify({"error": f"Model training failed: {str(e)}"}), 500


@classification_bp.route('/<int:dataset_id>/train_all', methods=['POST'])
@classification_bp.route('/<int:dataset_id>/train-all', methods=['POST'])
def train_all_models(dataset_id):
    try:
        df, _ = load_dataset_df(dataset_id, use_preprocessed=True, apply_mapping=True)

        body = request.get_json() or {}
        features = body.get('features')
        target = body.get('target', 'congestion_level')
        test_size = float(body.get('test_size', 0.2))
        params = body.get('params', {})

        result = train_all_classifiers(
            df=df,
            features=features,
            target=target,
            test_size=test_size,
            params=params
        )

        save_analysis_run(
            dataset_id=dataset_id,
            analysis_type="classification",
            parameters={
                "algorithm": "all_classifiers",
                "features": features,
                "target": target,
                "test_size": test_size
            },
            results={
                "comparison": result.get("comparison"),
                "best_algorithm": result.get("best_algorithm")
            }
        )

        return jsonify(sanitize_for_json(result))
    except Exception as e:
        return jsonify({"error": f"Training all models failed: {str(e)}"}), 500
