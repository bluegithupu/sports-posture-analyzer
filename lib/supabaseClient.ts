import { createClient } from '@supabase/supabase-js';

// Supabase 配置
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

let supabase: ReturnType<typeof createClient> | null = null;

// 初始化 Supabase 客户端
if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log("Supabase client initialized.");
} else {
    console.warn("Supabase configuration incomplete. Database features will be disabled.");
}

/**
 * 定义 AnalysisEvent 类型，如果它在其他地方没有被恰当地定义或导出
 * 或者从 apiClient.ts 导入
 */
interface AnalysisEvent {
    id: string;
    created_at: string;
    r2_video_link: string;
    gemini_file_link?: string | null; // 允许 null
    analysis_report?: { // 允许 null 或对象
        text: string;
        timestamp: string;
        model_used: string;
    } | null;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    error_message?: string | null; // 允许 null
    original_filename?: string | null; // 新增，允许 null
    content_type?: string | null; // 新增，允许 null
    status_text?: string | null; // 新增，允许 null
}

/**
 * 创建新的分析事件记录
 * @param {string} r2VideoLink - R2 视频链接
 * @param {string} geminiFileLink - Gemini 文件链接（可选）
 * @param {string} originalFilename - 原始文件名（新增）
 * @param {string} contentType - 文件类型（新增）
 * @returns {Promise<{id: string | null, error?: string}>}
 */
export async function createAnalysisEvent(
    r2VideoLink: string,
    originalFilename: string,
    contentType: string,
    geminiFileLink: string | null = null
): Promise<{ id: string | null, error?: string }> {
    if (!supabase) {
        console.warn("Supabase not configured, skipping database insertion");
        return { id: null, error: "Database not configured" };
    }

    try {
        const { data, error } = await supabase
            .from('analysis_events')
            .insert({
                r2_video_link: r2VideoLink,
                gemini_file_link: geminiFileLink,
                original_filename: originalFilename,
                content_type: contentType,
                status: 'pending',
                status_text: 'Job submitted and pending processing.'
            })
            .select()
            .single();

        if (error) {
            console.error("Error creating analysis event:", error);
            return { id: null, error: error.message };
        }

        console.log("Analysis event created:", data.id);
        return { id: data.id as string };
    } catch (err: unknown) {
        const error = err as Error;
        console.error("Exception creating analysis event:", error);
        return { id: null, error: error.message };
    }
}

