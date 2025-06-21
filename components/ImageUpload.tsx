"use client";

import React, { useRef, useState } from 'react';
import { compressImage, CompressionOptions } from '../utils/imageCompression';

interface ImageUploadProps {
  onImagesSelect: (files: File[]) => void;
  maxImages?: number;
  currentImages?: File[];
  enableCompression?: boolean;
  onCompressionProgress?: (current: number, total: number, fileName: string) => void;
  compressionOptions?: CompressionOptions;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  onImagesSelect,
  maxImages = 3,
  currentImages = [],
  enableCompression = true,
  onCompressionProgress,
  compressionOptions
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [compressionStatus, setCompressionStatus] = useState('');

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    handleFiles(files);
  };

  const compressAndSelectFiles = async (files: File[]) => {
    try {
      setCompressing(true);
      setCompressionStatus('正在压缩图片...');

      const compressedFiles: File[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileName = file.name;

        setCompressionStatus(`正在压缩 ${fileName} (${i + 1}/${files.length})`);
        onCompressionProgress?.(i + 1, files.length, fileName);

        try {
          // 检查是否需要压缩（大于1MB的图片才压缩）
          if (file.size > 1024 * 1024) {
            const result = await compressImage(file, compressionOptions || {
              maxWidth: 1920,
              maxHeight: 1080,
              quality: 0.8,
              maxSizeKB: 1024,
              enableResize: true,
              enableQualityAdjust: true,
            });
            compressedFiles.push(result.file);
            console.log(`图片 ${fileName} 压缩完成:`, {
              原始大小: (file.size / 1024 / 1024).toFixed(2) + 'MB',
              压缩后大小: (result.file.size / 1024 / 1024).toFixed(2) + 'MB',
              压缩率: result.compressionRatio.toFixed(1) + '%'
            });
          } else {
            // 小于1MB的图片不压缩
            compressedFiles.push(file);
          }
        } catch (error) {
          console.error(`压缩图片 ${fileName} 失败:`, error);
          // 压缩失败时使用原始文件
          compressedFiles.push(file);
        }
      }

      setCompressionStatus('压缩完成');
      onImagesSelect(compressedFiles);

    } catch (error) {
      console.error('图片压缩过程出错:', error);
      // 出错时使用原始文件
      onImagesSelect(files);
    } finally {
      setCompressing(false);
      setTimeout(() => setCompressionStatus(''), 2000);
    }
  };

  const handleFiles = async (newFiles: File[]) => {
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

    // 如果启用压缩，先压缩图片
    if (enableCompression) {
      await compressAndSelectFiles(limitedFiles);
    } else {
      onImagesSelect(limitedFiles);
    }

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
        className={`relative border-2 border-dashed rounded-lg p-4 sm:p-6 text-center cursor-pointer transition-all duration-300 touch-target ${dragOver
          ? 'border-sky-400 bg-sky-400/10'
          : canAddMore
            ? 'border-slate-600 hover:border-sky-400 hover:bg-slate-700/50'
            : 'border-slate-700 bg-slate-800/50 cursor-not-allowed'
          }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={canAddMore && !compressing ? handleClick : undefined}
      >
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          ref={fileInputRef}
          className="hidden"
          disabled={!canAddMore || compressing}
        />

        <div className="space-y-2 sm:space-y-3">
          <i className={`fas ${compressing ? 'fa-spinner fa-spin' : 'fa-images'} text-3xl sm:text-4xl ${canAddMore && !compressing ? 'text-sky-400' : 'text-slate-600'}`}></i>

          {compressing ? (
            <>
              <h3 className="text-base sm:text-lg font-semibold text-slate-300">
                正在压缩图片
              </h3>
              <p className="text-sm text-slate-400 px-2">
                {compressionStatus}
              </p>
              <p className="text-xs sm:text-sm text-slate-500 px-2">
                请稍候，正在优化图片大小以提升上传速度...
              </p>
            </>
          ) : canAddMore ? (
            <>
              <h3 className="text-base sm:text-lg font-semibold text-slate-300">
                选择图片文件
              </h3>
              <p className="text-sm text-slate-400 px-2">
                <span className="hidden sm:inline">点击选择或拖拽图片到此处</span>
                <span className="sm:hidden">点击选择图片</span>
              </p>
              <p className="text-xs sm:text-sm text-slate-500 px-2">
                支持 JPG、PNG、GIF 等格式，最多 {maxImages} 张图片
              </p>
              <p className="text-xs sm:text-sm text-slate-500">
                已选择 {currentImages.length} / {maxImages} 张
              </p>
              {enableCompression && (
                <p className="text-xs sm:text-sm text-green-400 px-2">
                  ✨ 自动压缩已启用，大图片将自动优化
                </p>
              )}
            </>
          ) : (
            <>
              <h3 className="text-base sm:text-lg font-semibold text-slate-500">
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
