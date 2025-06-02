// 全局分析任务存储
// 在生产环境中，这应该使用 Redis 或数据库来存储
export const analysisJobs: Record<string, unknown> = {};

export function getJob(jobId: string) {
    return analysisJobs[jobId];
}

export function setJob(jobId: string, jobData: unknown) {
    analysisJobs[jobId] = jobData;
}

export function updateJob(jobId: string, updates: unknown) {
    if (analysisJobs[jobId]) {
        analysisJobs[jobId] = { ...analysisJobs[jobId] as object, ...updates as object };
    }
}

export function deleteJob(jobId: string) {
    delete analysisJobs[jobId];
} 