/**
 * 更新分析事件状态
 * @param {string} eventId - 事件ID
 * @param {string} status - 新状态
 * @param {string} errorMessage - 错误消息（可选）
 * @param {string} statusText - 状态文本（可选，新增）
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function updateAnalysisEventStatus(
    eventId: string,
    status: string,
    errorMessage: string | null = null,
    statusText: string | null = null
) {
    if (!supabase || !eventId) {
        return { success: false, error: "Database not configured or no event ID" };
    }

    try {
        const updateData: Record<string, unknown> = { status };

        // 如果传入 null，明确清除错误消息
        if (errorMessage === null) {
            updateData.error_message = null;
        } else if (errorMessage) {
            updateData.error_message = errorMessage;
        }

        // 更新 status_text (如果提供)
        if (statusText !== null) {
            updateData.status_text = statusText;
        } else if (status === 'pending') {
            updateData.status_text = 'Job is pending.';
        } else if (status === 'processing') {
            updateData.status_text = updateData.status_text || 'Job is processing...';
        } else if (status === 'failed') {
            updateData.status_text = updateData.status_text || 'Job failed.';
        } else if (status === 'completed') {
            updateData.status_text = 'Job completed successfully.';
        }

        const { error } = await supabase
            .from('analysis_events')
            .update(updateData)
            .eq('id', eventId);

        if (error) {
            console.error("Error updating analysis event status:", error);
            return { success: false, error: error.message };
        }

        console.log(`Analysis event ${eventId} status updated to: ${status}${errorMessage === null ? ' (error message cleared)' : ''}`);
        return { success: true };
    } catch (err: unknown) {
        const error = err as Error;
        console.error("Exception updating analysis event status:", error);
        return { success: false, error: error.message };
    }
}

/**
 * 更新分析事件的 Gemini 文件链接
 * @param {string} eventId - 事件ID
 * @param {string} geminiFileLink - Gemini 文件链接
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function updateAnalysisEventGeminiLink(eventId: string, geminiFileLink: string) {
    if (!supabase || !eventId) {
        return { success: false, error: "Database not configured or no event ID" };
    }

    try {
        const { error } = await supabase
            .from('analysis_events')
            .update({
                gemini_file_link: geminiFileLink,
                status: 'processing',
                status_text: 'Gemini file link stored, awaiting GenAI processing.'
            })
            .eq('id', eventId);

        if (error) {
            console.error("Error updating gemini file link:", error);
            return { success: false, error: error.message };
        }

        console.log(`Analysis event ${eventId} gemini link updated`);
        return { success: true };
    } catch (err: unknown) {
        const error = err as Error;
        console.error("Exception updating gemini file link:", error);
        return { success: false, error: error.message };
    }
}

/**
 * 完成分析事件，保存报告
 * @param {string} eventId - 事件ID
 * @param {object} analysisReport - 分析报告
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function completeAnalysisEvent(eventId: string, analysisReport: Record<string, unknown>) {
    console.log(`[completeAnalysisEvent] Starting update for event ${eventId}`);
    console.log(`[completeAnalysisEvent] Report data:`, {
        text_length: (analysisReport?.text as string)?.length || 0,
        has_timestamp: !!analysisReport?.timestamp,
        model_used: analysisReport?.model_used
    });

    if (!supabase || !eventId) {
        console.error(`[completeAnalysisEvent] Missing requirements: supabase=${!!supabase}, eventId=${!!eventId}`);
        return { success: false, error: "Database not configured or no event ID" };
    }

    try {
        console.log(`[completeAnalysisEvent] Executing database update...`);
        const { data, error } = await supabase
            .from('analysis_events')
            .update({
                analysis_report: analysisReport,
                status: 'completed',
                status_text: 'Analysis completed and report generated.'
            })
            .eq('id', eventId)
            .select();

        if (error) {
            console.error(`[completeAnalysisEvent] Database error:`, error);
            return { success: false, error: error.message };
        }

        console.log(`[completeAnalysisEvent] Update successful for event ${eventId}. Updated rows:`, data?.length || 0);
        if (data?.length === 0) {
            console.warn(`[completeAnalysisEvent] No rows were updated. Event ID ${eventId} may not exist.`);
            return { success: false, error: "Event ID not found in database" };
        }

        console.log(`Analysis event ${eventId} completed successfully`);
        return { success: true };
    } catch (err: unknown) {
        const error = err as Error;
        console.error(`[completeAnalysisEvent] Exception:`, error);
        return { success: false, error: error.message };
    }
}

/**
 * 获取分析历史记录
 * @param {number} limit - 限制数量，默认10条
 * @returns {Promise<{data: array, error?: string}>}
 */
export async function getAnalysisHistory(limit: number = 10) {
    if (!supabase) {
        return { data: [], error: "Database not configured" };
    }

    try {
        const { data, error } = await supabase
            .from('analysis_events')
            .select('id, created_at, r2_video_link, status, error_message, analysis_report, original_filename, content_type, status_text')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error("Error fetching analysis history:", error);
            return { data: [], error: error.message };
        }

        return { data };
    } catch (err: unknown) {
        const error = err as Error;
        console.error("Exception fetching analysis history:", error);
        return { data: [], error: error.message };
    }
}

/**
 * 根据事件ID获取分析事件详情
 * @param {string} eventId - 事件ID
 * @returns {Promise<{data: AnalysisEvent | null, error?: string}>}
 */
export async function getAnalysisEventById(eventId: string): Promise<{ data: AnalysisEvent | null, error?: string }> {
    if (!supabase) {
        return { data: null, error: "Database not configured" };
    }

    try {
        const { data, error } = await supabase
            .from('analysis_events')
            .select('id, created_at, r2_video_link, status, error_message, analysis_report, gemini_file_link, original_filename, content_type, status_text')
            .eq('id', eventId)
            .single();

        if (error) {
            console.error("Error fetching analysis event by ID:", error);
            return { data: null, error: error.message };
        }

        return { data: data as AnalysisEvent | null };
    } catch (err: unknown) {
        const error = err as Error;
        console.error("Exception fetching analysis event by ID:", error);
        return { data: null, error: error.message };
    }
} 