import {
    GoogleGenAI,
    createUserContent,
    createPartFromUri,
} from '@google/genai';
import fs from 'fs';
import path from 'path';
import { updateAnalysisEventStatus, updateAnalysisEventGeminiLink, completeAnalysisEvent } from './supabaseClient';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

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

/**
 * 统一的分析提示词生成函数
 *
 * 这个函数为视频和图片分析生成统一的AI提示词模板，确保分析的一致性和质量。
 *
 * @param mediaType - 媒体类型：'video' 或 'image'
 * @param mediaCount - 媒体数量，对于视频始终为1，对于图片可以是1-3
 * @returns 生成的分析提示词字符串
 *
 * @example
 * // 生成视频分析提示词
 * const videoPrompt = generateAnalysisPrompt('video', 1);
 *
 * // 生成单张图片分析提示词
 * const imagePrompt = generateAnalysisPrompt('image', 1);
 *
 * // 生成多张图片对比分析提示词
 * const multiImagePrompt = generateAnalysisPrompt('image', 3);
 */
export function generateAnalysisPrompt(mediaType: 'video' | 'image', mediaCount: number = 1): string {
    const mediaDescription = mediaType === 'video'
        ? '运动视频'
        : mediaCount === 1
            ? '张运动图片'
            : `${mediaCount}张运动图片`;

    const rolePrompt = `你是一位拥有20年经验的专业运动姿态与体态分析大师，具备以下专业资质：
- 运动生物力学博士学位
- 国际认证的运动康复师和体态矫正专家
- 曾为奥运选手和职业运动员提供姿态分析服务
- 精通人体解剖学、运动力学和损伤预防

作为专业的运动姿态分析师，请对这${mediaType === 'video' ? '个' : ''}${mediaDescription}进行深度的专业分析。`;

    const basePrompt = `

## 专业分析报告

### 1. **运动项目识别与动作分解**
- 准确识别运动项目类型和具体动作名称
- 分解动作的各个技术阶段（准备期、主要用力期、结束期）
- 分析动作的生物力学特征

### 2. **体态与姿势评估**
- **脊柱对齐**: 评估颈椎、胸椎、腰椎的生理曲度
- **骨盆位置**: 分析骨盆前倾、后倾或侧倾情况
- **肩胛骨稳定性**: 检查肩胛骨位置和活动模式
- **关节对齐**: 评估主要关节（踝、膝、髋、肩）的对齐状态
- **肌肉平衡**: 识别可能的肌肉失衡模式

### 3. **动作技术分析**
- **力量传递链**: 分析动力链的完整性和效率
- **时序协调**: 评估各身体部位的协调配合
- **稳定性控制**: 分析核心稳定性和平衡控制
- **动作幅度**: 评估关节活动度是否充分且安全

### 4. **问题识别与风险评估**
- **代偿模式**: 识别异常的代偿动作模式
- **潜在损伤风险**: 基于动作模式预测可能的损伤风险
- **技术缺陷**: 指出影响运动表现的技术问题
- **功能性限制**: 识别可能的功能性活动限制

### 5. **专业改进方案**
- **矫正性训练**: 提供针对性的矫正训练建议
- **强化训练**: 推荐相应的力量和稳定性训练
- **柔韧性改善**: 建议特定的拉伸和活动度训练
- **技术优化**: 提供具体的技术改进要点

### 6. **专业安全建议**
- **即时注意事项**: 需要立即关注的安全问题
- **训练负荷管理**: 合理的训练强度和频率建议
- **预防性措施**: 预防运动损伤的具体措施
- **专业咨询建议**: 是否需要寻求进一步的专业医疗或康复指导`;

    let specificPrompt = '';
    if (mediaType === 'video') {
        specificPrompt = `

### 视频动态分析重点：
- 分析整个动作序列的流畅性和连贯性
- 评估动作节奏和时序控制
- 观察疲劳状态下的动作变化
- 识别动作过程中的稳定性变化
- 分析重复动作的一致性`;
    } else if (mediaCount === 1) {
        specificPrompt = `

### 静态姿态分析重点：
- 进行精确的单帧姿态评估
- 分析当前姿态的生物力学合理性
- 评估静态稳定性和平衡状态
- 识别姿态维持的肌肉激活模式
- 预测从当前姿态转换到动作的风险`;
    } else {
        specificPrompt = `

### 多图片对比分析重点：
- 对比分析${mediaCount}张图片中的姿态变化
- 评估动作学习进程和技术改善情况
- 识别一致性问题和变异模式
- 分析不同阶段的技术特点
- 提供基于进展的个性化建议`;
    }

    return rolePrompt + basePrompt + specificPrompt + `

---
**请以专业运动姿态分析师的身份，用中文提供详细、准确、实用的专业评估报告。报告应具备科学性、专业性和实操性。**`;
}

