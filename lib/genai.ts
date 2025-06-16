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

// Helper function for logging
const logPrefix = (jobId?: string, dbEventId?: string | null) => {
    return `[Job ${jobId || 'N/A'}]${dbEventId ? ` [DBEvent ${dbEventId}]` : ''}`;
};

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
    displayName: string,
    jobId?: string, // Added for logging
    dbEventId?: string | null // Added for logging
) {
    const prefix = logPrefix(jobId, dbEventId);
    console.info(`${prefix} Attempting to upload file to Gemini. Path: ${filePath}, MimeType: ${mimeType}, DisplayName: ${displayName}`);
    if (!ai) {
        console.error(`${prefix} Google GenAI SDK not initialized during uploadFileToGemini.`);
        throw new Error('Google GenAI SDK not initialized');
    }

    try {
        const startTime = Date.now();
        const uploadedFile = await ai.files.upload({
            file: filePath,
            config: {
                mimeType: mimeType,
                displayName: displayName
            },
        });

        const duration = Date.now() - startTime;
        console.info(`${prefix} File uploaded to Gemini. URI: ${uploadedFile.uri}, Duration: ${duration}ms`);
        return uploadedFile;
    } catch (error) {
        console.error(`${prefix} Error uploading file to Gemini:`, error instanceof Error ? error.message : error, error);
        throw error;
    }
}
export async function waitForFileProcessing(fileUri: string, maxWaitTime: number = 300000, jobId?: string, dbEventId?: string | null) {
    const prefix = logPrefix(jobId, dbEventId);
    console.info(`${prefix} Waiting for file processing. URI: ${fileUri}, MaxWait: ${maxWaitTime}ms`);
    if (!ai) {
        console.error(`${prefix} Google GenAI SDK not initialized during waitForFileProcessing.`);
        throw new Error('Google GenAI SDK not initialized');
    }

    if (!fileUri) {
        console.error(`${prefix} File URI is required but was not provided for waitForFileProcessing.`);
        throw new Error('File URI is required but was not provided');
    }

    const overallStartTime = Date.now();
    let attempts = 0;

    while (Date.now() - overallStartTime < maxWaitTime) {
        attempts++;
        const attemptStartTime = Date.now();
        try {
            const fileName = fileUri.split('/').pop();
            if (!fileName) {
                console.error(`${prefix} Invalid file URI format: ${fileUri}`);
                throw new Error('Invalid file URI format');
            }

            console.info(`${prefix} Attempt ${attempts}: Getting file info for ${fileName}`);
            const fileInfo = await ai.files.get({ name: fileName });
            const attemptDuration = Date.now() - attemptStartTime;
            console.info(`${prefix} Attempt ${attempts}: Got file info. State: ${fileInfo.state}, URI: ${fileInfo.uri}, Duration: ${attemptDuration}ms`, fileInfo);

            if (fileInfo.state === 'ACTIVE') {
                console.info(`${prefix} File processing completed and ACTIVE. URI: ${fileInfo.uri}, Total Wait: ${Date.now() - overallStartTime}ms, Attempts: ${attempts}`);
                return fileInfo;
            } else if (fileInfo.state === 'FAILED') {
                console.error(`${prefix} File processing FAILED by Gemini. URI: ${fileInfo.uri}, Info:`, fileInfo);
                throw new Error('File processing failed by Gemini');
            }

            console.info(`${prefix} File state: ${fileInfo.state} (URI: ${fileInfo.uri}). Waiting 10 seconds before next attempt...`);
            await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
        } catch (error) {
            const attemptDuration = Date.now() - attemptStartTime;
            console.error(`${prefix} Attempt ${attempts}: Error checking file status (Duration: ${attemptDuration}ms):`, error instanceof Error ? error.message : error, error);
            // If it's a transient error, we might want to continue retrying, but if it's a structural error (like bad URI), re-throwing is correct.
            // For now, re-throw to see what errors occur. If specific errors are retryable, handle them here.
            throw error;
        }
    }
    const totalDuration = Date.now() - overallStartTime;
    console.error(`${prefix} File processing timeout after ${totalDuration}ms and ${attempts} attempts. URI: ${fileUri}`);
    throw new Error(`File processing timeout for ${fileUri}`);
}

