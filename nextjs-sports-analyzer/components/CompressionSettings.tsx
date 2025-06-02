"use client";

import React, { useState, useEffect } from 'react';
import { CompressionOptions } from '../utils/videoCompression';

interface CompressionSettingsProps {
    onSettingsChange: (settings: CompressionOptions) => void;
    isVisible: boolean;
    onToggle: () => void;
}

export const CompressionSettings: React.FC<CompressionSettingsProps> = ({
    onSettingsChange,
    isVisible,
    onToggle
}) => {
    const [settings, setSettings] = useState<CompressionOptions>({
        maxWidth: 1280,
        maxHeight: 720,
        quality: 0.6,
        videoBitrate: 800000,
        maxFileSize: 50
    });

    const handleSettingChange = (key: keyof CompressionOptions, value: number) => {
        const newSettings = { ...settings, [key]: value };
        setSettings(newSettings);
        onSettingsChange(newSettings);
    };

    const presets = [
        {
            name: '高质量',
            settings: { maxWidth: 1920, maxHeight: 1080, quality: 0.8, videoBitrate: 1500000, maxFileSize: 100 }
        },
        {
            name: '标准质量',
            settings: { maxWidth: 1280, maxHeight: 720, quality: 0.6, videoBitrate: 800000, maxFileSize: 50 }
        },
        {
            name: '快速上传',
            settings: { maxWidth: 854, maxHeight: 480, quality: 0.4, videoBitrate: 400000, maxFileSize: 25 }
        },
        {
            name: '极速上传',
            settings: { maxWidth: 640, maxHeight: 360, quality: 0.3, videoBitrate: 200000, maxFileSize: 10 }
        }
    ];

    const applyPreset = (presetSettings: CompressionOptions) => {
        setSettings(presetSettings);
        onSettingsChange(presetSettings);
    };

    return (
        <div className="w-full">
            <button
                onClick={onToggle}
                className="w-full bg-slate-700 hover:bg-slate-600 text-sky-300 font-medium py-2 px-4 rounded-lg border border-sky-400 hover:border-sky-300 transition duration-300 ease-in-out flex items-center justify-between"
            >
                <span>压缩设置</span>
                <i className={`fas fa-chevron-${isVisible ? 'up' : 'down'}`}></i>
            </button>

            {isVisible && (
                <div className="mt-4 p-4 bg-slate-800 rounded-lg border border-slate-600">
                    {/* 预设选项 */}
                    <div className="mb-6">
                        <h3 className="text-sky-300 font-medium mb-3">快速预设</h3>
                        <div className="grid grid-cols-2 gap-2">
                            {presets.map((preset, index) => (
                                <button
                                    key={index}
                                    onClick={() => applyPreset(preset.settings)}
                                    className="bg-slate-700 hover:bg-slate-600 text-white py-2 px-3 rounded text-sm transition duration-200"
                                >
                                    {preset.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 详细设置 */}
                    <div className="space-y-4">
                        <h3 className="text-sky-300 font-medium">详细设置</h3>

                        {/* 分辨率设置 */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-slate-300 text-sm mb-1">最大宽度</label>
                                <select
                                    value={settings.maxWidth}
                                    onChange={(e) => handleSettingChange('maxWidth', Number(e.target.value))}
                                    className="w-full bg-slate-700 text-white border border-slate-600 rounded px-3 py-2 text-sm"
                                >
                                    <option value={640}>640px</option>
                                    <option value={854}>854px</option>
                                    <option value={1280}>1280px</option>
                                    <option value={1920}>1920px</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-slate-300 text-sm mb-1">最大高度</label>
                                <select
                                    value={settings.maxHeight}
                                    onChange={(e) => handleSettingChange('maxHeight', Number(e.target.value))}
                                    className="w-full bg-slate-700 text-white border border-slate-600 rounded px-3 py-2 text-sm"
                                >
                                    <option value={360}>360px</option>
                                    <option value={480}>480px</option>
                                    <option value={720}>720px</option>
                                    <option value={1080}>1080px</option>
                                </select>
                            </div>
                        </div>

                        {/* 质量设置 */}
                        <div>
                            <label className="block text-slate-300 text-sm mb-1">
                                视频质量: {Math.round(settings.quality! * 100)}%
                            </label>
                            <input
                                type="range"
                                min="0.1"
                                max="1"
                                step="0.1"
                                value={settings.quality}
                                onChange={(e) => handleSettingChange('quality', Number(e.target.value))}
                                className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer slider"
                            />
                            <div className="flex justify-between text-xs text-slate-400 mt-1">
                                <span>低质量</span>
                                <span>高质量</span>
                            </div>
                        </div>

                        {/* 比特率设置 */}
                        <div>
                            <label className="block text-slate-300 text-sm mb-1">
                                视频比特率: {Math.round(settings.videoBitrate! / 1000)}kbps
                            </label>
                            <input
                                type="range"
                                min="200000"
                                max="2000000"
                                step="100000"
                                value={settings.videoBitrate}
                                onChange={(e) => handleSettingChange('videoBitrate', Number(e.target.value))}
                                className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer slider"
                            />
                            <div className="flex justify-between text-xs text-slate-400 mt-1">
                                <span>200kbps</span>
                                <span>2000kbps</span>
                            </div>
                        </div>

                        {/* 文件大小限制 */}
                        <div>
                            <label className="block text-slate-300 text-sm mb-1">
                                最大文件大小: {settings.maxFileSize}MB
                            </label>
                            <input
                                type="range"
                                min="5"
                                max="200"
                                step="5"
                                value={settings.maxFileSize}
                                onChange={(e) => handleSettingChange('maxFileSize', Number(e.target.value))}
                                className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer slider"
                            />
                            <div className="flex justify-between text-xs text-slate-400 mt-1">
                                <span>5MB</span>
                                <span>200MB</span>
                            </div>
                        </div>
                    </div>

                    {/* 预估信息 */}
                    <div className="mt-4 p-3 bg-slate-900 rounded border border-slate-600">
                        <h4 className="text-sky-300 text-sm font-medium mb-2">预估效果</h4>
                        <div className="text-xs text-slate-400 space-y-1">
                            <div>分辨率: {settings.maxWidth} × {settings.maxHeight}</div>
                            <div>质量等级: {settings.quality! >= 0.8 ? '高' : settings.quality! >= 0.5 ? '中' : '低'}</div>
                            <div>上传速度: {settings.maxFileSize! <= 20 ? '很快' : settings.maxFileSize! <= 50 ? '较快' : '一般'}</div>
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