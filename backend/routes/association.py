from flask import Blueprint, request, jsonify
from services.dataset_service import load_dataset_df, save_analysis_run, sanitize_for_json
from algorithms.apriori import run_apriori

association_bp = Blueprint('association', __name__)


@association_bp.route('/<int:dataset_id>/run', methods=['POST'])
def run_association_mining(dataset_id):
    try:
        df, dataset = load_dataset_df(dataset_id, use_preprocessed=True, apply_mapping=True)

        body = request.get_json() or {}
        min_support = float(body.get('min_support', 0.1))
        min_confidence = float(body.get('min_confidence', 0.5))
        min_lift = float(body.get('min_lift', 1.0))

        result = run_apriori(
            df=df,
            column_mapping=dataset.get_column_mapping(),
            min_support=min_support,
            min_confidence=min_confidence,
            min_lift=min_lift
        )

        # Persist run for evaluation summary
        save_analysis_run(
            dataset_id=dataset_id,
            analysis_type="association",
            parameters={
                "min_support": min_support,
                "min_confidence": min_confidence,
                "min_lift": min_lift
            },
            results={
                "frequent_itemsets_count": len(result.get("frequent_itemsets", [])),
                "rules_count": len(result.get("rules", [])),
                "total_transactions": result.get("total_transactions", 0),
                "top_rules": result.get("rules", [])[:5]
            }
        )

        return jsonify(sanitize_for_json(result))
    except Exception as e:
        return jsonify({"error": f"Association rule mining failed: {str(e)}"}), 500