export async function analyzeVideoWithGemini(fileUri: string, mimeType: string = 'video/mp4', jobId?: string, dbEventId?: string | null): Promise<string> {
    const prefix = logPrefix(jobId, dbEventId);
    console.info(`${prefix} Starting video analysis with Gemini. URI: ${fileUri}, MimeType: ${mimeType}`);
    if (!ai) {
        console.error(`${prefix} Google GenAI SDK not initialized during analyzeVideoWithGemini.`);
        throw new Error('Google GenAI SDK not initialized');
    }

    if (!fileUri) {
        console.error(`${prefix} File URI is required but was not provided for analyzeVideoWithGemini.`);
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
        const startTime = Date.now();
        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: createUserContent([
                createPartFromUri(fileUri, mimeType),
                prompt
            ])
        });

        const duration = Date.now() - startTime;
        const analysisText = response.text;
        console.info(`${prefix} Gemini analysis successful. Duration: ${duration}ms. Response received: ${analysisText ? 'Yes' : 'No (Empty)'}`);

        if (!analysisText) {
            console.error(`${prefix} No analysis text received from Gemini. URI: ${fileUri}`);
            throw new Error('No analysis text received from Gemini');
        }

        return analysisText;
    } catch (error) {
        console.error(`${prefix} Error analyzing video with Gemini (URI: ${fileUri}):`, error instanceof Error ? error.message : error, error);
        throw error;
    }
}

export async function performCompleteAnalysis(
    filePath: string,
    mimeType: string,
    displayName: string,
    jobId?: string, // Added for logging
    dbEventId?: string | null // Added for logging
): Promise<string> {
    const prefix = logPrefix(jobId, dbEventId);
    console.info(`${prefix} Starting performCompleteAnalysis. FilePath: ${filePath}`);
    if (!ai) {
        console.error(`${prefix} Google GenAI SDK not initialized during performCompleteAnalysis.`);
        throw new Error('Google GenAI SDK not initialized');
    }

    try {
        // 1. 上传文件到 Gemini
        console.info(`${prefix} Step 1: Uploading file to Gemini...`);
        const uploadedFile = await uploadFileToGemini(filePath, mimeType, displayName, jobId, dbEventId);

        if (!uploadedFile || !uploadedFile.uri) {
            console.error(`${prefix} Step 1 Failed: Failed to upload file to Gemini, no URI returned.`);
            throw new Error('Failed to upload file to Gemini: No URI returned');
        }
        console.info(`${prefix} Step 1 Success: File uploaded. URI: ${uploadedFile.uri}`);

        // 2. 等待文件处理完成
        console.info(`${prefix} Step 2: Waiting for file processing... URI: ${uploadedFile.uri}`);
        await waitForFileProcessing(uploadedFile.uri, undefined, jobId, dbEventId); // Using default maxWaitTime
        console.info(`${prefix} Step 2 Success: File processing complete. URI: ${uploadedFile.uri}`);

        // 3. 进行分析
        console.info(`${prefix} Step 3: Analyzing video... URI: ${uploadedFile.uri}`);
        const analysisResult = await analyzeVideoWithGemini(uploadedFile.uri, mimeType, jobId, dbEventId);
        console.info(`${prefix} Step 3 Success: Video analysis complete. URI: ${uploadedFile.uri}`);

        console.info(`${prefix} performCompleteAnalysis finished successfully.`);
        return analysisResult;
    } catch (error) {
        console.error(`${prefix} Error in performCompleteAnalysis:`, error instanceof Error ? error.message : error, error);
        throw error; // Re-throw to be caught by the calling function (e.g., performAnalysisFromUrl)
    }
}

