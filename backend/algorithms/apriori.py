import pandas as pd
import numpy as np
from mlxtend.preprocessing import TransactionEncoder
from mlxtend.frequent_patterns import apriori, association_rules


def run_apriori(df, column_mapping=None, min_support=0.1, min_confidence=0.5, min_lift=1.0):
    """
    Performs association rule mining on traffic data using the Apriori algorithm.
    Discretizes continuous numeric variables and constructs transaction baskets.
    """
    df_clean = df.copy()

    # Discretize traffic_volume
    if 'traffic_volume' in df_clean.columns:
        vol = pd.to_numeric(df_clean['traffic_volume'], errors='coerce')
        df_clean['volume_bin'] = pd.cut(
            vol,
            bins=[-np.inf, 60, 110, np.inf],
            labels=['Volume:Low', 'Volume:Med', 'Volume:High']
        ).astype(str)

    # Discretize average_speed
    if 'average_speed' in df_clean.columns:
        spd = pd.to_numeric(df_clean['average_speed'], errors='coerce')
        df_clean['speed_bin'] = pd.cut(
            spd,
            bins=[-np.inf, 30, 60, np.inf],
            labels=['Speed:Slow', 'Speed:Moderate', 'Speed:Fast']
        ).astype(str)

    # Discretize hour / time of day
    if 'hour' in df_clean.columns:
        hr = pd.to_numeric(df_clean['hour'], errors='coerce')
        def categorize_hour(h):
            if np.isnan(h):
                return 'Time:Unknown'
            h = int(h)
            if 7 <= h <= 9:
                return 'Time:MorningRush'
            elif 17 <= h <= 19:
                return 'Time:EveningRush'
            elif 10 <= h <= 16:
                return 'Time:Midday'
            else:
                return 'Time:NightOffPeak'
        df_clean['time_period'] = hr.apply(categorize_hour)

    # Prepare itemset columns
    selected_cols = []
    item_prefixes = {
        'congestion_level': 'Congestion:',
        'weather': 'Weather:',
        'road_type': 'Road:',
        'volume_bin': '',
        'speed_bin': '',
        'time_period': '',
        'day_of_week': 'Day:'
    }

    transactions = []
    for idx, row in df_clean.iterrows():
        tx = []
        for col, prefix in item_prefixes.items():
            if col in df_clean.columns:
                val = str(row[col]).strip()
                if val and val != 'nan' and val != 'Unknown':
                    item_str = f"{prefix}{val}" if prefix else val
                    tx.append(item_str)
        if tx:
            transactions.append(tx)

    if not transactions:
        return {
            "frequent_itemsets": [],
            "rules": [],
            "total_transactions": 0,
            "message": "No valid transactions could be constructed from dataset."
        }

    # One-hot encode transactions
    te = TransactionEncoder()
    te_ary = te.fit(transactions).transform(transactions)
    encoded_df = pd.DataFrame(te_ary, columns=te.columns_)

    # Run Apriori
    try:
        frequent_itemsets = apriori(encoded_df, min_support=float(min_support), use_colnames=True)
    except Exception as e:
        return {
            "frequent_itemsets": [],
            "rules": [],
            "total_transactions": len(transactions),
            "message": f"Apriori execution failed: {str(e)}"
        }

    if frequent_itemsets.empty:
        return {
            "frequent_itemsets": [],
            "rules": [],
            "total_transactions": len(transactions),
            "message": f"No itemsets met the minimum support threshold of {min_support}. Try lowering min_support."
        }

    # Generate association rules
    rules_list = []
    try:
        rules_df = association_rules(frequent_itemsets, metric="confidence", min_threshold=float(min_confidence))
        if not rules_df.empty and min_lift is not None:
            rules_df = rules_df[rules_df['lift'] >= float(min_lift)]
            rules_df = rules_df.sort_values(by=['lift', 'confidence'], ascending=[False, False])

        for _, r in rules_df.iterrows():
            antecedents = list(r['antecedents'])
            consequents = list(r['consequents'])
            sup = round(float(r['support']), 4)
            conf = round(float(r['confidence']), 4)
            lift = round(float(r['lift']), 4)

            # Generate natural language interpretation
            ant_str = " & ".join(antecedents)
            con_str = " & ".join(consequents)
            interpretation = (
                f"When traffic exhibits [{ant_str}], there is a {conf * 100:.1f}% probability of [{con_str}] "
                f"(Lift: {lift:.2f}x baseline expectation)."
            )

            rules_list.append({
                "antecedents": antecedents,
                "consequents": consequents,
                "support": sup,
                "confidence": conf,
                "lift": lift,
                "interpretation": interpretation
            })
    except Exception:
        rules_list = []

    # Format frequent itemsets for JSON output (top 100 max)
    frequent_itemsets = frequent_itemsets.sort_values(by='support', ascending=False).head(100)
    formatted_itemsets = [
        {
            "itemset": list(row['itemsets']),
            "support": round(float(row['support']), 4)
        }
        for _, row in frequent_itemsets.iterrows()
    ]

    return {
        "frequent_itemsets": formatted_itemsets,
        "frequent_itemsets_count": len(formatted_itemsets),
        "rules": rules_list[:100],
        "rules_count": len(rules_list),
        "total_transactions": len(transactions),
        "message": f"Found {len(frequent_itemsets)} frequent itemsets and {len(rules_list)} association rules."
    }
