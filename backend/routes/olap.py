from flask import Blueprint, request, jsonify
from services.dataset_service import load_dataset_df, sanitize_for_json
from algorithms.olap import execute_olap_query

olap_bp = Blueprint('olap', __name__)


@olap_bp.route('/<int:dataset_id>/query', methods=['POST'])
def query_olap(dataset_id):
    try:
        df, _ = load_dataset_df(dataset_id, use_preprocessed=True, apply_mapping=True)

        body = request.get_json() or {}
        operation = body.get('operation', 'rollup')
        dimension = body.get('dimension', 'time')
        measure = body.get('measure', 'traffic_volume')
        time_grain = body.get('time_grain', 'hourly')
        filters = body.get('filters', {})

        result = execute_olap_query(
            df=df,
            operation=operation,
            dimension=dimension,
            measure=measure,
            time_grain=time_grain,
            filters=filters
        )

        return jsonify(sanitize_for_json(result))
    except Exception as e:
        return jsonify({"error": f"OLAP query failed: {str(e)}"}), 500