// 从 URL 下载并分析视频
export async function performAnalysisFromUrl(
    jobId: string,
    videoUrl: string,
    originalFilename: string,
    mimeType: string,
    // dbEventId is removed, jobId IS the dbEventId
    // analysisJobs Record is removed
) {
    const prefix = logPrefix(jobId, jobId); // dbEventId is now jobId
    console.info(`${prefix} Starting performAnalysisFromUrl. VideoURL: ${videoUrl}, Filename: ${originalFilename}`);

    if (!ai) {
        const errorMsg = 'Google GenAI SDK not initialized on server.';
        console.error(`${prefix} ${errorMsg}`);
        // analysisJobs[jobId] = { ... }; // REMOVED
        // if (dbEventId) { // dbEventId is jobId
        try {
            await updateAnalysisEventStatus(jobId, 'failed', errorMsg, 'Setup Error: GenAI SDK not initialized.');
            console.info(`${prefix} Supabase status updated to FAILED due to SDK init error.`);
        } catch (dbError) {
            console.error(`${prefix} Failed to update Supabase status to FAILED for SDK init error:`, dbError);
        }
        // }
        return;
    }

    const overallStartTime = Date.now();

    try {
        // console.info(`${prefix} Updating jobStorage: status=processing, message='Downloading video from R2...'`);
        // analysisJobs[jobId] = { ... }; // REMOVED
        // Attempt to update Supabase status to processing early
        // if (dbEventId) { // dbEventId is jobId
        try {
            await updateAnalysisEventStatus(jobId, 'processing', null, 'Downloading video from R2...');
            console.info(`${prefix} Supabase status updated to PROCESSING (Downloading).`);
        } catch (dbError) {
            console.warn(`${prefix} Failed to update Supabase status to PROCESSING (Downloading):`, dbError);
        }
        // }

        console.info(`${prefix} Downloading video from URL: ${videoUrl}`);
        const downloadStartTime = Date.now();
        const response = await fetch(videoUrl); // Consider adding timeout here
        const downloadDuration = Date.now() - downloadStartTime;

        if (!response.ok) {
            const errorText = await response.text().catch(() => 'Could not read error response body');
            console.error(`${prefix} Failed to download video. Status: ${response.status} ${response.statusText}. Body: ${errorText}. Duration: ${downloadDuration}ms`);
            throw new Error(`Failed to download video: ${response.status} ${response.statusText}. Details: ${errorText}`);
        }
        console.info(`${prefix} Video download HTTP request successful. Status: ${response.status}. Duration: ${downloadDuration}ms`);

        const bufferReadStartTime = Date.now();
        const buffer = await response.arrayBuffer();
        const bufferReadDuration = Date.now() - bufferReadStartTime;
        console.info(`${prefix} Video content read into buffer. Size: ${buffer.byteLength} bytes. Duration: ${bufferReadDuration}ms`);

        const tempFilePath = path.join(UPLOAD_DIR, `temp_${jobId}_${originalFilename}`);

        const writeFileStartTime = Date.now();
        fs.writeFileSync(tempFilePath, Buffer.from(buffer));
        const writeFileDuration = Date.now() - writeFileStartTime;
        console.info(`${prefix} Video downloaded and written to temporary file: ${tempFilePath}. Duration: ${writeFileDuration}ms`);

        // console.info(`${prefix} Updating jobStorage: message='Video downloaded, starting analysis with local file...'`);
        // analysisJobs[jobId] = { ... }; // REMOVED
        // if (dbEventId) { // dbEventId is jobId
        try {
            await updateAnalysisEventStatus(jobId, 'processing', null, 'Video downloaded, GenAI processing starting...');
            console.info(`${prefix} Supabase status updated to PROCESSING (Local file ready for GenAI).`);
        } catch (dbError) {
            console.warn(`${prefix} Failed to update Supabase status to PROCESSING (Local file ready for GenAI):`, dbError);
        }
        // }

        // 使用现有的分析逻辑 (now called performAnalysisWithLocalFile)
        await performAnalysisWithLocalFile(jobId, tempFilePath, originalFilename, mimeType, jobId /* jobId is dbEventId */);
        console.info(`${prefix} performAnalysisWithLocalFile completed.`); // Status should be set by performAnalysisWithLocalFile

        // 清理临时文件
        console.info(`${prefix} Attempting to clean up temporary file: ${tempFilePath}`);
        const cleanupStartTime = Date.now();
        try {
            fs.unlinkSync(tempFilePath);
            const cleanupDuration = Date.now() - cleanupStartTime;
            console.info(`${prefix} Temporary file cleaned up successfully: ${tempFilePath}. Duration: ${cleanupDuration}ms`);
        } catch (cleanupError) {
            const cleanupDuration = Date.now() - cleanupStartTime;
            console.warn(`${prefix} Failed to clean up temporary file (Duration: ${cleanupDuration}ms): ${tempFilePath}`, cleanupError);
        }

    } catch (error) {
        const overallDuration = Date.now() - overallStartTime;
        // const finalStatus = analysisJobs[jobId] ? (analysisJobs[jobId] as any).status : 'N/A'; // REMOVED
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during analysis from URL.';
        console.error(`${prefix} Critical error in performAnalysisFromUrl (Overall Duration: ${overallDuration}ms):`, errorMessage, error);

        const finalErrorMessage = errorMessage.includes('Failed to download')
            ? `Failed to download video from R2. Please check the video URL or R2 accessibility. Original Error: ${errorMessage}`
            : errorMessage;

        // console.info(`${prefix} Updating jobStorage: status=failed, error='${finalErrorMessage}'`);
        // analysisJobs[jobId] = { ... }; // REMOVED

        // 更新数据库状态为失败
        // if (dbEventId) { // dbEventId is jobId
        console.info(`${prefix} Attempting to update Supabase status to FAILED.`);
        try {
            await updateAnalysisEventStatus(jobId, 'failed', finalErrorMessage, 'Analysis failed during R2 download or pre-processing.');
            console.info(`${prefix} Supabase status updated to FAILED.`);
        } catch (dbError) {
            console.error(`${prefix} CRITICAL: Failed to update Supabase status to FAILED after main error:`, dbError);
        }
        // }
    } finally {
        const overallDuration = Date.now() - overallStartTime;
        // const finalStatus = analysisJobs[jobId] ? (analysisJobs[jobId] as any).status : 'N/A'; // REMOVED
        // Query Supabase for final status if needed for logging, or rely on prior logs.
        console.info(`${prefix} performAnalysisFromUrl finished. Overall Duration: ${overallDuration}ms.`);
    }
}

