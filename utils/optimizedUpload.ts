export interface UploadProgress {
    loaded: number;
    total: number;
    percentage: number;
    speed?: number; // bytes per second
    remainingTime?: number; // seconds
}

export interface ChunkUploadResult {
    success: boolean;
    error?: string;
}

export interface OptimizedUploadOptions {
    chunkSize?: number; // bytes, default 5MB
    maxConcurrent?: number; // max concurrent chunks, default 3
    maxRetries?: number; // max retries per chunk, default 3
    retryDelay?: number; // ms between retries, default 1000
}

export class OptimizedUploader {
    private static readonly DEFAULT_OPTIONS: OptimizedUploadOptions = {
        chunkSize: 5 * 1024 * 1024, // 5MB chunks
        maxConcurrent: 3,
        maxRetries: 3,
        retryDelay: 1000,
    };

    /**
     * 使用分块上传优化大文件上传速度
     */
    static async uploadFileWithProgress(
        file: File,
        uploadUrl: string,
        onProgress?: (progress: UploadProgress) => void,
        options: OptimizedUploadOptions = {}
    ): Promise<boolean> {
        const opts = { ...this.DEFAULT_OPTIONS, ...options };

        // 小文件直接上传
        if (file.size <= opts.chunkSize!) {
            return this.simpleUploadWithProgress(file, uploadUrl, onProgress);
        }

        // 大文件使用分块上传
        return this.chunkedUploadWithProgress(file, uploadUrl, opts, onProgress);
    }

    /**
     * 简单上传，带进度监控
     */
    private static async simpleUploadWithProgress(
        file: File,
        uploadUrl: string,
        onProgress?: (progress: UploadProgress) => void
    ): Promise<boolean> {
        return new Promise((resolve) => {
            const xhr = new XMLHttpRequest();
            const startTime = Date.now();

            xhr.upload.addEventListener('progress', (event) => {
                if (event.lengthComputable && onProgress) {
                    const elapsed = (Date.now() - startTime) / 1000;
                    const speed = event.loaded / elapsed;
                    const remainingTime = (event.total - event.loaded) / speed;

                    onProgress({
                        loaded: event.loaded,
                        total: event.total,
                        percentage: Math.round((event.loaded / event.total) * 100),
                        speed: Math.round(speed),
                        remainingTime: Math.round(remainingTime),
                    });
                }
            });

            xhr.addEventListener('load', () => {
                resolve(xhr.status >= 200 && xhr.status < 300);
            });

            xhr.addEventListener('error', () => {
                console.error('Upload failed:', xhr.statusText);
                resolve(false);
            });

            xhr.addEventListener('abort', () => {
                console.error('Upload aborted');
                resolve(false);
            });

            xhr.open('PUT', uploadUrl);
            xhr.setRequestHeader('Content-Type', file.type);
            xhr.send(file);
        });
    }

