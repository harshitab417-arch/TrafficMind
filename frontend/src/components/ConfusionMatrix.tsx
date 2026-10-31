import React from 'react';

export interface ConfusionMatrixProps {
  labels: string[];
  matrix: number[][];
  title?: string;
}

export const ConfusionMatrix: React.FC<ConfusionMatrixProps> = ({
  labels,
  matrix,
  title = 'Confusion Matrix',
}) => {
  if (!matrix || matrix.length === 0 || !labels || labels.length === 0) {
    return (
      <div className="bg-white p-6 rounded-xl border border-gray-200 text-center text-gray-500 text-sm">
        No confusion matrix data available.
      </div>
    );
  }

  // Find max value in matrix for relative color scale
  let maxVal = 0;
  let totalSum = 0;
  for (let r = 0; r < matrix.length; r++) {
    for (let c = 0; c < (matrix[r]?.length || 0); c++) {
      const val = matrix[r][c] || 0;
      if (val > maxVal) maxVal = val;
      totalSum += val;
    }
  }

  return (
    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-gray-800">{title}</h4>
        <span className="text-xs text-gray-500">Total samples: {totalSum}</span>
      </div>

      <div className="overflow-x-auto flex flex-col items-center">
        {/* Top Header: Predicted Label indicator */}
        <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
          Predicted Class
        </div>

        <div className="flex items-center">
          {/* Left Header: Actual Label indicator */}
          <div className="mr-3 -rotate-90 text-xs font-semibold uppercase tracking-wider text-gray-500 whitespace-nowrap">
            Actual Class
          </div>

          <div>
            {/* Column labels */}
            <div className="flex ml-20 mb-1">
              {labels.map((lbl, idx) => (
                <div
                  key={`col-lbl-${idx}`}
                  className="w-20 text-center text-xs font-semibold text-gray-600 truncate px-1"
                  title={lbl}
                >
                  {lbl}
                </div>
              ))}
            </div>

            {/* Matrix rows */}
            {matrix.map((row, rIdx) => {
              const actualLabel = labels[rIdx] || `Class ${rIdx}`;
              return (
                <div key={`row-${rIdx}`} className="flex items-center mb-1">
                  {/* Row Label (Actual) */}
                  <div className="w-20 text-right pr-3 text-xs font-semibold text-gray-600 truncate" title={actualLabel}>
                    {actualLabel}
                  </div>

                  {/* Row Cells */}
                  <div className="flex space-x-1">
                    {row.map((val, cIdx) => {
                      const isDiagonal = rIdx === cIdx;
                      const intensity = maxVal > 0 ? (val / maxVal) : 0;
                      // Determine background color
                      let bgColor = 'bg-gray-50';
                      let textColor = 'text-gray-700';

                      if (isDiagonal) {
                        // True Positives
                        if (intensity > 0.6) {
                          bgColor = 'bg-blue-600';
                          textColor = 'text-white';
                        } else if (intensity > 0.3) {
                          bgColor = 'bg-blue-400';
                          textColor = 'text-white';
                        } else if (intensity > 0) {
                          bgColor = 'bg-blue-100';
                          textColor = 'text-blue-900';
                        }
                      } else {
                        // Off-diagonal errors
                        if (intensity > 0.5) {
                          bgColor = 'bg-red-400';
                          textColor = 'text-white';
                        } else if (intensity > 0.2) {
                          bgColor = 'bg-red-200';
                          textColor = 'text-red-900';
                        } else if (intensity > 0) {
                          bgColor = 'bg-red-50';
                          textColor = 'text-red-800';
                        }
                      }

                      const pct = totalSum > 0 ? ((val / totalSum) * 100).toFixed(1) : '0';

                      return (
                        <div
                          key={`cell-${rIdx}-${cIdx}`}
                          className={`w-20 h-16 rounded flex flex-col items-center justify-center border border-gray-200 transition-colors ${bgColor}`}
                          title={`Actual: ${actualLabel}, Predicted: ${labels[cIdx] || cIdx}: ${val} (${pct}%)`}
                        >
                          <span className={`text-sm font-bold ${textColor}`}>{val}</span>
                          <span className={`text-[10px] ${textColor} opacity-80`}>{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 flex items-center justify-center space-x-6 text-xs text-gray-500">
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 bg-blue-500 rounded"></span>
            <span>Correctly Classified (Diagonal)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 bg-red-200 border border-red-300 rounded"></span>
            <span>Misclassified (Errors)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfusionMatrix;
