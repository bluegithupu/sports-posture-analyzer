"use client";

import React, { useState } from 'react';
import { CompressionOptions } from '../utils/imageCompression';

interface ImageCompressionSettingsProps {
  options: CompressionOptions;
  onChange: (options: CompressionOptions) => void;
  onToggle: (enabled: boolean) => void;
  enabled: boolean;
}

export const ImageCompressionSettings: React.FC<ImageCompressionSettingsProps> = ({
  options,
  onChange,
  onToggle,
  enabled
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleOptionChange = (key: keyof CompressionOptions, value: string | number | boolean) => {
    onChange({
      ...options,
      [key]: value
    });
  };

  return (
    <div className="p-4 bg-slate-800 rounded-lg border border-slate-600">
      {/* 压缩开关和标题 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <i className="fas fa-compress-alt text-sky-400"></i>
          <h4 className="text-lg font-semibold text-slate-300">图片压缩设置</h4>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-slate-400 hover:text-slate-300 transition-colors"
            title="展开/收起设置"
          >
            <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'}`}></i>
          </button>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => onToggle(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-sky-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600"></div>
          </label>
        </div>
      </div>

      {/* 压缩状态说明 */}
      <div className="mb-3">
        {enabled ? (
          <p className="text-sm text-green-400">
            ✅ 自动压缩已启用 - 大图片将自动优化以提升上传速度
          </p>
        ) : (
          <p className="text-sm text-slate-400">
            ❌ 自动压缩已禁用 - 图片将以原始大小上传
          </p>
        )}
      </div>

      {/* 详细设置 */}
      {isExpanded && enabled && (
        <div className="space-y-4 pt-3 border-t border-slate-600">
          {/* 预设按钮 */}
          <div className="flex space-x-2 mb-4">
            <button
              onClick={() => onChange({
                maxWidth: 1920,
                maxHeight: 1080,
                quality: 0.8,
                maxSizeKB: 1024,
                format: 'jpeg',
                enableResize: true,
                enableQualityAdjust: true,
              })}
              className="px-3 py-1 bg-sky-600 hover:bg-sky-700 text-white text-sm rounded transition-colors"
            >
              高质量
            </button>
            <button
              onClick={() => onChange({
                maxWidth: 1280,
                maxHeight: 720,
                quality: 0.7,
                maxSizeKB: 512,
                format: 'jpeg',
                enableResize: true,
                enableQualityAdjust: true,
              })}
              className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition-colors"
            >
              平衡
            </button>
            <button
              onClick={() => onChange({
                maxWidth: 800,
                maxHeight: 600,
                quality: 0.6,
                maxSizeKB: 256,
                format: 'jpeg',
                enableResize: true,
                enableQualityAdjust: true,
              })}
              className="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white text-sm rounded transition-colors"
            >
              快速上传
            </button>
          </div>

          {/* 最大尺寸设置 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                最大宽度 (px)
              </label>
              <input
                type="number"
                value={options.maxWidth || 1920}
                onChange={(e) => handleOptionChange('maxWidth', parseInt(e.target.value))}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500"
                min="100"
                max="4000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                最大高度 (px)
              </label>
              <input
                type="number"
                value={options.maxHeight || 1080}
                onChange={(e) => handleOptionChange('maxHeight', parseInt(e.target.value))}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500"
                min="100"
                max="4000"
              />
            </div>
          </div>

          {/* 质量设置 */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              图片质量: {Math.round((options.quality || 0.8) * 100)}%
            </label>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.1"
              value={options.quality || 0.8}
              onChange={(e) => handleOptionChange('quality', parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>低质量 (小文件)</span>
              <span>高质量 (大文件)</span>
            </div>
          </div>

          {/* 最大文件大小 */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              最大文件大小 (KB)
            </label>
            <input
              type="number"
              value={options.maxSizeKB || 1024}
              onChange={(e) => handleOptionChange('maxSizeKB', parseInt(e.target.value))}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500"
              min="100"
              max="10240"
            />
            <p className="text-xs text-slate-400 mt-1">
              约 {((options.maxSizeKB || 1024) / 1024).toFixed(1)} MB
            </p>
          </div>

          {/* 输出格式 */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              输出格式
            </label>
            <select
              value={options.format || 'jpeg'}
              onChange={(e) => handleOptionChange('format', e.target.value as 'jpeg' | 'webp' | 'png')}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="jpeg">JPEG (推荐，文件小)</option>
              <option value="webp">WebP (现代格式，更小)</option>
              <option value="png">PNG (无损，文件大)</option>
            </select>
          </div>

          {/* 高级选项 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-300">
                启用尺寸调整
              </label>
              <input
                type="checkbox"
                checked={options.enableResize !== false}
                onChange={(e) => handleOptionChange('enableResize', e.target.checked)}
                className="rounded border-slate-600 text-sky-600 focus:ring-sky-500"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-300">
                启用质量自动调整
              </label>
              <input
                type="checkbox"
                checked={options.enableQualityAdjust !== false}
                onChange={(e) => handleOptionChange('enableQualityAdjust', e.target.checked)}
                className="rounded border-slate-600 text-sky-600 focus:ring-sky-500"
              />
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #0ea5e9;
          cursor: pointer;
        }
        .slider::-moz-range-thumb {
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #0ea5e9;
          cursor: pointer;
          border: none;
        }
      `}</style>
    </div>
  );
};
