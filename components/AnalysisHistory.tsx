"use client";

import React, { useState } from 'react';
import { AnalysisReport } from './AnalysisReport';
import { useAnalysisHistory, useJobRetry } from '../lib/hooks';

export const AnalysisHistory: React.FC = () => {
    const [selectedReport, setSelectedReport] = useState<string | null>(null);
    const [showReportModal, setShowReportModal] = useState(false);

    // 使用自定义Hooks
    const { history, loading, error, refetch } = useAnalysisHistory(50);
    const { retryJob, isRetrying } = useJobRetry();



    // 格式化日期
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    // 获取状态显示文本和样式
    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'completed':
                return { text: '已完成', class: 'bg-green-100 text-green-800' };
            case 'processing':
                return { text: '处理中', class: 'bg-blue-100 text-blue-800' };
            case 'pending':
                return { text: '等待中', class: 'bg-yellow-100 text-yellow-800' };
            case 'failed':
                return { text: '失败', class: 'bg-red-100 text-red-800' };
            default:
                return { text: '未知', class: 'bg-gray-100 text-gray-800' };
        }
    };

    // 查看报告
    const viewReport = (report: string) => {
        setSelectedReport(report);
        setShowReportModal(true);
    };

    // 关闭报告弹窗
    const closeReportModal = () => {
        setShowReportModal(false);
        setSelectedReport(null);
    };

    // 获取视频文件名
    const getVideoFileName = (url: string) => {
        try {
            const urlParts = url.split('/');
            const fileName = urlParts[urlParts.length - 1];
            return fileName || '未知文件';
        } catch {
            return '未知文件';
        }
    };

    // 重试失败的任务
    const handleRetryJob = async (jobId: string) => {
        try {
            await retryJob(jobId);
            alert('重试已启动，请稍后刷新页面查看状态。');
            refetch(); // 刷新历史记录
        } catch (err) {
            console.error('重试错误:', err);
            alert(`重试失败: ${(err as Error).message}`);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-900 to-slate-800 text-slate-100">
                <div className="flex-grow container mx-auto px-4 py-8">
                    <div className="bg-slate-800 shadow-2xl rounded-lg p-6 md:p-10">
                        <h2 className="text-3xl font-bold mb-8 text-center text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-cyan-300">
                            分析历史记录
                        </h2>
                        <div className="flex justify-center items-center py-20">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-400"></div>
                            <span className="ml-3 text-lg">正在加载历史记录...</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-900 to-slate-800 text-slate-100">
                <div className="flex-grow container mx-auto px-4 py-8">
                    <div className="bg-slate-800 shadow-2xl rounded-lg p-6 md:p-10">
                        <h2 className="text-3xl font-bold mb-8 text-center text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-cyan-300">
                            分析历史记录
                        </h2>
                        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-200">
                            <div className="flex items-center">
                                <i className="fas fa-exclamation-triangle mr-3"></i>
                                <div>
                                    <h3 className="font-semibold">错误</h3>
                                    <p>{error}</p>
                                </div>
                            </div>
                            <button
                                onClick={refetch}
                                className="mt-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition duration-200"
                            >
                                重试
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-900 to-slate-800 text-slate-100">
            <div className="flex-grow container mx-auto px-4 py-8">
                <div className="bg-slate-800 shadow-2xl rounded-lg p-6 md:p-10">
                    <div className="flex justify-between items-center mb-8">
                        <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-cyan-300">
                            分析历史记录
                        </h2>
                        <button
                            onClick={refetch}
                            className="bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-lg transition duration-200 flex items-center"
                        >
                            <i className="fas fa-refresh mr-2"></i>
                            刷新
                        </button>
                    </div>

                    {history.length === 0 ? (
                        <div className="text-center py-20">
                            <i className="fas fa-history text-6xl text-slate-400 mb-4"></i>
                            <h3 className="text-xl font-semibold text-slate-300 mb-2">暂无分析记录</h3>
                            <p className="text-slate-400">开始上传视频进行体态分析吧！</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full bg-slate-700/50 rounded-lg overflow-hidden">
                                <thead className="bg-slate-600/50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                                            视频预览
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                                            创建时间
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                                            状态
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                                            操作
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-600/50">
                                    {history.map((event) => {
                                        const statusInfo = getStatusInfo(event.status);
                                        return (
                                            <tr key={event.id} className="hover:bg-slate-600/30 transition duration-200">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center space-x-4">
                                                        <div className="relative">
                                                            <video
                                                                src={event.r2_video_link}
                                                                className="w-24 h-16 object-cover rounded-lg bg-slate-600"
                                                                muted
                                                                preload="metadata"
                                                                onMouseEnter={(e) => {
                                                                    (e.target as HTMLVideoElement).currentTime = 1;
                                                                }}
                                                            />
                                                            <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-lg">
                                                                <i className="fas fa-play text-white text-sm"></i>
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium text-slate-200">
                                                                {getVideoFileName(event.r2_video_link)}
                                                            </p>
                                                            <a
                                                                href={event.r2_video_link}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-xs text-sky-400 hover:text-sky-300 transition duration-200"
                                                            >
                                                                查看原视频
                                                            </a>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-slate-300">
                                                    {formatDate(event.created_at)}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusInfo.class}`}>
                                                        {statusInfo.text}
                                                    </span>
                                                    {event.error_message && (
                                                        <p className="text-xs text-red-400 mt-1" title={event.error_message}>
                                                            {event.error_message.length > 50
                                                                ? `${event.error_message.substring(0, 50)}...`
                                                                : event.error_message
                                                            }
                                                        </p>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex space-x-2">
                                                        {event.status === 'completed' && event.analysis_report?.text && (
                                                            <button
                                                                onClick={() => viewReport(event.analysis_report!.text)}
                                                                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs transition duration-200 flex items-center"
                                                            >
                                                                <i className="fas fa-file-alt mr-1"></i>
                                                                查看报告
                                                            </button>
                                                        )}
                                                        {event.status === 'failed' && (
                                                            <button
                                                                onClick={() => handleRetryJob(event.id)}
                                                                disabled={isRetrying(event.id)}
                                                                className={`text-white px-3 py-1 rounded text-xs transition duration-200 flex items-center ${isRetrying(event.id)
                                                                    ? 'bg-gray-500 cursor-not-allowed'
                                                                    : 'bg-orange-600 hover:bg-orange-700'
                                                                    }`}
                                                            >
                                                                {isRetrying(event.id) ? (
                                                                    <>
                                                                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                                                                        重试中
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <i className="fas fa-redo mr-1"></i>
                                                                        重试
                                                                    </>
                                                                )}
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* 报告查看弹窗 */}
            {showReportModal && selectedReport && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-slate-800 rounded-lg p-6 max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-semibold text-sky-300">分析报告</h3>
                            <button
                                onClick={closeReportModal}
                                className="text-slate-400 hover:text-slate-200 transition duration-200"
                            >
                                <i className="fas fa-times text-xl"></i>
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto">
                            <AnalysisReport report={selectedReport} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}; 