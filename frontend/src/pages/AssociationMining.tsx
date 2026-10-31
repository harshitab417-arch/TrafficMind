import React, { useState } from 'react';
import {
  GitBranch,
  Play,
  RotateCcw,
  Sparkles,
  Info,
  Loader2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';
import { useDataset } from '../hooks/useDataset';
import { runAssociationMining } from '../services/api';
import { AssociationMiningResponse, AssociationRule } from '../types/api';
import AlgorithmExplainer from '../components/AlgorithmExplainer';
import DataTable, { Column } from '../components/DataTable';
import KpiCard from '../components/KpiCard';

export const AssociationMining: React.FC = () => {
  const { activeDataset } = useDataset();

  // Controls
  const [minSupport, setMinSupport] = useState<number>(0.1);
  const [minConfidence, setMinConfidence] = useState<number>(0.5);
  const [minLift, setMinLift] = useState<number>(1.0);

  // Response
  const [results, setResults] = useState<AssociationMiningResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleRunMining = async () => {
    if (!activeDataset) return;
    setLoading(true);
    setError(null);
    try {
      const response = await runAssociationMining(activeDataset.id, {
        min_support: minSupport,
        min_confidence: minConfidence,
        min_lift: minLift,
      });
      setResults(response);
    } catch (err: any) {
      setError(err?.message || 'Association rule mining execution failed');
    } finally {
      setLoading(false);
    }
  };

  const getInterpretationText = (rule: AssociationRule): string => {
    if (rule.interpretation) return rule.interpretation;
    const ant = rule.antecedents.join(' AND ');
    const con = rule.consequents.join(' AND ');
    return `When ${ant} occurs, ${con} is observed ${(rule.confidence * 100).toFixed(0)}% of the time (${rule.lift.toFixed(2)}x more likely than random baseline).`;
  };

  const columns: Column<AssociationRule>[] = [
    {
      key: 'antecedents',
      label: 'Antecedents (IF)',
      render: (val: string[]) => (
        <div className="flex flex-wrap gap-1">
          {val.map((item, i) => (
            <span
              key={i}
              className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded font-medium text-[11px] border border-slate-200"
            >
              {item}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: 'arrow',
      label: '',
      render: () => <ArrowRight className="w-3.5 h-3.5 text-gray-400" />,
    },
    {
      key: 'consequents',
      label: 'Consequents (THEN)',
      render: (val: string[]) => (
        <div className="flex flex-wrap gap-1">
          {val.map((item, i) => (
            <span
              key={i}
              className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded font-medium text-[11px] border border-blue-200"
            >
              {item}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: 'support',
      label: 'Support',
      sortable: true,
      render: (val: number) => (
        <span className="font-mono text-xs font-semibold text-gray-700">
          {(val * 100).toFixed(1)}%
        </span>
      ),
    },
    {
      key: 'confidence',
      label: 'Confidence',
      sortable: true,
      render: (val: number) => (
        <span className="font-mono text-xs font-semibold text-teal-700">
          {(val * 100).toFixed(1)}%
        </span>
      ),
    },
    {
      key: 'lift',
      label: 'Lift',
      sortable: true,
      render: (val: number) => {
        let badge = 'bg-gray-100 text-gray-800';
        if (val > 2.0) badge = 'bg-red-50 text-red-700 border-red-200';
        else if (val > 1.2) badge = 'bg-amber-50 text-amber-700 border-amber-200';
        return (
          <span className={`px-2 py-0.5 font-mono text-xs font-bold rounded border ${badge}`}>
            {val.toFixed(2)}x
          </span>
        );
      },
    },
    {
      key: 'interpretation',
      label: 'Human Interpretation',
      render: (_, row: AssociationRule) => (
        <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
          {getInterpretationText(row)}
        </p>
      ),
    },
  ];

  // Top 10 rules for chart
  const top10Rules = (results?.rules || [])
    .slice()
    .sort((a, b) => b.lift - a.lift)
    .slice(0, 10)
    .map((r, i) => ({
      name: `Rule ${i + 1}`,
      ruleLabel: `${r.antecedents.join(', ')} → ${r.consequents.join(', ')}`,
      lift: Number(r.lift.toFixed(2)),
      confidence: Number((r.confidence * 100).toFixed(1)),
      support: Number((r.support * 100).toFixed(1)),
    }));

  if (!activeDataset) {
    return (
      <div className="bg-white p-8 rounded-xl border border-gray-200 text-center text-sm text-gray-500">
        Please activate a dataset in Data Management to run Association Rule Mining.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Association Rule Mining (Apriori)</h1>
        <p className="text-xs text-gray-500 mt-1">
          Uncover co-occurrence dependencies between weather, time periods, road classes, and high congestion states.
        </p>
      </div>

      {/* Algorithm Explainer */}
      <AlgorithmExplainer
        title="Apriori Association Rule Mining"
        purpose="The Apriori algorithm mines frequent itemsets and association rules (X -> Y) from discretized traffic transactions. It helps discover hidden causal or co-occurring traffic states, such as 'Rain + Friday Evening -> High Congestion'."
        inputs={['Discretized traffic volume states (Low, Medium, High)', 'Weather condition categories', 'Peak rush period indicators', 'Road geometry & classification']}
        parameters={{
          'Min Support': 'Fraction of total transactions that must contain both antecedent and consequent.',
          'Min Confidence': 'Conditional probability P(Consequent | Antecedent). How often the rule is true.',
          'Min Lift': 'Ratio of observed confidence to expected confidence if independent (> 1.0 means positive correlation).',
        }}
        interpretation="Rules with high lift (> 1.5) indicate strong real-world interdependencies. Antecedents represent precursory conditions that can inform intelligent traffic signal timing and proactive dispatch."
        metrics={{
          'Support = freq(X, Y) / N': 'Popularity/frequency of the pattern across historical observations.',
          'Confidence = freq(X, Y) / freq(X)': 'Reliability of rule prediction.',
          'Lift = Conf(X -> Y) / Supp(Y)': 'Strength of association compared to random coincidence.',
        }}
        defaultOpen={false}
      />

      {/* Mining Parameters Control Panel */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
        <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
          Mining Threshold Configuration
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2">
          {/* Min Support Slider */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-gray-700">Minimum Support</label>
              <span className="font-mono text-xs font-bold text-blue-600">
                {(minSupport * 100).toFixed(0)}% ({minSupport})
              </span>
            </div>
            <input
              type="range"
              min="0.01"
              max="0.5"
              step="0.01"
              value={minSupport}
              onChange={(e) => setMinSupport(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <span className="text-[10px] text-gray-400 mt-1 block">
              Frequency threshold in dataset (0.01 - 0.50)
            </span>
          </div>

          {/* Min Confidence Slider */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-gray-700">Minimum Confidence</label>
              <span className="font-mono text-xs font-bold text-blue-600">
                {(minConfidence * 100).toFixed(0)}% ({minConfidence})
              </span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={minConfidence}
              onChange={(e) => setMinConfidence(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <span className="text-[10px] text-gray-400 mt-1 block">
              Rule accuracy threshold (0.10 - 1.00)
            </span>
          </div>

          {/* Min Lift Input */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-gray-700">Minimum Lift</label>
              <span className="font-mono text-xs font-bold text-blue-600">{minLift}x</span>
            </div>
            <input
              type="number"
              min="0.5"
              max="10.0"
              step="0.1"
              value={minLift}
              onChange={(e) => setMinLift(parseFloat(e.target.value) || 1.0)}
              className="w-full text-xs bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-1.5 font-medium"
            />
            <span className="text-[10px] text-gray-400 mt-1 block">
              Lift ratio over independent probability (&gt; 1.0 recommended)
            </span>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-3 border-t border-gray-100 flex justify-end">
          <button
            type="button"
            onClick={handleRunMining}
            disabled={loading}
            className="inline-flex items-center px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold text-xs rounded-xl shadow-sm transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Mining Frequent Itemsets & Rules...
              </>
            ) : (
              <>
                <GitBranch className="w-4 h-4 mr-2" />
                Mine Association Rules
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
      {results && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <KpiCard
              title="Transactions Analyzed"
              value={results.total_transactions.toLocaleString()}
              subtitle="Discrete time snapshots"
              icon={<GitBranch className="w-5 h-5" />}
              color="blue"
            />
            <KpiCard
              title="Frequent Itemsets"
              value={(results.frequent_itemsets_count ?? results.frequent_itemsets?.length ?? 0).toLocaleString()}
              subtitle="Above support threshold"
              icon={<Sparkles className="w-5 h-5" />}
              color="teal"
            />
            <KpiCard
              title="Rules Generated"
              value={(results.rules_count ?? results.rules?.length ?? 0).toLocaleString()}
              subtitle="Passing confidence & lift"
              icon={<Info className="w-5 h-5" />}
              color={(results.rules_count ?? results.rules?.length ?? 0) > 0 ? 'green' : 'amber'}
            />
          </div>

          {results.rules.length === 0 ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-8 text-center text-xs text-amber-800">
              <Info className="w-6 h-6 mx-auto mb-2 text-amber-600" />
              <p className="font-bold text-sm">No Association Rules Found</p>
              <p className="mt-1 max-w-md mx-auto text-amber-700">
                The current thresholds (Support: {(minSupport * 100).toFixed(0)}%, Confidence: {(minConfidence * 100).toFixed(0)}%, Lift: {minLift}) were too restrictive. Try lowering Minimum Support to 0.05 or Confidence to 0.3.
              </p>
            </div>
          ) : (
            <>
              {/* Top 10 Rules Chart */}
              <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                <div className="mb-4">
                  <h3 className="text-sm font-bold text-gray-900">Top 10 Association Rules by Lift Strength</h3>
                  <p className="text-xs text-gray-500">
                    Bar height depicts Lift multiplier; color shade depicts Rule Confidence
                  </p>
                </div>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={top10Rules} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#64748b' }} unit="x" />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const d = payload[0].payload;
                            return (
                              <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-md text-xs">
                                <p className="font-bold text-gray-900">{d.name}</p>
                                <p className="text-gray-600 my-1">{d.ruleLabel}</p>
                                <p className="text-blue-600 font-semibold">Lift: {d.lift}x</p>
                                <p className="text-teal-600">Confidence: {d.confidence}%</p>
                                <p className="text-gray-500">Support: {d.support}%</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="lift" fill="#2563eb" radius={[4, 4, 0, 0]}>
                        {top10Rules.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.confidence > 70 ? '#2563eb' : entry.confidence > 50 ? '#3b82f6' : '#93c5fd'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Rules DataTable */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                  <h3 className="text-sm font-bold text-gray-900">Mined Decision Association Rules</h3>
                  <span className="text-xs text-gray-500">Sorted by Lift & Confidence</span>
                </div>
                <DataTable
                  columns={columns}
                  data={results.rules}
                  loading={loading}
                  perPage={10}
                />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default AssociationMining;
