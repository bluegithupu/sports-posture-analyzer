// 全局分析事件存储
// 在生产环境中，这应该使用 Redis 或数据库来存储
export const analysisEvents: Record<string, unknown> = {};

export function getEvent(eventId: string) {
    return analysisEvents[eventId];
}

export function setEvent(eventId: string, eventData: unknown) {
    analysisEvents[eventId] = eventData;
}

export function updateEvent(eventId: string, updates: unknown) {
    if (analysisEvents[eventId]) {
        analysisEvents[eventId] = { ...analysisEvents[eventId] as object, ...updates as object };
    }
}

export function deleteEvent(eventId: string) {
    delete analysisEvents[eventId];
} 