// 使用本地文件进行分析
export async function performAnalysisWithLocalFile(
    jobId: string, // This is the Supabase event ID
    localFilePath: string,
    originalFilename: string,
    mimeType: string,
    dbEventId: string // Kept for clarity, it's same as jobId
    // analysisJobs Record is removed
) {
    const prefix = logPrefix(jobId, dbEventId);
    console.info(`${prefix} Starting performAnalysisWithLocalFile. FilePath: ${localFilePath}`);
    const overallStartTime = Date.now();

    try {
        // console.info(`${prefix} Updating jobStorage: message='Uploading file to Google GenAI...'`);
        // analysisJobs[jobId] = { ... }; // REMOVED
        // if (dbEventId) { // dbEventId is jobId
        try {
            await updateAnalysisEventStatus(jobId, 'processing', null, 'Uploading file to Google GenAI...');
            console.info(`${prefix} Supabase status updated to PROCESSING (Uploading to GenAI).`);
        } catch (dbError) {
            console.warn(`${prefix} Failed to update Supabase status to PROCESSING (Uploading to GenAI):`, dbError);
        }
        // }
        console.info(`${prefix} Uploading file: ${localFilePath} (Original: ${originalFilename}, Type: ${mimeType})`);

        // 上传文件到 Gemini
        const uploadedFile = await uploadFileToGemini(localFilePath, mimeType, originalFilename, jobId, dbEventId);

        if (!uploadedFile || !uploadedFile.uri) {
            console.error(`${prefix} Failed to upload file to Gemini: No URI returned.`);
            throw new Error('Failed to upload file to Gemini: No URI returned');
        }
        console.info(`${prefix} File uploaded to Gemini. URI: ${uploadedFile.uri}. Updating Supabase.`);
        // analysisJobs[jobId] = { ... }; // REMOVED

        // 更新数据库中的 Gemini 文件链接 和 status_text
        // if (dbEventId) { // dbEventId is jobId
        console.info(`${prefix} Attempting to update Supabase with Gemini file link: ${uploadedFile.uri}`);
        try {
            // updateAnalysisEventGeminiLink also sets status to processing and a status_text
            await updateAnalysisEventGeminiLink(jobId, uploadedFile.uri);
            console.info(`${prefix} Supabase Gemini file link and status updated successfully.`);
        } catch (dbError) {
            console.warn(`${prefix} Failed to update Supabase Gemini file link or status:`, dbError);
        }
        // }

        // 等待文件处理
        console.info(`${prefix} Waiting for Gemini file processing... URI: ${uploadedFile.uri}`);
        // analysisJobs[jobId] = { ... }; // REMOVED
        // No specific Supabase status update here as updateAnalysisEventGeminiLink covers it.

        await waitForFileProcessing(uploadedFile.uri, undefined, jobId, dbEventId);
        console.info(`${prefix} Gemini file processing completed. URI: ${uploadedFile.uri}`);
        // analysisJobs[jobId] = { ... }; // REMOVED
        // if (dbEventId) { // dbEventId is jobId
        try {
            await updateAnalysisEventStatus(jobId, 'processing', null, 'GenAI file active, starting content analysis...');
            console.info(`${prefix} Supabase status updated to PROCESSING (Analyzing content).`);
        } catch (dbError) {
            console.warn(`${prefix} Failed to update Supabase status to PROCESSING (Analyzing content):`, dbError);
        }
        // }

        // 进行分析
        console.info(`${prefix} Starting Gemini content analysis... URI: ${uploadedFile.uri}`);
        const analysisResultText = await analyzeVideoWithGemini(uploadedFile.uri, mimeType, jobId, dbEventId);
        console.info(`${prefix} Gemini content analysis successful. Result text received.`);

        // 完成分析
        const analysisReport = {
            text: analysisResultText,
            timestamp: new Date().toISOString(),
            model_used: 'gemini-2.0-flash' // Ensure this is the correct model if it changes
        };
        console.info(`${prefix} Analysis report prepared. Updating Supabase to COMPLETED.`);

        // analysisJobs[jobId] = { ... }; // REMOVED

        // 更新数据库
        // if (dbEventId) { // dbEventId is jobId
        console.info(`${prefix} Attempting to update Supabase status to COMPLETED with report.`);
        try {
            await completeAnalysisEvent(jobId, analysisReport); // completeAnalysisEvent sets status and status_text
            console.info(`${prefix} Supabase status and report updated to COMPLETED successfully.`);
        } catch (dbError) {
            console.error(`${prefix} CRITICAL: Failed to update Supabase status to COMPLETED:`, dbError);
            // Consider if we need a fallback or retry for this DB update.
        }
        // }

        console.info(`${prefix} performAnalysisWithLocalFile completed successfully.`);

    } catch (error) {
        const overallDuration = Date.now() - overallStartTime;
        // const finalStatus = analysisJobs[jobId] ? (analysisJobs[jobId] as any).status : 'N/A'; // REMOVED
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during local file analysis.';
        console.error(`${prefix} Critical error in performAnalysisWithLocalFile (Overall Duration: ${overallDuration}ms):`, errorMessage, error);

        // console.info(`${prefix} Updating jobStorage: status=failed, error='${errorMessage}'`);
        // analysisJobs[jobId] = { ... }; // REMOVED

        // 更新数据库状态为失败
        // if (dbEventId) { // dbEventId is jobId
        console.info(`${prefix} Attempting to update Supabase status to FAILED.`);
        try {
            await updateAnalysisEventStatus(jobId, 'failed', errorMessage, `Analysis failed: ${errorMessage.substring(0, 100)}`);
            console.info(`${prefix} Supabase status updated to FAILED.`);
        } catch (dbError) {
            console.error(`${prefix} CRITICAL: Failed to update Supabase status to FAILED after local analysis error:`, dbError);
        }
        // }
    } finally {
        const overallDuration = Date.now() - overallStartTime;
        // const finalStatus = analysisJobs[jobId] ? (analysisJobs[jobId] as any).status : 'N/A'; // REMOVED
        console.info(`${prefix} performAnalysisWithLocalFile finished. Overall Duration: ${overallDuration}ms.`);
    }
}

