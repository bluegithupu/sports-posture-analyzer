

import React, { useState, useCallback, useEffect } from 'react';
import { GoogleGenAI, GenerateContentResponse, File as GeminiFile } from '@google/genai'; // Added GeminiFile type
import { FileUpload } from './components/FileUpload';
import { VideoPlayer } from './components/VideoPlayer';
import { AnalysisReport } from './components/AnalysisReport';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ErrorMessage } from './components/ErrorMessage';
import { Header } from './components/Header';
import { Footer } from './components/Footer';

// Helper function to wait for the file to become active
async function waitForFileActive(ai: GoogleGenAI, fileName: string): Promise<GeminiFile> {
  const POLLING_INTERVAL_MS = 3000; // 3 seconds
  const MAX_POLLING_ATTEMPTS = 40; // 40 attempts * 3s = 120 seconds (2 minutes) timeout

  for (let i = 0; i < MAX_POLLING_ATTEMPTS; i++) {
    try {
      const file = await ai.files.get({ name: fileName });
      if (file.state === 'ACTIVE') {
        return file;
      }
      if (file.state === 'FAILED') {
        throw new Error(`文件处理失败: ${file.displayName || fileName}。状态: FAILED。(File processing failed: ${file.displayName || fileName}. State: FAILED.)`);
      }
      // If state is 'PROCESSING' or other non-terminal state, wait and poll again.
      if (i < MAX_POLLING_ATTEMPTS - 1) {
        await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL_MS));
      }
    } catch (err) {
      // If ai.files.get fails, retry a few times before failing.
      // This can happen due to transient network issues.
      console.warn(`Polling file state failed for ${fileName}, attempt ${i + 1}:`, err);
      if (i < MAX_POLLING_ATTEMPTS - 1) {
        await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL_MS * (i + 1))); // Exponential backoff could be better
      } else {
        throw new Error(`获取文件状态时出错: ${fileName}。错误: ${(err as Error).message || String(err)} (Error fetching file status for ${fileName}. Error: ${(err as Error).message || String(err)})`);
      }
    }
  }
  throw new Error(`等待文件激活超时: ${fileName}。文件可能仍在处理中，或处理失败。(Timeout waiting for file to become active: ${fileName}. The file might still be processing or failed.)`);
}


