// 自定义 React Hooks
// 提供数据获取、状态管理和业务逻辑封装

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient, AnalysisEvent, JobResult } from './apiClient';

// 分析历史Hook
export function useAnalysisHistory(limit: number = 10) {
    const [history, setHistory] = useState<AnalysisEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchHistory = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await apiClient.getAnalysisHistory(limit);

            if (response.success && response.data) {
                setHistory(response.data.data || []);
            } else {
                setError(response.error || '获取历史记录失败');
            }
        } catch (err) {
            console.error('获取历史记录错误:', err);
            setError(err instanceof Error ? err.message : '获取历史记录时发生错误');
        } finally {
            setLoading(false);
        }
    }, [limit]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    const refetch = useCallback(() => {
        fetchHistory();
    }, [fetchHistory]);

    return {
        history,
        loading,
        error,
        refetch,
    };
}

// 任务结果轮询Hook
export function useJobPolling(jobId: string | null, enabled: boolean = true) {
    const [result, setResult] = useState<JobResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const intervalRef = useRef<number | null>(null);

    const pollResult = useCallback(async () => {
        if (!jobId) return;

        try {
            const response = await apiClient.getJobResult(jobId);

            if (response.success && response.data) {
                setResult(response.data);
                setError(null);

                // 如果任务完成或失败，停止轮询
                if (response.data.status === 'completed' || response.data.status === 'failed') {
                    setLoading(false);
                    if (intervalRef.current) {
                        clearInterval(intervalRef.current);
                        intervalRef.current = null;
                    }
                }
            } else {
                setError(response.error || '获取结果失败');
                setLoading(false);
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                    intervalRef.current = null;
                }
            }
        } catch (err) {
            console.error('轮询错误:', err);
            setError(err instanceof Error ? err.message : '轮询时发生错误');
            setLoading(false);
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        }
    }, [jobId]);

    const startPolling = useCallback(() => {
        if (!jobId || !enabled) return;

        setLoading(true);
        setError(null);

        // 立即执行一次
        pollResult();

        // 设置定时轮询
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }
        intervalRef.current = window.setInterval(pollResult, 5000);
    }, [jobId, enabled, pollResult]);

    const stopPolling = useCallback(() => {
        setLoading(false);
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }, []);

    useEffect(() => {
        if (enabled && jobId) {
            startPolling();
        } else {
            stopPolling();
        }

        return () => {
            stopPolling();
        };
    }, [enabled, jobId, startPolling, stopPolling]);

    return {
        result,
        loading,
        error,
        startPolling,
        stopPolling,
    };
}

