import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.tree import DecisionTreeClassifier
from sklearn.naive_bayes import GaussianNB
from sklearn.neighbors import KNeighborsClassifier
from sklearn.svm import SVC
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix, classification_report
from services.dataset_service import sanitize_for_json


def derive_congestion_labels(df, volume_col="traffic_volume", speed_col="average_speed"):
    """
    Applies the documented rules to derive traffic congestion levels:
    - High: volume >= 120 AND speed <= 25, OR volume >= 150 (any speed)
    - Medium: (volume >= 70 AND speed <= 40) OR (volume >= 100 AND speed <= 50)
    - Low: all others
    """
    vol = pd.to_numeric(df[volume_col], errors='coerce').fillna(0)
    spd = pd.to_numeric(df[speed_col], errors='coerce').fillna(40)

    conditions = [
        (vol >= 150) | ((vol >= 120) & (spd <= 25)),
        ((vol >= 70) & (spd <= 40)) | ((vol >= 100) & (spd <= 50))
    ]
    choices = ['High', 'Medium']
    return pd.Series(np.select(conditions, choices, default='Low'), index=df.index)


def _prepare_data(df, features, target="congestion_level"):
    df_clean = df.copy()

    if target not in df_clean.columns:
        if 'traffic_volume' in df_clean.columns and 'average_speed' in df_clean.columns:
            df_clean[target] = derive_congestion_labels(df_clean)
        else:
            raise ValueError(f"Target column '{target}' not found in dataset and cannot be derived.")

    if not features:
        # Default candidate features
        default_candidates = ['traffic_volume', 'average_speed', 'weather', 'road_type', 'hour', 'temperature']
        features = [c for c in default_candidates if c in df_clean.columns and c != target]

    available_features = [c for c in features if c in df_clean.columns and c != target]
    if not available_features:
        raise ValueError(f"No valid features found from requested {features}")

    # Drop rows with null in target
    valid_mask = df_clean[target].notnull() & (df_clean[target] != '')
    df_sub = df_clean[valid_mask].copy()

    # Preprocess features: numeric vs categorical
    feature_dfs = []
    processed_feature_names = []

    for feat in available_features:
        if pd.api.types.is_numeric_dtype(df_sub[feat]):
            median_val = df_sub[feat].median()
            series = df_sub[feat].fillna(median_val)
            feature_dfs.append(series)
            processed_feature_names.append(feat)
        else:
            # Categorical: one-hot encode
            dummies = pd.get_dummies(df_sub[feat].astype(str), prefix=feat, drop_first=True)
            if not dummies.empty:
                feature_dfs.append(dummies)
                processed_feature_names.extend(list(dummies.columns))

    if not feature_dfs:
        raise ValueError("Could not extract any valid feature data.")

    X = pd.concat(feature_dfs, axis=1)
    y = df_sub[target].astype(str)

    return X, y, df_sub, processed_feature_names


