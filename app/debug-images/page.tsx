"use client";

import React, { useState, useEffect } from 'react';
import { ImagePreviewDebug } from '@/components/ImagePreviewDebug';
import { useAnalysisHistory } from '@/lib/hooks';

export default function DebugImagesPage() {
    const [testUrl, setTestUrl] = useState('');
    const [imageRecords, setImageRecords] = useState<Array<{
        id: string;
        analysis_type?: string;
        image_urls?: string[];
        image_count?: number;
        created_at: string;
        status: string;
        original_filename?: string;
    }>>([]);
    const { history, loading, error } = useAnalysisHistory(20);

    useEffect(() => {
        // 筛选出图片分析记录
        if (history) {
            const imageAnalysisRecords = history.filter(record => 
                record.analysis_type === 'image' && 
                record.image_urls && 
                record.image_urls.length > 0
            );
            setImageRecords(imageAnalysisRecords);
        }
    }, [history]);

    const handleTestUrl = () => {
        if (!testUrl.trim()) {
            alert('请输入图片URL');
            return;
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-slate-100">
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-6xl mx-auto">
                    <h1 className="text-3xl font-bold mb-8 text-center text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-cyan-300">
                        图片预览调试工具
                    </h1>

                    {/* 手动测试区域 */}
                    <div className="mb-8 p-6 bg-slate-800 rounded-lg shadow-lg">
                        <h2 className="text-xl font-semibold mb-4 text-sky-300">手动测试图片URL</h2>
                        <div className="flex gap-4 mb-4">
                            <input
                                type="text"
                                value={testUrl}
                                onChange={(e) => setTestUrl(e.target.value)}
                                placeholder="输入图片URL进行测试..."
                                className="flex-1 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                            />
                            <button
                                onClick={handleTestUrl}
                                className="px-6 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg transition duration-200"
                            >
                                测试
                            </button>
                        </div>
                        
                        {testUrl && (
                            <ImagePreviewDebug 
                                imageUrl={testUrl} 
                                filename="手动测试图片"
                            />
                        )}
                    </div>

                    {/* 历史记录中的图片分析 */}
                    <div className="mb-8">
                        <h2 className="text-xl font-semibold mb-4 text-sky-300">
                            历史记录中的图片分析 ({imageRecords.length} 条)
                        </h2>

                        {loading && (
                            <div className="flex justify-center items-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-400"></div>
                                <span className="ml-3">正在加载历史记录...</span>
                            </div>
                        )}

                        {error && (
                            <div className="p-4 bg-red-900/20 border border-red-600/30 rounded-lg text-red-300">
                                加载历史记录失败: {error}
                            </div>
                        )}

                        {!loading && !error && imageRecords.length === 0 && (
                            <div className="text-center py-8 text-slate-400">
                                <i className="fas fa-image text-4xl mb-4"></i>
                                <p>暂无图片分析记录</p>
                                <p className="text-sm mt-2">请先进行一些图片分析，然后回到此页面查看调试信息</p>
                            </div>
                        )}

                        {imageRecords.length > 0 && (
                            <div className="space-y-6">
                                {imageRecords.map((record, index) => (
                                    <div key={record.id} className="border border-slate-600 rounded-lg overflow-hidden">
                                        <div className="p-4 bg-slate-700/50">
                                            <div className="flex justify-between items-center">
                                                <h3 className="text-lg font-medium text-slate-200">
                                                    记录 #{index + 1}
                                                </h3>
                                                <div className="text-sm text-slate-400">
                                                    {new Date(record.created_at).toLocaleString('zh-CN')}
                                                </div>
                                            </div>
                                            <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                                <div>
                                                    <span className="text-slate-400">状态:</span>
                                                    <span className={`ml-2 ${
                                                        record.status === 'completed' ? 'text-green-400' :
                                                        record.status === 'failed' ? 'text-red-400' : 'text-yellow-400'
                                                    }`}>
                                                        {record.status}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="text-slate-400">图片数量:</span>
                                                    <span className="text-slate-300 ml-2">{record.image_count || 1}</span>
                                                </div>
                                                <div>
                                                    <span className="text-slate-400">文件名:</span>
                                                    <span className="text-slate-300 ml-2">{record.original_filename || '未知'}</span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="p-4">
                                            {record.image_urls?.map((imageUrl: string, imgIndex: number) => (
                                                <div key={imgIndex} className="mb-6 last:mb-0">
                                                    <h4 className="text-md font-medium text-slate-300 mb-3">
                                                        图片 {imgIndex + 1} / {record.image_urls?.length || 0}
                                                    </h4>
                                                    <ImagePreviewDebug 
                                                        imageUrl={imageUrl}
                                                        filename={`${record.original_filename || '未知文件'} - 图片${imgIndex + 1}`}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* 配置信息 */}
                    <div className="p-6 bg-slate-800 rounded-lg shadow-lg">
                        <h2 className="text-xl font-semibold mb-4 text-sky-300">当前配置信息</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-slate-400">Next.js 版本:</span>
                                <span className="text-slate-300 ml-2">15.3.3</span>
                            </div>
                            <div>
                                <span className="text-slate-400">图片优化:</span>
                                <span className="text-slate-300 ml-2">已启用</span>
                            </div>
                            <div>
                                <span className="text-slate-400">支持的域名:</span>
                                <span className="text-slate-300 ml-2">*.r2.dev, *.r2.cloudflarestorage.com</span>
                            </div>
                            <div>
                                <span className="text-slate-400">CORS 状态:</span>
                                <span className="text-yellow-400 ml-2">需要检查</span>
                            </div>
                        </div>
                        
                        <div className="mt-4 p-3 bg-blue-900/20 border border-blue-600/30 rounded">
                            <h6 className="text-blue-400 font-medium mb-2">使用说明:</h6>
                            <ul className="text-sm text-blue-300 space-y-1">
                                <li>• 此页面用于调试图片预览问题</li>
                                <li>• 可以手动测试任意图片URL</li>
                                <li>• 自动检测历史记录中的图片分析</li>
                                <li>• 显示详细的错误信息和解决建议</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