// 视频上传和分析Hook
export function useVideoAnalysis() {
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadMessage, setUploadMessage] = useState('');
    const [error, setError] = useState<string | null>(null);

    const uploadAndAnalyze = useCallback(async (
        file: File,
        onProgress?: (stage: string, progress?: { percentage: number }) => void
    ): Promise<string | null> => {
        try {
            setUploading(true);
            setError(null);
            setUploadProgress(0);

            // 文件大小检查
            const MAX_SIZE = 5000 * 1024 * 1024; // 5GB
            if (file.size > MAX_SIZE) {
                throw new Error('视频文件过大，最大支持5GB');
            }

            // 0. 运行上传诊断
            setUploadMessage('正在诊断上传环境...');
            onProgress?.('正在诊断上传环境...');

            try {
                const { UploadDiagnosticTool } = await import('../utils/uploadDiagnostics');
                const diagnostics = await UploadDiagnosticTool.runDiagnostics(file);

                // 检查是否有高风险问题
                const highRiskIssues = diagnostics.issues.filter(issue => issue.severity === 'high');
                if (highRiskIssues.length > 0) {
                    console.warn('⚠️ 检测到上传风险:', highRiskIssues);
                }
            } catch (diagError) {
                console.warn('诊断失败，继续上传:', diagError);
            }

            // 1. 获取上传URL
            setUploadMessage('正在准备上传...');
            onProgress?.('正在准备上传...');

            const uploadUrlResponse = await apiClient.generateUploadUrl(file.name, file.type);
            if (!uploadUrlResponse.success || !uploadUrlResponse.data) {
                throw new Error(uploadUrlResponse.error || '获取上传URL失败');
            }

            const { uploadUrl, publicUrl } = uploadUrlResponse.data;

            // 2. 上传文件到R2
            setUploadMessage('正在上传文件...');
            onProgress?.('正在上传文件...', { percentage: 0 });
            setUploadProgress(0);

            const uploadSuccess = await apiClient.uploadToR2(uploadUrl, file, (progress) => {
                const message = `正在上传文件... ${progress.percentage}%`;
                let detailMessage = message;

                if (progress.speed) {
                    // 简单的字节格式化函数
                    const formatBytes = (bytes: number): string => {
                        if (bytes === 0) return '0 B';
                        const k = 1024;
                        const sizes = ['B', 'KB', 'MB', 'GB'];
                        const i = Math.floor(Math.log(bytes) / Math.log(k));
                        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
                    };

                    const speedText = formatBytes(progress.speed);
                    detailMessage += ` (${speedText}/s)`;

                    if (progress.remainingTime && progress.remainingTime > 0) {
                        const minutes = Math.floor(progress.remainingTime / 60);
                        const seconds = Math.floor(progress.remainingTime % 60);
                        if (minutes > 0) {
                            detailMessage += ` - 剩余 ${minutes}:${seconds.toString().padStart(2, '0')}`;
                        } else {
                            detailMessage += ` - 剩余 ${seconds}秒`;
                        }
                    }
                }

                setUploadMessage(detailMessage);
                setUploadProgress(progress.percentage);
                onProgress?.(detailMessage, { percentage: progress.percentage });
            });

            if (!uploadSuccess) {
                throw new Error('文件上传失败');
            }

            // 3. 提交分析任务
            setUploadMessage('正在启动分析...');
            onProgress?.('正在启动分析...', { percentage: 80 });
            setUploadProgress(80);

            const submitResponse = await apiClient.submitVideoUrl(publicUrl, file.name, file.type);
            if (!submitResponse.success || !submitResponse.data) {
                throw new Error(submitResponse.error || '启动分析失败');
            }

            setUploadMessage('分析任务已启动');
            onProgress?.('分析任务已启动', { percentage: 100 });
            setUploadProgress(100);

            return submitResponse.data.job_id;

        } catch (err) {
            console.error('上传分析错误:', err);
            const errorMessage = err instanceof Error ? err.message : '上传分析时发生错误';
            setError(errorMessage);
            onProgress?.(`错误: ${errorMessage}`);
            return null;
        } finally {
            setUploading(false);
        }
    }, []);

    const reset = useCallback(() => {
        setUploading(false);
        setUploadProgress(0);
        setUploadMessage('');
        setError(null);
    }, []);

    return {
        uploading,
        uploadProgress,
        uploadMessage,
        error,
        uploadAndAnalyze,
        reset,
    };
}

// 任务重试Hook
export function useJobRetry() {
    const [retrying, setRetrying] = useState<Set<string>>(new Set());

    const retryJob = useCallback(async (jobId: string): Promise<boolean> => {
        try {
            setRetrying(prev => new Set(prev).add(jobId));

            const response = await apiClient.retryJob(jobId);

            if (response.success) {
                return true;
            } else {
                throw new Error(response.error || '重试失败');
            }
        } catch (err) {
            console.error('重试错误:', err);
            throw err;
        } finally {
            setRetrying(prev => {
                const newSet = new Set(prev);
                newSet.delete(jobId);
                return newSet;
            });
        }
    }, []);

    const isRetrying = useCallback((jobId: string) => {
        return retrying.has(jobId);
    }, [retrying]);

    return {
        retryJob,
        isRetrying,
    };
} 