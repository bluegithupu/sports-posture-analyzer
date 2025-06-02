export interface CompressionConfig {
    // 是否启用自动压缩
    autoCompressionEnabled: boolean;

    // 自动压缩的文件大小阈值 (MB)
    autoCompressionThreshold: number;

    // 默认压缩设置
    defaultSettings: {
        maxWidth: number;
        maxHeight: number;
        quality: number;
        videoBitrate: number;
        maxFileSize: number;
    };

    // 是否显示压缩设置面板
    showCompressionSettings: boolean;
}

export const COMPRESSION_CONFIG: CompressionConfig = {
    // 🚫 自动压缩已禁用
    autoCompressionEnabled: false,

    // 自动压缩阈值设为较大值，基本不会触发
    autoCompressionThreshold: 1000, // 1GB

    // 保留默认设置供手动压缩使用
    defaultSettings: {
        maxWidth: 1280,
        maxHeight: 720,
        quality: 0.6,
        videoBitrate: 800000,
        maxFileSize: 50
    },

    // 保留设置面板供高级用户使用
    showCompressionSettings: true
};

/**
 * 检查文件是否需要自动压缩
 */
export function shouldAutoCompress(fileSize: number): boolean {
    if (!COMPRESSION_CONFIG.autoCompressionEnabled) {
        return false;
    }

    const fileSizeMB = fileSize / (1024 * 1024);
    return fileSizeMB > COMPRESSION_CONFIG.autoCompressionThreshold;
}

/**
 * 获取用户友好的压缩状态描述
 */
export function getCompressionStatusText(fileSize: number): {
    text: string;
    color: string;
} {
    if (!COMPRESSION_CONFIG.autoCompressionEnabled) {
        return {
            text: '自动压缩已关闭',
            color: 'text-slate-400'
        };
    }

    const fileSizeMB = fileSize / (1024 * 1024);

    if (fileSizeMB > COMPRESSION_CONFIG.autoCompressionThreshold) {
        return {
            text: '建议压缩',
            color: 'text-yellow-400'
        };
    } else {
        return {
            text: '大小合适',
            color: 'text-green-400'
        };
    }
} 