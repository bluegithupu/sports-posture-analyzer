export interface UploadProgress {
    loaded: number;
    total: number;
    percentage: number;
    speed?: number; // bytes per second
    remainingTime?: number; // seconds
}

export interface FastUploadOptions {
    timeout?: number; // 上传超时时间 (ms)
    retries?: number; // 重试次数
    retryDelay?: number; // 重试间隔 (ms)
    progressInterval?: number; // 进度报告间隔 (ms)
}

export class FastUploader {
    private static readonly DEFAULT_OPTIONS: FastUploadOptions = {
        timeout: 10 * 60 * 1000, // 10分钟超时
        retries: 3,
        retryDelay: 2000,
        progressInterval: 500, // 500ms 更新一次进度
    };

    /**
     * 优化的文件上传，包含速度监控、重试机制和详细进度
     */
    static async uploadWithProgress(
        file: File,
        uploadUrl: string,
        onProgress?: (progress: UploadProgress) => void,
        options: FastUploadOptions = {}
    ): Promise<boolean> {
        const opts = { ...this.DEFAULT_OPTIONS, ...options };

        for (let attempt = 1; attempt <= opts.retries!; attempt++) {
            try {
                console.log(`上传尝试 ${attempt}/${opts.retries} - 文件: ${file.name} (${this.formatBytes(file.size)})`);

                const result = await this.performUpload(file, uploadUrl, opts, onProgress);

                if (result) {
                    console.log(`上传成功！尝试次数: ${attempt}`);
                    return true;
                }

                console.warn(`上传失败，尝试 ${attempt}/${opts.retries}`);

            } catch (error) {
                console.error(`上传尝试 ${attempt} 出错:`, error);

                if (attempt === opts.retries) {
                    throw error;
                }
            }

            // 重试前等待
            if (attempt < opts.retries!) {
                console.log(`等待 ${opts.retryDelay}ms 后重试...`);
                await this.delay(opts.retryDelay!);
            }
        }

        return false;
    }

