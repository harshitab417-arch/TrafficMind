import React, { useState } from 'react';
import {
  AlertTriangle,
  Play,
  RotateCcw,
  Sparkles,
  Info,
  Loader2,
  AlertCircle,
  ShieldAlert,
  BarChart2,
  CheckCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  Legend,
} from 'recharts';
import { useDataset } from '../hooks/useDataset';
import { runOutlierDetection } from '../services/api';
import { OutlierDetectionResponse, AnomalyItem } from '../types/api';
import AlgorithmExplainer from '../components/AlgorithmExplainer';
import DataTable, { Column } from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import KpiCard from '../components/KpiCard';

export const OutlierDetection: React.FC = () => {
  const { activeDataset } = useDataset();

  // Controls
  const [method, setMethod] = useState<'z_score' | 'lof' | 'isolation_forest' | 'all'>('isolation_forest');
  const candidateFeatures = ['traffic_volume', 'average_speed', 'occupancy'];
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>(['traffic_volume', 'average_speed']);
  const [zThreshold, setZThreshold] = useState<number>(3.0);
  const [lofNeighbors, setLofNeighbors] = useState<number>(20);
  const [contamination, setContamination] = useState<number>(0.05);

  // Results
  const [result, setResult] = useState<OutlierDetectionResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const toggleFeature = (feat: string) => {
    if (selectedFeatures.includes(feat)) {
      if (selectedFeatures.length > 1) setSelectedFeatures(selectedFeatures.filter((f) => f !== feat));
    } else {
      setSelectedFeatures([...selectedFeatures, feat]);
    }
  };

  const handleRunDetection = async () => {
    if (!activeDataset) return;
    setLoading(true);
    setError(null);
    try {
      const response = await runOutlierDetection(activeDataset.id, {
        method,
        features: selectedFeatures,
        z_threshold: zThreshold,
        lof_neighbors: lofNeighbors,
        contamination: contamination,
      });
      setResult(response);
    } catch (err: any) {
      setError(err?.message || 'Anomaly detection failed');
    } finally {
      setLoading(false);
    }
  };

  const anomalyColumns: Column<AnomalyItem>[] = [
    {
      key: 'timestamp',
      label: 'Date & Time',
      render: (val, row) => (
        <span className="font-mono text-xs">{val || `${row.date || ''} ${row.time || ''}`.trim() || '-'}</span>
      ),
    },
    {
      key: 'location',
      label: 'Location / Sensor',
      render: (val) => <span className="font-semibold text-gray-900">{val || 'Sensor Node'}</span>,
    },
    {
      key: 'volume',
      label: 'Volume (veh/h)',
      render: (val) => <span className="font-mono text-gray-800">{Number(val).toLocaleString()}</span>,
    },
    {
      key: 'speed',
      label: 'Speed (km/h)',
      render: (val) => <span className="font-mono text-gray-800">{Number(val).toFixed(1)}</span>,
    },
    {
      key: 'score',
      label: 'Anomaly Score',
      render: (val) => (
        <span className="font-mono text-xs font-bold text-red-600">
          {typeof val === 'number' ? val.toFixed(3) : val}
        </span>
      ),
    },
    {
      key: 'severity',
      label: 'Severity',
      render: (val) => <StatusBadge status={val || 'High'} size="sm" />,
    },
  ];

  if (!activeDataset) {
    return (
      <div className="bg-white p-8 rounded-xl border border-gray-200 text-center text-sm text-gray-500">
        Please activate a dataset in Data Management to detect Traffic Anomalies.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Traffic Outlier & Anomaly Detection</h1>
        <p className="text-xs text-gray-500 mt-1">
          Detect statistical anomalies, sensor malfunctions, sudden bottlenecks, and irregular events across the network.
        </p>
      </div>

      {/* Explainer */}
      <AlgorithmExplainer
        title="Anomaly Detection Algorithms: Z-Score, LOF, and Isolation Forest"
        purpose="Outlier detection detects rare observations that deviate substantially from typical vehicular flow patterns. In urban intelligence, anomalies highlight sensor dropouts, severe accidents, construction blockages, or unannounced emergency closures."
        inputs={['Traffic Volume (veh/h)', 'Average Speed (km/h)', 'Sensor Occupancy %']}
        parameters={{
          'Z-Score (Standard Score)': 'Measures deviations from Gaussian mean in units of standard deviation: |z| = |x - μ| / σ > threshold (e.g. 3.0).',
          'Local Outlier Factor (LOF)': 'Measures local density of points relative to their k-nearest neighbors. Isolates points in sparse neighborhoods.',
          'Isolation Forest (iForest)': 'Tree-based ensemble that isolates anomalous observations via random partitioning. Anomalies require fewer recursive cuts.',
        }}
        interpretation="Anomalous records flagged with high severity represent observations with extreme z-deviations or short isolation tree path lengths. Prioritize inspecting records with near-zero speeds paired with sudden volume halts."
        metrics={{
          'Contamination Rate': 'Expected baseline proportion of anomalous records within the dataset (typically 2% to 10%).',
          'Anomaly Score': 'Numerical magnitude indicating how abnormal the instance appears according to the chosen algorithm.',
        }}
        defaultOpen={false}
      />

      {/* Controls Panel */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
        {/* Method Selector Tabs */}
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
            1. Select Detection Methodology
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: 'isolation_forest', label: 'Isolation Forest', desc: 'Ensemble partition' },
              { id: 'lof', label: 'Local Outlier Factor', desc: 'Density-based kNN' },
              { id: 'z_score', label: 'Z-Score Analysis', desc: 'Parametric Gaussian' },
              { id: 'all', label: '★ Compare All 3', desc: 'Cross-method consensus' },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMethod(m.id as any)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  method === m.id
                    ? 'border-blue-600 bg-blue-50/70 text-blue-900 font-bold shadow-2xs'
                    : 'border-gray-200 text-gray-700 bg-white hover:bg-gray-50'
                }`}
              >
                <div className="text-xs">{m.label}</div>
                <div className="text-[10px] text-gray-500 mt-0.5">{m.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Feature Select & Parameter Sliders */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">
              Telemetry Features Evaluated
            </label>
            <div className="flex flex-wrap gap-2">
              {candidateFeatures.map((feat) => {
                const isSelected = selectedFeatures.includes(feat);
                return (
                  <button
                    key={feat}
                    type="button"
                    onClick={() => toggleFeature(feat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 font-bold'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {isSelected ? '✓ ' : '+ '}
                    {feat.replace('_', ' ')}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Conditional parameters */}
          <div>
            {method === 'z_score' && (
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-gray-700">Z-Score Cutoff Threshold</label>
                  <span className="font-mono text-xs font-bold text-blue-600">{zThreshold} σ</span>
                </div>
                <input
                  type="range"
                  min="1.5"
                  max="5.0"
                  step="0.1"
                  value={zThreshold}
                  onChange={(e) => setZThreshold(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <span className="text-[10px] text-gray-400 mt-1 block">Points exceeding |z| &gt; {zThreshold} flagged as outliers</span>
              </div>
            )}

            {method === 'lof' && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">LOF k-Neighbors</label>
                <input
                  type="number"
                  min="5"
                  max="100"
                  step="5"
                  value={lofNeighbors}
                  onChange={(e) => setLofNeighbors(parseInt(e.target.value, 10) || 20)}
                  className="w-full text-xs bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-1.5 font-medium"
                />
                <span className="text-[10px] text-gray-400 mt-1 block">Number of local neighbors to contrast density</span>
              </div>
            )}

            {(method === 'isolation_forest' || method === 'all') && (
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-gray-700">Assumed Contamination Rate</label>
                  <span className="font-mono text-xs font-bold text-blue-600">
                    {(contamination * 100).toFixed(0)}% ({contamination})
                  </span>
                </div>
                <input
                  type="range"
                  min="0.01"
                  max="0.2"
                  step="0.01"
                  value={contamination}
                  onChange={(e) => setContamination(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <span className="text-[10px] text-gray-400 mt-1 block">Expected proportion of anomalous events (0.01 - 0.20)</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-3 border-t border-gray-100 flex justify-end">
          <button
            type="button"
            onClick={handleRunDetection}
            disabled={loading}
            className="inline-flex items-center px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold text-xs rounded-xl shadow-sm transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Scanning Network for Anomalies...
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 mr-2" />
                Detect Outliers
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

      {/* Results View */}
      {result && (
        <div className="space-y-6">
          {/* Summary Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <KpiCard
              title="Anomalies Flagged"
              value={(result.anomaly_count ?? (result as any).total_outliers ?? 0).toLocaleString()}
              subtitle={`Out of ${(result.total_evaluated ?? 4000).toLocaleString()} observations`}
              icon={<ShieldAlert className="w-5 h-5" />}
              color="red"
            />
            <KpiCard
              title="Anomaly Ratio"
              value={`${(result.anomaly_percentage ?? (result as any).outlier_pct ?? 0).toFixed(2)}%`}
              subtitle="Network contamination"
              icon={<AlertTriangle className="w-5 h-5" />}
              color="amber"
            />
            <KpiCard
              title="Algorithm Applied"
              value={(result.method || method).toUpperCase()}
              subtitle="Telemetry verification"
              icon={<CheckCircle className="w-5 h-5" />}
              color="blue"
            />
          </div>

          {/* Scatter Plot Highlighting Normal (Blue) vs Anomalies (Red) */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-gray-900">Normal vs Outlier Distribution Scatter</h3>
              <p className="text-xs text-gray-500">
                Blue points indicate typical operational flow; red points indicate detected anomalous events.
              </p>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    type="number"
                    dataKey="x"
                    name={selectedFeatures[0]}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                  />
                  <YAxis
                    type="number"
                    dataKey="y"
                    name={selectedFeatures[1] || selectedFeatures[0]}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                  />
                  <Scatter name="Observations" data={result.scatter_points || []}>
                    {(result.scatter_points || []).map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.is_anomaly ? '#ef4444' : '#3b82f6'}
                        opacity={entry.is_anomaly ? 0.9 : 0.4}
                      />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Method Comparison Bar Chart if 'All Methods' was chosen */}
          {result.method_comparison && result.method_comparison.length > 0 && (
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <div className="mb-4">
                <h3 className="text-sm font-bold text-gray-900">Method Comparison: Anomaly Counts</h3>
                <p className="text-xs text-gray-500">
                  Contrast detection sensitivity between Z-Score, LOF, and Isolation Forest
                </p>
              </div>

              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={result.method_comparison} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="method" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                    <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                    <Bar dataKey="count" fill="#ef4444" radius={[4, 4, 0, 0]} name="Anomalies Flagged" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Anomalies Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Detected Anomaly Events Log</h3>
                <p className="text-xs text-gray-500">Prioritized by statistical deviation severity</p>
              </div>
            </div>

            <DataTable
              columns={anomalyColumns}
              data={result.anomalies || (result as any).outliers || []}
              perPage={10}
              emptyMessage="No anomalies found meeting the configured parameters."
            />
          </div>

          {/* Notice Note */}
          <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900 leading-relaxed">
            <strong>Domain Notice:</strong> Detected outliers represent unusual statistical observations requiring further operational verification. They do not necessarily imply motor vehicle collisions or roadway structural damage.
          </div>
        </div>
      )}
    </div>
  );
};

export default OutlierDetection;
