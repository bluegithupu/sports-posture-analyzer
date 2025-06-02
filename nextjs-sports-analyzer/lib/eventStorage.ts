// 全局分析事件存储
// 在生产环境中，这应该使用 Redis 或数据库来存储
export const analysisEvents: Record<string, any> = {};

export function getEvent(eventId: string) {
    return analysisEvents[eventId];
}

export function setEvent(eventId: string, eventData: any) {
    analysisEvents[eventId] = eventData;
}

export function updateEvent(eventId: string, updates: any) {
    if (analysisEvents[eventId]) {
        analysisEvents[eventId] = { ...analysisEvents[eventId], ...updates };
    }
}

export function deleteEvent(eventId: string) {
    delete analysisEvents[eventId];
} 