    /**
     * 分块上传，提高大文件上传速度
     */
    private static async chunkedUploadWithProgress(
        file: File,
        uploadUrl: string,
        options: OptimizedUploadOptions,
        onProgress?: (progress: UploadProgress) => void
    ): Promise<boolean> {
        const { chunkSize, maxConcurrent, maxRetries } = options;
        const totalChunks = Math.ceil(file.size / chunkSize!);
        const uploadedChunks = new Array(totalChunks).fill(false);
        let totalUploaded = 0;
        const startTime = Date.now();

        console.log(`开始分块上传: ${totalChunks} 个块，每块 ${this.formatBytes(chunkSize!)}`);

        // 创建上传队列
        const uploadQueue: Array<{ index: number; start: number; end: number }> = [];
        for (let i = 0; i < totalChunks; i++) {
            const start = i * chunkSize!;
            const end = Math.min(start + chunkSize!, file.size);
            uploadQueue.push({ index: i, start, end });
        }

        // 更新进度的函数
        const updateProgress = () => {
            if (onProgress) {
                const elapsed = (Date.now() - startTime) / 1000;
                const speed = totalUploaded / elapsed;
                const remainingTime = (file.size - totalUploaded) / speed;

                onProgress({
                    loaded: totalUploaded,
                    total: file.size,
                    percentage: Math.round((totalUploaded / file.size) * 100),
                    speed: Math.round(speed),
                    remainingTime: Math.round(remainingTime),
                });
            }
        };

        // 上传单个块的函数
        const uploadChunk = async (chunkInfo: { index: number; start: number; end: number }): Promise<boolean> => {
            const { index, start, end } = chunkInfo;
            const chunk = file.slice(start, end);

            for (let retry = 0; retry < maxRetries!; retry++) {
                try {
                    // 为每个块创建单独的上传 URL（如果需要）
                    // 注意：R2 可能需要 multipart upload，这里先简化处理
                    const success = await this.uploadSingleChunk(chunk, uploadUrl, index);

                    if (success) {
                        uploadedChunks[index] = true;
                        totalUploaded += chunk.size;
                        updateProgress();
                        return true;
                    }
                } catch (error) {
                    console.warn(`块 ${index} 上传失败 (尝试 ${retry + 1}/${maxRetries}):`, error);

                    if (retry < maxRetries! - 1) {
                        await this.delay(options.retryDelay! * (retry + 1));
                    }
                }
            }

            console.error(`块 ${index} 上传最终失败`);
            return false;
        };

        // 并发上传块
        const results: boolean[] = [];
        for (let i = 0; i < uploadQueue.length; i += maxConcurrent!) {
            const batch = uploadQueue.slice(i, i + maxConcurrent!);
            const batchResults = await Promise.all(batch.map(uploadChunk));
            results.push(...batchResults);
        }

        const allSuccess = results.every(success => success);

        if (allSuccess) {
            console.log('所有块上传成功');
            onProgress?.({
                loaded: file.size,
                total: file.size,
                percentage: 100,
            });
        } else {
            console.error('部分块上传失败');
        }

        return allSuccess;
    }

    /**
     * 上传单个数据块
     */
    private static async uploadSingleChunk(
        chunk: Blob,
        uploadUrl: string,
        chunkIndex: number
    ): Promise<boolean> {
        return new Promise((resolve) => {
            const xhr = new XMLHttpRequest();

            xhr.addEventListener('load', () => {
                resolve(xhr.status >= 200 && xhr.status < 300);
            });

            xhr.addEventListener('error', () => {
                resolve(false);
            });

            xhr.addEventListener('abort', () => {
                resolve(false);
            });

            // 注意：这里的实现可能需要根据 R2 的具体 multipart upload API 调整
            xhr.open('PUT', uploadUrl);
            xhr.setRequestHeader('Content-Type', 'application/octet-stream');
            xhr.setRequestHeader('X-Chunk-Index', chunkIndex.toString());
            xhr.send(chunk);
        });
    }

    /**
     * 延时函数
     */
    private static delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 格式化字节数
     */
    static formatBytes(bytes: number): string {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * 检测网络速度
     */
    static async detectNetworkSpeed(): Promise<number> {
        try {
            const startTime = Date.now();
            // 下载一个小文件来测试网络速度
            const response = await fetch('/favicon.ico', { cache: 'no-cache' });
            const blob = await response.blob();
            const endTime = Date.now();

            const duration = (endTime - startTime) / 1000; // seconds
            const speed = blob.size / duration; // bytes per second

            console.log(`检测到网络速度: ${this.formatBytes(speed)}/s`);
            return speed;
        } catch {
            // 默认速度假设
            return 1024 * 1024; // 1MB/s
        }
    }

    /**
     * 根据文件大小和网络速度推荐上传配置
     */
    static getOptimalUploadConfig(fileSize: number, networkSpeed?: number): OptimizedUploadOptions {
        const speed = networkSpeed || 1024 * 1024; // 默认 1MB/s

        // 小文件（< 50MB）
        if (fileSize < 50 * 1024 * 1024) {
            return {
                chunkSize: 5 * 1024 * 1024, // 5MB
                maxConcurrent: 2,
                maxRetries: 3,
                retryDelay: 1000,
            };
        }

        // 中等文件（50MB - 500MB）
        if (fileSize < 500 * 1024 * 1024) {
            return {
                chunkSize: 10 * 1024 * 1024, // 10MB
                maxConcurrent: 3,
                maxRetries: 3,
                retryDelay: 1500,
            };
        }

        // 大文件（> 500MB）
        return {
            chunkSize: 20 * 1024 * 1024, // 20MB
            maxConcurrent: 4,
            maxRetries: 5,
            retryDelay: 2000,
        };
    }
} 