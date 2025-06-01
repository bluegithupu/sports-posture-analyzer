import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';

interface AnalysisReportProps {
  report: string;
}

export const AnalysisReport: React.FC<AnalysisReportProps> = ({ report }) => {
  const [copySuccess, setCopySuccess] = useState<boolean>(false);

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

      {/* Report content with Markdown rendering */}
      <div className="prose prose-invert prose-sm sm:prose-base max-w-none p-4">
        <ReactMarkdown
          components={{
            // 自定义组件样式以匹配深色主题
            h1: ({ ...props }) => <h1 className="text-slate-100 text-xl font-bold mb-4" {...props} />,
            h2: ({ ...props }) => <h2 className="text-slate-200 text-lg font-semibold mb-3" {...props} />,
            h3: ({ ...props }) => <h3 className="text-slate-200 text-base font-medium mb-2" {...props} />,
            p: ({ ...props }) => <p className="text-slate-300 mb-3 leading-relaxed" {...props} />,
            strong: ({ ...props }) => <strong className="text-slate-100 font-semibold" {...props} />,
            em: ({ ...props }) => <em className="text-slate-200 italic" {...props} />,
            ul: ({ ...props }) => <ul className="text-slate-300 mb-3 pl-6 list-disc" {...props} />,
            ol: ({ ...props }) => <ol className="text-slate-300 mb-3 pl-6 list-decimal" {...props} />,
            li: ({ ...props }) => <li className="mb-1" {...props} />,
            blockquote: ({ ...props }) => <blockquote className="border-l-4 border-blue-400 pl-4 text-slate-300 italic" {...props} />,
            code: ({ ...props }) => <code className="bg-slate-700 text-blue-300 px-1 py-0.5 rounded text-sm" {...props} />,
            hr: ({ ...props }) => <hr className="border-slate-600 my-4" {...props} />
          }}
        >
          {report}
        </ReactMarkdown>
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
