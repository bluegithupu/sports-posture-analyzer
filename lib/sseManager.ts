interface SSEMessage {
    type: string;
    text?: string;
    message?: string;
    reason?: string;
    timestamp?: string;
}

// 存储SSE连接
const sseConnections = new Map<string, ReadableStreamDefaultController>();

// 存储会话消息队列
const messageQueues = new Map<string, SSEMessage[]>();

// 发送消息到客户端
export function sendMessageToClient(sessionId: string, message: SSEMessage) {
    const controller = sseConnections.get(sessionId);
    
    if (controller) {
        try {
            controller.enqueue(`data: ${JSON.stringify(message)}\n\n`);
        } catch (error) {
            console.error('Error sending message to client:', error);
            // 如果连接已关闭，存储到队列
            const queue = messageQueues.get(sessionId) || [];
            queue.push(message);
            messageQueues.set(sessionId, queue);
        }
    } else {
        // 连接尚未建立，存储到队列
        const queue = messageQueues.get(sessionId) || [];
        queue.push(message);
        messageQueues.set(sessionId, queue);
    }
}

// 获取 SSE 连接管理器
export function getSSEManager() {
    return {
        sseConnections,
        messageQueues
    };
}