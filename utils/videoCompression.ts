export interface CompressionOptions {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    videoBitrate?: number;
    maxFileSize?: number; // MB
}

export interface CompressionProgress {
    progress: number;
    stage: string;
}

export class VideoCompressor {
    private static readonly DEFAULT_OPTIONS: CompressionOptions = {
        maxWidth: 854,        // 480p宽度，更小的分辨率
        maxHeight: 480,       // 480p高度
        quality: 0.3,         // 30%质量，更低的质量
        videoBitrate: 300000, // 300kbps，更低的比特率
        maxFileSize: 20       // 20MB，更小的目标文件大小
    };

    /**
     * 压缩视频文件
     */
    static async compressVideo(
        file: File,
        options: CompressionOptions = {},
        onProgress?: (progress: CompressionProgress) => void
    ): Promise<File> {
        const finalOptions = { ...this.DEFAULT_OPTIONS, ...options };

        try {
            // 检查压缩支持
            if (!this.isCompressionSupported()) {
                throw new Error('当前浏览器不支持视频压缩功能');
            }

            // 如果文件已经很小，直接返回
            if (file.size <= (finalOptions.maxFileSize! * 1024 * 1024)) {
                onProgress?.({ progress: 100, stage: '文件大小已符合要求，无需压缩' });
                return file;
            }

            onProgress?.({ progress: 10, stage: '正在分析视频...' });

            // 尝试使用简单的重编码方法
            return await this.simpleCompress(file, finalOptions, onProgress);
        } catch (error) {
            console.warn('简单压缩失败，尝试基础压缩:', error);
            // 如果失败，尝试更基础的方法
            return await this.basicCompress(file, finalOptions, onProgress);
        }
    }