    /**
     * 执行实际的上传操作
     */
    private static async performUpload(
        file: File,
        uploadUrl: string,
        options: FastUploadOptions,
        onProgress?: (progress: UploadProgress) => void
    ): Promise<boolean> {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            const startTime = Date.now();
            let lastReportTime = startTime;
            let lastLoaded = 0;

            // 设置超时
            const timeoutId = setTimeout(() => {
                xhr.abort();
                reject(new Error(`上传超时 (${options.timeout! / 1000}秒)`));
            }, options.timeout!);

            // 优化 XHR 设置
            xhr.timeout = options.timeout!;

            // 进度监控
            xhr.upload.addEventListener('progress', (event) => {
                if (!event.lengthComputable) return;

                const now = Date.now();
                const timeSinceLastReport = now - lastReportTime;

                // 控制进度报告频率
                if (timeSinceLastReport >= options.progressInterval! || event.loaded === event.total) {
                    const elapsed = (now - startTime) / 1000;
                    const totalSpeed = event.loaded / elapsed;

                    // 计算瞬时速度（最近一段时间的速度）
                    const instantSpeed = (event.loaded - lastLoaded) / (timeSinceLastReport / 1000);

                    // 使用平均速度和瞬时速度的混合
                    const speed = elapsed > 5 ? totalSpeed : instantSpeed;

                    const remainingBytes = event.total - event.loaded;
                    const remainingTime = speed > 0 ? remainingBytes / speed : 0;

                    const progress: UploadProgress = {
                        loaded: event.loaded,
                        total: event.total,
                        percentage: Math.round((event.loaded / event.total) * 100),
                        speed: Math.round(speed),
                        remainingTime: Math.round(remainingTime),
                    };

                    onProgress?.(progress);

                    lastReportTime = now;
                    lastLoaded = event.loaded;
                }
            });

            // 加载完成
            xhr.addEventListener('load', () => {
                clearTimeout(timeoutId);

                if (xhr.status >= 200 && xhr.status < 300) {
                    const totalTime = (Date.now() - startTime) / 1000;
                    const avgSpeed = file.size / totalTime;
                    console.log(`上传完成! 平均速度: ${this.formatBytes(avgSpeed)}/s, 总耗时: ${totalTime.toFixed(1)}s`);

                    // 确保进度为100%
                    onProgress?.({
                        loaded: file.size,
                        total: file.size,
                        percentage: 100,
                        speed: Math.round(avgSpeed),
                        remainingTime: 0,
                    });

                    resolve(true);
                } else {
                    reject(new Error(`上传失败: HTTP ${xhr.status} - ${xhr.statusText}`));
                }
            });

            // 错误处理
            xhr.addEventListener('error', (event) => {
                clearTimeout(timeoutId);
                console.error('上传网络错误:', event);

                // 检测可能的 CORS 错误
                if (xhr.status === 0) {
                    reject(new Error('CORS错误：请检查 Cloudflare R2 存储桶的 CORS 配置。详见 CLOUDFLARE_R2_CORS_SETUP.md'));
                } else {
                    reject(new Error('网络错误，请检查您的网络连接'));
                }
            });

            xhr.addEventListener('abort', () => {
                clearTimeout(timeoutId);
                reject(new Error('上传被中断'));
            });

            // 超时处理
            xhr.addEventListener('timeout', () => {
                clearTimeout(timeoutId);
                reject(new Error('上传超时'));
            });

            // 开始上传
            try {
                xhr.open('PUT', uploadUrl, true);

                // 优化请求头
                xhr.setRequestHeader('Content-Type', file.type);

                // 可选：设置缓存控制
                xhr.setRequestHeader('Cache-Control', 'no-cache');

                console.log(`开始上传: ${this.formatBytes(file.size)} 到 R2...`);
                console.log(`上传URL域名: ${new URL(uploadUrl).hostname}`);
                xhr.send(file);

            } catch (error) {
                clearTimeout(timeoutId);
                reject(new Error(`上传初始化失败: ${error}`));
            }
        });
    }

    /**
     * 检测网络速度
     */
    static async detectNetworkSpeed(): Promise<number> {
        try {
            const testUrl = '/favicon.ico?' + Date.now(); // 避免缓存
            const startTime = Date.now();

            const response = await fetch(testUrl, {
                cache: 'no-cache',
                method: 'GET'
            });

            if (!response.ok) {
                throw new Error('Speed test failed');
            }

            const blob = await response.blob();
            const endTime = Date.now();

            const duration = (endTime - startTime) / 1000;
            const speed = blob.size / duration;

            console.log(`网络速度检测: ${this.formatBytes(speed)}/s (测试文件: ${this.formatBytes(blob.size)}, 耗时: ${duration.toFixed(2)}s)`);

            return Math.max(speed, 100 * 1024); // 最少假设 100KB/s

        } catch (error) {
            console.warn('网络速度检测失败:', error);
            return 1024 * 1024; // 默认 1MB/s
        }
    }

    /**
     * 根据文件大小和网络速度获取最优上传配置
     */
    static getOptimalConfig(fileSize: number, networkSpeed?: number): FastUploadOptions {
        const speed = networkSpeed || 1024 * 1024; // 默认 1MB/s

        // 估算上传时间
        const estimatedTime = fileSize / speed; // 秒

        // 根据文件大小调整配置
        if (fileSize < 10 * 1024 * 1024) { // < 10MB
            return {
                timeout: Math.max(60 * 1000, estimatedTime * 3000), // 至少1分钟
                retries: 2,
                retryDelay: 1000,
                progressInterval: 500,
            };
        } else if (fileSize < 100 * 1024 * 1024) { // < 100MB
            return {
                timeout: Math.max(5 * 60 * 1000, estimatedTime * 3000), // 至少5分钟
                retries: 3,
                retryDelay: 2000,
                progressInterval: 1000,
            };
        } else { // >= 100MB
            return {
                timeout: Math.max(15 * 60 * 1000, estimatedTime * 2000), // 至少15分钟
                retries: 5,
                retryDelay: 3000,
                progressInterval: 1000,
            };
        }
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
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * 估算上传时间
     */
    static estimateUploadTime(fileSize: number, networkSpeed: number): string {
        const seconds = Math.ceil(fileSize / networkSpeed);

        if (seconds < 60) {
            return `约 ${seconds} 秒`;
        } else if (seconds < 3600) {
            const minutes = Math.ceil(seconds / 60);
            return `约 ${minutes} 分钟`;
        } else {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.ceil((seconds % 3600) / 60);
            return `约 ${hours} 小时 ${minutes} 分钟`;
        }
    }
} 