def train_classifier(df, algorithm="decision_tree", features=None, target="congestion_level", test_size=0.2, params=None):
    """
    Trains a classification model (decision_tree, naive_bayes, knn, svm) strictly
    on the train set and evaluates on the test set.
    """
    if params is None:
        params = {}

    X, y, df_sub, feature_names = _prepare_data(df, features, target)

    # Stratified split if each class has at least 2 instances
    class_counts = y.value_counts()
    stratify = y if (class_counts >= 2).all() else None

    test_sz = float(test_size) if test_size and 0.05 <= float(test_size) <= 0.5 else 0.2
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_sz, random_state=42, stratify=stratify
    )

    # Scale numeric inputs for algorithms sensitive to distance
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # Model instantiation
    algo = str(algorithm).lower().strip()
    if algo == 'decision_tree':
        max_depth = int(params.get('max_depth', 6))
        min_samples_split = int(params.get('min_samples_split', 2))
        model = DecisionTreeClassifier(max_depth=max_depth, min_samples_split=min_samples_split, random_state=42)
        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)
    elif algo == 'naive_bayes':
        model = GaussianNB()
        model.fit(X_train, y_train)
        y_pred = model.predict(X_test)
    elif algo == 'knn':
        n_neighbors = int(params.get('n_neighbors', 5))
        model = KNeighborsClassifier(n_neighbors=n_neighbors)
        model.fit(X_train_scaled, y_train)
        y_pred = model.predict(X_test_scaled)
    elif algo == 'svm':
        kernel = params.get('kernel', 'rbf')
        C = float(params.get('C', 1.0))
        model = SVC(kernel=kernel, C=C, probability=True, random_state=42)
        model.fit(X_train_scaled, y_train)
        y_pred = model.predict(X_test_scaled)
    else:
        raise ValueError(f"Unsupported algorithm '{algorithm}'. Must be one of: decision_tree, naive_bayes, knn, svm.")

    # Unique classes sorted
    classes = sorted(list(set(y)))

    # Metrics calculation
    acc = round(float(accuracy_score(y_test, y_pred)), 4)
    prec = round(float(precision_score(y_test, y_pred, average='weighted', zero_division=0)), 4)
    rec = round(float(recall_score(y_test, y_pred, average='weighted', zero_division=0)), 4)
    f1 = round(float(f1_score(y_test, y_pred, average='weighted', zero_division=0)), 4)

    cm = confusion_matrix(y_test, y_pred, labels=classes).tolist()
    report = classification_report(y_test, y_pred, labels=classes, output_dict=True, zero_division=0)

    # Feature importances for Decision Tree
    feature_importance = None
    if algo == 'decision_tree' and hasattr(model, 'feature_importances_'):
        feature_importance = {
            name: round(float(imp), 4)
            for name, imp in zip(feature_names, model.feature_importances_)
        }
        # Sort descending
        feature_importance = dict(sorted(feature_importance.items(), key=lambda item: item[1], reverse=True))

    # Sample test predictions for display
    test_indices = X_test.index[:25]
    predictions_sample = []
    for idx, act, pred in zip(test_indices, y_test[:25], y_pred[:25]):
        sample_row = {
            "record_id": int(df_sub.loc[idx, 'record_id']) if 'record_id' in df_sub.columns else int(idx),
            "actual": str(act),
            "predicted": str(pred),
            "is_correct": bool(act == pred)
        }
        predictions_sample.append(sample_row)

    return sanitize_for_json({
        "algorithm": algo,
        "accuracy": acc,
        "precision": prec,
        "recall": rec,
        "f1": f1,
        "classes": classes,
        "confusion_matrix": cm,
        "classification_report": report,
        "feature_importance": feature_importance,
        "predictions_sample": predictions_sample,
        "train_size": len(X_train),
        "test_size": len(X_test)
    })


def train_all_classifiers(df, features=None, target="congestion_level", test_size=0.2, params=None):
    """
    Trains all 4 algorithms on identical train/test splits for objective comparison.
    """
    algorithms = ['decision_tree', 'naive_bayes', 'knn', 'svm']
    results = {}
    comparison = []

    for algo in algorithms:
        res = train_classifier(df, algorithm=algo, features=features, target=target, test_size=test_size, params=params)
        results[algo] = res
        comparison.append({
            "algorithm": algo,
            "accuracy": res["accuracy"],
            "precision": res["precision"],
            "recall": res["recall"],
            "f1": res["f1"],
            "f1_score": res["f1"]
        })

    # Sort comparison by F1 score descending
    comparison.sort(key=lambda x: x["f1"], reverse=True)
    best_algorithm = comparison[0]["algorithm"] if comparison else None

    return sanitize_for_json({
        "comparison": comparison,
        "best_algorithm": best_algorithm,
        "models": results,
        "results": results,
        "target_derived": target not in df.columns
    })