    /**
     * 简单压缩方法 - 使用MediaRecorder
     */
    private static async simpleCompress(
        file: File,
        options: CompressionOptions,
        onProgress?: (progress: CompressionProgress) => void
    ): Promise<File> {
        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            video.muted = true;
            video.playsInline = true;
            video.crossOrigin = 'anonymous';

            // 添加超时机制
            const timeout = setTimeout(() => {
                reject(new Error('视频加载超时'));
            }, 30000); // 30秒超时

            video.onloadedmetadata = () => {
                try {
                    clearTimeout(timeout);

                    if (video.videoWidth === 0 || video.videoHeight === 0) {
                        reject(new Error('无效的视频文件：无法获取视频尺寸'));
                        return;
                    }

                    const { width: newWidth, height: newHeight } = this.calculateDimensions(
                        video.videoWidth,
                        video.videoHeight,
                        options.maxWidth!,
                        options.maxHeight!
                    );

                    onProgress?.({ progress: 20, stage: '正在设置压缩参数...' });

                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');

                    if (!ctx) {
                        reject(new Error('无法创建Canvas上下文'));
                        return;
                    }

                    canvas.width = newWidth;
                    canvas.height = newHeight;

                    // 选择最佳的编码格式
                    const mimeType = this.getBestMimeType();
                    if (!mimeType) {
                        reject(new Error('浏览器不支持任何视频编码格式'));
                        return;
                    }

                    let stream: MediaStream;
                    try {
                        stream = canvas.captureStream(24); // 24fps
                    } catch (error) {
                        reject(new Error(`无法创建Canvas流: ${error}`));
                        return;
                    }

                    let mediaRecorder: MediaRecorder;
                    try {
                        mediaRecorder = new MediaRecorder(stream, {
                            mimeType,
                            videoBitsPerSecond: options.videoBitrate
                        });
                    } catch (error) {
                        reject(new Error(`无法创建MediaRecorder: ${error}`));
                        return;
                    }

                    const chunks: Blob[] = [];
                    let recordingStarted = false;
                    let recordingComplete = false;

                    mediaRecorder.ondataavailable = (event) => {
                        if (event.data.size > 0) {
                            chunks.push(event.data);
                        }
                    };

                    mediaRecorder.onstop = () => {
                        recordingComplete = true;
                        onProgress?.({ progress: 95, stage: '正在生成压缩文件...' });

                        if (chunks.length === 0) {
                            reject(new Error('录制过程中没有生成任何数据'));
                            return;
                        }

                        const extension = mimeType.includes('webm') ? 'webm' : 'mp4';
                        const compressedBlob = new Blob(chunks, { type: mimeType });

                        if (compressedBlob.size === 0) {
                            reject(new Error('生成的压缩文件为空'));
                            return;
                        }

                        const compressedFile = new File(
                            [compressedBlob],
                            `compressed_${file.name.replace(/\.[^/.]+$/, `.${extension}`)}`,
                            { type: mimeType }
                        );

                        onProgress?.({ progress: 100, stage: '压缩完成！' });
                        resolve(compressedFile);
                    };

                    mediaRecorder.onerror = (event) => {
                        const error = (event as any).error || event;
                        reject(new Error(`MediaRecorder错误: ${error}`));
                    };

                    // 录制超时保护
                    const recordingTimeout = setTimeout(() => {
                        if (!recordingComplete && mediaRecorder.state === 'recording') {
                            mediaRecorder.stop();
                        }
                    }, Math.max(video.duration * 1000 + 10000, 60000)); // 视频时长 + 10秒，最少60秒

                    onProgress?.({ progress: 30, stage: '开始压缩视频...' });

                    try {
                        mediaRecorder.start(1000); // 每秒收集一次数据
                        recordingStarted = true;
                    } catch (error) {
                        clearTimeout(recordingTimeout);
                        reject(new Error(`无法开始录制: ${error}`));
                        return;
                    }

                    // 播放视频并捕获帧
                    let startTime = Date.now();
                    const duration = video.duration * 1000; // 转换为毫秒
                    let frameCount = 0;

                    const captureFrame = () => {
                        if (video.ended || video.paused || recordingComplete) {
                            clearTimeout(recordingTimeout);
                            if (recordingStarted && mediaRecorder.state === 'recording') {
                                mediaRecorder.stop();
                            }
                            return;
                        }

                        try {
                            ctx.drawImage(video, 0, 0, newWidth, newHeight);
                            frameCount++;
                        } catch (error) {
                            console.warn('绘制帧时出错:', error);
                        }

                        const elapsed = Date.now() - startTime;
                        const progress = Math.min(30 + (elapsed / duration) * 60, 90);
                        onProgress?.({
                            progress: Math.round(progress),
                            stage: `正在压缩视频... ${Math.round((elapsed / duration) * 100)}%`
                        });

                        requestAnimationFrame(captureFrame);
                    };

                    video.onplay = () => {
                        startTime = Date.now();
                        captureFrame();
                    };

                    video.onended = () => {
                        clearTimeout(recordingTimeout);
                        setTimeout(() => {
                            if (recordingStarted && mediaRecorder.state === 'recording') {
                                mediaRecorder.stop();
                            }
                        }, 1000); // 等待1秒确保所有帧都处理完
                    };

                    video.onerror = () => {
                        clearTimeout(recordingTimeout);
                        reject(new Error('视频播放失败'));
                    };

                    // 开始播放视频
                    video.currentTime = 0;
                    video.play().catch((error) => {
                        clearTimeout(recordingTimeout);
                        reject(new Error(`视频播放失败: ${error}`));
                    });

                } catch (error) {
                    clearTimeout(timeout);
                    reject(error);
                }
            };

            video.onerror = () => {
                clearTimeout(timeout);
                reject(new Error('视频加载失败：文件可能已损坏或格式不支持'));
            };

            try {
                video.src = URL.createObjectURL(file);
                video.load();
            } catch (error) {
                clearTimeout(timeout);
                reject(new Error(`无法加载视频文件: ${error}`));
            }
        });
    }

    /**
     * 基础压缩方法 - 使用FFmpeg.wasm或其他方法
     */
    private static async basicCompress(
        file: File,
        options: CompressionOptions,
        onProgress?: (progress: CompressionProgress) => void
    ): Promise<File> {
        onProgress?.({ progress: 10, stage: '使用基础压缩方法...' });

        try {
            // 尝试使用Web API进行基本的重新编码
            const video = document.createElement('video');
            video.muted = true;
            video.playsInline = true;

            return new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('基础压缩超时'));
                }, 20000);

                video.onloadedmetadata = async () => {
                    try {
                        clearTimeout(timeout);

                        // 如果视频时长过长，截取前30秒
                        const maxDuration = 30; // 秒
                        const actualDuration = Math.min(video.duration, maxDuration);

                        const { width: newWidth, height: newHeight } = this.calculateDimensions(
                            video.videoWidth,
                            video.videoHeight,
                            options.maxWidth! * 0.8, // 进一步减小尺寸
                            options.maxHeight! * 0.8
                        );

                        onProgress?.({ progress: 30, stage: '创建低质量版本...' });

                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');

                        if (!ctx) {
                            reject(new Error('无法创建Canvas上下文'));
                            return;
                        }

                        canvas.width = newWidth;
                        canvas.height = newHeight;

                        // 使用更低的质量设置
                        const mimeType = 'video/webm'; // 使用最基础的格式
                        const stream = canvas.captureStream(15); // 降低到15fps

                        const mediaRecorder = new MediaRecorder(stream, {
                            mimeType,
                            videoBitsPerSecond: Math.min(options.videoBitrate! * 0.5, 300000) // 进一步降低比特率
                        });

                        const chunks: Blob[] = [];
                        let recordingComplete = false;

                        mediaRecorder.ondataavailable = (event) => {
                            if (event.data.size > 0) {
                                chunks.push(event.data);
                            }
                        };

                        mediaRecorder.onstop = () => {
                            recordingComplete = true;
                            onProgress?.({ progress: 95, stage: '完成基础压缩...' });

                            const compressedBlob = new Blob(chunks, { type: mimeType });
                            const compressedFile = new File(
                                [compressedBlob],
                                `basic_compressed_${file.name.replace(/\.[^/.]+$/, '.webm')}`,
                                { type: mimeType }
                            );

                            onProgress?.({ progress: 100, stage: '基础压缩完成' });
                            resolve(compressedFile);
                        };

                        mediaRecorder.onerror = (event) => {
                            reject(new Error(`基础压缩失败: ${event}`));
                        };

                        mediaRecorder.start(1000);

                        // 只录制几秒钟的内容
                        const recordingDuration = Math.min(actualDuration, 10) * 1000; // 最多10秒
                        let frameCount = 0;
                        const maxFrames = Math.ceil(recordingDuration / 1000 * 15); // 15fps

                        const captureFrames = () => {
                            if (frameCount >= maxFrames || recordingComplete) {
                                if (mediaRecorder.state === 'recording') {
                                    mediaRecorder.stop();
                                }
                                return;
                            }

                            try {
                                ctx.drawImage(video, 0, 0, newWidth, newHeight);
                                frameCount++;

                                const progress = 30 + (frameCount / maxFrames) * 60;
                                onProgress?.({
                                    progress: Math.round(progress),
                                    stage: `基础压缩中... ${Math.round((frameCount / maxFrames) * 100)}%`
                                });
                            } catch (error) {
                                console.warn('基础压缩绘制帧失败:', error);
                            }

                            setTimeout(captureFrames, 1000 / 15); // 15fps
                        };

                        video.onplay = () => {
                            captureFrames();
                        };

                        video.currentTime = 0;
                        video.play().catch(reject);

                    } catch (error) {
                        clearTimeout(timeout);
                        reject(error);
                    }
                };

                video.onerror = () => {
                    clearTimeout(timeout);
                    reject(new Error('基础压缩时视频加载失败'));
                };

                video.src = URL.createObjectURL(file);
                video.load();
            });

        } catch (error) {
            console.error('基础压缩失败:', error);
            onProgress?.({ progress: 100, stage: '压缩失败，返回原文件' });
            // 如果所有方法都失败，返回原文件
            return file;
        }
    }

    /**
     * 计算新的视频尺寸，保持宽高比
     */
    private static calculateDimensions(
        originalWidth: number,
        originalHeight: number,
        maxWidth: number,
        maxHeight: number
    ): { width: number; height: number } {
        let { width, height } = { width: originalWidth, height: originalHeight };

        // 如果原始尺寸已经小于最大尺寸，则不需要缩放
        if (width <= maxWidth && height <= maxHeight) {
            return { width, height };
        }

        // 计算缩放比例，保持宽高比
        const widthRatio = maxWidth / width;
        const heightRatio = maxHeight / height;
        const ratio = Math.min(widthRatio, heightRatio);

        width = Math.round(width * ratio);
        height = Math.round(height * ratio);

        // 确保尺寸是偶数（某些编码器要求）
        width = width % 2 === 0 ? width : width - 1;
        height = height % 2 === 0 ? height : height - 1;

        return { width, height };
    }

    /**
     * 获取最佳的MIME类型
     */
    private static getBestMimeType(): string {
        const formats = [
            'video/webm;codecs=vp9',
            'video/webm;codecs=vp8',
            'video/webm',
            'video/mp4;codecs=h264',
            'video/mp4'
        ];

        for (const format of formats) {
            if (MediaRecorder.isTypeSupported(format)) {
                return format;
            }
        }

        // 如果都不支持，返回空字符串
        return '';
    }

    /**
     * 计算文件大小减少百分比
     */
    static getFileSizeReduction(originalSize: number, compressedSize: number): string {
        const reduction = ((originalSize - compressedSize) / originalSize) * 100;
        return `${reduction.toFixed(1)}%`;
    }

    /**
     * 格式化文件大小
     */
    static formatFileSize(bytes: number): string {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * 检查浏览器支持的压缩格式
     */
    static getSupportedFormats(): string[] {
        const formats = [
            'video/webm;codecs=vp9',
            'video/webm;codecs=vp8',
            'video/webm',
            'video/mp4;codecs=h264',
            'video/mp4'
        ];

        return formats.filter(format => MediaRecorder.isTypeSupported(format));
    }

    /**
     * 检查是否支持视频压缩
     */
    static isCompressionSupported(): boolean {
        try {
            // 检查基本API支持
            if (typeof MediaRecorder === 'undefined') return false;
            if (typeof HTMLCanvasElement === 'undefined') return false;
            if (typeof HTMLVideoElement === 'undefined') return false;

            // 检查是否有支持的格式
            const supportedFormats = this.getSupportedFormats();
            if (supportedFormats.length === 0) return false;

            // 检查Canvas captureStream支持
            const testCanvas = document.createElement('canvas');
            if (typeof testCanvas.captureStream !== 'function') return false;

            return true;
        } catch (error) {
            console.error('检查压缩支持时出错:', error);
            return false;
        }
    }
} 