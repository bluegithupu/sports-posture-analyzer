import React, { useRef, useState } from 'react';
import { VideoCompressor, CompressionOptions, CompressionProgress } from '../utils/videoCompression';
import { CompressionSettings } from './CompressionSettings';
import { CompressionProgress as CompressionProgressComponent } from './CompressionProgress';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState<CompressionProgress>({ progress: 0, stage: '' });
  const [showSettings, setShowSettings] = useState(false);
  const [compressionSettings, setCompressionSettings] = useState<CompressionOptions>({
    maxWidth: 1280,
    maxHeight: 720,
    quality: 0.6,
    videoBitrate: 800000,
    maxFileSize: 50
  });
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [enableCompression, setEnableCompression] = useState(true);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setOriginalFile(file);

      // 检查文件大小，如果超过设定值且启用压缩，则进行压缩
      const fileSizeMB = file.size / (1024 * 1024);
      const shouldCompress = enableCompression && fileSizeMB > compressionSettings.maxFileSize!;

      if (shouldCompress) {
        await compressAndSelectFile(file);
      } else {
        onFileSelect(file);
      }
    }
  };

  const compressAndSelectFile = async (file: File) => {
    try {
      setIsCompressing(true);
      setCompressionProgress({ progress: 0, stage: '开始压缩...' });

      const compressedFile = await VideoCompressor.compressVideo(
        file,
        compressionSettings,
        (progress) => {
          setCompressionProgress(progress);
        }
      );

      // 显示压缩结果
      const originalSize = VideoCompressor.formatFileSize(file.size);
      const compressedSize = VideoCompressor.formatFileSize(compressedFile.size);
      const reduction = VideoCompressor.getFileSizeReduction(file.size, compressedFile.size);

      console.log(`压缩完成: ${originalSize} → ${compressedSize} (减少 ${reduction})`);

      onFileSelect(compressedFile);
    } catch (error) {
      console.error('压缩失败:', error);
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
          {enableCompression && (
            <span className="block text-green-400 mt-1">
              <i className="fas fa-compress-alt mr-1"></i>
              自动压缩已启用
            </span>
          )}
        </p>
      </div>

      {/* 压缩开关 */}
      <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg border border-slate-600">
        <div className="flex items-center space-x-2">
          <i className="fas fa-compress-alt text-sky-400"></i>
          <span className="text-slate-300 text-sm">自动压缩大文件</span>
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

      {/* 压缩设置 */}
      {enableCompression && (
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
              <span className={`${originalFile.size > (compressionSettings.maxFileSize! * 1024 * 1024) ? 'text-yellow-400' : 'text-green-400'}`}>
                {originalFile.size > (compressionSettings.maxFileSize! * 1024 * 1024) ? '建议压缩' : '大小合适'}
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
