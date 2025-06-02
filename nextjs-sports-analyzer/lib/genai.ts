import {
    GoogleGenAI,
    createUserContent,
    createPartFromUri,
} from '@google/genai';
import fs from 'fs';
import path from 'path';
import { updateAnalysisEventStatus, updateAnalysisEventGeminiLink, completeAnalysisEvent } from './supabaseClient';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;

if (!GEMINI_API_KEY) {
    console.warn("GEMINI_API_KEY is not set. AI analysis features will be disabled.");
}

export const ai = GEMINI_API_KEY ? new GoogleGenAI({ apiKey: GEMINI_API_KEY }) : null;

export interface AnalysisResult {
    status: 'completed' | 'failed' | 'processing' | 'pending';
    report?: string;
    error?: string;
    message?: string;
}

// 临时文件目录
const UPLOAD_DIR = '/tmp/uploads_nextjs';

// 确保上传目录存在
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export async function uploadFileToGemini(
    filePath: string,
    mimeType: string,
    displayName: string
) {
    if (!ai) {
        throw new Error('Google GenAI SDK not initialized');
    }

    try {
        const uploadedFile = await ai.files.upload({
            file: filePath,
            config: {
                mimeType: mimeType,
                displayName: displayName
            },
        });

        console.log(`File uploaded to Gemini. URI: ${uploadedFile.uri}`);
        return uploadedFile;
    } catch (error) {
        console.error('Error uploading file to Gemini:', error);
        throw error;
    }
}

export async function waitForFileProcessing(fileUri: string, maxWaitTime: number = 300000) {
    if (!ai) {
        throw new Error('Google GenAI SDK not initialized');
    }

    if (!fileUri) {
        throw new Error('File URI is required but was not provided');
    }

    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
        try {
            // 从 fileUri 中提取文件名
            const fileName = fileUri.split('/').pop();
            if (!fileName) {
                throw new Error('Invalid file URI format');
            }

            const fileInfo = await ai.files.get({ name: fileName });

            if (fileInfo.state === 'ACTIVE') {
                console.log('File processing completed');
                return fileInfo;
            } else if (fileInfo.state === 'FAILED') {
                throw new Error('File processing failed');
            }

            console.log(`File state: ${fileInfo.state}, waiting...`);
            await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
        } catch (error) {
            console.error('Error checking file status:', error);
            throw error;
        }
    }

    throw new Error('File processing timeout');
}

export async function analyzeVideoWithGemini(fileUri: string, mimeType: string = 'video/mp4'): Promise<string> {
    if (!ai) {
        throw new Error('Google GenAI SDK not initialized');
    }

    if (!fileUri) {
        throw new Error('File URI is required but was not provided');
    }

    const prompt = `请分析这个运动视频中的体态和动作。请提供详细的分析报告，包括：

1. **动作识别**: 识别视频中的运动类型和具体动作
2. **体态评估**: 分析身体姿势、对齐和平衡
3. **技术要点**: 指出动作的关键技术要素
4. **问题识别**: 发现可能的体态问题或动作错误
5. **改进建议**: 提供具体的改进建议和训练要点
6. **安全提醒**: 指出需要注意的安全事项

请用中文回答，并提供结构化的分析报告。`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: createUserContent([
                createPartFromUri(fileUri, mimeType),
                prompt
            ])
        });

        const analysisText = response.text;

        if (!analysisText) {
            throw new Error('No analysis text received from Gemini');
        }

        return analysisText;
    } catch (error) {
        console.error('Error analyzing video with Gemini:', error);
        throw error;
    }
}

export async function performCompleteAnalysis(
    filePath: string,
    mimeType: string,
    displayName: string
): Promise<string> {
    if (!ai) {
        throw new Error('Google GenAI SDK not initialized');
    }

    try {
        // 1. 上传文件到 Gemini
        console.log('Uploading file to Gemini...');
        const uploadedFile = await uploadFileToGemini(filePath, mimeType, displayName);

        // 2. 等待文件处理完成
        console.log('Waiting for file processing...');
        await waitForFileProcessing(uploadedFile.uri);

        // 3. 进行分析
        console.log('Analyzing video...');
        const analysisResult = await analyzeVideoWithGemini(uploadedFile.uri, mimeType);

        return analysisResult;
    } catch (error) {
        console.error('Error in complete analysis:', error);
        throw error;
    }
}

