// API 客户端工具
// 提供统一的 API 调用接口，包含错误处理和类型安全

export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

export interface AnalysisEvent {
    id: string;
    created_at: string;
    r2_video_link: string;
    gemini_file_link?: string;
    analysis_report?: {
        // 统一使用 text 字段存储分析文本
        text: string;
        // 保持向后兼容：旧的图片分析记录可能使用 analysis_text 字段
        analysis_text?: string;
        timestamp: string;
        model_used: string;
        analysis_type?: string;
        image_count?: number;
        processing_duration_ms?: number;
        image_filenames?: string[];
    };
    status: 'pending' | 'processing' | 'completed' | 'failed';
    error_message?: string;
    original_filename?: string;
    content_type?: string;
    status_text?: string;
    analysis_type?: string;
    image_urls?: string[];
    image_count?: number;
}

export interface JobResult {
    status: 'pending' | 'processing' | 'completed' | 'failed';
    report?: string;
    error?: string;
    message?: string;
    videoUrl?: string;
    originalFilename?: string;
    contentType?: string;
    dbEventId?: string;
}

export interface UploadUrlResponse {
    uploadUrl: string;
    objectKey: string;
    publicUrl: string;
    expiresIn: number;
}

export interface SubmitVideoResponse {
    message: string;
    job_id: string;
    db_event_id: string;
}

export interface ImageInfo {
    url: string;
    filename: string;
    contentType: string;
}

export interface SubmitImagesResponse {
    message: string;
    job_id: string;
    db_event_id: string;
}

class ApiClient {
    private baseUrl: string;

    constructor(baseUrl: string = '/api') {
        this.baseUrl = baseUrl;
    }

    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<ApiResponse<T>> {
        try {
            const url = `${this.baseUrl}${endpoint}`;
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers,
                },
                ...options,
            });

            const data = await response.json();

            if (!response.ok) {
                return {
                    success: false,
                    error: data.error || `请求失败: ${response.status}`,
                };
            }

            return {
                success: true,
                data,
            };
        } catch (error) {
            console.error('API请求错误:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : '网络请求失败',
            };
        }
    }

    // 生成上传URL
    async generateUploadUrl(filename: string, contentType: string): Promise<ApiResponse<UploadUrlResponse>> {
        return this.request<UploadUrlResponse>('/generate-upload-url', {
            method: 'POST',
            body: JSON.stringify({ filename, contentType }),
        });
    }

    // 提交视频URL进行分析
    async submitVideoUrl(
        videoUrl: string,
        originalFilename: string,
        contentType: string
    ): Promise<ApiResponse<SubmitVideoResponse>> {
        return this.request<SubmitVideoResponse>('/submit-video-url', {
            method: 'POST',
            body: JSON.stringify({ videoUrl, originalFilename, contentType }),
        });
    }

    // 提交图片进行分析
    async submitImages(
        images: ImageInfo[]
    ): Promise<ApiResponse<SubmitImagesResponse>> {
        return this.request<SubmitImagesResponse>('/submit-images', {
            method: 'POST',
            body: JSON.stringify({ images }),
        });
    }

    // 获取分析结果
    async getJobResult(jobId: string): Promise<ApiResponse<JobResult>> {
        return this.request<JobResult>(`/results/${jobId}`);
    }

    // 获取分析历史
    async getAnalysisHistory(limit: number = 10): Promise<ApiResponse<{ data: AnalysisEvent[]; count: number }>> {
        return this.request(`/analysis-history?limit=${limit}`);
    }

    // 重试失败的任务
    async retryJob(jobId: string): Promise<ApiResponse<unknown>> {
        return this.request(`/jobs/${jobId}/retry`, {
            method: 'POST',
        });
    }

    // 直接上传文件到R2（带进度和优化）
    async uploadToR2(
        uploadUrl: string,
        file: File,
        onProgress?: (progress: { percentage: number; speed?: number; remainingTime?: number }) => void
    ): Promise<boolean> {
        try {
            // 动态导入快速上传工具
            const { FastUploader } = await import('../utils/fastUpload');

            // 检测网络速度
            console.log('正在检测网络速度...');
            const networkSpeed = await FastUploader.detectNetworkSpeed();

            // 获取最优配置
            const config = FastUploader.getOptimalConfig(file.size, networkSpeed);

            // 估算上传时间
            const estimatedTime = FastUploader.estimateUploadTime(file.size, networkSpeed);

            console.log(`开始优化上传:`, {
                文件名: file.name,
                文件大小: FastUploader.formatBytes(file.size),
                网络速度: FastUploader.formatBytes(networkSpeed) + '/s',
                预计时间: estimatedTime,
                配置: config
            });

            return await FastUploader.uploadWithProgress(
                file,
                uploadUrl,
                (progress) => {
                    onProgress?.({
                        percentage: progress.percentage,
                        speed: progress.speed,
                        remainingTime: progress.remainingTime,
                    });
                },
                config
            );
        } catch (error) {
            console.error('R2优化上传错误:', error);

            // fallback 到简单上传
            console.log('回退到简单上传模式');
            return this.simpleUploadToR2(uploadUrl, file, onProgress);
        }
    }

    // 简单上传方法作为备用
    private async simpleUploadToR2(
        uploadUrl: string,
        file: File,
        onProgress?: (progress: { percentage: number; speed?: number; remainingTime?: number }) => void
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
                console.error('Simple upload failed:', xhr.statusText);
                resolve(false);
            });

            xhr.addEventListener('abort', () => {
                console.error('Simple upload aborted');
                resolve(false);
            });

            xhr.open('PUT', uploadUrl);
            xhr.setRequestHeader('Content-Type', file.type);
            xhr.send(file);
        });
    }
}

// 导出单例实例
export const apiClient = new ApiClient();

// 导出类以便测试或创建新实例
export { ApiClient }; 