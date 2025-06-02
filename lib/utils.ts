import { v4 as uuidv4 } from 'uuid';

export function generateUniqueId(): string {
    return uuidv4();
}

export function getVideoFileName(url: string): string {
    try {
        const urlParts = url.split('/');
        const fileName = urlParts[urlParts.length - 1];
        return fileName || 'unknown_file.mp4';
    } catch {
        return 'unknown_file.mp4';
    }
}

export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function isValidVideoFile(file: File): boolean {
    const allowedMimeTypes = [
        'video/mp4',
        'video/quicktime',
        'video/x-msvideo',
        'video/x-matroska',
        'video/webm'
    ];

    return allowedMimeTypes.includes(file.type);
}

export function validateVideoFile(file: File, maxSizeMB: number = 5000): { valid: boolean; error?: string } {
    if (!isValidVideoFile(file)) {
        return {
            valid: false,
            error: '不支持的文件类型。请上传 MP4、MOV、AVI、MKV 或 WebM 格式的视频文件。'
        };
    }

    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
        return {
            valid: false,
            error: `文件过大。最大支持 ${maxSizeMB}MB 的视频文件。`
        };
    }

    return { valid: true };
}

export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

export function getFileExtension(filename: string): string {
    return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
}

export function sanitizeFilename(filename: string): string {
    // 移除或替换不安全的字符
    return filename.replace(/[^a-zA-Z0-9.-]/g, '_');
} 