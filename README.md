# TrafficMind

**Urban Traffic Pattern Mining & Congestion Prediction System**

> Discover Traffic Patterns. Predict Congestion. Understand Urban Mobility.

TrafficMind is a full-stack academic data mining web application that analyses historical urban traffic datasets to discover hidden patterns, classify congestion levels, predict traffic conditions, and detect unusual vehicular behaviour — all driven by real machine learning algorithms running on live dataset records.

---

## Table of Contents

- [Features Overview](#features-overview)
- [Tech Stack](#tech-stack)
- [Quick Start Guide](#quick-start-guide)
  - [Prerequisites](#prerequisites)
  - [1. Backend Setup](#1--backend-setup-flask--python)
  - [2. Frontend Setup](#2--frontend-setup-react--vite)
- [Project Architecture](#project-architecture)
- [Data Mining Modules](#data-mining-modules)
- [API Reference](#api-reference)
- [Demonstration Dataset](#demonstration-dataset)

---

## Features Overview

1. **Executive Overview Dashboard**:
   - Dynamic network-level and location-specific KPIs: Total Records, Average Speed, Peak Volume, High Congestion %, and Monitored Locations.
   - Interactive location filter dropdown to dynamically slice and recalculate metrics per corridor.
   - Visual trend charts: Volume over time, Congestion severity donut chart, Speed by location/road type, 24-hour diurnal volume curves, Weekday vs Weekend congestion stacks, and Weather impact charts.
   - Dynamic, automated heuristics and insights generated from real dataset aggregates.

2. **Data Management & Preprocessing**:
   - Upload custom traffic CSV files with drag-and-drop.
   - Schema column mapping tool for custom field alignment (timestamp, location, speed, volume, weather).
   - Automated cleaning pipeline: duplicate elimination, missing value imputation, z-score normalization, categorical encoding, and datetime feature extraction.

3. **Interactive Traffic Explorer & GIS Mapping**:
   - Granular multi-attribute slicing: Corridor, Congestion Level, Weather Condition, Date Range, and Time Window.
   - Leaflet.js interactive OpenStreetMap GIS distribution with congestion-colored sensor markers (Green = Low, Amber = Medium, Red = High).
   - Quick date presets (*Single Day*, *First 7 Days*, *Full Year*, *Clear Dates*) with bound indicators.
   - Sortable, paginated observation data table.

4. **OLAP Multi-Dimensional Analytics**:
   - Cube operations: **Roll-Up**, **Drill-Down**, **Slice**, and **Dice**.
   - Flexible dimensional aggregation by Time (hourly, daily, weekly, monthly), Location, Road Type, or Weather Condition.

5. **Association Rule Mining (Apriori)**:
   - Uses `mlxtend` to find frequent co-occurring traffic states (e.g., *Rainy + Peak Hours → High Congestion*).
   - Adjustable minimum support, confidence, and lift thresholds with natural language rule interpretations.

6. **Clustering Analysis (K-Means & DBSCAN)**:
   - Partitioning with K-Means and density-based clustering with DBSCAN.
   - Interactive 2D scatter plots, silhouette scores, noise detection, and cluster profile statistics.

7. **Congestion Level Classification**:
   - Trains and compares 4 classification models: **Decision Tree**, **Naive Bayes**, **K-Nearest Neighbors (KNN)**, and **Support Vector Machine (SVM)**.
   - Computes Accuracy, Precision, Recall, F1-Score, and renders interactive confusion matrix heatmaps.
   - Strict train/test split with data leakage prevention.

8. **Traffic Volume & Speed Prediction**:
   - Supervised regression via **Random Forest Regressor** and **Linear Regression**.
   - Chronological temporal train/test split.
   - Reports MAE, RMSE, and $R^2$ goodness-of-fit metrics alongside actual vs. predicted curves and future forecasts.

9. **Outlier & Anomaly Detection**:
   - Parametric Gaussian **Z-Score**, density-based **Local Outlier Factor (LOF)**, and ensemble **Isolation Forest**.
   - Consensus view (`all`) comparing detection sensitivities across all three methods.
   - Red vs. blue scatter distribution and prioritized anomaly event logs.

10. **Model Evaluation & Viva Explanations**:
    - Centralized model comparison matrix across all performed runs.
    - Academic explanation panel on every module detailing purpose, formulation, input features, hyperparameters, and evaluation interpretation.

---

## Tech Stack

- **Backend**: Python 3.10+, Flask, Flask-CORS, SQLAlchemy, SQLite, Pandas, NumPy, Scikit-learn, MLxtend.
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Recharts, Leaflet.js, React-Leaflet, Lucide React, Axios.

---

## Quick Start Guide

### Prerequisites

| Tool | Minimum Version | Check Command |
|---|---|---|
| Python | 3.10+ | `python --version` |
| Node.js | 18.0+ | `node --version` |
| npm | 9.0+ | `npm --version` |

---

### 1 — Backend Setup (Flask & Python)

Open a terminal (PowerShell or Command Prompt):

```powershell
# 1. Navigate to backend directory
cd e:\TrafficMind\backend

# 2. Install backend dependencies
pip install -r requirements.txt

# 3. Generate the 4,000-row synthetic demonstration dataset & populate SQLite
python sample_data/generate_sample.py

# 4. Start the Flask API server
python app.py
```

The Flask backend will start on **`http://localhost:5000`** (or `http://127.0.0.1:5000`).

---

### 2 — Frontend Setup (React & Vite)

Open a **separate** terminal window:

```powershell
# 1. Navigate to frontend directory
cd e:\TrafficMind\frontend

# 2. Install Node dependencies
npm install

# 3. Start the Vite development server
npm run dev
```

Open your browser at **`http://localhost:5173`**.

---

## Project Architecture

```
TrafficMind/
├── backend/
│   ├── app.py                        # Flask application factory & blueprint registry
│   ├── config.py                     # App settings, DB paths, upload limits
│   ├── requirements.txt              # Python library dependencies
│   ├── database/
│   │   ├── db.py                     # SQLAlchemy session initialization
│   │   └── models.py                 # Dataset and AnalysisRun ORM models
│   ├── services/
│   │   ├── dataset_service.py        # CSV parsing, column mapping & JSON sanitization
│   │   └── preprocessing_service.py  # Cleaning, imputation, discretization pipeline
│   ├── algorithms/                   # Core Data Mining implementations
│   │   ├── olap.py                   # Roll-up, Drill-down, Slice, Dice logic
│   │   ├── apriori.py                # Frequent itemsets & association rules
│   │   ├── clustering.py             # K-Means & DBSCAN algorithms
│   │   ├── classification.py         # DT, Naive Bayes, KNN, SVM classifiers
│   │   ├── prediction.py             # Random Forest & Linear Regression forecasting
│   │   └── outlier_detection.py      # Z-Score, LOF, Isolation Forest algorithms
│   ├── routes/                       # Modular Flask API endpoints
│   │   ├── health.py                 # System health check
│   │   ├── datasets.py               # Dataset upload, preview, activation
│   │   ├── preprocessing.py          # Data cleaning endpoints
│   │   ├── overview.py               # Dynamic KPIs, charts, insights
│   │   ├── explorer.py               # Granular filtering & record queries
│   │   ├── olap.py                   # Multi-dimensional analytics queries
│   │   ├── association.py            # Apriori execution route
│   │   ├── clustering.py             # Clustering execution routes
│   │   ├── classification.py         # Classifier training & cross-comparison
│   │   ├── prediction.py             # Regressor training & forecasting
│   │   ├── outlier.py                # Anomaly detection route
│   │   └── evaluation.py             # Model performance benchmarking
│   └── sample_data/
│       ├── generate_sample.py        # 4,000-record realistic synthetic dataset generator
│       └── traffic_sample.csv        # Pre-generated baseline CSV
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx                   # Client router & ErrorBoundary wrapper
│   │   ├── main.tsx                  # React entry point
│   │   ├── types/api.ts              # Strongly-typed TypeScript interfaces
│   │   ├── services/api.ts           # Axios client with 26+ typed API methods
│   │   ├── hooks/
│   │   │   └── useDataset.tsx        # Global active dataset state provider
│   │   ├── layouts/
│   │   │   ├── Sidebar.tsx           # Dark navigation bar
│   │   │   ├── Header.tsx            # Dataset selector & system status
│   │   │   └── MainLayout.tsx        # App layout shell
│   │   ├── components/               # Reusable UI widgets
│   │   │   ├── KpiCard.tsx           # Stat counter cards with trends
│   │   │   ├── DataTable.tsx         # Paginated, sortable data table
│   │   │   ├── ConfusionMatrix.tsx   # Matrix heatmap visualization
│   │   │   ├── AlgorithmExplainer.tsx# Academic Viva explanation accordion
│   │   │   └── StatusBadge.tsx       # Severity/level indicators
│   │   └── pages/                    # 10 Application Views
│   │       ├── Overview.tsx          # Executive dashboard with location picker
│   │       ├── DataManagement.tsx    # Upload & preprocessing manager
│   │       ├── TrafficExplorer.tsx   # Granular filters & Leaflet GIS map
│   │       ├── OlapAnalytics.tsx     # OLAP cube operations
│   │       ├── AssociationMining.tsx # Apriori rule discovery
│   │       ├── ClusteringAnalysis.tsx# K-Means and DBSCAN
│   │       ├── CongestionClassification.tsx # 4-algorithm classifier
│   │       ├── TrafficPrediction.tsx # Time-series forecasting
│   │       ├── OutlierDetection.tsx  # Multi-method anomaly detection
│   │       └── ModelEvaluation.tsx   # Benchmark scorecards
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
│
└── README.md
```

---

## Data Mining Modules

| Module | Core Algorithms | Input Parameters | Primary Output |
|---|---|---|---|
| **Overview** | Dynamic Aggregation | Location Filter | Live KPIs, 6 temporal charts, automated insights |
| **Explorer** | Multi-attribute Slicing | Location, Weather, Level, Date, Time | Leaflet GIS markers, filtered record table |
| **OLAP** | Roll-Up, Drill-Down, Slice, Dice | Dimension, Measure, Time Grain | Aggregated multi-dimensional charts |
| **Association** | Apriori (MLxtend) | Min Support, Min Confidence, Min Lift | Association rules with Antecedent → Consequent |
| **Clustering** | K-Means, DBSCAN | $k$, $\varepsilon$ (Eps), Min Samples | 2D Scatter plot, Silhouette score, cluster distribution |
| **Classification** | Decision Tree, Naive Bayes, KNN, SVM | Target, Features, Test Split | Confusion matrix, Accuracy, Precision, Recall, F1 |
| **Prediction** | Random Forest Regressor, Linear Regression | Target, Features, Forecast Horizon | MAE, RMSE, $R^2$, Historical vs Forecast plot |
| **Outliers** | Z-Score, LOF, Isolation Forest | Z-Threshold, $k$-Neighbors, Contamination | Flagged anomalies, scatter highlights, method comparison |
| **Evaluation** | Cross-Module Benchmarking | Dataset ID | Unified scorecard across all ML runs |

---


### Datasets & Preprocessing
- `GET /api/datasets` — List all datasets
- `GET /api/datasets/active` — Get currently active dataset
- `POST /api/datasets/upload` — Upload CSV (`multipart/form-data`)
- `POST /api/datasets/sample` — Load demo sample dataset
- `GET /api/datasets/<id>/preview` — First 50 rows of dataset
- `GET /api/datasets/<id>/stats` — Summary statistics per column
- `PUT /api/datasets/<id>/mapping` — Update custom schema column mapping
- `POST /api/datasets/<id>/activate` — Set dataset as system active
- `POST /api/preprocessing/<id>/run` — Execute cleaning & normalization pipeline
- `GET /api/preprocessing/<id>/summary` — Retrieve preprocessing history

### Analytics & ML
- `GET /api/overview/<id>/kpis?location=<loc>` — Location-filtered summary KPIs
- `GET /api/overview/<id>/charts?location=<loc>` — Overview chart data payloads
- `GET /api/overview/<id>/insights?location=<loc>` — Automated heuristic findings
- `GET /api/explorer/<id>/records` — Paginated and filtered traffic records
- `GET /api/explorer/<id>/filters` — Available filter values & date range
- `GET /api/explorer/<id>/stats` — Aggregated metrics for current active query
- `POST /api/olap/<id>/query` — Multi-dimensional OLAP cube query
- `POST /api/association/<id>/run` — Apriori association rule mining
- `POST /api/clustering/<id>/kmeans` — K-Means clustering execution
- `POST /api/clustering/<id>/dbscan` — DBSCAN clustering execution
- `POST /api/classification/<id>/train` — Train a single classifier
- `POST /api/classification/<id>/train_all` — Train and benchmark all 4 classifiers
- `POST /api/prediction/<id>/run` — Train regressor and forecast
- `POST /api/outlier/<id>/run` — Run Z-Score, LOF, or Isolation Forest anomaly detection
- `GET /api/evaluation/<id>/summary` — Retrieve cross-algorithm evaluation summary

---

## Demonstration Dataset

The system includes a realistic synthetic dataset (`traffic_sample.csv`) containing **4,000 records**:
- *Highway 101 North*
- *Downtown Central*
- *Main St & 1st Ave*
- *Riverside Drive*
- *Airport Road*
- *Shopping District*
- *Industrial Zone*
- *University Blvd*

**Realistic Characteristics Included:**
- Morning (07:00–09:00) and evening (17:00–19:00) rush-hour volume surges.
- Weekend patterns featuring lower total volume and delayed afternoon peaks.
- Weather variations (Clear, Cloudy, Rainy, Foggy, Stormy) with correlated travel speed drops.
- 50 deliberately introduced sensor dropouts and severe traffic anomalies for outlier testing.

**Documented Congestion Derivation Rules:**
- **High**: `traffic_volume ≥ 120 AND average_speed ≤ 25` OR `traffic_volume ≥ 150`
- **Medium**: `(traffic_volume ≥ 70 AND average_speed ≤ 40)` OR `(traffic_volume ≥ 100 AND average_speed ≤ 50)`
- **Low**: All remaining observations

> [!NOTE]
> All synthetic demonstration rows are clearly tagged (`is_sample = True`).

---