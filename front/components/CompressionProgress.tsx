import React from 'react';
import { CompressionProgress as ProgressType } from '../utils/videoCompression';

interface CompressionProgressProps {
    progress: ProgressType;
    originalSize: number;
    isVisible: boolean;
    onCancel?: () => void;
}

export const CompressionProgress: React.FC<CompressionProgressProps> = ({
    progress,
    originalSize,
    isVisible,
    onCancel
}) => {
    if (!isVisible) return null;

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4 border border-slate-600">
                <div className="text-center">
                    <div className="mb-4">
                        <i className="fas fa-compress-alt text-sky-400 text-3xl mb-2"></i>
                        <h3 className="text-sky-300 text-lg font-semibold">正在压缩视频</h3>
                    </div>

                    {/* 进度条 */}
                    <div className="mb-4">
                        <div className="flex justify-between text-sm text-slate-300 mb-2">
                            <span>{progress.stage}</span>
                            <span>{progress.progress}%</span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-3">
                            <div
                                className="bg-gradient-to-r from-sky-500 to-blue-500 h-3 rounded-full transition-all duration-300 ease-out"
                                style={{ width: `${progress.progress}%` }}
                            ></div>
                        </div>
                    </div>

                    {/* 文件信息 */}
                    <div className="bg-slate-900 rounded p-3 mb-4">
                        <div className="text-sm text-slate-400 space-y-1">
                            <div className="flex justify-between">
                                <span>原始大小:</span>
                                <span className="text-slate-300">{formatFileSize(originalSize)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>预计压缩:</span>
                                <span className="text-green-400">30-70%</span>
                            </div>
                        </div>
                    </div>

                    {/* 进度动画 */}
                    <div className="flex justify-center mb-4">
                        <div className="flex space-x-1">
                            {[0, 1, 2].map((i) => (
                                <div
                                    key={i}
                                    className="w-2 h-2 bg-sky-400 rounded-full animate-pulse"
                                    style={{
                                        animationDelay: `${i * 0.2}s`,
                                        animationDuration: '1s'
                                    }}
                                ></div>
                            ))}
                        </div>
                    </div>

                    {/* 取消按钮 */}
                    {onCancel && progress.progress < 90 && (
                        <button
                            onClick={onCancel}
                            className="bg-slate-700 hover:bg-slate-600 text-slate-300 px-4 py-2 rounded text-sm transition duration-200"
                        >
                            取消压缩
                        </button>
                    )}

                    {/* 提示信息 */}
                    <div className="mt-4 text-xs text-slate-500">
                        <p>压缩过程可能需要几分钟，请耐心等待</p>
                        <p>压缩后的视频将自动用于分析</p>
                    </div>
                </div>
            </div>
        </div>
    );
}; 