const App: React.FC = () => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [analysisReport, setAnalysisReport] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const apiKey = process.env.API_KEY;

  useEffect(() => {
    if (!apiKey) {
      setError('API密钥未配置。请确保API_KEY环境变量已设置。(API Key not configured. Please ensure API_KEY environment variable is set.)');
    }
  }, [apiKey]);

  const handleFileSelect = useCallback((file: File) => {
    setVideoFile(file);
    if (videoSrc) {
      URL.revokeObjectURL(videoSrc);
    }
    setVideoSrc(URL.createObjectURL(file));
    setAnalysisReport(null);
    setError(null);
  }, [videoSrc]);

  const handleAnalyzeVideo = useCallback(async () => {
    if (!videoFile) {
      setError('请先上传一个视频文件。(Please upload a video file first.)');
      return;
    }
    if (!apiKey) {
      setError('API密钥未配置。应用无法连接到分析服务。(API Key is not configured. The application cannot connect to the analysis service.)');
      return;
    }

    const MAX_VIDEO_SIZE_MB = 5000;
    const MAX_VIDEO_SIZE_BYTES = MAX_VIDEO_SIZE_MB * 1024 * 1024;

    if (videoFile.size > MAX_VIDEO_SIZE_BYTES) {
      setError(`视频文件过大 (最大 ${MAX_VIDEO_SIZE_MB}MB)。请选择一个较小的文件进行分析。(Video file is too large (max ${MAX_VIDEO_SIZE_MB}MB). Please select a smaller file for analysis.) \n注意：处理非常大的视频文件可能会导致浏览器无响应或分析失败。 (Note: Processing very large video files may cause browser unresponsiveness or analysis failure.)`);
      return;
    }

    setIsLoading(true);
    setLoadingMessage('正在上传视频文件...');
    setError(null);
    setAnalysisReport(null);
    let uploadedFileName: string | undefined = undefined;

    try {
      const ai = new GoogleGenAI({ apiKey });

      setLoadingMessage('正在上传视频文件...');
      // FIX: Removed `displayName` property as it's not a valid key for `UploadFileParameters`.
      // The API likely uses the File object's name property by default or it's not settable here.
      const uploadResult = await ai.files.upload({
        file: videoFile,
      });

      if (!uploadResult || !uploadResult.name) {
        throw new Error('视频文件上传后未返回有效的文件名。(Video file upload did not return a valid file name.)');
      }
      uploadedFileName = uploadResult.name; // Store the file name (resource name like 'files/your-file-id')

      setLoadingMessage('文件上传成功，正在等待处理完成...');
      const activeFile = await waitForFileActive(ai, uploadedFileName); // Pass the resource name

      if (!activeFile.uri || !activeFile.mimeType) {
        throw new Error('激活的文件信息不完整，缺少URI或MIME类型。(Active file information is incomplete, missing URI or MIME type.)');
      }

      setLoadingMessage('文件处理完成，正在进行姿态分析...');
      const model = 'gemini-2.5-flash-preview-04-17';
      const systemInstructionText = "你是一位顶级的运动医学专家和体态教练。";

      const userPromptText = `
附件是一个用户的运动视频。请仔细分析视频中用户的运动姿态和动作模式。
请在报告中包含以下内容：
1.  观察到的主要动态体态问题（例如，跑步时的不良着地、深蹲时的膝盖内扣、投掷时不正确的身体序列等）。请列出2-3个主要问题。
2.  详细说明每个已识别问题对运动表现、日常生活和长期健康的潜在负面影响，特别关注其在动态运动中的表现。
3.  针对每个已识别问题，提供具体、可操作的纠正建议，包括技术提示和至少1-2个推荐的动态练习或纠正性训练。
4.  对视频中整体动作流畅性、协调性和可能存在的代偿模式进行评估。
请以清晰、专业且易于理解的中文撰写此报告。
如果视频质量不足以进行详细分析，或者姿态和动作看起来相对标准，请也明确指出。
如果提供的视频不适合进行姿态分析（例如，视频模糊、非人物运动、或无法判断动作），请说明无法分析并解释原因。
请注意：视频的时长较短，请基于可见内容进行分析。
      `.trim();

      const textPart = {
        text: userPromptText
      };

      const videoPart = {
        fileData: {
          mimeType: activeFile.mimeType,
          fileUri: activeFile.uri,
        },
      };

      const response: GenerateContentResponse = await ai.models.generateContent({
        model: model,
        contents: { parts: [textPart, videoPart] },
        config: {
          systemInstruction: systemInstructionText,
        }
      });

      setAnalysisReport(response.text || '');

    } catch (err) {
      console.error('Analysis Error:', err);
      let errorMessage = '分析视频时发生错误。(An error occurred while analyzing the video.)';
      if (err instanceof Error) {
        errorMessage = err.message;
      }

      if (typeof err === 'string' && err.includes("API key not valid")) {
        errorMessage = "API密钥无效或已过期。请检查您的API密钥配置。(Invalid or expired API key. Please check your API key configuration.)";
      } else if (err instanceof Error) {
        if (err.message.includes("Quota") || err.message.includes("quota")) {
          errorMessage = "已达到API配额限制。请稍后再试或检查您的配额。(API quota limit reached. Please try again later or check your quota.)";
        } else if (err.message.toLowerCase().includes("payload") || err.message.toLowerCase().includes("request entity too large")) {
          errorMessage = `分析请求或文件上传因数据量过大失败。请尝试使用更小的视频文件。(Analysis request or file upload failed due to large payload. Please try a smaller video file.) Error: ${err.message}`;
        } else if (err.message.includes("file processing error") || err.message.includes("failed to process file") || err.message.includes("文件处理失败") || err.message.includes("等待文件激活超时")) {
          errorMessage = `视频文件处理或等待激活时出错: ${err.message}`;
        } else if (err.message.includes("500") || err.message.includes("Internal error") || (err as any)?.error?.status === "INTERNAL" || (err as any)?.error?.code === 500) {
          errorMessage = `分析服务遇到内部错误。请稍后再试。如果问题持续，请尝试使用不同的、较短的或更清晰的视频文件，或联系支持。(Analysis service encountered an internal error. Please try again later. If the problem persists, try a different, shorter, or clearer video file, or contact support.) Original error: ${err.message}`;
        } else if (err.message.includes("412") && err.message.includes("FAILED_PRECONDITION")) {
          errorMessage = `文件预处理失败或未准备好: ${err.message}。请稍后再试或尝试其他文件。(File precondition failed or not ready: ${err.message}. Please try again later or try a different file.)`;
        }
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
      // We can optionally delete the file from Gemini's servers if needed.
      // For this app, automatic cleanup after 2 days by Google is fine.
      // if (uploadedFileName) {
      //   try {
      //     const ai = new GoogleGenAI({ apiKey: apiKey! }); // Re-init or pass 'ai' instance
      //     await ai.files.delete({ name: uploadedFileName });
      //     console.log(`Successfully deleted uploaded file: ${uploadedFileName}`);
      //   } catch (deleteError) {
      //     console.error(`Failed to delete uploaded file ${uploadedFileName}:`, deleteError);
      //   }
      // }
    }
  }, [videoFile, apiKey]);

  useEffect(() => {
    return () => {
      if (videoSrc) {
        URL.revokeObjectURL(videoSrc);
      }
    };
  }, [videoSrc]);


  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-900 to-slate-800 text-slate-100 font-sans">
      <Header />

      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="bg-slate-800 shadow-2xl rounded-lg p-6 md:p-10">
          <h2 className="text-3xl font-bold mb-8 text-center text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-cyan-300">
            运动视频体态分析
          </h2>

          <div className="grid md:grid-cols-2 gap-8 items-start">
            <div className="space-y-6">
              <div className="p-6 bg-slate-700/50 rounded-lg shadow-lg">
                <h3 className="text-xl font-semibold mb-4 text-sky-300">1. 上传视频</h3>
                <FileUpload onFileSelect={handleFileSelect} />
                {videoFile && (
                  <p className="text-xs text-slate-400 mt-2">
                    已选择文件: {videoFile.name} ({(videoFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
                {videoSrc && (
                  <div className="mt-4">
                    <VideoPlayer src={videoSrc} />
                  </div>
                )}
              </div>

              {videoFile && (
                <div className="p-6 bg-slate-700/50 rounded-lg shadow-lg">
                  <h3 className="text-xl font-semibold mb-4 text-sky-300">2. 开始分析</h3>
                  <button
                    onClick={handleAnalyzeVideo}
                    disabled={isLoading || !videoFile || !apiKey}
                    className="w-full bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600 text-white font-bold py-3 px-6 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    aria-live="polite"
                    aria-label={isLoading ? "正在处理视频，请稍候" : "获取体态分析报告"}
                  >
                    {isLoading ? (
                      <>
                        <LoadingSpinner />
                        <span className="ml-2">{loadingMessage || '处理中...'}</span>
                      </>
                    ) : (
                      <>
                        <i className="fas fa-microscope mr-2" aria-hidden="true"></i>
                        <span>获取体态分析报告</span>
                      </>
                    )}
                  </button>
                  {!apiKey && !isLoading && <p className="text-red-400 text-sm mt-2">API密钥未配置，无法开始分析。</p>}
                </div>
              )}
            </div>

            <div className="space-y-6">
              {(isLoading || analysisReport || error) && (
                <div className="p-6 bg-slate-700/50 rounded-lg shadow-lg min-h-[200px] flex flex-col justify-center" role="region" aria-live="polite" aria-atomic="true" aria-labelledby="analysis-result-heading">
                  <h3 id="analysis-result-heading" className="text-xl font-semibold mb-4 text-sky-300">3. 分析结果</h3>
                  {isLoading && !analysisReport && <div className="flex justify-center items-center py-8"><LoadingSpinner /> <span className="ml-3 text-lg">{loadingMessage || '正在生成报告...'}</span></div>}
                  {error && <ErrorMessage message={error} />}
                  {analysisReport && !isLoading && <AnalysisReport report={analysisReport} />}
                </div>
              )}
              {!isLoading && !analysisReport && !error && !videoFile &&
                <div className="p-6 bg-slate-700/50 rounded-lg shadow-lg min-h-[200px] flex flex-col justify-center items-center text-slate-400">
                  <i className="fas fa-film text-4xl mb-4"></i>
                  <p>请先上传一个视频并开始分析。</p>
                  <p className="text-sm mt-1">分析结果将显示在此处。</p>
                </div>
              }
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default App;