// 从 URL 下载并分析视频
export async function performAnalysisFromUrl(
    jobId: string,
    videoUrl: string,
    originalFilename: string,
    mimeType: string,
    dbEventId: string | null,
    analysisJobs: Record<string, any>
) {
    if (!ai) {
        analysisJobs[jobId] = { ...analysisJobs[jobId], status: 'failed', error: 'Google GenAI SDK not initialized on server.' };
        if (dbEventId) {
            await updateAnalysisEventStatus(dbEventId, 'failed', 'Google GenAI SDK not initialized on server.');
        }
        return;
    }

    try {
        analysisJobs[jobId] = { ...analysisJobs[jobId], status: 'processing', message: 'Downloading video from R2...' };
        console.log(`[Job ${jobId}] Downloading video from URL: ${videoUrl}`);

        // 从 R2 下载文件到临时位置
        const response = await fetch(videoUrl);
        if (!response.ok) {
            throw new Error(`Failed to download video: ${response.status} ${response.statusText}`);
        }

        const buffer = await response.arrayBuffer();
        const tempFilePath = path.join(UPLOAD_DIR, `temp_${jobId}_${originalFilename}`);

        // 将 buffer 写入临时文件
        fs.writeFileSync(tempFilePath, Buffer.from(buffer));

        console.log(`[Job ${jobId}] Video downloaded to: ${tempFilePath}`);
        analysisJobs[jobId] = { ...analysisJobs[jobId], status: 'processing', message: 'Video downloaded, uploading to Google GenAI...' };

        // 使用现有的分析逻辑
        await performAnalysisWithLocalFile(jobId, tempFilePath, originalFilename, mimeType, dbEventId, analysisJobs);

        // 清理临时文件
        try {
            fs.unlinkSync(tempFilePath);
            console.log(`[Job ${jobId}] Temporary file cleaned up: ${tempFilePath}`);
        } catch (cleanupError) {
            console.warn(`[Job ${jobId}] Failed to clean up temporary file: ${cleanupError}`);
        }

    } catch (error) {
        console.error(`[Job ${jobId}] Analysis from URL error:`, error);

        let errorMessage = (error as Error).message || 'An unknown error occurred during analysis.';
        if (errorMessage.includes('Failed to download')) {
            errorMessage = 'Failed to download video from R2. Please check the video URL.';
        }

        analysisJobs[jobId] = { ...analysisJobs[jobId], status: 'failed', error: errorMessage };

        // 更新数据库状态为失败
        if (dbEventId) {
            await updateAnalysisEventStatus(dbEventId, 'failed', errorMessage);
        }
    }
}

// 使用本地文件进行分析
export async function performAnalysisWithLocalFile(
    jobId: string,
    localFilePath: string,
    originalFilename: string,
    mimeType: string,
    dbEventId: string | null,
    analysisJobs: Record<string, any>
) {
    try {
        analysisJobs[jobId] = { ...analysisJobs[jobId], status: 'processing', message: 'Uploading file to Google GenAI...' };
        console.log(`[Job ${jobId}] Uploading file: ${localFilePath}`);

        // 上传文件到 Gemini
        const uploadedFile = await uploadFileToGemini(localFilePath, mimeType, originalFilename);

        if (!uploadedFile || !uploadedFile.uri) {
            throw new Error('Failed to upload file to Gemini: No URI returned');
        }

        console.log(`[Job ${jobId}] File uploaded. URI: ${uploadedFile.uri}`);
        analysisJobs[jobId] = { ...analysisJobs[jobId], status: 'processing', message: 'File uploaded. Waiting for processing...' };

        // 更新数据库中的 Gemini 文件链接
        if (dbEventId) {
            await updateAnalysisEventGeminiLink(dbEventId, uploadedFile.uri);
        }

        // 等待文件处理
        analysisJobs[jobId] = { ...analysisJobs[jobId], status: 'processing', message: 'Waiting for file processing...' };
        await waitForFileProcessing(uploadedFile.uri);

        // 进行分析
        analysisJobs[jobId] = { ...analysisJobs[jobId], status: 'processing', message: 'Analyzing video content...' };
        console.log(`[Job ${jobId}] Starting analysis...`);

        const analysisResult = await analyzeVideoWithGemini(uploadedFile.uri, mimeType);

        // 完成分析
        const analysisReport = {
            text: analysisResult,
            timestamp: new Date().toISOString(),
            model_used: 'gemini-2.0-flash-exp'
        };

        analysisJobs[jobId] = {
            ...analysisJobs[jobId],
            status: 'completed',
            report: analysisResult,
            message: 'Analysis completed successfully!'
        };

        // 更新数据库
        if (dbEventId) {
            await completeAnalysisEvent(dbEventId, analysisReport);
        }

        console.log(`[Job ${jobId}] Analysis completed successfully`);

    } catch (error) {
        console.error(`[Job ${jobId}] Analysis error:`, error);

        let errorMessage = (error as Error).message || 'An unknown error occurred during analysis.';

        analysisJobs[jobId] = { ...analysisJobs[jobId], status: 'failed', error: errorMessage };

        // 更新数据库状态为失败
        if (dbEventId) {
            await updateAnalysisEventStatus(dbEventId, 'failed', errorMessage);
        }
    }
} 