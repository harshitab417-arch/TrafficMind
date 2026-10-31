from flask import Blueprint, request, jsonify
from database.db import db
from database.models import Dataset, AnalysisRun
from services.preprocessing_service import run_preprocessing_pipeline
from services.dataset_service import sanitize_for_json

preprocessing_bp = Blueprint('preprocessing', __name__)


@preprocessing_bp.route('/<int:dataset_id>/run', methods=['POST'])
def run_preprocessing(dataset_id):
    try:
        body = request.get_json() or {}
        operations = body.get('operations')
        result = run_preprocessing_pipeline(dataset_id, operations=operations)
        return jsonify(sanitize_for_json(result))
    except ValueError as e:
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        return jsonify({"error": f"Preprocessing failed: {str(e)}"}), 500


@preprocessing_bp.route('/<int:dataset_id>/summary', methods=['GET'])
def get_preprocessing_summary(dataset_id):
    try:
        dataset = db.session.get(Dataset, dataset_id)
        if not dataset:
            return jsonify({"error": f"Dataset {dataset_id} not found."}), 404

        latest_run = (
            AnalysisRun.query
            .filter_by(dataset_id=dataset_id, analysis_type="preprocessing")
            .order_by(AnalysisRun.created_at.desc())
            .first()
        )

        has_preprocessed = bool(dataset.preprocessed_filepath)

        return jsonify({
            "dataset_id": dataset.id,
            "has_preprocessed_file": has_preprocessed,
            "preprocessed_filepath": dataset.preprocessed_filepath,
            "last_run": latest_run.to_dict() if latest_run else None,
            "status": "preprocessed" if has_preprocessed else "raw"
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