// 统一的媒体分析函数（支持视频和图片）
export async function analyzeMediaWithGemini(
    fileUri: string,
    mimeType: string,
    mediaType: 'video' | 'image' = 'video',
    jobId?: string,
    dbEventId?: string | null
): Promise<string> {
    const prefix = logPrefix(jobId, dbEventId);
    console.info(`${prefix} Starting ${mediaType} analysis with Gemini. URI: ${fileUri}, MimeType: ${mimeType}`);

    if (!ai) {
        console.error(`${prefix} Google GenAI SDK not initialized during analyzeMediaWithGemini.`);
        throw new Error('Google GenAI SDK not initialized');
    }

    if (!fileUri) {
        console.error(`${prefix} File URI is required but was not provided for analyzeMediaWithGemini.`);
        throw new Error('File URI is required but was not provided');
    }

    const prompt = generateAnalysisPrompt(mediaType, 1);

    try {
        const startTime = Date.now();
        const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: createUserContent([
                createPartFromUri(fileUri, mimeType),
                prompt
            ])
        });

        const duration = Date.now() - startTime;
        const analysisText = response.text;
        console.info(`${prefix} Gemini ${mediaType} analysis successful. Duration: ${duration}ms. Response received: ${analysisText ? 'Yes' : 'No (Empty)'}`);

        if (!analysisText) {
            console.error(`${prefix} No analysis text received from Gemini. URI: ${fileUri}`);
            throw new Error('No analysis text received from Gemini');
        }

        return analysisText;
    } catch (error) {
        console.error(`${prefix} Error analyzing ${mediaType} with Gemini (URI: ${fileUri}):`, error instanceof Error ? error.message : error, error);
        throw error;
    }
}

