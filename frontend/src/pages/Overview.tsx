import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  Gauge,
  TrendingUp,
  AlertTriangle,
  MapPin,
  Lightbulb,
  Clock,
  ArrowRight,
  Database,
  Loader2,
  AlertCircle,
  RefreshCw,
  Filter,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { useDataset } from '../hooks/useDataset';
import { getOverviewKPIs, getOverviewCharts, getOverviewInsights } from '../services/api';
import { OverviewKPIs, OverviewCharts, OverviewInsights } from '../types/api';
import KpiCard from '../components/KpiCard';
import StatusBadge from '../components/StatusBadge';

const COLORS = ['#22c55e', '#f59e0b', '#ef4444', '#2563eb', '#8b5cf6'];

export const Overview: React.FC = () => {
  const { activeDataset, isLoading: datasetLoading } = useDataset();
  const [kpis, setKpis] = useState<OverviewKPIs | null>(null);
  const [charts, setCharts] = useState<OverviewCharts | null>(null);
  const [insights, setInsights] = useState<OverviewInsights | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string>('');

  const fetchOverviewData = async (datasetId: string, location?: string) => {
    setLoading(true);
    setError(null);
    try {
      const loc = location && location !== '' ? location : undefined;
      const [kpiRes, chartsRes, insightsRes] = await Promise.all([
        getOverviewKPIs(datasetId, loc),
        getOverviewCharts(datasetId, loc),
        getOverviewInsights(datasetId, loc),
      ]);
      setKpis(kpiRes);
      setCharts(chartsRes);
      setInsights(insightsRes);
    } catch (err: any) {
      setError(err?.message || 'Failed to load traffic overview data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeDataset?.id) {
      fetchOverviewData(activeDataset.id, selectedLocation);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDataset?.id, selectedLocation]);

  if (datasetLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px]">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
        <p className="text-sm text-gray-500">Checking active datasets...</p>
      </div>
    );
  }

  if (!activeDataset) {
    return (
      <div className="max-w-xl mx-auto my-16 bg-white border border-gray-200 rounded-2xl p-8 text-center shadow-sm">
        <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Database className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">No Active Dataset Loaded</h2>
        <p className="text-sm text-gray-600 mb-6 leading-relaxed">
          TrafficMind needs an active urban traffic dataset to compute key metrics, run mining algorithms, and generate charts.
        </p>
        <Link
          to="/data"
          className="inline-flex items-center px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-xl shadow-sm transition-colors"
        >
          <span>Go to Data Management</span>
          <ArrowRight className="w-4 h-4 ml-2" />
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Traffic Executive Overview</h1>
          <p className="text-xs text-gray-500 mt-1">
            Real-time urban telemetry metrics and exploratory indicators for{' '}
            <span className="font-semibold text-gray-800">{activeDataset.name}</span>
            {selectedLocation && selectedLocation !== '' && (
              <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-semibold text-[11px]">
                {selectedLocation}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Location Filter Dropdown */}
          {kpis?.available_locations && kpis.available_locations.length > 0 && (
            <div className="relative">
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                disabled={loading}
                className="pl-3 pr-8 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-2xs hover:bg-gray-50 disabled:opacity-50 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Locations</option>
                {kpis.available_locations.map((loc) => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          )}
          <button
            onClick={() => activeDataset && fetchOverviewData(activeDataset.id, selectedLocation)}
            disabled={loading}
            className="inline-flex items-center px-3 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg shadow-2xs hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh Metrics
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start text-xs text-red-700">
          <AlertCircle className="w-4 h-4 mr-2 mt-0.5 text-red-500 flex-shrink-0" />
          <div className="flex-1">
            <span className="font-semibold">Failed to fetch overview:</span> {error}
          </div>
          <button
            onClick={() => fetchOverviewData(activeDataset.id)}
            className="text-xs font-semibold underline ml-3"
          >
            Retry
          </button>
        </div>
      )}

      {/* Row of 5 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard
          title="Total Records"
          value={kpis?.total_records != null ? kpis.total_records.toLocaleString() : '-'}
          subtitle="Observations analyzed"
          icon={<Database className="w-5 h-5" />}
          color="blue"
        />
        <KpiCard
          title="Average Speed"
          value={kpis?.avg_speed != null ? `${kpis.avg_speed.toFixed(1)} km/h` : '-'}
          subtitle="Network wide speed"
          icon={<Gauge className="w-5 h-5" />}
          color="teal"
          trend={kpis?.trends?.speed}
        />
        <KpiCard
          title="Peak Volume"
          value={kpis?.peak_traffic_volume != null ? `${kpis.peak_traffic_volume.toLocaleString()}` : (kpis?.avg_volume != null ? `${kpis.avg_volume.toLocaleString()}` : '-')}
          subtitle="Max vehicles / hr"
          icon={<TrendingUp className="w-5 h-5" />}
          color="amber"
          trend={kpis?.trends?.volume}
        />
        <KpiCard
          title="High Congestion"
          value={kpis?.high_congestion_pct != null ? `${kpis.high_congestion_pct.toFixed(1)}%` : '-'}
          subtitle="Ratio of critical bottlenecks"
          icon={<AlertTriangle className="w-5 h-5" />}
          color="red"
          trend={kpis?.trends?.congestion}
        />
        <KpiCard
          title="Monitored Locations"
          value={kpis?.active_locations != null ? kpis.active_locations.toLocaleString() : (kpis?.anomaly_count != null ? `${kpis.anomaly_count} Anomalies` : '-')}
          subtitle="Sensors & Intersections"
          icon={<MapPin className="w-5 h-5" />}
          color="green"
        />
      </div>

      {/* Charts Grid 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Traffic Volume Over Time */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-gray-800">Traffic Volume Over Time</h3>
            <p className="text-xs text-gray-500">Historical trend of vehicle density across time periods</p>
          </div>
          <div className="h-64 w-full">
            {charts?.volume_over_time && charts.volume_over_time.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={charts.volume_over_time} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                  />
                  <Line type="monotone" dataKey="volume" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 2 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-gray-400">
                {loading ? 'Loading timeline...' : 'No timeline data'}
              </div>
            )}
          </div>
        </div>

        {/* Congestion Distribution (Donut Chart) */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-gray-800">Congestion Severity Distribution</h3>
            <p className="text-xs text-gray-500">Proportion of Low, Medium, and High traffic states</p>
          </div>
          <div className="h-64 w-full flex items-center justify-center">
            {charts?.congestion_distribution && charts.congestion_distribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts.congestion_distribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {charts.congestion_distribution.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          entry.color ||
                          (entry.name.toLowerCase().includes('low')
                            ? '#22c55e'
                            : entry.name.toLowerCase().includes('med')
                            ? '#f59e0b'
                            : '#ef4444')
                        }
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                  />
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-gray-400">
                {loading ? 'Computing distribution...' : 'No distribution data'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Charts Grid 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Average Speed by Location (Horizontal Bar Chart) */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-gray-800">Average Speed by Location</h3>
            <p className="text-xs text-gray-500">Flow performance across top monitored road segments (km/h)</p>
          </div>
          <div className="h-64 w-full">
            {charts?.speed_by_location && charts.speed_by_location.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={charts.speed_by_location}
                  margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} unit=" km/h" />
                  <YAxis type="category" dataKey="location" tick={{ fontSize: 11, fill: '#64748b' }} width={90} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                  />
                  <Bar dataKey="speed" fill="#0d9488" radius={[0, 4, 4, 0]} name="Speed (km/h)" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-gray-400">
                {loading ? 'Loading location speeds...' : 'No location data'}
              </div>
            )}
          </div>
        </div>

        {/* Hourly Traffic Distribution (AreaChart) */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-gray-800">Hourly Traffic Volume Rhythm</h3>
            <p className="text-xs text-gray-500">Average vehicle traffic volume across 24 hours</p>
          </div>
          <div className="h-64 w-full">
            {charts?.hourly_distribution && charts.hourly_distribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={charts.hourly_distribution} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="hourColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.7} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="hour" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                  />
                  <Area type="monotone" dataKey="volume" stroke="#8b5cf6" fillOpacity={1} fill="url(#hourColor)" name="Avg Volume" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-gray-400">
                {loading ? 'Calculating diurnal profile...' : 'No hourly data'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Charts Grid 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Congestion by Day of Week */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-gray-800">Congestion by Day of Week</h3>
            <p className="text-xs text-gray-500">Congestion count distribution between weekdays and weekends</p>
          </div>
          <div className="h-64 w-full">
            {charts?.congestion_by_day && charts.congestion_by_day.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.congestion_by_day} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="low" name="Low" fill="#22c55e" stackId="a" />
                  <Bar dataKey="medium" name="Medium" fill="#f59e0b" stackId="a" />
                  <Bar dataKey="high" name="High" fill="#ef4444" stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-gray-400">
                {loading ? 'Analyzing weekly breakdown...' : 'No weekly day data'}
              </div>
            )}
          </div>
        </div>

        {/* Weather vs Congestion */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-gray-800">Weather Condition vs Congestion</h3>
            <p className="text-xs text-gray-500">Impact of adverse atmospheric conditions on traffic states</p>
          </div>
          <div className="h-64 w-full">
            {charts?.weather_congestion && charts.weather_congestion.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.weather_congestion} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="weather" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="high" name="High Congestion" fill="#ef4444" />
                  <Bar dataKey="medium" name="Medium" fill="#f59e0b" />
                  <Bar dataKey="low" name="Low" fill="#22c55e" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-gray-400">
                {loading ? 'Aggregating weather patterns...' : 'No weather condition data'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lists Section: Most Congested Locations & Peak Hours */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Most Congested Locations */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-red-500" />
              <h3 className="text-sm font-bold text-gray-900">Top Bottleneck Corridors</h3>
            </div>
            <span className="text-[11px] text-gray-500 font-medium">Ranked by congestion rate</span>
          </div>

          <div className="space-y-3">
            {insights?.most_congested_locations && insights.most_congested_locations.length > 0 ? (
              insights.most_congested_locations.map((loc, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100 hover:bg-gray-100/70 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <span className="w-6 h-6 rounded-full bg-red-100 text-red-700 font-bold text-xs flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="text-xs font-semibold text-gray-900">{loc.location}</p>
                      <p className="text-[10px] text-gray-500">Avg Flow: {loc.avg_speed.toFixed(1)} km/h</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-red-600">
                      {(loc.congestion_rate * 100).toFixed(1)}%
                    </span>
                    <span className="block text-[10px] text-gray-400">Congestion Rate</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-400 text-center py-4">No hotspot data available</p>
            )}
          </div>
        </div>

        {/* Peak Hours List */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-bold text-gray-900">Peak Traffic Rush Hours</h3>
            </div>
            <span className="text-[11px] text-gray-500 font-medium">Highest average volume</span>
          </div>

          <div className="space-y-3">
            {insights?.peak_traffic_hours && insights.peak_traffic_hours.length > 0 ? (
              insights.peak_traffic_hours.map((peak, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100 hover:bg-gray-100/70 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 font-bold text-xs flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="text-xs font-semibold text-gray-900">{peak.hour}</p>
                      <p className="text-[10px] text-gray-500">Commute Window</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-amber-700">
                      {peak.avg_volume.toLocaleString()} veh/h
                    </span>
                    <span className="block text-[10px] text-gray-400">Volume</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-400 text-center py-4">No peak hour data available</p>
            )}
          </div>
        </div>
      </div>

      {/* Traffic Insights Section */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center space-x-2 mb-4">
          <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
            <Lightbulb className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">Automated Data Mining Insights</h3>
            <p className="text-xs text-gray-500">Heuristic traffic findings and descriptive findings</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {(Array.isArray(insights) ? insights : insights?.insights || []).length > 0 ? (
            (Array.isArray(insights) ? insights : insights?.insights || []).map((insight: string, idx: number) => (
              <div
                key={idx}
                className="p-3.5 rounded-lg border border-blue-100 bg-blue-50/40 text-xs text-blue-950 flex items-start space-x-2.5 leading-relaxed"
              >
                <Lightbulb className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <span>{insight}</span>
              </div>
            ))
          ) : (
            <p className="text-xs text-gray-400 py-2 col-span-3">No automated insights available yet.</p>
          )}
        </div>
      </div>

      {/* Recent Traffic Anomalies Table */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <h3 className="text-sm font-bold text-gray-900">Recent Traffic Anomalies</h3>
          </div>
          <Link
            to="/outliers"
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center"
          >
            <span>Investigate in Outlier Module</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2.5 font-semibold text-gray-600 uppercase tracking-wider">Timestamp</th>
                <th className="px-4 py-2.5 font-semibold text-gray-600 uppercase tracking-wider">Location</th>
                <th className="px-4 py-2.5 font-semibold text-gray-600 uppercase tracking-wider">Observed Volume</th>
                <th className="px-4 py-2.5 font-semibold text-gray-600 uppercase tracking-wider">Observed Speed</th>
                <th className="px-4 py-2.5 font-semibold text-gray-600 uppercase tracking-wider">Anomaly Severity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {insights?.recent_anomalies && insights.recent_anomalies.length > 0 ? (
                insights.recent_anomalies.map((anom) => (
                  <tr key={anom.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-mono text-gray-700">{anom.timestamp}</td>
                    <td className="px-4 py-2.5 font-medium text-gray-900">{anom.location}</td>
                    <td className="px-4 py-2.5 text-gray-700">{anom.volume} veh/h</td>
                    <td className="px-4 py-2.5 text-gray-700">{anom.speed} km/h</td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={anom.severity} size="sm" />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                    No recent traffic anomalies detected.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Overview;
