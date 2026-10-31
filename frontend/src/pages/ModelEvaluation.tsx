import React, { useState, useEffect } from 'react';
import {
  Award,
  BarChart3,
  Layers,
  TrendingUp,
  GitBranch,
  ShieldAlert,
  Loader2,
  AlertCircle,
  RefreshCw,
  Info,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import { useDataset } from '../hooks/useDataset';
import { getEvaluationSummary } from '../services/api';
import { ModelEvaluationSummary } from '../types/api';
import AlgorithmExplainer from '../components/AlgorithmExplainer';
import DataTable, { Column } from '../components/DataTable';

export const ModelEvaluation: React.FC = () => {
  const { activeDataset } = useDataset();
  const [summary, setSummary] = useState<ModelEvaluationSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = async (datasetId: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getEvaluationSummary(datasetId);
      setSummary(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch model evaluation summary');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeDataset?.id) {
      fetchSummary(activeDataset.id);
    }
  }, [activeDataset?.id]);

  if (!activeDataset) {
    return (
      <div className="bg-white p-8 rounded-xl border border-gray-200 text-center text-sm text-gray-500">
        Please activate a dataset in Data Management to view Unified Model Evaluations.
      </div>
    );
  }

  const hasAnyData =
    summary &&
    (summary.classification?.length ||
      summary.clustering?.kmeans ||
      summary.clustering?.dbscan ||
      summary.prediction?.length ||
      summary.association ||
      summary.outliers?.length);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Model Evaluation & Benchmark Synthesis</h1>
          <p className="text-xs text-gray-500 mt-1">
            Comprehensive comparative analysis of supervised, unsupervised, and time-series models trained on{' '}
            <span className="font-semibold text-gray-800">{activeDataset.name}</span>.
          </p>
        </div>
        <button
          onClick={() => activeDataset && fetchSummary(activeDataset.id)}
          disabled={loading}
          className="inline-flex items-center px-3 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg shadow-2xs hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh Evaluation
        </button>
      </div>

      {/* Explainer */}
      <AlgorithmExplainer
        title="Comprehensive Data Mining Evaluation Framework"
        purpose="This synthesized evaluation dashboard aggregates quantitative metrics across all core algorithms implemented in TrafficMind: Supervised Classification (DT, NB, KNN, SVM), Unsupervised Clustering (K-Means, DBSCAN), Predictive Regressors (RF, LR), Association Rules (Apriori), and Anomaly Detectors (IForest, LOF, Z-Score)."
        interpretation="Review multi-criteria trade-offs. For example, while non-linear models (SVM, Random Forest) may offer higher accuracy, simpler models (Decision Trees, Linear Regression) provide explainable rules essential for municipal traffic engineering audits."
        metrics={{
          'Supervised F1 & Accuracy': 'Measures exactness and class recall on held-out test splits.',
          'Silhouette Score': 'Assesses cluster boundary compactness and geometric separation.',
          'Regression MAE & R²': 'Validates vehicle count error tolerances and explained variance.',
          'Lift & Confidence': 'Guarantees actionable non-random association discovery.',
        }}
        defaultOpen={false}
      />

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center text-xs text-red-700">
          <AlertCircle className="w-4 h-4 mr-2 text-red-500 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading && !summary && (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-gray-200">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
          <p className="text-xs text-gray-500">Aggregating cross-module evaluation metrics...</p>
        </div>
      )}

      {!loading && !hasAnyData && (
        <div className="bg-white p-10 rounded-xl border border-dashed border-gray-300 text-center space-y-3">
          <Info className="w-8 h-8 text-blue-600 mx-auto" />
          <h3 className="text-sm font-bold text-gray-800">No Model Run History Available Yet</h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            Please run models in their respective analytical modules (Classification, Clustering, Prediction, Outliers, Association) to populate this benchmark report.
          </p>
        </div>
      )}

      {summary && (
        <div className="space-y-6">
          {/* Section 1: Classification Comparison */}
          {summary.classification && summary.classification.length > 0 && (
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">1. Congestion Classification Benchmark</h3>
                  <p className="text-xs text-gray-500">Comparison of 4 supervised learning classifiers</p>
                </div>
              </div>

              {/* Bar Chart */}
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={summary.classification.map((c) => ({
                      algorithm: c.algorithm,
                      Accuracy: Number((c.accuracy * 100).toFixed(1)),
                      Precision: Number((c.precision * 100).toFixed(1)),
                      Recall: Number((c.recall * 100).toFixed(1)),
                      F1: Number((c.f1_score * 100).toFixed(1)),
                    }))}
                    margin={{ top: 10, right: 20, left: 0, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="algorithm" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis unit="%" tick={{ fontSize: 11, fill: '#64748b' }} domain={[0, 100]} />
                    <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="Accuracy" fill="#2563eb" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="F1" fill="#0d9488" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Precision" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Recall" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2.5 font-semibold text-gray-600 uppercase">Algorithm</th>
                      <th className="px-4 py-2.5 font-semibold text-gray-600 uppercase">Accuracy</th>
                      <th className="px-4 py-2.5 font-semibold text-gray-600 uppercase">Precision</th>
                      <th className="px-4 py-2.5 font-semibold text-gray-600 uppercase">Recall</th>
                      <th className="px-4 py-2.5 font-semibold text-gray-600 uppercase">F1-Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {summary.classification.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-4 py-2.5 font-bold text-gray-900">{item.algorithm}</td>
                        <td className="px-4 py-2.5 font-mono text-blue-700">{(item.accuracy * 100).toFixed(1)}%</td>
                        <td className="px-4 py-2.5 font-mono text-teal-700">{(item.precision * 100).toFixed(1)}%</td>
                        <td className="px-4 py-2.5 font-mono text-amber-700">{(item.recall * 100).toFixed(1)}%</td>
                        <td className="px-4 py-2.5 font-mono text-purple-700 font-bold">{(item.f1_score * 100).toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Section 2: Clustering Models */}
          {summary.clustering && (summary.clustering.kmeans || summary.clustering.dbscan) && (
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-teal-50 text-teal-600 rounded-lg">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">2. Unsupervised Clustering Models</h3>
                  <p className="text-xs text-gray-500">Partition vs Density-Based Spatial Separation</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {summary.clustering.kmeans && (
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-xs space-y-2">
                    <span className="font-bold text-gray-900 text-sm">K-Means Partitioning</span>
                    <div className="flex justify-between text-gray-600">
                      <span>Number of Clusters (k):</span>
                      <span className="font-bold text-gray-900">{summary.clustering.kmeans.n_clusters}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Silhouette Coefficient:</span>
                      <span className="font-bold text-blue-700 font-mono">
                        {summary.clustering.kmeans.silhouette.toFixed(3)}
                      </span>
                    </div>
                  </div>
                )}

                {summary.clustering.dbscan && (
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-xs space-y-2">
                    <span className="font-bold text-gray-900 text-sm">DBSCAN Density-Based</span>
                    <div className="flex justify-between text-gray-600">
                      <span>Clusters Discovered:</span>
                      <span className="font-bold text-gray-900">{summary.clustering.dbscan.n_clusters}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Noise Percentage:</span>
                      <span className="font-bold text-amber-700 font-mono">
                        {summary.clustering.dbscan.noise_pct.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Section 3: Prediction Models */}
          {summary.prediction && summary.prediction.length > 0 && (
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">3. Continuous Prediction Regressors</h3>
                  <p className="text-xs text-gray-500">Random Forest Regressor vs Linear Regression Fit</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2.5 font-semibold text-gray-600 uppercase">Algorithm</th>
                      <th className="px-4 py-2.5 font-semibold text-gray-600 uppercase">MAE</th>
                      <th className="px-4 py-2.5 font-semibold text-gray-600 uppercase">RMSE</th>
                      <th className="px-4 py-2.5 font-semibold text-gray-600 uppercase">R² Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {summary.prediction.map((p, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-4 py-2.5 font-bold text-gray-900">{p.algorithm}</td>
                        <td className="px-4 py-2.5 font-mono text-gray-800">{p.mae.toFixed(2)}</td>
                        <td className="px-4 py-2.5 font-mono text-gray-800">{p.rmse.toFixed(2)}</td>
                        <td className="px-4 py-2.5 font-mono text-blue-700 font-bold">{(p.r2 * 100).toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Section 4 & 5: Association & Outlier Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {summary.association && (
              <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-3">
                <div className="flex items-center space-x-2">
                  <GitBranch className="w-4 h-4 text-purple-600" />
                  <h3 className="text-sm font-bold text-gray-900">4. Association Rule Statistics</h3>
                </div>
                <div className="space-y-2 text-xs text-gray-700">
                  <div className="flex justify-between py-1 border-b border-gray-100">
                    <span>Rules Discovered:</span>
                    <span className="font-bold text-gray-900">{summary.association.rules_count}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-100">
                    <span>Average Support:</span>
                    <span className="font-mono">{(summary.association.avg_support * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-100">
                    <span>Average Confidence:</span>
                    <span className="font-mono text-teal-700">{(summary.association.avg_confidence * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span>Average Lift:</span>
                    <span className="font-mono font-bold text-blue-700">{summary.association.avg_lift.toFixed(2)}x</span>
                  </div>
                </div>
              </div>
            )}

            {summary.outliers && summary.outliers.length > 0 && (
              <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-3">
                <div className="flex items-center space-x-2">
                  <ShieldAlert className="w-4 h-4 text-red-600" />
                  <h3 className="text-sm font-bold text-gray-900">5. Outlier Detection Method Summary</h3>
                </div>
                <div className="space-y-2 text-xs text-gray-700">
                  {summary.outliers.map((out, idx) => (
                    <div key={idx} className="flex justify-between py-1 border-b border-gray-100 last:border-b-0">
                      <span className="font-medium text-gray-800">{out.method}:</span>
                      <span className="font-mono text-red-600 font-semibold">
                        {out.anomaly_count} flagged ({out.anomaly_pct.toFixed(1)}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelEvaluation;
