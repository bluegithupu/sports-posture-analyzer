
import React from 'react';

interface AnalysisReportProps {
  report: string;
}

export const AnalysisReport: React.FC<AnalysisReportProps> = ({ report }) => {
  // Split the report into paragraphs for better readability if there are double newlines
  // Or just display as pre-formatted text
  const paragraphs = report.split(/\n\s*\n/); // Splits by one or more empty lines

  return (
    <div className="prose prose-invert prose-sm sm:prose-base max-w-none bg-slate-800 p-4 rounded-md shadow">
      {paragraphs.map((paragraph, index) => (
        <p key={index} className="whitespace-pre-wrap mb-3 last:mb-0 text-slate-300">
          {paragraph}
        </p>
      ))}
    </div>
  );
};
    