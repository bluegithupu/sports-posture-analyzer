import React, { useState } from 'react';

interface AnalysisReportProps {
  report: string;
}

export const AnalysisReport: React.FC<AnalysisReportProps> = ({ report }) => {
  const [copySuccess, setCopySuccess] = useState<boolean>(false);

  // Split the report into paragraphs for better readability if there are double newlines
  // Or just display as pre-formatted text
  const paragraphs = report.split(/\n\s*\n/); // Splits by one or more empty lines

  const handleCopyToClipboard = async () => {
    // Format the report as markdown
    const markdownContent = `# 运动姿态分析报告

${report}

---
*报告生成时间：${new Date().toLocaleString('zh-CN')}*
*由运动姿态分析大师生成*`;

    try {
      await navigator.clipboard.writeText(markdownContent);
      setCopySuccess(true);

      // Reset success message after 2 seconds
      setTimeout(() => {
        setCopySuccess(false);
      }, 2000);
    } catch (err) {
      console.error('复制到剪贴板失败:', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = markdownContent;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopySuccess(true);
        setTimeout(() => {
          setCopySuccess(false);
        }, 2000);
      } catch (fallbackErr) {
        console.error('备用复制方法也失败了:', fallbackErr);
      }
      document.body.removeChild(textArea);
    }
  };

  return (
    <div className="bg-slate-800 rounded-lg shadow-lg overflow-hidden">
      {/* Header with copy button */}
      <div className="flex justify-between items-center p-4 bg-slate-700 border-b border-slate-600">
        <h3 className="text-lg font-semibold text-slate-100 flex items-center">
          <i className="fas fa-file-medical-alt mr-2 text-blue-400"></i>
          分析报告
        </h3>
        <button
          onClick={handleCopyToClipboard}
          className={`flex items-center px-4 py-2 rounded-md transition-all duration-200 ${copySuccess
            ? 'bg-green-600 text-white'
            : 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-md'
            }`}
          disabled={copySuccess}
        >
          {copySuccess ? (
            <>
              <i className="fas fa-check mr-2"></i>
              已复制
            </>
          ) : (
            <>
              <i className="fas fa-copy mr-2"></i>
              复制结果
            </>
          )}
        </button>
      </div>

      {/* Report content */}
      <div className="prose prose-invert prose-sm sm:prose-base max-w-none p-4">
        {paragraphs.map((paragraph, index) => (
          <p key={index} className="whitespace-pre-wrap mb-3 last:mb-0 text-slate-300">
            {paragraph}
          </p>
        ))}
      </div>

      {/* Copy success notification */}
      {copySuccess && (
        <div className="px-4 pb-4">
          <div className="bg-green-600 text-white px-3 py-2 rounded-md text-sm flex items-center">
            <i className="fas fa-check-circle mr-2"></i>
            分析结果已复制到剪贴板（Markdown格式）
          </div>
        </div>
      )}
    </div>
  );
};
