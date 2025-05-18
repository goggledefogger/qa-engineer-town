import React from 'react';

interface OverallScoreGaugeProps {
  score: number | undefined; // Score out of 100
  categoryName?: string; // Optional: e.g., "Performance", "Accessibility"
}

const getScoreColor = (score: number | undefined): string => {
  if (score === undefined) return 'bg-slate-200 text-slate-700'; // Undefined or loading
  if (score >= 90) return 'bg-green-500 text-white'; // Good
  if (score >= 50) return 'bg-orange-400 text-white'; // Needs Improvement
  return 'bg-red-500 text-white'; // Poor
};

const OverallScoreGauge: React.FC<OverallScoreGaugeProps> = ({ score, categoryName }) => {
  const scoreDisplay = score !== undefined ? score : '--';
  const colorClasses = getScoreColor(score);

  return (
    <div className="flex flex-col items-center p-4 rounded-lg shadow-md bg-white w-48 h-40 justify-center border border-slate-200">
      {categoryName && <div className="text-sm font-medium text-slate-600 mb-2">{categoryName}</div>}
      <div
        className={`w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold ${colorClasses} transition-colors duration-300 ease-in-out`}
      >
        {scoreDisplay}
      </div>
      {score !== undefined && <div className="mt-2 text-xs text-slate-500">out of 100</div>}
    </div>
  );
};

export default OverallScoreGauge;
