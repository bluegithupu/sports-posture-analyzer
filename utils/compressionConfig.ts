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
    // ✅ 自动压缩已启用
    autoCompressionEnabled: true,

    // 自动压缩阈值设为较小值，大部分视频都会触发压缩
    autoCompressionThreshold: 10, // 10MB

    // 默认设置为最低质量以获得最小文件大小
    defaultSettings: {
        maxWidth: 854,      // 降低到480p宽度
        maxHeight: 480,     // 降低到480p高度
        quality: 0.3,       // 降低质量到30%
        videoBitrate: 300000, // 降低比特率到300kbps
        maxFileSize: 20     // 降低目标文件大小到20MB
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
            text: '将自动压缩为最低质量',
            color: 'text-orange-400'
        };
    } else {
        return {
            text: '文件较小，无需压缩',
            color: 'text-green-400'
        };
    }
}