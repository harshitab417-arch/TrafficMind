import React, { useState } from 'react';
import {
  Tag,
  Play,
  RotateCcw,
  Award,
  Layers,
  Sliders,
  Loader2,
  AlertCircle,
  HelpCircle,
  CheckCircle,
  BarChart3,
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
import { trainClassifier, trainAllClassifiers } from '../services/api';
import { ClassifierResult, TrainAllClassifiersResponse } from '../types/api';
import AlgorithmExplainer from '../components/AlgorithmExplainer';
import ConfusionMatrix from '../components/ConfusionMatrix';
import DataTable, { Column } from '../components/DataTable';
import KpiCard from '../components/KpiCard';

export const CongestionClassification: React.FC = () => {
  const { activeDataset } = useDataset();

  // Features & targets
  const candidateFeatures = [
    'traffic_volume',
    'average_speed',
    'hour',
    'day_of_week',
    'weather',
    'road_type',
  ];
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([
    'traffic_volume',
    'average_speed',
    'hour',
  ]);
  const [targetColumn, setTargetColumn] = useState<string>('congestion_level');
  const [testSize, setTestSize] = useState<number>(0.2);

  // Algorithm selection
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<
    'decision_tree' | 'naive_bayes' | 'knn' | 'svm' | 'all'
  >('decision_tree');

  // Algorithm specific hyperparameters
  const [maxDepth, setMaxDepth] = useState<number>(5);
  const [nNeighbors, setNNeighbors] = useState<number>(5);
  const [svmKernel, setSvmKernel] = useState<string>('rbf');

  // Execution states
  const [singleResult, setSingleResult] = useState<ClassifierResult | null>(null);
  const [allResult, setAllResult] = useState<TrainAllClassifiersResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const toggleFeature = (feat: string) => {
    if (selectedFeatures.includes(feat)) {
      if (selectedFeatures.length > 1) {
        setSelectedFeatures(selectedFeatures.filter((f) => f !== feat));
      }
    } else {
      setSelectedFeatures([...selectedFeatures, feat]);
    }
  };

  const handleTrain = async () => {
    if (!activeDataset) return;
    setLoading(true);
    setError(null);

    try {
      if (selectedAlgorithm === 'all') {
        const response = await trainAllClassifiers(activeDataset.id, {
          features: selectedFeatures,
          target: targetColumn,
          test_size: testSize,
        });
        setAllResult(response);
        setSingleResult(null);
      } else {
        const params: Record<string, any> = {};
        if (selectedAlgorithm === 'decision_tree') params.max_depth = maxDepth;
        if (selectedAlgorithm === 'knn') params.n_neighbors = nNeighbors;
        if (selectedAlgorithm === 'svm') params.kernel = svmKernel;

        const response = await trainClassifier(activeDataset.id, {
          algorithm: selectedAlgorithm,
          features: selectedFeatures,
          target: targetColumn,
          test_size: testSize,
          params,
        });
        setSingleResult(response);
        setAllResult(null);
      }
    } catch (err: any) {
      setError(err?.message || 'Model training pipeline failed');
    } finally {
      setLoading(false);
    }
  };

  const formatAlgoName = (slug: string): string => {
    switch (slug) {
      case 'decision_tree':
        return 'Decision Tree';
      case 'naive_bayes':
        return 'Gaussian Naive Bayes';
      case 'knn':
        return 'K-Nearest Neighbors (KNN)';
      case 'svm':
        return 'Support Vector Machine (SVM)';
      default:
        return slug;
    }
  };

  // Classification report table rows
  const reportRows = singleResult?.classification_report
    ? Object.entries(singleResult.classification_report)
        .filter(([key]) => key !== 'accuracy')
        .map(([className, metrics]) => ({
          className,
          precision: (metrics.precision * 100).toFixed(1) + '%',
          recall: (metrics.recall * 100).toFixed(1) + '%',
          f1: (metrics['f1-score'] * 100).toFixed(1) + '%',
          support: metrics.support,
        }))
    : [];

  const reportColumns: Column<any>[] = [
    {
      key: 'className',
      label: 'Class Label',
      render: (val) => <span className="font-semibold text-gray-900">{val}</span>,
    },
    { key: 'precision', label: 'Precision' },
    { key: 'recall', label: 'Recall' },
    { key: 'f1', label: 'F1-Score' },
    { key: 'support', label: 'Sample Support' },
  ];

  if (!activeDataset) {
    return (
      <div className="bg-white p-8 rounded-xl border border-gray-200 text-center text-sm text-gray-500">
        Please activate a dataset in Data Management to train Congestion Classifiers.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Congestion Severity Classification</h1>
        <p className="text-xs text-gray-500 mt-1">
          Supervised machine learning algorithms (Decision Tree, Naive Bayes, KNN, SVM) to predict traffic states.
        </p>
      </div>

      {/* Explainer */}
      <AlgorithmExplainer
        title="Supervised Classification Suite"
        purpose="Classification models learn mappings from road state inputs (volume, speed, time, weather) to categorical congestion levels (Low, Medium, High). This enables automated bottleneck prediction and traffic control decision support."
        inputs={['Vehicle Volume', 'Average Speed', 'Hour of Day', 'Day of Week', 'Weather Condition']}
        parameters={{
          'Decision Tree': 'Splits features by Gini impurity / Information Gain. Parameter: max_depth limits overfitting.',
          'Naive Bayes': 'Probabilistic Bayes theorem with Gaussian feature likelihood assumption. Rapid, probabilistic baseline.',
          'K-Nearest Neighbors (KNN)': 'Instance-based majority voting among k nearest Euclidean neighbors.',
          'Support Vector Machine (SVM)': 'Finds optimal separating hyperplanes using linear or non-linear kernel transformations (RBF).',
        }}
        interpretation="Compare Precision (exactness - minimizing false alarms) against Recall (completeness - catching all congestions). High F1-score balances both for asymmetric traffic datasets."
        metrics={{
          'Accuracy': 'Total correct predictions divided by all evaluated test instances.',
          'F1-Score': 'Harmonic mean of Precision and Recall. Essential for imbalanced traffic classes.',
          'Confusion Matrix': 'Grid comparing true ground-truth labels against model predictions.',
        }}
        defaultOpen={false}
      />

      {/* Controls Container */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
        {/* Algorithm Tabs */}
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
            1. Select Algorithm or Benchmark All
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {[
              { id: 'decision_tree', label: 'Decision Tree' },
              { id: 'naive_bayes', label: 'Naive Bayes' },
              { id: 'knn', label: 'KNN' },
              { id: 'svm', label: 'SVM' },
              { id: 'all', label: '★ Compare All 4' },
            ].map((algo) => (
              <button
                key={algo.id}
                type="button"
                onClick={() => setSelectedAlgorithm(algo.id as any)}
                className={`py-2 px-3 rounded-lg border text-xs font-semibold transition-all ${
                  selectedAlgorithm === algo.id
                    ? 'border-blue-600 bg-blue-50 text-blue-800'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {algo.label}
              </button>
            ))}
          </div>
        </div>

        {/* Feature Multi-Select & Target */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">
              Select Input Features
            </label>
            <div className="flex flex-wrap gap-1.5">
              {candidateFeatures.map((feat) => {
                const isSelected = selectedFeatures.includes(feat);
                return (
                  <button
                    key={feat}
                    type="button"
                    onClick={() => toggleFeature(feat)}
                    className={`px-2.5 py-1 text-xs rounded-md border font-medium transition-colors ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 font-bold'
                        : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    {isSelected ? '✓ ' : '+ '}
                    {feat.replace('_', ' ')}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-gray-700">Train/Test Split (Test Size)</label>
              <span className="font-mono text-xs font-bold text-blue-600">
                {(testSize * 100).toFixed(0)}% Test / {(100 - testSize * 100).toFixed(0)}% Train
              </span>
            </div>
            <input
              type="range"
              min="0.1"
              max="0.4"
              step="0.05"
              value={testSize}
              onChange={(e) => setTestSize(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <span className="text-[10px] text-gray-400 mt-1 block">
              Proportion of dataset withheld for unbiased validation
            </span>
          </div>
        </div>

        {/* Hyperparameter Inputs based on selected algorithm */}
        {selectedAlgorithm !== 'all' && (
          <div className="pt-2 border-t border-gray-100 flex flex-wrap items-center gap-4 text-xs">
            {selectedAlgorithm === 'decision_tree' && (
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-gray-700">Max Depth:</span>
                <input
                  type="number"
                  min="2"
                  max="20"
                  value={maxDepth}
                  onChange={(e) => setMaxDepth(parseInt(e.target.value, 10) || 5)}
                  className="w-20 px-2 py-1 bg-gray-50 border border-gray-300 rounded font-mono"
                />
              </div>
            )}

            {selectedAlgorithm === 'knn' && (
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-gray-700">N-Neighbors (k):</span>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={nNeighbors}
                  onChange={(e) => setNNeighbors(parseInt(e.target.value, 10) || 5)}
                  className="w-20 px-2 py-1 bg-gray-50 border border-gray-300 rounded font-mono"
                />
              </div>
            )}

            {selectedAlgorithm === 'svm' && (
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-gray-700">Kernel:</span>
                <select
                  value={svmKernel}
                  onChange={(e) => setSvmKernel(e.target.value)}
                  className="px-2 py-1 bg-gray-50 border border-gray-300 rounded font-mono text-xs"
                >
                  <option value="rbf">RBF (Radial Basis Function)</option>
                  <option value="linear">Linear</option>
                  <option value="poly">Polynomial</option>
                </select>
              </div>
            )}
          </div>
        )}

        {/* Submit */}
        <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
          <span className="text-[11px] text-gray-500">
            Target variable: <span className="font-mono font-semibold text-gray-700">congestion_level</span>
          </span>
          <button
            type="button"
            onClick={handleTrain}
            disabled={loading}
            className="inline-flex items-center px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold text-xs rounded-xl shadow-sm transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Training Classifier Pipeline...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2 fill-current" />
                {selectedAlgorithm === 'all' ? 'Train All 4 Classifiers' : `Train ${formatAlgoName(selectedAlgorithm)}`}
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center text-xs text-red-700">
          <AlertCircle className="w-4 h-4 mr-2 text-red-500 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Auto-derived Target Info Banner */}
      {(singleResult?.target_derived || allResult?.target_derived) && (
        <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start space-x-2">
          <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <p className="leading-relaxed">
            <span className="font-bold">Derived Congestion Ground Truth:</span> Congestion labels were derived using domain speed/volume heuristics: High (volume &ge; 120 AND speed &le; 25, OR volume &ge; 150), Medium (volume &ge; 80 AND speed &le; 45), Low (all others).
          </p>
        </div>
      )}

      {/* Single Classifier Results */}
      {singleResult && (
        <div className="space-y-6">
          {/* KPI Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <KpiCard
              title="Test Accuracy"
              value={`${(singleResult.accuracy * 100).toFixed(1)}%`}
              subtitle="Overall correct rate"
              icon={<Award className="w-5 h-5" />}
              color="blue"
            />
            <KpiCard
              title="Precision (Macro)"
              value={`${(singleResult.precision * 100).toFixed(1)}%`}
              subtitle="Low false alarms"
              icon={<CheckCircle className="w-5 h-5" />}
              color="teal"
            />
            <KpiCard
              title="Recall (Macro)"
              value={`${(singleResult.recall * 100).toFixed(1)}%`}
              subtitle="Sensitivity to bottlenecks"
              icon={<Tag className="w-5 h-5" />}
              color="amber"
            />
            <KpiCard
              title="F1-Score (Macro)"
              value={`${(singleResult.f1_score * 100).toFixed(1)}%`}
              subtitle="Harmonic balance"
              icon={<BarChart3 className="w-5 h-5" />}
              color="green"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Confusion Matrix */}
            <ConfusionMatrix
              title={`${formatAlgoName(singleResult.algorithm)} Confusion Matrix`}
              labels={singleResult.confusion_matrix.labels}
              matrix={singleResult.confusion_matrix.matrix}
            />

            {/* Classification Report */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col justify-between">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-sm font-bold text-gray-900">Per-Class Performance Metrics</h3>
                <p className="text-xs text-gray-500">Breakdown for Low, Medium, and High traffic states</p>
              </div>
              <DataTable
                columns={reportColumns}
                data={reportRows}
                perPage={10}
              />
            </div>
          </div>
        </div>
      )}

      {/* Comparison View when "All" was trained */}
      {allResult && (
        <div className="space-y-6">
          {/* Bar Chart comparing 4 algorithms */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-gray-900">Algorithm Performance Comparison</h3>
              <p className="text-xs text-gray-500">
                Side-by-side benchmark across Decision Tree, Naive Bayes, KNN, and SVM
              </p>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={allResult.comparison.map((item) => ({
                    algorithm: formatAlgoName(item.algorithm),
                    Accuracy: Number(((item.accuracy ?? 0) * 100).toFixed(1)),
                    F1: Number((((item as any).f1_score ?? (item as any).f1 ?? 0) * 100).toFixed(1)),
                    Precision: Number(((item.precision ?? 0) * 100).toFixed(1)),
                    Recall: Number(((item.recall ?? 0) * 100).toFixed(1)),
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
          </div>

          {/* Comparison Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-sm font-bold text-gray-900">Benchmark Leaderboard</h3>
            </div>
            <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-3 font-semibold text-gray-600 uppercase">Algorithm</th>
                  <th className="px-5 py-3 font-semibold text-gray-600 uppercase">Accuracy</th>
                  <th className="px-5 py-3 font-semibold text-gray-600 uppercase">Precision</th>
                  <th className="px-5 py-3 font-semibold text-gray-600 uppercase">Recall</th>
                  <th className="px-5 py-3 font-semibold text-gray-600 uppercase">F1-Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {allResult.comparison.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="px-5 py-3.5 font-bold text-gray-900">{formatAlgoName(item.algorithm)}</td>
                    <td className="px-5 py-3.5 font-mono text-blue-700 font-semibold">
                      {(((item.accuracy ?? 0)) * 100).toFixed(1)}%
                    </td>
                    <td className="px-5 py-3.5 font-mono text-teal-700">
                      {(((item.precision ?? 0)) * 100).toFixed(1)}%
                    </td>
                    <td className="px-5 py-3.5 font-mono text-amber-700">
                      {(((item.recall ?? 0)) * 100).toFixed(1)}%
                    </td>
                    <td className="px-5 py-3.5 font-mono text-purple-700 font-bold">
                      {((((item as any).f1_score ?? (item as any).f1 ?? 0)) * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default CongestionClassification;
