import React, { useState, useEffect } from 'react';
import {
  BarChart2,
  Play,
  RotateCcw,
  Layers,
  Calendar,
  MapPin,
  CloudRain,
  Sliders,
  Loader2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import { useDataset } from '../hooks/useDataset';
import { runOLAPQuery, getExplorerFilters } from '../services/api';
import { OLAPQueryRequest, OLAPQueryResponse, ExplorerFilters } from '../types/api';
import AlgorithmExplainer from '../components/AlgorithmExplainer';
import DataTable, { Column } from '../components/DataTable';

export const OlapAnalytics: React.FC = () => {
  const { activeDataset } = useDataset();

  // Query states
  const [operation, setOperation] = useState<'rollup' | 'drilldown' | 'slice' | 'dice'>('rollup');
  const [dimension, setDimension] = useState<string>('time');
  const [measure, setMeasure] = useState<string>('traffic_volume');
  const [timeGrain, setTimeGrain] = useState<'hourly' | 'daily' | 'weekly' | 'monthly'>('daily');
  const [sliceFilterField, setSliceFilterField] = useState<string>('location');
  const [sliceFilterValue, setSliceFilterValue] = useState<string>('');
  const [diceFilterField2, setDiceFilterField2] = useState<string>('weather');
  const [diceFilterValue2, setDiceFilterValue2] = useState<string>('');
  const [filterOptions, setFilterOptions] = useState<ExplorerFilters | null>(null);

  // Results state
  const [result, setResult] = useState<OLAPQueryResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Load available values for Slice & Dice dropdowns
  useEffect(() => {
    if (!activeDataset) return;
    const loadFilters = async () => {
      try {
        const filters = await getExplorerFilters(activeDataset.id);
        setFilterOptions(filters);
      } catch (err) {
        console.warn('Could not load filters for OLAP', err);
      }
    };
    loadFilters();
  }, [activeDataset?.id]);

  const getFieldOptions = (field: string): string[] => {
    if (field === 'location') return filterOptions?.locations || ['Downtown Central', 'Highway 101 North', 'Airport Road', 'Main St & 1st Ave'];
    if (field === 'weather') return filterOptions?.weathers || filterOptions?.weather_conditions || ['Clear', 'Cloudy', 'Rainy', 'Foggy', 'Stormy'];
    if (field === 'road_type') return ['Arterial', 'Highway', 'Collector', 'Local'];
    if (field === 'congestion_level') return ['Low', 'Medium', 'High'];
    return [];
  };

  const handleRunQuery = async (override?: Partial<OLAPQueryRequest>) => {
    if (!activeDataset) return;
    setLoading(true);
    setError(null);

    const activeOp = override?.operation || operation;
    const activeDim = override?.dimension || dimension;
    const activeMeas = override?.measure || measure;
    const activeGrain = override?.time_grain || timeGrain;

    const filters: Record<string, any> = {};
    if (activeOp === 'slice' && sliceFilterValue) {
      filters[sliceFilterField] = sliceFilterValue;
    } else if (activeOp === 'dice') {
      if (sliceFilterValue) filters[sliceFilterField] = sliceFilterValue;
      if (diceFilterValue2) filters[diceFilterField2] = diceFilterValue2;
    }

    const payload: OLAPQueryRequest = {
      operation: activeOp,
      dimension: activeDim,
      measure: activeMeas,
      time_grain: activeDim === 'time' ? activeGrain : undefined,
      filters: Object.keys(filters).length > 0 ? filters : undefined,
    };

    try {
      const response = await runOLAPQuery(activeDataset.id, payload);
      setResult(response);
    } catch (err: any) {
      setError(err?.message || 'Failed to execute multidimensional OLAP query');
    } finally {
      setLoading(false);
    }
  };

  // Auto-run initial default query on activeDataset mount
  useEffect(() => {
    if (activeDataset?.id) {
      handleRunQuery({ operation: 'rollup', dimension: 'time', measure: 'traffic_volume', time_grain: 'daily' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDataset?.id]);

  const columns: Column<any>[] = [
    {
      key: 'dimension_value',
      label: dimension === 'time' ? `Time (${timeGrain})` : dimension.replace('_', ' ').toUpperCase(),
      sortable: true,
      render: (val) => <span className="font-semibold text-gray-900">{val}</span>,
    },
    {
      key: 'measure_value',
      label: measure.replace('_', ' ').toUpperCase(),
      sortable: true,
      render: (val) => (
        <span className="font-mono font-bold text-blue-700">
          {typeof val === 'number' ? (Number.isInteger(val) ? val.toLocaleString() : val.toFixed(2)) : val}
        </span>
      ),
    },
    {
      key: 'count',
      label: 'Sample Count',
      sortable: true,
      render: (val) => <span className="text-gray-500 font-mono text-xs">{val || '-'}</span>,
    },
  ];

  if (!activeDataset) {
    return (
      <div className="bg-white p-8 rounded-xl border border-gray-200 text-center text-sm text-gray-500">
        Please activate a dataset in Data Management to run OLAP multidimensional analytics.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">OLAP Multi-Dimensional Analytics</h1>
        <p className="text-xs text-gray-500 mt-1">
          Perform Online Analytical Processing operations (Roll-Up, Drill-Down, Slice, and Dice) on the traffic cube.
        </p>
      </div>

      {/* Algorithm Explainer */}
      <AlgorithmExplainer
        title="OLAP Cube & Multi-Dimensional Data Aggregation"
        purpose="Online Analytical Processing (OLAP) facilitates high-speed multidimensional analytical querying on large data warehouses. The traffic data is organized into a hypercube of Dimensions (Time, Location, Road Type, Weather) and Measures (Volume, Speed, Congestion Counts)."
        inputs={['Time Dimension (Hourly/Daily/Monthly)', 'Spatial Dimension (Location/Corridor)', 'Categorical Dimensions (Weather, Road Type)', 'Additive Measures (Traffic Volume, Average Speed)']}
        parameters={{
          'Roll-Up': 'Aggregates data by climbing up a concept hierarchy (e.g. hourly -> daily -> monthly).',
          'Drill-Down': 'Navigates from less detailed data to more detailed data (e.g. monthly -> hourly).',
          'Slice': 'Performs a selection on one dimension of the cube (e.g. location = Main St).',
          'Dice': 'Defines a sub-cube by selecting two or more dimensions simultaneously.',
        }}
        interpretation="Compare measure trends across granular time scales and spatial intersections to identify systematic network-wide congestion patterns and seasonal variance."
        metrics={{
          'Aggregate Measure': 'Sum/Average of observed vehicular flow or velocities across dimension cells.',
          'Grain': 'The finest level of granularity stored in the dimensional hierarchy.',
        }}
        defaultOpen={false}
      />

      {/* OLAP Control Panel */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-5">
        {/* Operation Selector Tabs */}
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
            1. Select OLAP Operation
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: 'rollup', label: 'Roll-Up', desc: 'Summarize hierarchy' },
              { id: 'drilldown', label: 'Drill-Down', desc: 'Detailed breakdown' },
              { id: 'slice', label: 'Slice', desc: 'Filter 1 dimension' },
              { id: 'dice', label: 'Dice', desc: 'Sub-cube filter' },
            ].map((op) => (
              <button
                key={op.id}
                type="button"
                onClick={() => setOperation(op.id as any)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  operation === op.id
                    ? 'border-blue-600 bg-blue-50/50 text-blue-900 shadow-2xs font-semibold'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700 bg-white'
                }`}
              >
                <div className="text-xs font-bold">{op.label}</div>
                <div className="text-[10px] text-gray-500 mt-0.5">{op.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Dimension & Measure Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-gray-100">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Target Dimension</label>
            <select
              value={dimension}
              onChange={(e) => setDimension(e.target.value)}
              className="w-full text-xs bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-800 font-medium focus:ring-2 focus:ring-blue-500"
            >
              <option value="time">Time Hierarchy</option>
              <option value="location">Location / Intersection</option>
              <option value="road_type">Road Classification</option>
              <option value="weather">Weather Condition</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Target Measure</label>
            <select
              value={measure}
              onChange={(e) => setMeasure(e.target.value)}
              className="w-full text-xs bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-800 font-medium focus:ring-2 focus:ring-blue-500"
            >
              <option value="traffic_volume">Traffic Volume (Sum / Average)</option>
              <option value="average_speed">Average Speed (Mean Velocity)</option>
              <option value="congestion_count">Congestion Incident Count</option>
            </select>
          </div>

          {dimension === 'time' && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Time Granularity (Roll-Up / Drill-Down)
              </label>
              <select
                value={timeGrain}
                onChange={(e) => setTimeGrain(e.target.value as any)}
                className="w-full text-xs bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-gray-800 font-medium focus:ring-2 focus:ring-blue-500"
              >
                <option value="hourly">Hourly Grain (Drill-Down)</option>
                <option value="daily">Daily Grain</option>
                <option value="weekly">Weekly Grain (Roll-Up)</option>
                <option value="monthly">Monthly Grain (Roll-Up)</option>
              </select>
            </div>
          )}
        </div>

        {/* Slice / Dice Filter Inputs */}
        {(operation === 'slice' || operation === 'dice') && (
          <div className="pt-2 border-t border-gray-100 bg-slate-50/70 p-3.5 rounded-xl border border-gray-200">
            <span className="text-xs font-bold text-gray-800 uppercase tracking-wider block mb-2">
              Dimensional Slicing Constraints
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">Slice Dimension 1</label>
                <div className="flex space-x-2">
                  <select
                    value={sliceFilterField}
                    onChange={(e) => {
                      setSliceFilterField(e.target.value);
                      setSliceFilterValue('');
                    }}
                    className="w-1/2 text-xs bg-white border border-gray-300 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="location">Location</option>
                    <option value="weather">Weather</option>
                    <option value="road_type">Road Type</option>
                    <option value="congestion_level">Congestion Level</option>
                  </select>
                  <select
                    value={sliceFilterValue}
                    onChange={(e) => setSliceFilterValue(e.target.value)}
                    className="w-1/2 text-xs bg-white border border-gray-300 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-blue-500 font-medium"
                  >
                    <option value="">Select Value...</option>
                    {getFieldOptions(sliceFilterField).map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {operation === 'dice' && (
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">Dice Dimension 2</label>
                  <div className="flex space-x-2">
                    <select
                      value={diceFilterField2}
                      onChange={(e) => {
                        setDiceFilterField2(e.target.value);
                        setDiceFilterValue2('');
                      }}
                      className="w-1/2 text-xs bg-white border border-gray-300 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="weather">Weather</option>
                      <option value="road_type">Road Type</option>
                      <option value="location">Location</option>
                      <option value="congestion_level">Congestion Level</option>
                    </select>
                    <select
                      value={diceFilterValue2}
                      onChange={(e) => setDiceFilterValue2(e.target.value)}
                      className="w-1/2 text-xs bg-white border border-gray-300 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-blue-500 font-medium"
                    >
                      <option value="">Select Value...</option>
                      {getFieldOptions(diceFilterField2).map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Run Query Button */}
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={() => handleRunQuery()}
            disabled={loading}
            className="inline-flex items-center px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold text-xs rounded-xl shadow-sm transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Aggregating OLAP Cube...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2 fill-current" />
                Run Multidimensional Query
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

      {/* Query Results */}
      {result && (
        <div className="space-y-6">
          {/* Summary Banner */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
            <div className="text-xs text-blue-900 font-medium">
              <span className="font-bold">Summary:</span> {result.summary || `Showing ${measure} aggregated by ${dimension}`}
            </div>
            <span className="text-[11px] font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
              {(Array.isArray(result) ? result : result.data || []).length} Aggregated Cells
            </span>
          </div>

          {/* Visualization Chart */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-gray-900">Aggregated Measure Profile</h3>
              <p className="text-xs text-gray-500">Distribution across dimensional coordinates</p>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                {dimension === 'time' ? (
                  <LineChart data={Array.isArray(result) ? result : result.data || []} margin={{ top: 10, right: 20, left: 10, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis
                      dataKey="dimension_value"
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      angle={-25}
                      textAnchor="end"
                      height={40}
                      minTickGap={25}
                      tickFormatter={(val: string) => (val && val.length > 10 ? val.slice(5) : val)}
                    />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                    <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                    <Line
                      type="monotone"
                      dataKey="measure_value"
                      stroke="#2563eb"
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                      name={measure.replace('_', ' ')}
                    />
                  </LineChart>
                ) : (
                  <BarChart data={Array.isArray(result) ? result : result.data || []} margin={{ top: 10, right: 20, left: 10, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis
                      dataKey="dimension_value"
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      angle={-25}
                      textAnchor="end"
                      height={40}
                      minTickGap={20}
                    />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                    <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                    <Bar
                      dataKey="measure_value"
                      fill="#0d9488"
                      radius={[4, 4, 0, 0]}
                      name={measure.replace('_', ' ')}
                    />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          {/* Results Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-sm font-bold text-gray-900">Tabular OLAP Data Matrix</h3>
            </div>
            <DataTable
              columns={columns}
              data={Array.isArray(result) ? result : result.data || []}
              loading={loading}
              perPage={10}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default OlapAnalytics;
