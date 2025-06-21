"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';

interface ImagePreviewDebugProps {
    imageUrl: string;
    filename?: string;
}

export const ImagePreviewDebug: React.FC<ImagePreviewDebugProps> = ({ 
    imageUrl, 
    filename = '未知文件' 
}) => {
    const [imageStatus, setImageStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [imageInfo, setImageInfo] = useState<{
        url: string;
        domain: string;
        protocol: string;
        isValidDomain: boolean;
        corsTest?: string;
    } | null>(null);

    useEffect(() => {
        // 分析图片URL
        try {
            const url = new URL(imageUrl);
            const domain = url.hostname;
            const protocol = url.protocol;
            
            // 检查是否是已知的R2域名
            const isValidDomain = 
                domain.includes('.r2.dev') ||
                domain.includes('.r2.cloudflarestorage.com') ||
                domain.includes('cloudflare');

            setImageInfo({
                url: imageUrl,
                domain,
                protocol,
                isValidDomain,
            });

            // 测试图片是否可访问
            testImageAccess(imageUrl);
        } catch (error) {
            console.error('Invalid URL:', imageUrl, error);
            setImageStatus('error');
        }
    }, [imageUrl]);

    const testImageAccess = async (url: string) => {
        try {
            const response = await fetch(url, { method: 'HEAD' });
            if (response.ok) {
                setImageStatus('success');
                setImageInfo(prev => prev ? { ...prev, corsTest: 'success' } : null);
            } else {
                setImageStatus('error');
                setImageInfo(prev => prev ? { ...prev, corsTest: `HTTP ${response.status}` } : null);
            }
        } catch (error) {
            setImageStatus('error');
            setImageInfo(prev => prev ? { ...prev, corsTest: 'CORS/Network Error' } : null);
        }
    };

    return (
        <div className="p-4 bg-slate-800 rounded-lg border border-slate-600">
            <h4 className="text-lg font-semibold text-slate-300 mb-3">图片预览调试</h4>
            
            {/* 图片预览区域 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {/* Next.js Image 组件 */}
                <div>
                    <h5 className="text-sm font-medium text-slate-400 mb-2">Next.js Image 组件</h5>
                    <div className="relative w-32 h-24 bg-slate-700 rounded border">
                        {imageStatus === 'loading' && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400"></div>
                            </div>
                        )}
                        {imageStatus === 'success' && (
                            <Image
                                src={imageUrl}
                                alt="Next.js预览"
                                fill
                                className="object-cover rounded"
                                onError={() => setImageStatus('error')}
                                unoptimized={true}
                            />
                        )}
                        {imageStatus === 'error' && (
                            <div className="absolute inset-0 flex items-center justify-center text-red-400">
                                <i className="fas fa-exclamation-triangle"></i>
                            </div>
                        )}
                    </div>
                </div>

                {/* 普通 img 标签 */}
                <div>
                    <h5 className="text-sm font-medium text-slate-400 mb-2">普通 img 标签</h5>
                    <div className="relative w-32 h-24 bg-slate-700 rounded border">
                        <img
                            src={imageUrl}
                            alt="普通img预览"
                            className="w-full h-full object-cover rounded"
                            onLoad={() => console.log('普通img加载成功')}
                            onError={() => console.log('普通img加载失败')}
                        />
                    </div>
                </div>
            </div>

            {/* 调试信息 */}
            {imageInfo && (
                <div className="space-y-2 text-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <span className="text-slate-400">文件名:</span>
                            <span className="text-slate-300 ml-2">{filename}</span>
                        </div>
                        <div>
                            <span className="text-slate-400">状态:</span>
                            <span className={`ml-2 ${
                                imageStatus === 'success' ? 'text-green-400' :
                                imageStatus === 'error' ? 'text-red-400' : 'text-yellow-400'
                            }`}>
                                {imageStatus === 'success' ? '✅ 成功' :
                                 imageStatus === 'error' ? '❌ 失败' : '⏳ 加载中'}
                            </span>
                        </div>
                        <div>
                            <span className="text-slate-400">域名:</span>
                            <span className="text-slate-300 ml-2">{imageInfo.domain}</span>
                        </div>
                        <div>
                            <span className="text-slate-400">协议:</span>
                            <span className="text-slate-300 ml-2">{imageInfo.protocol}</span>
                        </div>
                        <div>
                            <span className="text-slate-400">域名验证:</span>
                            <span className={`ml-2 ${imageInfo.isValidDomain ? 'text-green-400' : 'text-red-400'}`}>
                                {imageInfo.isValidDomain ? '✅ 已配置' : '❌ 未配置'}
                            </span>
                        </div>
                        <div>
                            <span className="text-slate-400">网络测试:</span>
                            <span className={`ml-2 ${
                                imageInfo.corsTest === 'success' ? 'text-green-400' : 'text-red-400'
                            }`}>
                                {imageInfo.corsTest || '测试中...'}
                            </span>
                        </div>
                    </div>
                    
                    <div className="mt-3 p-2 bg-slate-900 rounded text-xs">
                        <span className="text-slate-400">完整URL:</span>
                        <div className="text-slate-300 break-all mt-1">{imageUrl}</div>
                    </div>
                </div>
            )}

            {/* 解决建议 */}
            {imageStatus === 'error' && (
                <div className="mt-4 p-3 bg-red-900/20 border border-red-600/30 rounded">
                    <h6 className="text-red-400 font-medium mb-2">可能的解决方案:</h6>
                    <ul className="text-sm text-red-300 space-y-1">
                        <li>• 检查图片URL是否正确</li>
                        <li>• 确认Cloudflare R2的CORS配置</li>
                        <li>• 验证Next.js的图片域名配置</li>
                        <li>• 检查图片是否存在于R2存储桶中</li>
                        <li>• 确认R2存储桶的公共访问权限</li>
                    </ul>
                </div>
            )}
        </div>
    );
};
