export interface UploadUrlResponse {
    uploadUrl: string;
    objectKey: string;
    publicUrl: string;
    expiresIn: number;
}

export interface UploadProgress {
    loaded: number;
    total: number;
    percentage: number;
}

export class R2Uploader {
    private apiBaseUrl: string;

    constructor(apiBaseUrl: string) {
        this.apiBaseUrl = apiBaseUrl;
    }

    /**
     * 获取预签名上传 URL
     */
    async getUploadUrl(filename: string, contentType: string): Promise<UploadUrlResponse> {
        const response = await fetch(`${this.apiBaseUrl}/generate-upload-url`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                filename,
                contentType,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: `获取上传URL失败，状态码: ${response.status}` }));
            throw new Error(errorData.error || `获取上传URL失败，状态码: ${response.status}`);
        }

        return response.json();
    }

    /**
     * 上传文件到 R2
     */
    async uploadFile(
        file: File,
        uploadUrl: string,
        onProgress?: (progress: UploadProgress) => void
    ): Promise<void> {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();

            // 监听上传进度
            if (onProgress) {
                xhr.upload.addEventListener('progress', (event) => {
                    if (event.lengthComputable) {
                        const progress: UploadProgress = {
                            loaded: event.loaded,
                            total: event.total,
                            percentage: Math.round((event.loaded / event.total) * 100),
                        };
                        onProgress(progress);
                    }
                });
            }

            // 监听完成事件
            xhr.addEventListener('load', () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve();
                } else {
                    reject(new Error(`上传失败，状态码: ${xhr.status}`));
                }
            });

            // 监听错误事件
            xhr.addEventListener('error', () => {
                reject(new Error('上传过程中发生网络错误'));
            });

            // 监听中断事件
            xhr.addEventListener('abort', () => {
                reject(new Error('上传被中断'));
            });

            // 发送请求
            xhr.open('PUT', uploadUrl);
            xhr.setRequestHeader('Content-Type', file.type);
            xhr.send(file);
        });
    }

    /**
     * 提交视频 URL 到后端进行分析
     */
    async submitVideoUrl(videoUrl: string, originalFilename: string, contentType: string): Promise<{ job_id: string }> {
        const response = await fetch(`${this.apiBaseUrl}/submit-video-url`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                videoUrl,
                originalFilename,
                contentType,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: `提交视频URL失败，状态码: ${response.status}` }));
            throw new Error(errorData.error || `提交视频URL失败，状态码: ${response.status}`);
        }

        return response.json();
    }

    /**
     * 完整的上传流程：获取URL -> 上传文件 -> 提交URL
     */
    async uploadAndSubmit(
        file: File,
        onProgress?: (stage: string, progress?: UploadProgress) => void
    ): Promise<{ job_id: string; publicUrl: string }> {
        try {
            // 第一步：获取预签名 URL
            if (onProgress) onProgress('正在获取上传许可...');

            const uploadInfo = await this.getUploadUrl(file.name, file.type);

            // 第二步：上传文件到 R2
            if (onProgress) onProgress('正在上传到云存储...');

            await this.uploadFile(file, uploadInfo.uploadUrl, (progress) => {
                if (onProgress) {
                    onProgress(`正在上传到云存储... ${progress.percentage}%`, progress);
                }
            });

            // 第三步：提交视频 URL 到后端
            if (onProgress) onProgress('正在启动分析...');

            const result = await this.submitVideoUrl(uploadInfo.publicUrl, file.name, file.type);

            return {
                job_id: result.job_id,
                publicUrl: uploadInfo.publicUrl,
            };

        } catch (error) {
            console.error('R2 upload error:', error);
            throw error;
        }
    }
} 