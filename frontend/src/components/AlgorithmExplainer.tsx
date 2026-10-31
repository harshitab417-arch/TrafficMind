import React, { useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp, Layers, Sliders, Eye, Award, HelpCircle } from 'lucide-react';

export interface AlgorithmExplainerProps {
  title: string;
  purpose: string;
  inputs?: string[] | string;
  parameters?: Record<string, string | number | boolean> | string[];
  interpretation?: string;
  metrics?: Record<string, string> | string[];
  defaultOpen?: boolean;
}

export const AlgorithmExplainer: React.FC<AlgorithmExplainerProps> = ({
  title,
  purpose,
  inputs,
  parameters,
  interpretation,
  metrics,
  defaultOpen = false,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(defaultOpen);

  return (
    <div className="bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-white rounded-xl border border-blue-200/80 mb-6 shadow-sm overflow-hidden transition-all duration-200">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-blue-100/30 transition-colors"
      >
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-sm">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-bold text-gray-900">{title}</h3>
              <span className="text-[10px] uppercase font-semibold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                Theory & Methodology
              </span>
            </div>
            <p className="text-xs text-gray-600 line-clamp-1 mt-0.5">{purpose}</p>
          </div>
        </div>

        <div className="flex items-center text-xs text-blue-700 font-medium space-x-1 pr-2">
          <span>{isOpen ? 'Hide Explainer' : 'Learn Algorithm Details'}</span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {isOpen && (
        <div className="px-5 pb-5 pt-2 border-t border-blue-100 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-700">
          {/* Purpose & Concept */}
          <div className="p-3.5 bg-white/80 rounded-lg border border-blue-100/60 shadow-xs">
            <div className="flex items-center space-x-1.5 font-semibold text-gray-900 mb-1.5">
              <HelpCircle className="w-4 h-4 text-blue-600" />
              <span>Core Purpose & Theory</span>
            </div>
            <p className="text-gray-600 leading-relaxed">{purpose}</p>
          </div>

          {/* Inputs & Features */}
          {inputs && (
            <div className="p-3.5 bg-white/80 rounded-lg border border-blue-100/60 shadow-xs">
              <div className="flex items-center space-x-1.5 font-semibold text-gray-900 mb-1.5">
                <Layers className="w-4 h-4 text-teal-600" />
                <span>Input Features Required</span>
              </div>
              {Array.isArray(inputs) ? (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {inputs.map((inp, idx) => (
                    <span
                      key={idx}
                      className="bg-teal-50 text-teal-800 border border-teal-200 px-2 py-0.5 rounded font-mono text-[11px]"
                    >
                      {inp}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600 leading-relaxed">{inputs}</p>
              )}
            </div>
          )}

          {/* Parameters */}
          {parameters && (
            <div className="p-3.5 bg-white/80 rounded-lg border border-blue-100/60 shadow-xs">
              <div className="flex items-center space-x-1.5 font-semibold text-gray-900 mb-1.5">
                <Sliders className="w-4 h-4 text-amber-600" />
                <span>Hyperparameters & Configuration</span>
              </div>
              {Array.isArray(parameters) ? (
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  {parameters.map((param, idx) => (
                    <li key={idx}>{param}</li>
                  ))}
                </ul>
              ) : (
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {Object.entries(parameters).map(([k, v]) => (
                    <div key={k} className="bg-amber-50/60 border border-amber-200/60 px-2 py-1 rounded">
                      <span className="font-medium text-amber-900">{k}:</span>{' '}
                      <span className="text-amber-800 font-mono">{String(v)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Interpretation */}
          {interpretation && (
            <div className="p-3.5 bg-white/80 rounded-lg border border-blue-100/60 shadow-xs">
              <div className="flex items-center space-x-1.5 font-semibold text-gray-900 mb-1.5">
                <Eye className="w-4 h-4 text-indigo-600" />
                <span>How to Interpret Results</span>
              </div>
              <p className="text-gray-600 leading-relaxed">{interpretation}</p>
            </div>
          )}

          {/* Metrics */}
          {metrics && (
            <div className="p-3.5 bg-white/80 rounded-lg border border-blue-100/60 shadow-xs md:col-span-2">
              <div className="flex items-center space-x-1.5 font-semibold text-gray-900 mb-1.5">
                <Award className="w-4 h-4 text-purple-600" />
                <span>Evaluation Metrics Explained</span>
              </div>
              {Array.isArray(metrics) ? (
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-gray-600">
                  {metrics.map((m, idx) => (
                    <li key={idx} className="bg-purple-50/50 p-2 rounded border border-purple-100">
                      {m}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Object.entries(metrics).map(([mName, mDesc]) => (
                    <div key={mName} className="p-2 bg-purple-50/50 rounded border border-purple-100">
                      <span className="font-bold text-purple-900">{mName}:</span>{' '}
                      <span className="text-purple-800">{mDesc}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AlgorithmExplainer;
