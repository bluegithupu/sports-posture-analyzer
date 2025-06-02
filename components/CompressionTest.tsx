"use client";

import React, { useState } from 'react';
import { VideoCompressor, CompressionOptions } from '../utils/videoCompression';

export const CompressionTest: React.FC = () => {
    const [testFile, setTestFile] = useState<File | null>(null);
    const [compressedFile, setCompressedFile] = useState<File | null>(null);
    const [isCompressing, setIsCompressing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [stage, setStage] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            setTestFile(event.target.files[0]);
            setCompressedFile(null);
            setError(null);
        }
    };

    const handleCompress = async () => {
        if (!testFile) return;

        setIsCompressing(true);
        setError(null);
        setProgress(0);
        setStage('');

        try {
            const options: CompressionOptions = {
                maxWidth: 1280,
                maxHeight: 720,
                quality: 0.6,
                videoBitrate: 800000,
                maxFileSize: 50
            };

            const compressed = await VideoCompressor.compressVideo(
                testFile,
                options,
                (progressInfo) => {
                    setProgress(progressInfo.progress);
                    setStage(progressInfo.stage);
                }
            );

            setCompressedFile(compressed);
        } catch (err) {
            setError(err instanceof Error ? err.message : '压缩失败');
        } finally {
            setIsCompressing(false);
        }
    };

    const formatFileSize = (bytes: number): string => {
        return VideoCompressor.formatFileSize(bytes);
    };

    const getReduction = (): string => {
        if (!testFile || !compressedFile) return '0%';
        return VideoCompressor.getFileSizeReduction(testFile.size, compressedFile.size);
    };

    return (
        <div className="p-6 bg-slate-800 rounded-lg border border-slate-600 max-w-2xl mx-auto">
            <h2 className="text-xl font-semibold text-sky-300 mb-4">视频压缩测试</h2>

            {/* 文件选择 */}
            <div className="mb-4">
                <input
                    type="file"
                    accept="video/*"
                    onChange={handleFileSelect}
                    className="block w-full text-sm text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-sky-600 file:text-white hover:file:bg-sky-700"
                />
            </div>

            {/* 文件信息 */}
            {testFile && (
                <div className="mb-4 p-3 bg-slate-900 rounded border border-slate-600">
                    <h3 className="text-sky-300 font-medium mb-2">原始文件信息</h3>
                    <div className="text-sm text-slate-400 space-y-1">
                        <div>文件名: {testFile.name}</div>
                        <div>大小: {formatFileSize(testFile.size)}</div>
                        <div>类型: {testFile.type}</div>
                    </div>
                </div>
            )}

            {/* 压缩按钮 */}
            {testFile && !isCompressing && (
                <button
                    onClick={handleCompress}
                    className="w-full bg-sky-600 hover:bg-sky-500 text-white font-medium py-2 px-4 rounded-lg transition duration-200 mb-4"
                >
                    开始压缩测试
                </button>
            )}

            {/* 压缩进度 */}
            {isCompressing && (
                <div className="mb-4 p-3 bg-slate-900 rounded border border-slate-600">
                    <div className="flex justify-between text-sm text-slate-300 mb-2">
                        <span>{stage}</span>
                        <span>{progress}%</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                        <div
                            className="bg-sky-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                </div>
            )}

            {/* 错误信息 */}
            {error && (
                <div className="mb-4 p-3 bg-red-900/50 border border-red-600 rounded text-red-300">
                    错误: {error}
                </div>
            )}

            {/* 压缩结果 */}
            {compressedFile && (
                <div className="p-3 bg-slate-900 rounded border border-slate-600">
                    <h3 className="text-sky-300 font-medium mb-2">压缩结果</h3>
                    <div className="text-sm text-slate-400 space-y-1">
                        <div>压缩后文件名: {compressedFile.name}</div>
                        <div>压缩后大小: {formatFileSize(compressedFile.size)}</div>
                        <div>压缩后类型: {compressedFile.type}</div>
                        <div className="text-green-400">大小减少: {getReduction()}</div>
                    </div>

                    {/* 下载按钮 */}
                    <button
                        onClick={() => {
                            const url = URL.createObjectURL(compressedFile);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = compressedFile.name;
                            a.click();
                            URL.revokeObjectURL(url);
                        }}
                        className="mt-3 bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded text-sm transition duration-200"
                    >
                        下载压缩文件
                    </button>
                </div>
            )}

            {/* 浏览器支持信息 */}
            <div className="mt-4 p-3 bg-slate-900 rounded border border-slate-600">
                <h3 className="text-sky-300 font-medium mb-2">浏览器支持</h3>
                <div className="text-sm text-slate-400">
                    <div>压缩支持: {VideoCompressor.isCompressionSupported() ? '✅ 支持' : '❌ 不支持'}</div>
                    <div>支持的格式:</div>
                    <ul className="ml-4 mt-1">
                        {VideoCompressor.getSupportedFormats().map((format, index) => (
                            <li key={index} className="text-green-400">• {format}</li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}; 