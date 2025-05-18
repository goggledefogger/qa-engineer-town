import React from 'react';

export type PerformanceCategory = 'Good' | 'Needs Improvement' | 'Poor' | 'N/A';

interface MetricDisplayProps {
  metricName: string;
  value: number | string | undefined;
  unit?: string;
  category: PerformanceCategory;
  explanation: string;
  thresholds?: {
    good: string;
    needsImprovement: string;
    poor: string;
  };
}

const getCategoryColorClasses = (category: PerformanceCategory): string => {
  switch (category) {
    case 'Good':
      return 'bg-green-100 text-green-700 border-green-300';
    case 'Needs Improvement':
      return 'bg-orange-100 text-orange-700 border-orange-300';
    case 'Poor':
      return 'bg-red-100 text-red-700 border-red-300';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-300';
  }
};

const MetricDisplay: React.FC<MetricDisplayProps> = ({
  metricName,
  value,
  unit,
  category,
  explanation,
  thresholds,
}) => {
  const displayValue = value !== undefined ? `${value}${unit ? ` ${unit}` : ''}` : 'N/A';
  const colorClasses = getCategoryColorClasses(category);

  return (
    <div className={`p-4 rounded-lg shadow border ${colorClasses}`}>
      <h4 className="text-md font-semibold mb-1">{metricName}</h4>
      <p className={`text-2xl font-bold mb-2 ${getCategoryColorClasses(category).split(' ')[1]}`}>
        {displayValue}
      </p>
      <p className="text-xs mb-2">
        <span className={`font-semibold px-2 py-0.5 rounded-full text-xs ${colorClasses}`}>
          {category}
        </span>
      </p>
      {thresholds && (
        <div className="text-xs space-y-0.5 mb-3">
          <p><span className="font-medium">Good:</span> {thresholds.good}</p>
          <p><span className="font-medium">Needs Improvement:</span> {thresholds.needsImprovement}</p>
          <p><span className="font-medium">Poor:</span> {thresholds.poor}</p>
        </div>
      )}
      <p className="text-xs leading-relaxed">{explanation}</p>
    </div>
  );
};

export default MetricDisplay;
