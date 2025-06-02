"use client";

import React, { useRef, useState } from 'react';
import { VideoCompressor, CompressionOptions, CompressionProgress } from '../utils/videoCompression';
import { CompressionSettings } from './CompressionSettings';
import { CompressionProgress as CompressionProgressComponent } from './CompressionProgress';
import { COMPRESSION_CONFIG, getCompressionStatusText } from '../utils/compressionConfig';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState<CompressionProgress>({ progress: 0, stage: '' });
  const [showSettings, setShowSettings] = useState(false);
  const [compressionSettings, setCompressionSettings] = useState<CompressionOptions>(
    COMPRESSION_CONFIG.defaultSettings
  );
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [enableCompression, setEnableCompression] = useState(COMPRESSION_CONFIG.autoCompressionEnabled);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setOriginalFile(file);

      // 取消自动压缩，直接选择文件
      onFileSelect(file);
    }
  };

  const compressAndSelectFile = async (file: File) => {
    try {
      setIsCompressing(true);
      setCompressionProgress({ progress: 0, stage: '开始压缩...' });

      // 添加详细的诊断信息
      console.log('开始压缩文件:', {
        name: file.name,
        size: file.size,
        type: file.type,
        settings: compressionSettings
      });

      // 检查压缩支持
      const isSupported = VideoCompressor.isCompressionSupported();
      console.log('压缩支持检查:', isSupported);

      if (!isSupported) {
        console.error('浏览器不支持视频压缩功能');
        throw new Error('浏览器不支持视频压缩功能');
      }

      const supportedFormats = VideoCompressor.getSupportedFormats();
      console.log('支持的视频格式:', supportedFormats);

      const compressedFile = await VideoCompressor.compressVideo(
        file,
        compressionSettings,
        (progress) => {
          console.log('压缩进度:', progress);
          setCompressionProgress(progress);
        }
      );

      // 显示压缩结果
      const originalSize = VideoCompressor.formatFileSize(file.size);
      const compressedSize = VideoCompressor.formatFileSize(compressedFile.size);
      const reduction = VideoCompressor.getFileSizeReduction(file.size, compressedFile.size);

      console.log(`压缩完成: ${originalSize} → ${compressedSize} (减少 ${reduction})`);

      // 验证压缩结果
      if (compressedFile.size === 0) {
        throw new Error('压缩后的文件为空');
      }

      if (compressedFile.size >= file.size) {
        console.warn('压缩后文件大小没有减少，可能是文件已经很小或压缩失败');
      }

      onFileSelect(compressedFile);
    } catch (error) {
      console.error('压缩失败，详细错误信息:', {
        error: error,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        settings: compressionSettings
      });

      // 显示用户友好的错误信息
      let userMessage = '压缩失败，将使用原文件';
      if (error instanceof Error) {
        if (error.message.includes('不支持')) {
          userMessage = '当前浏览器不支持视频压缩功能，将使用原文件';
        } else if (error.message.includes('超时')) {
          userMessage = '压缩超时，文件可能太大，将使用原文件';
        } else if (error.message.includes('格式')) {
          userMessage = '视频格式不支持压缩，将使用原文件';
        }
      }

      console.log(userMessage);
      // 压缩失败时使用原文件
      onFileSelect(file);
    } finally {
      setIsCompressing(false);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleManualCompress = async () => {
    if (originalFile) {
      await compressAndSelectFile(originalFile);
    }
  };

  const cancelCompression = () => {
    setIsCompressing(false);
    // 注意：实际的取消逻辑需要在VideoCompressor中实现
  };

  return (
    <div className="w-full space-y-4">
      {/* 文件选择按钮 */}
      <div>
        <input
          type="file"
          accept="video/*"
          onChange={handleFileChange}
          ref={fileInputRef}
          className="hidden"
          id="videoUpload"
        />
        <button
          onClick={handleClick}
          disabled={isCompressing}
          className="w-full bg-slate-600 hover:bg-slate-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-sky-300 font-semibold py-3 px-4 rounded-lg border border-sky-400 hover:border-sky-300 disabled:border-slate-600 transition duration-300 ease-in-out flex items-center justify-center space-x-2"
        >
          <i className="fas fa-video"></i>
          <span>{isCompressing ? '正在处理...' : '选择视频文件'}</span>
        </button>
        <p className="text-xs text-slate-400 mt-2 text-center">
          支持常见视频格式 (MP4, MOV, AVI, etc.)
          {enableCompression ? (
            <span className="block text-green-400 mt-1">
              <i className="fas fa-compress-alt mr-1"></i>
              自动压缩已启用
            </span>
          ) : (
            <span className="block text-slate-400 mt-1">
              <i className="fas fa-compress-alt mr-1"></i>
              自动压缩已关闭
            </span>
          )}
        </p>
      </div>

      {/* 压缩开关 */}
      <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg border border-slate-600">
        <div className="flex items-center space-x-2">
          <i className="fas fa-compress-alt text-sky-400"></i>
          <span className="text-slate-300 text-sm">启用视频压缩 (手动控制)</span>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={enableCompression}
            onChange={(e) => setEnableCompression(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-500"></div>
        </label>
      </div>

      {/* R2 上传提示 */}
      <div className="p-3 bg-green-900/20 rounded-lg border border-green-600/30">
        <div className="flex items-center space-x-2 text-green-400">
          <i className="fas fa-cloud-upload-alt"></i>
          <span className="text-sm font-medium">云存储直接上传</span>
        </div>
        <p className="text-xs text-green-300 mt-1">
          文件将直接上传到 Cloudflare R2 云存储，无需压缩，支持更大的文件和更快的上传速度。
        </p>
      </div>

      {/* 压缩设置 */}
      {enableCompression && COMPRESSION_CONFIG.showCompressionSettings && (
        <CompressionSettings
          onSettingsChange={setCompressionSettings}
          isVisible={showSettings}
          onToggle={() => setShowSettings(!showSettings)}
        />
      )}

      {/* 手动压缩按钮 */}
      {originalFile && enableCompression && !isCompressing && (
        <button
          onClick={handleManualCompress}
          className="w-full bg-sky-600 hover:bg-sky-500 text-white font-medium py-2 px-4 rounded-lg transition duration-300 ease-in-out flex items-center justify-center space-x-2"
        >
          <i className="fas fa-compress-alt"></i>
          <span>手动压缩当前文件</span>
        </button>
      )}

      {/* 文件信息显示 */}
      {originalFile && (
        <div className="p-3 bg-slate-900 rounded-lg border border-slate-600">
          <div className="text-sm text-slate-400 space-y-1">
            <div className="flex justify-between">
              <span>文件名:</span>
              <span className="text-slate-300 truncate ml-2">{originalFile.name}</span>
            </div>
            <div className="flex justify-between">
              <span>文件大小:</span>
              <span className="text-slate-300">{VideoCompressor.formatFileSize(originalFile.size)}</span>
            </div>
            <div className="flex justify-between">
              <span>状态:</span>
              <span className="text-green-400">
                已选择，可直接使用
              </span>
            </div>
            <div className="flex justify-between">
              <span>压缩状态:</span>
              <span className={getCompressionStatusText(originalFile.size).color}>
                {getCompressionStatusText(originalFile.size).text}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 压缩进度弹窗 */}
      <CompressionProgressComponent
        progress={compressionProgress}
        originalSize={originalFile?.size || 0}
        isVisible={isCompressing}
        onCancel={cancelCompression}
      />
    </div>
  );
};
