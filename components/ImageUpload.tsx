"use client";

import React, { useRef, useState } from 'react';

interface ImageUploadProps {
  onImagesSelect: (files: File[]) => void;
  maxImages?: number;
  currentImages?: File[];
}

export const ImageUpload: React.FC<ImageUploadProps> = ({ 
  onImagesSelect, 
  maxImages = 3,
  currentImages = []
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    handleFiles(files);
  };

  const handleFiles = (newFiles: File[]) => {
    // 过滤图片文件
    const imageFiles = newFiles.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
      alert('请选择图片文件');
      return;
    }

    // 合并现有图片和新图片，但不超过最大数量
    const allFiles = [...currentImages, ...imageFiles];
    const limitedFiles = allFiles.slice(0, maxImages);
    
    if (allFiles.length > maxImages) {
      alert(`最多只能选择 ${maxImages} 张图片，已自动选择前 ${maxImages} 张`);
    }

    onImagesSelect(limitedFiles);
    
    // 清空input以允许重新选择相同文件
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const canAddMore = currentImages.length < maxImages;

  return (
    <div className="w-full space-y-4">
      {/* 文件选择区域 */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all duration-300 ${
          dragOver
            ? 'border-sky-400 bg-sky-400/10'
            : canAddMore
            ? 'border-slate-600 hover:border-sky-400 hover:bg-slate-700/50'
            : 'border-slate-700 bg-slate-800/50 cursor-not-allowed'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={canAddMore ? handleClick : undefined}
      >
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          ref={fileInputRef}
          className="hidden"
          disabled={!canAddMore}
        />
        
        <div className="space-y-3">
          <i className={`fas fa-images text-4xl ${canAddMore ? 'text-sky-400' : 'text-slate-600'}`}></i>
          
          {canAddMore ? (
            <>
              <h3 className="text-lg font-semibold text-slate-300">
                选择图片文件
              </h3>
              <p className="text-sm text-slate-400">
                点击选择或拖拽图片到此处
              </p>
              <p className="text-xs text-slate-500">
                支持 JPG、PNG、GIF 等格式，最多 {maxImages} 张图片
              </p>
              <p className="text-xs text-slate-500">
                已选择 {currentImages.length} / {maxImages} 张
              </p>
            </>
          ) : (
            <>
              <h3 className="text-lg font-semibold text-slate-500">
                已达到最大图片数量
              </h3>
              <p className="text-sm text-slate-500">
                {currentImages.length} / {maxImages} 张图片已选择
              </p>
            </>
          )}
        </div>
      </div>

      {/* 图片数量提示 */}
      {currentImages.length > 0 && (
        <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg border border-slate-600">
          <div className="flex items-center space-x-2">
            <i className="fas fa-info-circle text-sky-400"></i>
            <span className="text-slate-300 text-sm">
              已选择 {currentImages.length} 张图片
            </span>
          </div>
          <div className="text-xs text-slate-400">
            {currentImages.length === 1 && '单张图片分析'}
            {currentImages.length > 1 && '多张图片对比分析'}
          </div>
        </div>
      )}

      {/* 支持格式说明 */}
      <div className="p-3 bg-blue-900/20 rounded-lg border border-blue-600/30">
        <div className="flex items-center space-x-2 text-blue-400">
          <i className="fas fa-lightbulb"></i>
          <span className="text-sm font-medium">图片分析说明</span>
        </div>
        <div className="mt-2 text-xs text-blue-300 space-y-1">
          <p>• 单张图片：分析运动姿态、身体对齐等</p>
          <p>• 多张图片：对比分析动作变化、进步情况</p>
          <p>• 建议上传清晰、光线充足的图片以获得更好的分析效果</p>
        </div>
      </div>
    </div>
  );
};
