"use client";

import React, { useState, useRef } from 'react';
import { FastUploader } from '../../utils/fastUpload';
import { UploadDiagnosticTool } from '../../utils/uploadDiagnostics';
import { CORSTestTool, CORSTestResult } from '../../utils/corsTest';

export default function UploadTestPage() {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [speed, setSpeed] = useState<number | null>(null);
    const [remainingTime, setRemainingTime] = useState<number | null>(null);
    const [corsTestResult, setCorsTestResult] = useState<CORSTestResult | null>(null);
    const [diagnostics, setDiagnostics] = useState<{
        networkSpeed: number;
        fileSize: number;
        browserInfo: string;
        connectionType?: string;
        issues: Array<{
            issue: string;
            suggestion: string;
        }>;
        recommendations: string[];
    } | null>(null);
    const [logs, setLogs] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const addLog = (message: string) => {
        setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            addLog(`文件已选择: ${file.name} (${FastUploader.formatBytes(file.size)})`);
        }
    };

    const runCORSTest = async () => {
        addLog('开始 CORS 配置测试...');
        try {
            const result = await CORSTestTool.runCORSTest();
            setCorsTestResult(result);
            addLog(`CORS 测试完成: ${result.success ? '成功' : '失败'} - ${result.message}`);

            if (!result.success) {
                CORSTestTool.showCORSSetupGuide();
            }
        } catch (error) {
            addLog(`CORS 测试失败: ${error}`);
        }
    };

    const runDiagnostics = async () => {
        if (!selectedFile) return;

        addLog('开始运行诊断...');
        try {
            const result = await UploadDiagnosticTool.runDiagnostics(selectedFile);
            setDiagnostics(result);
            addLog('诊断完成');
        } catch (error) {
            addLog(`诊断失败: ${error}`);
        }
    };

    const testUpload = async () => {
        if (!selectedFile) return;

        setUploading(true);
        setProgress(0);
        setSpeed(null);
        setRemainingTime(null);
        addLog('开始测试上传优化...');

        try {
            // 这里我们模拟一个上传URL（实际使用时需要从后端获取）
            const mockUploadUrl = 'https://httpbin.org/put'; // 测试端点

            const config = FastUploader.getOptimalConfig(selectedFile.size);
            addLog(`使用配置: ${JSON.stringify(config)}`);

            const success = await FastUploader.uploadWithProgress(
                selectedFile,
                mockUploadUrl,
                (progressData) => {
                    setProgress(progressData.percentage);
                    if (progressData.speed) {
                        setSpeed(progressData.speed);
                    }
                    if (progressData.remainingTime) {
                        setRemainingTime(progressData.remainingTime);
                    }

                    addLog(`进度: ${progressData.percentage}%, 速度: ${FastUploader.formatBytes(progressData.speed || 0)}/s`);
                },
                config
            );

            if (success) {
                addLog('上传成功！');
            } else {
                addLog('上传失败');
            }
        } catch (error) {
            addLog(`上传错误: ${error}`);
        } finally {
            setUploading(false);
        }
    };

    const formatTime = (seconds: number): string => {
        if (seconds < 60) {
            return `${Math.ceil(seconds)} 秒`;
        }
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.ceil(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-slate-100">
            <div className="container mx-auto px-4 py-8">
                <div className="bg-slate-800 shadow-2xl rounded-lg p-6 md:p-10">
                    <h1 className="text-3xl font-bold mb-8 text-center text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-cyan-300">
                        上传优化测试页面
                    </h1>

                    {/* CORS 测试 */}
                    <div className="mb-6">
                        <button
                            onClick={runCORSTest}
                            disabled={uploading}
                            className="w-full bg-red-600 hover:bg-red-500 text-white font-medium py-3 px-4 rounded-lg transition duration-300 disabled:opacity-50 mb-4"
                        >
                            🔍 测试 CORS 配置（必须先执行）
                        </button>

                        {corsTestResult && (
                            <div className={`p-4 rounded-lg mb-4 ${corsTestResult.success ? 'bg-green-900/20 border border-green-600/30' : 'bg-red-900/20 border border-red-600/30'}`}>
                                <div className={`flex items-center space-x-2 ${corsTestResult.success ? 'text-green-400' : 'text-red-400'}`}>
                                    <span className="text-sm font-medium">
                                        {corsTestResult.success ? '✅' : '❌'} {corsTestResult.message}
                                    </span>
                                </div>
                                {corsTestResult.suggestions && corsTestResult.suggestions.length > 0 && (
                                    <div className="mt-2">
                                        <p className="text-xs text-slate-400 mb-1">建议:</p>
                                        <ul className="text-xs space-y-1">
                                            {corsTestResult.suggestions.map((suggestion, index) => (
                                                <li key={index} className="text-orange-300">• {suggestion}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* 文件选择 */}
                    <div className="mb-6">
                        <input
                            type="file"
                            accept="video/*"
                            onChange={handleFileSelect}
                            ref={fileInputRef}
                            className="hidden"
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full bg-slate-600 hover:bg-slate-500 text-sky-300 font-semibold py-3 px-4 rounded-lg border border-sky-400 hover:border-sky-300 transition duration-300"
                        >
                            选择测试文件
                        </button>
                        {selectedFile && (
                            <p className="text-sm text-slate-400 mt-2">
                                已选择: {selectedFile.name} ({FastUploader.formatBytes(selectedFile.size)})
                            </p>
                        )}
                    </div>

                    {/* 操作按钮 */}
                    {selectedFile && (
                        <div className="grid md:grid-cols-2 gap-4 mb-6">
                            <button
                                onClick={runDiagnostics}
                                disabled={uploading}
                                className="bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 px-4 rounded-lg transition duration-300 disabled:opacity-50"
                            >
                                运行上传诊断
                            </button>
                            <button
                                onClick={testUpload}
                                disabled={uploading || !selectedFile}
                                className="bg-green-600 hover:bg-green-500 text-white font-medium py-2 px-4 rounded-lg transition duration-300 disabled:opacity-50"
                            >
                                测试优化上传
                            </button>
                        </div>
                    )}

                    {/* 上传进度 */}
                    {uploading && (
                        <div className="mb-6 p-4 bg-slate-700 rounded-lg">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-medium">上传进度</span>
                                <span className="text-sm text-slate-400">{progress}%</span>
                            </div>
                            <div className="w-full bg-slate-600 rounded-full h-2">
                                <div
                                    className="bg-sky-500 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            {speed && (
                                <div className="flex justify-between mt-2 text-sm text-slate-400">
                                    <span>速度: {FastUploader.formatBytes(speed)}/s</span>
                                    {remainingTime && (
                                        <span>剩余时间: {formatTime(remainingTime)}</span>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* 诊断结果 */}
                    {diagnostics && (
                        <div className="mb-6 p-4 bg-slate-700 rounded-lg">
                            <h3 className="text-lg font-semibold mb-3 text-sky-300">诊断结果</h3>
                            <div className="space-y-2 text-sm">
                                <div>
                                    <span className="text-slate-400">网络速度:</span>
                                    <span className="ml-2 text-green-400">
                                        {FastUploader.formatBytes(diagnostics.networkSpeed)}/s
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-400">浏览器:</span>
                                    <span className="ml-2">{diagnostics.browserInfo}</span>
                                </div>
                                {diagnostics.connectionType && (
                                    <div>
                                        <span className="text-slate-400">连接类型:</span>
                                        <span className="ml-2">{diagnostics.connectionType}</span>
                                    </div>
                                )}
                                {diagnostics.issues.length > 0 && (
                                    <div>
                                        <span className="text-slate-400">发现问题:</span>
                                        <ul className="ml-4 mt-1">
                                            {diagnostics.issues.map((issue, index: number) => (
                                                <li key={index} className="text-orange-400">
                                                    • {issue.issue} - {issue.suggestion}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                {diagnostics.recommendations.length > 0 && (
                                    <div>
                                        <span className="text-slate-400">优化建议:</span>
                                        <ul className="ml-4 mt-1">
                                            {diagnostics.recommendations.map((rec: string, index: number) => (
                                                <li key={index} className="text-blue-400">
                                                    • {rec}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* 日志输出 */}
                    <div className="p-4 bg-black rounded-lg">
                        <h3 className="text-lg font-semibold mb-3 text-green-400">控制台日志</h3>
                        <div className="max-h-64 overflow-y-auto">
                            {logs.map((log, index) => (
                                <div key={index} className="text-sm text-green-300 font-mono">
                                    {log}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 说明 */}
                    <div className="mt-6 p-4 bg-blue-900/20 rounded-lg border border-blue-600/30">
                        <h3 className="text-lg font-semibold mb-2 text-blue-400">测试说明</h3>
                        <ul className="text-sm text-blue-300 space-y-1">
                            <li>• 选择一个视频文件进行测试</li>
                            <li>• 运行诊断可以检测网络环境和潜在问题</li>
                            <li>• 测试上传会模拟实际的上传过程（使用测试端点）</li>
                            <li>• 查看控制台可以看到详细的优化日志</li>
                            <li>• 所有优化功能都会在实际上传中自动启用</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
} 