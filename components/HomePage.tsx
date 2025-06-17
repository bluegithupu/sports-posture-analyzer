"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { FileUpload } from './FileUpload';
import { VideoPlayer } from './VideoPlayer';
import { AnalysisReport } from './AnalysisReport';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorMessage } from './ErrorMessage';
import { useVideoAnalysis, useJobPolling } from '../lib/hooks';

export const HomePage: React.FC = () => {
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [videoSrc, setVideoSrc] = useState<string | null>(null);
    const [currentJobId, setCurrentJobId] = useState<string | null>(null);

    // 使用自定义Hooks
    const {
        uploading,
        uploadMessage,
        error: uploadError,
        uploadAndAnalyze,
        reset: resetUpload,
    } = useVideoAnalysis();

    const {
        result: jobResult,
        loading: polling,
        error: pollingError,
    } = useJobPolling(currentJobId, !!currentJobId);

    // 合并错误状态
    const error = uploadError || pollingError;
    const isLoading = uploading || polling;
    const loadingMessage = uploadMessage || (jobResult?.message) || '';
    const analysisReport = jobResult?.report || null;

    const handleFileSelect = useCallback((file: File) => {
        setVideoFile(file);
        if (videoSrc) {
            URL.revokeObjectURL(videoSrc);
        }
        setVideoSrc(URL.createObjectURL(file));
        setCurrentJobId(null);
        resetUpload();
    }, [videoSrc, resetUpload]);

    const handleAnalyzeVideo = useCallback(async () => {
        if (!videoFile) {
            return;
        }

        try {
            const jobId = await uploadAndAnalyze(videoFile);
            if (jobId) {
                setCurrentJobId(jobId);
            }
        } catch (err) {
            console.error('分析错误:', err);
        }
    }, [videoFile, uploadAndAnalyze]);

    useEffect(() => {
        return () => {
            if (videoSrc) {
                URL.revokeObjectURL(videoSrc);
            }
        };
    }, [videoSrc]);

    return (
        <div className="container mx-auto px-4 py-4 sm:py-6 lg:py-8 safe-padding">
            <div className="bg-slate-800 shadow-2xl rounded-lg p-4 sm:p-6 lg:p-8 xl:p-10">
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-6 sm:mb-8 text-center text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-cyan-300">
                    运动视频体态分析
                </h2>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 items-start">
                    <div className="space-y-4 sm:space-y-6">
                        <div className="p-4 sm:p-6 bg-slate-700/50 rounded-lg shadow-lg">
                            <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-sky-300">1. 上传视频</h3>
                            <FileUpload onFileSelect={handleFileSelect} />
                            {videoFile && (
                                <p className="text-xs sm:text-sm text-slate-400 mt-2 break-all">
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
                            <div className="p-4 sm:p-6 bg-slate-700/50 rounded-lg shadow-lg">
                                <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-sky-300">2. 开始分析</h3>
                                <button
                                    onClick={handleAnalyzeVideo}
                                    disabled={isLoading || !videoFile}
                                    className="w-full bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600 text-white font-bold py-3 sm:py-4 px-4 sm:px-6 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center touch-target text-sm sm:text-base"
                                    aria-live="polite"
                                    aria-label={isLoading ? "正在处理视频，请稍候" : "获取体态分析报告"}
                                >
                                    {isLoading ? (
                                        <>
                                            <LoadingSpinner />
                                            <span className="ml-2 truncate">{loadingMessage || '处理中...'}</span>
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

                    <div className="space-y-4 sm:space-y-6">
                        {(isLoading || analysisReport || error) && (
                            <div className="p-4 sm:p-6 bg-slate-700/50 rounded-lg shadow-lg min-h-[200px] sm:min-h-[250px] flex flex-col justify-center" role="region" aria-live="polite" aria-atomic="true" aria-labelledby="analysis-result-heading">
                                <h3 id="analysis-result-heading" className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-sky-300">3. 分析结果</h3>
                                {isLoading && !analysisReport && <div className="flex flex-col sm:flex-row justify-center items-center py-6 sm:py-8 space-y-2 sm:space-y-0 sm:space-x-3"><LoadingSpinner /> <span className="text-sm sm:text-lg text-center">{loadingMessage || '正在生成报告...'}</span></div>}
                                {error && <ErrorMessage message={error} />}
                                {analysisReport && !isLoading && <AnalysisReport report={analysisReport} />}
                            </div>
                        )}
                        {!isLoading && !analysisReport && !error && !videoFile &&
                            <div className="p-4 sm:p-6 bg-slate-700/50 rounded-lg shadow-lg min-h-[200px] sm:min-h-[250px] flex flex-col justify-center items-center text-slate-400 text-center">
                                <i className="fas fa-film text-3xl sm:text-4xl mb-3 sm:mb-4"></i>
                                <p className="text-sm sm:text-base">请先上传一个视频并开始分析。</p>
                                <p className="text-xs sm:text-sm mt-1">分析结果将显示在此处。</p>
                            </div>
                        }
                    </div>
                </div>
            </div>
        </div>
    );
}; 