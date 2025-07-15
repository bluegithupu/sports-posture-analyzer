import { NextRequest } from 'next/server';
import { getSSEManager } from '@/lib/sseManager';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
        return new Response('Session ID required', { status: 400 });
    }

    const { sseConnections, messageQueues } = getSSEManager();

    // 创建消息队列
    if (!messageQueues.has(sessionId)) {
        messageQueues.set(sessionId, []);
    }

    const stream = new ReadableStream({
        start(controller) {
            // 存储连接
            sseConnections.set(sessionId, controller);

            // 发送初始连接消息
            controller.enqueue(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

            // 发送队列中的消息
            const queue = messageQueues.get(sessionId);
            if (queue && queue.length > 0) {
                queue.forEach(message => {
                    controller.enqueue(`data: ${JSON.stringify(message)}\n\n`);
                });
                // 清空队列
                messageQueues.set(sessionId, []);
            }
        },
        cancel() {
            // 清理连接
            sseConnections.delete(sessionId);
            messageQueues.delete(sessionId);
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}