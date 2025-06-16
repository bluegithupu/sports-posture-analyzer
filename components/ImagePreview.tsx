"use client";

import React, { useState, useEffect } from 'react';

interface ImagePreviewProps {
  images: File[];
  onRemoveImage: (index: number) => void;
}

export const ImagePreview: React.FC<ImagePreviewProps> = ({ images, onRemoveImage }) => {
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  useEffect(() => {
    // 创建图片预览URL
    const previews = images.map(file => URL.createObjectURL(file));
    setImagePreviews(previews);

    // 清理函数：释放URL对象
    return () => {
      previews.forEach(url => URL.revokeObjectURL(url));
    };
  }, [images]);

  if (images.length === 0) {
    return null;
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-semibold text-slate-300">图片预览</h4>
        <span className="text-sm text-slate-400">{images.length} 张图片</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {images.map((file, index) => (
          <div key={index} className="relative group">
            {/* 图片容器 */}
            <div className="relative aspect-square bg-slate-800 rounded-lg overflow-hidden border border-slate-600">
              {imagePreviews[index] && (
                <img
                  src={imagePreviews[index]}
                  alt={`预览图片 ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              )}
              
              {/* 删除按钮 */}
              <button
                onClick={() => onRemoveImage(index)}
                className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white rounded-full w-8 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                title="删除图片"
              >
                <i className="fas fa-times text-sm"></i>
              </button>

              {/* 图片序号 */}
              <div className="absolute top-2 left-2 bg-slate-900/80 text-white text-xs px-2 py-1 rounded">
                {index + 1}
              </div>
            </div>

            {/* 图片信息 */}
            <div className="mt-2 space-y-1">
              <p className="text-sm text-slate-300 truncate" title={file.name}>
                {file.name}
              </p>
              <div className="flex justify-between text-xs text-slate-400">
                <span>{formatFileSize(file.size)}</span>
                <span>{file.type.split('/')[1].toUpperCase()}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 图片总览信息 */}
      <div className="p-3 bg-slate-900 rounded-lg border border-slate-600">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-slate-400">图片数量:</span>
            <span className="text-slate-300 ml-2">{images.length} 张</span>
          </div>
          <div>
            <span className="text-slate-400">总大小:</span>
            <span className="text-slate-300 ml-2">
              {formatFileSize(images.reduce((total, file) => total + file.size, 0))}
            </span>
          </div>
          <div>
            <span className="text-slate-400">格式:</span>
            <span className="text-slate-300 ml-2">
              {[...new Set(images.map(file => file.type.split('/')[1]))].join(', ').toUpperCase()}
            </span>
          </div>
          <div>
            <span className="text-slate-400">状态:</span>
            <span className="text-green-400 ml-2">已准备分析</span>
          </div>
        </div>
      </div>
    </div>
  );
};