// 保持向后兼容性的视频分析函数
export async function analyzeVideoWithGemini(fileUri: string, mimeType: string = 'video/mp4', jobId?: string, dbEventId?: string | null): Promise<string> {
    return analyzeMediaWithGemini(fileUri, mimeType, 'video', jobId, dbEventId);
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
        const analysisResult = await analyzeMediaWithGemini(uploadedFile.uri, mimeType, 'video', jobId, dbEventId);
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
        const analysisResultText = await analyzeMediaWithGemini(uploadedFile.uri, mimeType, 'video', jobId, dbEventId);
        console.info(`${prefix} Gemini content analysis successful. Result text received.`);

        // 完成分析
        const analysisReport = {
            text: analysisResultText,
            timestamp: new Date().toISOString(),
            model_used: GEMINI_MODEL // Use the configured model name
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
export async function analyzeImages(images: Array<{ url: string, filename: string, contentType: string }>): Promise<string> {
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

    // 使用统一的提示词生成函数
    const fullPrompt = generateAnalysisPrompt('image', images.length);

    try {
        const startTime = Date.now();

        // 创建内容数组，包含所有图片
        const contentParts = [];

        // 下载并转换图片为base64
        for (let i = 0; i < images.length; i++) {
            const image = images[i];
            console.info(`Fetching and converting image ${i + 1} to base64: ${image.filename}`);

            try {
                // 下载图片
                const response = await fetch(image.url);
                if (!response.ok) {
                    throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
                }

                // 转换为ArrayBuffer然后base64
                const arrayBuffer = await response.arrayBuffer();
                const base64 = Buffer.from(arrayBuffer).toString('base64');

                // 添加图片数据到内容数组
                contentParts.push({
                    inlineData: {
                        data: base64,
                        mimeType: image.contentType
                    }
                });

                console.info(`Successfully converted image ${i + 1} to base64`);
            } catch (fetchError) {
                console.error(`Error fetching image ${i + 1}:`, fetchError);
                throw new Error(`Failed to fetch image ${image.filename}: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`);
            }
        }

        // 添加提示词
        contentParts.push({ text: fullPrompt });

        const response = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: [{ role: 'user', parts: contentParts }]
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

// 执行完整的图片分析流程
export async function performImageAnalysis(
    jobId: string,
    images: Array<{ url: string, filename: string, contentType: string }>
) {
    const prefix = logPrefix(jobId, jobId);
    console.info(`${prefix} Starting performImageAnalysis. Images count: ${images.length}`);
    const overallStartTime = Date.now();

    try {
        // 更新数据库状态为处理中
        console.info(`${prefix} Updating Supabase status to PROCESSING.`);
        try {
            await updateAnalysisEventStatus(jobId, 'processing', 'AI正在分析图片...');
            console.info(`${prefix} Supabase status updated to PROCESSING successfully.`);
        } catch (dbError) {
            console.error(`${prefix} Failed to update Supabase status to PROCESSING:`, dbError);
            // Continue with analysis even if DB update fails
        }

        // 进行图片分析
        console.info(`${prefix} Starting image analysis with Gemini...`);
        const analysisStartTime = Date.now();
        const analysisText = await analyzeImages(images);
        const analysisDuration = Date.now() - analysisStartTime;
        console.info(`${prefix} Image analysis completed. Duration: ${analysisDuration}ms`);

        // 准备分析报告 - 统一使用 text 字段以保持与视频分析的一致性
        const analysisReport = {
            text: analysisText, // 统一使用 text 字段
            timestamp: new Date().toISOString(), // 统一使用 timestamp 字段
            model_used: GEMINI_MODEL, // 使用配置的模型名称
            analysis_type: 'image' as const,
            image_count: images.length,
            processing_duration_ms: analysisDuration,
            image_filenames: images.map(img => img.filename)
        };

        console.info(`${prefix} Analysis report prepared. Updating Supabase to COMPLETED.`);

        // 更新数据库
        console.info(`${prefix} Attempting to update Supabase status to COMPLETED with report.`);
        try {
            await completeAnalysisEvent(jobId, analysisReport);
            console.info(`${prefix} Supabase status and report updated to COMPLETED successfully.`);
        } catch (dbError) {
            console.error(`${prefix} CRITICAL: Failed to update Supabase status to COMPLETED:`, dbError);
            // Consider if we need a fallback or retry for this DB update.
        }

        const overallDuration = Date.now() - overallStartTime;
        console.info(`${prefix} performImageAnalysis finished successfully. Overall Duration: ${overallDuration}ms.`);

    } catch (error) {
        console.error(`${prefix} Error in performImageAnalysis:`, error instanceof Error ? error.message : error, error);

        // 更新数据库状态为失败
        try {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error during image analysis';
            await updateAnalysisEventStatus(jobId, 'failed', `分析失败: ${errorMessage}`);
            console.info(`${prefix} Supabase status updated to FAILED.`);
        } catch (dbError) {
            console.error(`${prefix} CRITICAL: Failed to update Supabase status to FAILED:`, dbError);
        }

        const overallDuration = Date.now() - overallStartTime;
        console.info(`${prefix} performImageAnalysis finished with error. Overall Duration: ${overallDuration}ms.`);
    }
}