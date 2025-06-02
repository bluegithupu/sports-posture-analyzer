"use client";

import React, { useState, useEffect } from 'react';
import { VideoCompressor, CompressionOptions } from '../utils/videoCompression';

export const CompressionDebug: React.FC = () => {
    const [debugInfo, setDebugInfo] = useState<string[]>([]);
    const [testFile, setTestFile] = useState<File | null>(null);
    const [isCompressing, setIsCompressing] = useState(false);
    const [compressionResult, setCompressionResult] = useState<{
        success: boolean;
        error?: string;
        originalSize?: number;
        compressedSize?: number;
        timeTaken?: number;
    } | null>(null);

    const addLog = (message: string, type: 'info' | 'error' | 'warning' | 'success' = 'info') => {
        const timestamp = new Date().toLocaleTimeString();
        setDebugInfo(prev => [...prev, `[${timestamp}] [${type.toUpperCase()}] ${message}`]);
    };

    useEffect(() => {
        // 初始化检查
        addLog('开始压缩功能诊断...');

        // 检查基本API支持
        addLog(`MediaRecorder 支持: ${typeof MediaRecorder !== 'undefined' ? '✅' : '❌'}`);
        addLog(`Canvas 支持: ${typeof document !== 'undefined' && typeof document.createElement === 'function' ? '✅' : '❌'}`);
        addLog(`Video 元素支持: ${typeof HTMLVideoElement !== 'undefined' ? '✅' : '❌'}`);

        // 检查压缩支持
        addLog(`压缩功能支持: ${VideoCompressor.isCompressionSupported() ? '✅' : '❌'}`);

        // 检查支持的格式
        const supportedFormats = VideoCompressor.getSupportedFormats();
        addLog(`支持的视频格式数量: ${supportedFormats.length}`);
        supportedFormats.forEach(format => {
            addLog(`  - ${format}`, 'success');
        });

        // 检查浏览器信息
        if (typeof navigator !== 'undefined') {
            addLog(`浏览器: ${navigator.userAgent}`);
            addLog(`平台: ${navigator.platform}`);
        }

        // 检查是否在安全上下文中
        addLog(`安全上下文 (HTTPS): ${typeof window !== 'undefined' && window.isSecureContext ? '✅' : '❌'}`);

    }, []);

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            const file = event.target.files[0];
            setTestFile(file);
            addLog(`选择文件: ${file.name} (${VideoCompressor.formatFileSize(file.size)})`);
            addLog(`文件类型: ${file.type}`);
            addLog(`文件大小: ${file.size} bytes`);
        }
    };

    const testBasicCompression = async () => {
        if (!testFile) {
            addLog('请先选择一个视频文件', 'error');
            return;
        }

        setIsCompressing(true);
        setCompressionResult(null);
        const startTime = Date.now();

        addLog('开始基础压缩测试...', 'info');

        try {
            // 测试文件读取
            addLog('测试文件读取...');
            const url = URL.createObjectURL(testFile);
            addLog(`创建对象URL: ${url.substring(0, 50)}...`);

            // 测试视频元素创建和加载
            addLog('测试视频元素创建...');
            const video = document.createElement('video');
            video.muted = true;
            video.playsInline = true;

            const videoLoadPromise = new Promise<void>((resolve, reject) => {
                video.onloadedmetadata = () => {
                    addLog(`视频元数据加载成功:`);
                    addLog(`  - 尺寸: ${video.videoWidth} x ${video.videoHeight}`);
                    addLog(`  - 时长: ${video.duration.toFixed(2)} 秒`);
                    resolve();
                };

                video.onerror = () => {
                    addLog('视频加载失败', 'error');
                    reject(new Error('视频加载失败'));
                };

                setTimeout(() => {
                    reject(new Error('视频加载超时'));
                }, 10000); // 10秒超时
            });

            video.src = url;
            video.load();

            await videoLoadPromise;

            // 测试Canvas创建
            addLog('测试Canvas创建...');
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                throw new Error('无法创建Canvas上下文');
            }

            canvas.width = 640;
            canvas.height = 360;
            addLog(`Canvas创建成功: ${canvas.width} x ${canvas.height}`);

            // 测试MediaRecorder
            addLog('测试MediaRecorder...');
            const stream = canvas.captureStream(10); // 降低帧率到10fps进行测试
            addLog(`Canvas流创建成功`);

            const mimeType = VideoCompressor.getSupportedFormats()[0] || 'video/webm';
            addLog(`使用编码格式: ${mimeType}`);

            const mediaRecorder = new MediaRecorder(stream, {
                mimeType,
                videoBitsPerSecond: 400000 // 降低比特率进行测试
            });
            addLog(`MediaRecorder创建成功`);

            const chunks: Blob[] = [];
            let recordingComplete = false;

            const recordingPromise = new Promise<Blob>((resolve, reject) => {
                mediaRecorder.ondataavailable = (event) => {
                    if (event.data.size > 0) {
                        chunks.push(event.data);
                        addLog(`接收数据块: ${event.data.size} bytes`);
                    }
                };

                mediaRecorder.onstop = () => {
                    addLog('录制停止');
                    const blob = new Blob(chunks, { type: mimeType });
                    addLog(`生成Blob: ${blob.size} bytes`);
                    recordingComplete = true;
                    resolve(blob);
                };

                mediaRecorder.onerror = (event) => {
                    addLog(`MediaRecorder错误: ${event}`, 'error');
                    reject(new Error(`MediaRecorder错误: ${event}`));
                };

                setTimeout(() => {
                    if (!recordingComplete) {
                        mediaRecorder.stop();
                    }
                }, 3000); // 3秒后停止录制
            });

            addLog('开始录制测试...');
            mediaRecorder.start(100); // 每100ms收集一次数据

            // 绘制几帧测试
            let frameCount = 0;
            const drawFrame = () => {
                if (frameCount < 30) { // 绘制30帧
                    ctx.fillStyle = `hsl(${frameCount * 12}, 70%, 50%)`;
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.fillStyle = 'white';
                    ctx.font = '24px Arial';
                    ctx.fillText(`Frame ${frameCount}`, 50, 100);
                    frameCount++;
                    setTimeout(drawFrame, 100); // 10fps
                } else {
                    addLog('绘制完成，停止录制...');
                    mediaRecorder.stop();
                }
            };

            drawFrame();

            const resultBlob = await recordingPromise;

            // 创建结果文件
            const resultFile = new File([resultBlob], 'test_compressed.webm', { type: mimeType });

            const endTime = Date.now();
            const timeTaken = endTime - startTime;

            setCompressionResult({
                success: true,
                originalSize: testFile.size,
                compressedSize: resultFile.size,
                timeTaken
            });

            addLog(`压缩测试完成！`, 'success');
            addLog(`耗时: ${timeTaken}ms`);
            addLog(`原始大小: ${VideoCompressor.formatFileSize(testFile.size)}`);
            addLog(`压缩后大小: ${VideoCompressor.formatFileSize(resultFile.size)}`);

            // 清理
            URL.revokeObjectURL(url);

        } catch (error) {
            const endTime = Date.now();
            const timeTaken = endTime - startTime;

            setCompressionResult({
                success: false,
                error: error instanceof Error ? error.message : String(error),
                timeTaken
            });

            addLog(`压缩测试失败: ${error}`, 'error');
        } finally {
            setIsCompressing(false);
        }
    };

    const testFullCompression = async () => {
        if (!testFile) {
            addLog('请先选择一个视频文件', 'error');
            return;
        }

        setIsCompressing(true);
        setCompressionResult(null);
        const startTime = Date.now();

        addLog('开始完整压缩测试...', 'info');

        try {
            const options: CompressionOptions = {
                maxWidth: 640,
                maxHeight: 360,
                quality: 0.5,
                videoBitrate: 400000,
                maxFileSize: 10
            };

            addLog(`压缩设置: ${JSON.stringify(options)}`);

            const compressedFile = await VideoCompressor.compressVideo(
                testFile,
                options,
                (progress) => {
                    addLog(`进度: ${progress.progress}% - ${progress.stage}`);
                }
            );

            const endTime = Date.now();
            const timeTaken = endTime - startTime;

            setCompressionResult({
                success: true,
                originalSize: testFile.size,
                compressedSize: compressedFile.size,
                timeTaken
            });

            addLog(`完整压缩测试完成！`, 'success');
            addLog(`耗时: ${timeTaken}ms`);
            addLog(`原始大小: ${VideoCompressor.formatFileSize(testFile.size)}`);
            addLog(`压缩后大小: ${VideoCompressor.formatFileSize(compressedFile.size)}`);
            addLog(`压缩比例: ${VideoCompressor.getFileSizeReduction(testFile.size, compressedFile.size)}`);

        } catch (error) {
            const endTime = Date.now();
            const timeTaken = endTime - startTime;

            setCompressionResult({
                success: false,
                error: error instanceof Error ? error.message : String(error),
                timeTaken
            });

            addLog(`完整压缩测试失败: ${error}`, 'error');
        } finally {
            setIsCompressing(false);
        }
    };

    const clearLogs = () => {
        setDebugInfo([]);
        setCompressionResult(null);
    };

    return (
        <div className="p-6 bg-slate-800 rounded-lg border border-slate-600 max-w-4xl mx-auto">
            <h2 className="text-xl font-semibold text-sky-300 mb-4">压缩功能调试工具</h2>

            {/* 文件选择 */}
            <div className="mb-4">
                <input
                    type="file"
                    accept="video/*"
                    onChange={handleFileSelect}
                    className="block w-full text-sm text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-sky-600 file:text-white hover:file:bg-sky-700"
                />
            </div>

            {/* 测试按钮 */}
            <div className="flex gap-4 mb-4">
                <button
                    onClick={testBasicCompression}
                    disabled={!testFile || isCompressing}
                    className="bg-sky-600 hover:bg-sky-500 disabled:bg-slate-700 text-white px-4 py-2 rounded-lg"
                >
                    基础压缩测试
                </button>
                <button
                    onClick={testFullCompression}
                    disabled={!testFile || isCompressing}
                    className="bg-green-600 hover:bg-green-500 disabled:bg-slate-700 text-white px-4 py-2 rounded-lg"
                >
                    完整压缩测试
                </button>
                <button
                    onClick={clearLogs}
                    className="bg-slate-600 hover:bg-slate-500 text-white px-4 py-2 rounded-lg"
                >
                    清空日志
                </button>
            </div>

            {/* 压缩结果摘要 */}
            {compressionResult && (
                <div className={`mb-4 p-4 rounded-lg ${compressionResult.success ? 'bg-green-900/30 border border-green-600' : 'bg-red-900/30 border border-red-600'}`}>
                    <h3 className={`font-bold mb-2 ${compressionResult.success ? 'text-green-400' : 'text-red-400'}`}>
                        {compressionResult.success ? '测试成功' : '测试失败'}
                    </h3>
                    {compressionResult.success ? (
                        <div className="text-sm text-slate-300 space-y-1">
                            <div>耗时: {compressionResult.timeTaken}ms</div>
                            <div>原始大小: {VideoCompressor.formatFileSize(compressionResult.originalSize!)}</div>
                            <div>压缩后大小: {VideoCompressor.formatFileSize(compressionResult.compressedSize!)}</div>
                            <div>压缩比例: {VideoCompressor.getFileSizeReduction(compressionResult.originalSize!, compressionResult.compressedSize!)}</div>
                        </div>
                    ) : (
                        <div className="text-sm text-red-300">
                            <div>错误: {compressionResult.error}</div>
                            <div>耗时: {compressionResult.timeTaken}ms</div>
                        </div>
                    )}
                </div>
            )}

            {/* 日志显示 */}
            <div className="bg-slate-900 rounded-lg p-4 h-96 overflow-y-auto">
                <h3 className="text-sky-300 font-medium mb-2">调试日志</h3>
                {debugInfo.map((log, index) => {
                    const isError = log.includes('[ERROR]');
                    const isWarning = log.includes('[WARNING]');
                    const isSuccess = log.includes('[SUCCESS]');

                    return (
                        <div
                            key={index}
                            className={`text-xs font-mono mb-1 ${isError ? 'text-red-400' :
                                isWarning ? 'text-yellow-400' :
                                    isSuccess ? 'text-green-400' :
                                        'text-slate-400'
                                }`}
                        >
                            {log}
                        </div>
                    );
                })}
                {debugInfo.length === 0 && (
                    <div className="text-slate-500 text-sm">等待日志输出...</div>
                )}
            </div>

            {isCompressing && (
                <div className="mt-4 text-center">
                    <div className="inline-flex items-center text-sky-400">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-sky-400 mr-2"></div>
                        测试进行中...
                    </div>
                </div>
            )}
        </div>
    );
}; 