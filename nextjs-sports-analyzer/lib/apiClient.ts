// API 客户端工具
// 提供统一的 API 调用接口，包含错误处理和类型安全

export interface ApiResponse<T = any> {
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
        text: string;
        timestamp: string;
        model_used: string;
    };
    status: 'pending' | 'processing' | 'completed' | 'failed';
    error_message?: string;
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

    // 获取分析结果
    async getJobResult(jobId: string): Promise<ApiResponse<JobResult>> {
        return this.request<JobResult>(`/results/${jobId}`);
    }

    // 获取分析历史
    async getAnalysisHistory(limit: number = 10): Promise<ApiResponse<{ data: AnalysisEvent[]; count: number }>> {
        return this.request(`/analysis-history?limit=${limit}`);
    }

    // 重试失败的任务
    async retryJob(jobId: string): Promise<ApiResponse<any>> {
        return this.request(`/jobs/${jobId}/retry`, {
            method: 'POST',
        });
    }

    // 直接上传文件到R2
    async uploadToR2(uploadUrl: string, file: File): Promise<boolean> {
        try {
            const response = await fetch(uploadUrl, {
                method: 'PUT',
                body: file,
                headers: {
                    'Content-Type': file.type,
                },
            });

            return response.ok;
        } catch (error) {
            console.error('R2上传错误:', error);
            return false;
        }
    }
}

// 导出单例实例
export const apiClient = new ApiClient();

// 导出类以便测试或创建新实例
export { ApiClient }; 