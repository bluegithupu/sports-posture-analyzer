import { NextRequest, NextResponse } from 'next/server';
import { createLiveSession, GeminiLiveSession } from '@/lib/geminiLive';
import { sendMessageToClient } from '@/lib/sseManager';

// 存储活跃的会话
const activeSessions = new Map<string, GeminiLiveSession>();

export async function POST(request: NextRequest) {
    try {
        const { action, sessionId, data } = await request.json();

        switch (action) {
            case 'connect':
                return await handleConnect(sessionId);
            
            case 'disconnect':
                return await handleDisconnect(sessionId);
            
            case 'sendText':
                return await handleSendText(sessionId, data.text);
            
            case 'sendAudio':
                return await handleSendAudio(sessionId, data.audioData);
            
            case 'sendVideo':
                return await handleSendVideo(sessionId, data.videoFrame);
            
            default:
                return NextResponse.json(
                    { error: 'Invalid action' },
                    { status: 400 }
                );
        }
    } catch (error) {
        console.error('Live session API error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

async function handleConnect(sessionId: string): Promise<NextResponse> {
    try {
        // 检查是否已存在会话
        if (activeSessions.has(sessionId)) {
            const existingSession = activeSessions.get(sessionId);
            if (existingSession?.isConnected()) {
                return NextResponse.json({ 
                    success: true, 
                    message: 'Session already connected' 
                });
            }
        }

        // 创建新会话
        const session = createLiveSession({
            onopen: () => {
                console.log(`Session ${sessionId} opened`);
                sendMessageToClient(sessionId, { type: 'session_opened' });
            },
            onmessage: (message) => {
                console.log(`Session ${sessionId} received message:`, message);
                
                // 提取文本响应并发送到客户端
                if (message.serverContent?.modelTurn?.parts) {
                    const part = message.serverContent.modelTurn.parts[0];
                    if (part?.text) {
                        sendMessageToClient(sessionId, {
                            type: 'coach_message',
                            text: part.text,
                            timestamp: new Date().toISOString()
                        });
                    }
                }
            },
            onerror: (error) => {
                console.error(`Session ${sessionId} error:`, error);
                sendMessageToClient(sessionId, { 
                    type: 'error', 
                    message: error.message 
                });
            },
            onclose: (event) => {
                console.log(`Session ${sessionId} closed:`, event.reason);
                sendMessageToClient(sessionId, { 
                    type: 'session_closed', 
                    reason: event.reason 
                });
                activeSessions.delete(sessionId);
            }
        });

        // 连接会话
        await session.connect({
            speechConfig: {
                languageCode: 'en-US',  // 使用英文，因为模型不支持中文
                voiceConfig: {
                    prebuiltVoiceConfig: {
                        voiceName: 'Aoede'
                    }
                }
            }
        });

        // 存储会话
        activeSessions.set(sessionId, session);

        return NextResponse.json({ 
            success: true, 
            message: 'Session connected successfully' 
        });
    } catch (error) {
        console.error('Failed to connect session:', error);
        return NextResponse.json(
            { error: 'Failed to connect to live session' },
            { status: 500 }
        );
    }
}

async function handleDisconnect(sessionId: string): Promise<NextResponse> {
    try {
        const session = activeSessions.get(sessionId);
        if (session) {
            session.close();
            activeSessions.delete(sessionId);
        }

        return NextResponse.json({ 
            success: true, 
            message: 'Session disconnected' 
        });
    } catch (error) {
        console.error('Failed to disconnect session:', error);
        return NextResponse.json(
            { error: 'Failed to disconnect session' },
            { status: 500 }
        );
    }
}

async function handleSendText(sessionId: string, text: string): Promise<NextResponse> {
    try {
        const session = activeSessions.get(sessionId);
        if (!session || !session.isConnected()) {
            return NextResponse.json(
                { error: 'Session not connected' },
                { status: 400 }
            );
        }

        await session.sendText(text);

        return NextResponse.json({ 
            success: true, 
            message: 'Text sent successfully' 
        });
    } catch (error) {
        console.error('Failed to send text:', error);
        return NextResponse.json(
            { error: 'Failed to send text' },
            { status: 500 }
        );
    }
}

async function handleSendAudio(sessionId: string, audioData: string): Promise<NextResponse> {
    try {
        const session = activeSessions.get(sessionId);
        if (!session || !session.isConnected()) {
            return NextResponse.json(
                { error: 'Session not connected' },
                { status: 400 }
            );
        }

        // 将base64音频数据转换为ArrayBuffer
        const binaryString = atob(audioData);
        const arrayBuffer = new ArrayBuffer(binaryString.length);
        const uint8Array = new Uint8Array(arrayBuffer);
        
        for (let i = 0; i < binaryString.length; i++) {
            uint8Array[i] = binaryString.charCodeAt(i);
        }

        await session.sendAudio(arrayBuffer);

        return NextResponse.json({ 
            success: true, 
            message: 'Audio sent successfully' 
        });
    } catch (error) {
        console.error('Failed to send audio:', error);
        return NextResponse.json(
            { error: 'Failed to send audio' },
            { status: 500 }
        );
    }
}

async function handleSendVideo(sessionId: string, videoFrame: ImageData): Promise<NextResponse> {
    try {
        const session = activeSessions.get(sessionId);
        if (!session || !session.isConnected()) {
            return NextResponse.json(
                { error: 'Session not connected' },
                { status: 400 }
            );
        }

        // 这里videoFrame应该是ImageData格式
        await session.sendVideo(videoFrame);

        return NextResponse.json({ 
            success: true, 
            message: 'Video frame sent successfully' 
        });
    } catch (error) {
        console.error('Failed to send video frame:', error);
        return NextResponse.json(
            { error: 'Failed to send video frame' },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
        return NextResponse.json(
            { error: 'Session ID required' },
            { status: 400 }
        );
    }

    const session = activeSessions.get(sessionId);
    const isConnected = session ? session.isConnected() : false;

    return NextResponse.json({ 
        connected: isConnected,
        sessionId 
    });
}

export async function DELETE() {
    try {
        // 清理所有活跃会话（主要用于服务器重启时的清理）
        for (const [sessionId, session] of activeSessions.entries()) {
            try {
                session.close();
            } catch (error) {
                console.error(`Error closing session ${sessionId}:`, error);
            }
        }
        activeSessions.clear();

        return NextResponse.json({ 
            success: true, 
            message: 'All sessions cleared' 
        });
    } catch (error) {
        console.error('Failed to clear sessions:', error);
        return NextResponse.json(
            { error: 'Failed to clear sessions' },
            { status: 500 }
        );
    }
}