// 图片分析功能
export async function analyzeImages(images: Array<{url: string, filename: string, contentType: string}>): Promise<string> {
    console.info(`Starting image analysis for ${images.length} images`);

    if (!ai) {
        console.error('Google GenAI SDK not initialized during analyzeImages');
        throw new Error('Google GenAI SDK not initialized');
    }

    if (!images || images.length === 0) {
        throw new Error('No images provided for analysis');
    }

    if (images.length > 3) {
        throw new Error('Maximum 3 images allowed for analysis');
    }

    // 构建分析提示词
    const basePrompt = `请分析这${images.length === 1 ? '张运动图片' : `${images.length}张运动图片`}中的体态和动作。请提供详细的分析报告，包括：

1. **动作识别**: 识别图片中的运动类型和具体动作
2. **体态评估**: 分析身体姿势、对齐和平衡
3. **技术要点**: 指出动作的关键技术要素
4. **问题识别**: 发现可能的体态问题或动作错误
5. **改进建议**: 提供具体的改进建议和训练要点
6. **安全提醒**: 指出需要注意的安全事项`;

    let specificPrompt = '';
    if (images.length === 1) {
        specificPrompt = '\n\n请针对这张图片进行详细的单帧分析，重点关注当前姿态的准确性和改进空间。';
    } else {
        specificPrompt = `\n\n这是${images.length}张图片的对比分析，请：
- 比较不同图片中的动作差异
- 分析动作的进步或退步
- 提供连续性的改进建议
- 指出动作序列中的关键变化点`;
    }

    const fullPrompt = basePrompt + specificPrompt + '\n\n请用中文回答，并提供结构化的分析报告。';

    try {
        const startTime = Date.now();

        // 创建内容数组，包含所有图片
        const contentParts = [];

        // 添加所有图片
        for (let i = 0; i < images.length; i++) {
            const image = images[i];
            console.info(`Adding image ${i + 1} to analysis: ${image.filename}`);
            contentParts.push(createPartFromUri(image.url, image.contentType));
        }

        // 添加提示词
        contentParts.push(fullPrompt);

        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: createUserContent(contentParts)
        });

        const duration = Date.now() - startTime;
        const analysisText = response.text;
        console.info(`Image analysis successful. Duration: ${duration}ms. Response received: ${analysisText ? 'Yes' : 'No (Empty)'}`);

        if (!analysisText) {
            console.error('No analysis text received from Gemini for images');
            throw new Error('No analysis text received from Gemini');
        }

        return analysisText;
    } catch (error) {
        console.error('Error analyzing images with Gemini:', error instanceof Error ? error.message : error, error);
        throw error;
    }
}