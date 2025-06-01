import React, { useState, useCallback, useEffect, useRef } from 'react';
// Remove direct Gemini SDK imports
// import { GoogleGenAI, GenerateContentResponse, File as GeminiFile } from '@google/genai';
import { FileUpload } from './components/FileUpload';
import { VideoPlayer } from './components/VideoPlayer';
import { AnalysisReport } from './components/AnalysisReport';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ErrorMessage } from './components/ErrorMessage';
import { Header } from './components/Header';
import { Footer } from './components/Footer';

// Define a base URL for the backend API.
// For Vercel, VITE_API_BASE_URL will be set in Environment Variables.
// For local dev, it falls back to localhost.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5002/api';

// Helper function to wait for the file to become active - REMOVED as backend handles this
// async function waitForFileActive(ai: GoogleGenAI, fileName: string): Promise<GeminiFile> { ... }

const App: React.FC = () => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [analysisReport, setAnalysisReport] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // No longer need to directly use apiKey in frontend for Gemini SDK
  // const apiKey = process.env.API_KEY; // Remove this

  // This useEffect for API key check can be removed or repurposed
  // useEffect(() => { ... }, [apiKey]);

  const pollingIntervalRef = useRef<number | null>(null);

  const handleFileSelect = useCallback((file: File) => {
    setVideoFile(file);
    if (videoSrc) {
      URL.revokeObjectURL(videoSrc);
    }
    setVideoSrc(URL.createObjectURL(file));
    setAnalysisReport(null);
    setError(null);
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, [videoSrc]);

  const pollForResult = useCallback(async (jobId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/results/${jobId}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `请求结果失败，状态码: ${response.status}` }));
        throw new Error(errorData.error || `请求结果失败，状态码: ${response.status}`);
      }
      const result = await response.json();

      if (result.status === 'completed') {
        setAnalysisReport(result.report || '');
        setIsLoading(false);
        setLoadingMessage('');
        if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
      } else if (result.status === 'failed') {
        setError(result.error || '分析失败，未提供具体错误信息。');
        setIsLoading(false);
        setLoadingMessage('');
        if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
      } else if (result.status === 'processing' || result.status === 'pending') {
        setLoadingMessage(result.message || '分析仍在进行中，请稍候...');
        // Continue polling, don't clear interval here
      } else {
        setError(`收到未知的分析状态: ${result.status}`);
        setIsLoading(false);
        setLoadingMessage('');
        if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
      }
    } catch (err) {
      console.error('Polling Error:', err);
      setError((err as Error).message || '轮询分析结果时发生网络错误。');
      setIsLoading(false);
      setLoadingMessage('');
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    }
  }, []); // Removed isLoading from dependencies as it caused stale closure issues

  const handleAnalyzeVideo = useCallback(async () => {
    if (!videoFile) {
      setError('请先上传一个视频文件。');
      return;
    }

    const MAX_VIDEO_SIZE_MB = 5000;
    const MAX_VIDEO_SIZE_BYTES = MAX_VIDEO_SIZE_MB * 1024 * 1024;
    if (videoFile.size > MAX_VIDEO_SIZE_BYTES) {
      setError(`视频文件过大 (最大 ${MAX_VIDEO_SIZE_MB}MB)。请选择一个较小的文件进行分析。`);
      return;
    }

    setIsLoading(true);
    setLoadingMessage('正在上传视频文件...');
    setError(null);
    setAnalysisReport(null);
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    try {
      const formData = new FormData();
      formData.append('file', videoFile);

      const uploadResponse = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json().catch(() => ({ error: `文件上传失败，状态码: ${uploadResponse.status}` }));
        throw new Error(errorData.error || `文件上传失败，状态码: ${uploadResponse.status}`);
      }
      const uploadResult = await uploadResponse.json();
      const { file_id, original_filename, mimetype } = uploadResult;

      if (!file_id || !original_filename || !mimetype) {
        throw new Error('后端未能成功处理上传的文件，缺少必要信息。');
      }

      setLoadingMessage('文件上传成功，正在启动分析...');

      const analyzeResponse = await fetch(`${API_BASE_URL}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_id, original_filename, mimetype }),
      });

      if (!analyzeResponse.ok) {
        const errorData = await analyzeResponse.json().catch(() => ({ error: `启动分析失败，状态码: ${analyzeResponse.status}` }));
        throw new Error(errorData.error || `启动分析失败，状态码: ${analyzeResponse.status}`);
      }
      const analyzeResult = await analyzeResponse.json();
      const { job_id } = analyzeResult;

      if (!job_id) {
        throw new Error('后端未能成功启动分析任务。');
      }

      setLoadingMessage('分析任务已启动，正在获取结果...');
      // Initial poll
      await pollForResult(job_id);

      // Set interval only if the job is still processing after the initial poll
      // Check a fresh value of isLoading, by accessing state via a setter's callback or ref if needed,
      // or simply check if an error or report has been set by the first pollForResult call.
      // For simplicity, if no report and no error, assume it's still loading.
      setAnalysisReport(currentReport => {
        setError(currentError => {
          if (!currentReport && !currentError) { // if not completed or failed from first poll
            if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current); // Clear any old one
            pollingIntervalRef.current = window.setInterval(() => {
              pollForResult(job_id);
            }, 5000);
          }
          return currentError;
        });
        return currentReport;
      });

    } catch (err) {
      console.error('Analysis Error:', err);
      setError((err as Error).message || '处理视频分析时发生错误。');
      setIsLoading(false);
      setLoadingMessage('');
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    }
  }, [videoFile, pollForResult]);

  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
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
                    disabled={isLoading || !videoFile}
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