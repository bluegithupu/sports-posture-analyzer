"use client";

import React, { useState, useCallback } from 'react';
import { ImageUpload } from './ImageUpload';
import { ImagePreview } from './ImagePreview';
import { AnalysisReport } from './AnalysisReport';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorMessage } from './ErrorMessage';
import { ImageCompressionSettings } from './ImageCompressionSettings';
import { useImageAnalysis, useJobPolling } from '../lib/hooks';
import { CompressionOptions } from '../utils/imageCompression';

export const ImageAnalysisPage: React.FC = () => {
    const [selectedImages, setSelectedImages] = useState<File[]>([]);
    const [currentJobId, setCurrentJobId] = useState<string | null>(null);
    const [compressionProgress, setCompressionProgress] = useState<string>('');
    const [compressionEnabled, setCompressionEnabled] = useState<boolean>(true);
    const [compressionOptions, setCompressionOptions] = useState<CompressionOptions>({
        maxWidth: 1920,
        maxHeight: 1080,
        quality: 0.8,
        maxSizeKB: 1024,
        format: 'jpeg',
        enableResize: true,
        enableQualityAdjust: true,
    });

    // 使用自定义Hooks
    const {
        uploading,
        uploadMessage,
        error: uploadError,
        uploadAndAnalyze,
        reset: resetUpload,
    } = useImageAnalysis();

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

    const handleImagesSelect = useCallback((files: File[]) => {
        setSelectedImages(files);
        setCurrentJobId(null);
        resetUpload();
        setCompressionProgress('');
    }, [resetUpload]);

    const handleCompressionProgress = useCallback((current: number, total: number, fileName: string) => {
        setCompressionProgress(`正在压缩 ${fileName} (${current}/${total})`);
    }, []);

    const handleRemoveImage = useCallback((index: number) => {
        setSelectedImages(prev => prev.filter((_, i) => i !== index));
    }, []);

    const handleAnalyzeImages = useCallback(async () => {
        if (selectedImages.length === 0) {
            return;
        }

        try {
            const jobId = await uploadAndAnalyze(selectedImages);
            if (jobId) {
                setCurrentJobId(jobId);
            }
        } catch (err) {
            console.error('分析错误:', err);
        }
    }, [selectedImages, uploadAndAnalyze]);

    const handleClearAll = useCallback(() => {
        setSelectedImages([]);
        setCurrentJobId(null);
        resetUpload();
    }, [resetUpload]);

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="bg-slate-800 shadow-2xl rounded-lg p-6 md:p-10">
                <h2 className="text-3xl font-bold mb-8 text-center text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-cyan-300">
                    运动图片体态分析
                </h2>

                <div className="grid lg:grid-cols-2 gap-8">
                    {/* 左侧：上传和预览 */}
                    <div className="space-y-6">
                        {/* 图片上传 */}
                        <div className="p-6 bg-slate-700/50 rounded-lg shadow-lg">
                            <h3 className="text-xl font-semibold mb-4 text-sky-300">1. 选择图片</h3>
                            <ImageUpload
                                onImagesSelect={handleImagesSelect}
                                currentImages={selectedImages}
                                maxImages={3}
                                enableCompression={compressionEnabled}
                                onCompressionProgress={handleCompressionProgress}
                                compressionOptions={compressionOptions}
                            />
                            {compressionProgress && (
                                <div className="mt-4 p-3 bg-blue-900/20 rounded-lg border border-blue-600/30">
                                    <div className="flex items-center space-x-2 text-blue-400">
                                        <i className="fas fa-compress-alt"></i>
                                        <span className="text-sm">{compressionProgress}</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 压缩设置 */}
                        <div className="p-6 bg-slate-700/50 rounded-lg shadow-lg">
                            <ImageCompressionSettings
                                options={compressionOptions}
                                onChange={setCompressionOptions}
                                onToggle={setCompressionEnabled}
                                enabled={compressionEnabled}
                            />
                        </div>

                        {/* 图片预览 */}
                        {selectedImages.length > 0 && (
                            <div className="p-6 bg-slate-700/50 rounded-lg shadow-lg">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-xl font-semibold text-sky-300">2. 图片预览</h3>
                                    <button
                                        onClick={handleClearAll}
                                        className="text-red-400 hover:text-red-300 text-sm flex items-center space-x-1"
                                        disabled={isLoading}
                                    >
                                        <i className="fas fa-trash"></i>
                                        <span>清空所有</span>
                                    </button>
                                </div>
                                <ImagePreview
                                    images={selectedImages}
                                    onRemoveImage={handleRemoveImage}
                                />
                            </div>
                        )}

                        {/* 开始分析按钮 */}
                        {selectedImages.length > 0 && (
                            <div className="p-6 bg-slate-700/50 rounded-lg shadow-lg">
                                <h3 className="text-xl font-semibold mb-4 text-sky-300">3. 开始分析</h3>
                                <button
                                    onClick={handleAnalyzeImages}
                                    disabled={isLoading || selectedImages.length === 0}
                                    className="w-full bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600 text-white font-bold py-3 px-6 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                                >
                                    {isLoading ? (
                                        <>
                                            <LoadingSpinner />
                                            <span className="ml-2">{loadingMessage || '分析中...'}</span>
                                        </>
                                    ) : (
                                        <>
                                            <i className="fas fa-search mr-2"></i>
                                            <span>
                                                {selectedImages.length === 1
                                                    ? '分析图片姿态'
                                                    : `对比分析 ${selectedImages.length} 张图片`
                                                }
                                            </span>
                                        </>
                                    )}
                                </button>

                                {selectedImages.length > 1 && (
                                    <p className="text-xs text-slate-400 mt-2 text-center">
                                        多张图片将进行对比分析，识别动作变化和改进建议
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* 右侧：分析结果 */}
                    <div className="space-y-6">
                        {(isLoading || analysisReport || error) && (
                            <div className="p-6 bg-slate-700/50 rounded-lg shadow-lg min-h-[400px] flex flex-col justify-center">
                                <h3 className="text-xl font-semibold mb-4 text-sky-300">4. 分析结果</h3>
                                {isLoading && !analysisReport && (
                                    <div className="flex flex-col items-center justify-center py-8 space-y-4">
                                        <LoadingSpinner />
                                        <span className="text-lg">{loadingMessage || '正在分析图片...'}</span>
                                        <p className="text-sm text-slate-400 text-center">
                                            AI正在分析您的运动姿态，请稍候...
                                        </p>
                                    </div>
                                )}
                                {error && <ErrorMessage message={error} />}
                                {analysisReport && !isLoading && <AnalysisReport report={analysisReport} />}
                            </div>
                        )}

                        {!isLoading && !analysisReport && !error && selectedImages.length === 0 && (
                            <div className="p-6 bg-slate-700/50 rounded-lg shadow-lg min-h-[400px] flex flex-col justify-center items-center text-slate-400">
                                <i className="fas fa-images text-6xl mb-6 text-slate-600"></i>
                                <h3 className="text-xl font-semibold mb-2">开始图片分析</h3>
                                <p className="text-center mb-4">请选择 1-3 张运动图片进行姿态分析</p>
                                <div className="text-sm text-slate-500 space-y-1 text-center">
                                    <p>• 单张图片：分析当前姿态</p>
                                    <p>• 多张图片：对比分析进步</p>
                                    <p>• 支持常见图片格式</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
