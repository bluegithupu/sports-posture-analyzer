import {
    GoogleGenAI,
    LiveServerMessage,
    MediaResolution,
    Modality,
    Session,
} from '@google/genai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_LIVE_MODEL = 'gemini-live-2.5-flash-preview';

if (!GEMINI_API_KEY) {
    console.warn("GEMINI_API_KEY is not set. Live coach features will be disabled.");
}

export const ai = GEMINI_API_KEY ? new GoogleGenAI({ apiKey: GEMINI_API_KEY }) : null;

export interface LiveSessionConfig {
    responseModalities: Modality[];
    mediaResolution: MediaResolution;
    speechConfig: {
        languageCode: string;
        voiceConfig: {
            prebuiltVoiceConfig: {
                voiceName: string;
            };
        };
    };
    contextWindowCompression?: {
        triggerTokens: string;
        slidingWindow: { targetTokens: string };
    };
}

export interface LiveSessionCallbacks {
    onopen?: () => void;
    onmessage?: (message: LiveServerMessage) => void;
    onerror?: (error: ErrorEvent) => void;
    onclose?: (event: CloseEvent) => void;
}

export class GeminiLiveSession {
    private session: Session | null = null;
    private responseQueue: LiveServerMessage[] = [];
    private audioParts: string[] = [];
    private callbacks: LiveSessionCallbacks;
    private isProcessing = false;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 3;
    private connectionConfig: Partial<LiveSessionConfig> | undefined;

    constructor(callbacks: LiveSessionCallbacks) {
        this.callbacks = callbacks;
    }

    async connect(config?: Partial<LiveSessionConfig>): Promise<void> {
        if (!ai) {
            throw new Error('Google GenAI SDK not initialized');
        }

        // 保存配置用于重连
        this.connectionConfig = config;

        const defaultConfig = {
            responseModalities: [Modality.TEXT],  // 先只使用文本模式
            systemInstruction: "你是一位专业的运动姿态与体态分析大师。请用中文与用户交流，分析用户的运动动作并提供专业指导。请保持友好、专业的语调。"
        };

        const finalConfig = { ...defaultConfig, ...config };

        try {
            console.log('Attempting to connect to Gemini Live API...');
            console.log('Using model:', GEMINI_LIVE_MODEL);
            console.log('Using config:', finalConfig);

            // 添加连接超时处理
            const connectPromise = ai.live.connect({
                model: GEMINI_LIVE_MODEL,
                callbacks: {
                    onopen: () => {
                        console.log('Live session opened successfully');
                        this.reconnectAttempts = 0; // 重置重连计数
                        this.callbacks.onopen?.();
                    },
                    onmessage: (message: LiveServerMessage) => {
                        console.log('Received message from Gemini Live:', message);
                        this.responseQueue.push(message);
                        this.processMessage(message);
                        this.callbacks.onmessage?.(message);
                    },
                    onerror: (error: ErrorEvent) => {
                        console.error('Live session error:', error);
                        this.callbacks.onerror?.(error);
                    },
                    onclose: (event: CloseEvent) => {
                        console.log('Live session closed:', event.reason, 'Code:', event.code);
                        this.session = null;

                        // 如果是意外断开且未达到最大重连次数，尝试重连
                        if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
                            console.log(`Attempting reconnection (${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})...`);
                            this.reconnectAttempts++;
                            setTimeout(() => {
                                this.connect(this.connectionConfig).catch(error => {
                                    console.error('Reconnection failed:', error);
                                });
                            }, 2000 * this.reconnectAttempts); // 递增延迟
                        } else {
                            this.callbacks.onclose?.(event);
                        }
                    },
                },
                config: finalConfig
            });

            // 30秒连接超时
            const timeoutPromise = new Promise<never>((_, reject) => {
                setTimeout(() => reject(new Error('Connection timeout after 30 seconds')), 30000);
            });

            this.session = await Promise.race([connectPromise, timeoutPromise]);

            console.log('Session connected, setting coach personality...');
            // 发送初始健身教练角色设定
            await this.setCoachPersonality();
            console.log('Coach personality set successfully');
        } catch (error) {
            console.error('Failed to connect to Gemini Live:', error);
            throw error;
        }
    }

    private async setCoachPersonality(): Promise<void> {
        const coachPrompt = `You are a professional AI fitness coach with the following characteristics:

**Professional Qualifications**:
- Master's degree in Exercise Science with 10 years of fitness coaching experience
- Internationally certified personal trainer (ACSM, NASM certified)
- Professional sports rehabilitation specialist and posture correction expert
- Experience coaching professional athletes and fitness enthusiasts

**Communication Style**:
- Friendly, encouraging, professional but not overly serious
- Speak clearly and concisely
- Provide timely positive feedback and constructive suggestions
- Focus on user safety and injury prevention
- Can understand both English and Chinese inputs from users
- Always respond in Chinese (中文) for better user experience
- Use encouraging and professional language

**Core Responsibilities**:
1. **Real-time Posture Guidance**: Observe user's exercise videos and provide immediate posture corrections
2. **Movement Demonstration**: Explain correct movement techniques and key points in detail
3. **Safety Reminders**: Identify dangerous movements and promptly remind users to stop or adjust
4. **Encouragement and Support**: Provide positive encouragement to maintain exercise motivation
5. **Personalized Advice**: Offer personalized training suggestions based on user performance

**Communication Principles**:
- Keep responses brief and effective (1-2 sentences per response)
- Prioritize safety concerns
- Use encouraging language
- Provide specific, actionable advice
- Appropriately ask about user's feelings and needs
- Always respond in Chinese to match user preference
- If user speaks Chinese, respond in Chinese with professional fitness guidance

Now let's begin our fitness coaching session. Please introduce yourself in Chinese and ask the user what exercise they would like to do today.`;

        if (this.session) {
            this.session.sendRealtimeInput({
                text: coachPrompt
            });
        }
    }

    private processMessage(message: LiveServerMessage): void {
        if (this.isProcessing) return;
        this.isProcessing = true;

        try {
            if (message.serverContent?.modelTurn?.parts) {
                const part = message.serverContent.modelTurn.parts[0];

                if (part?.inlineData) {
                    // 处理音频数据
                    this.audioParts.push(part.inlineData.data ?? '');

                    if (message.serverContent.turnComplete) {
                        // 完整音频接收完毕，可以播放
                        this.playAudioResponse();
                        this.audioParts = []; // 清空音频缓存
                    }
                }

                if (part?.text) {
                    console.log('Coach response:', part.text);
                    // 文本响应会在 API 路由中通过 SSE 发送到客户端
                }
            }
        } catch (error) {
            console.error('Error processing message:', error);
        } finally {
            this.isProcessing = false;
        }
    }

    private playAudioResponse(): void {
        if (this.audioParts.length === 0) return;

        // 检查是否在浏览器环境中
        if (typeof window === 'undefined' || typeof Audio === 'undefined') {
            console.warn('playAudioResponse called in server environment, skipping');
            return;
        }

        try {
            // 将base64音频数据转换为blob并播放
            const combinedData = this.audioParts.join('');
            const binaryData = atob(combinedData);
            const arrayBuffer = new ArrayBuffer(binaryData.length);
            const uint8Array = new Uint8Array(arrayBuffer);

            for (let i = 0; i < binaryData.length; i++) {
                uint8Array[i] = binaryData.charCodeAt(i);
            }

            const audioBlob = new Blob([arrayBuffer], { type: 'audio/wav' });
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);

            audio.play().catch(error => {
                console.error('Error playing audio:', error);
            });

            // 清理URL
            audio.onended = () => {
                URL.revokeObjectURL(audioUrl);
            };
        } catch (error) {
            console.error('Error creating audio from response:', error);
        }
    }

    async sendText(text: string): Promise<void> {
        if (!this.session) {
            throw new Error('Session not connected');
        }

        try {
            console.log('Sending text to Gemini Live session:', text);

            this.session.sendRealtimeInput({
                text: text
            });

        } catch (error) {
            console.error('Error sending text:', error);
            throw error;
        }
    }

    async sendAudio(audioData: ArrayBuffer): Promise<void> {
        if (!this.session) {
            throw new Error('Session not connected');
        }

        try {
            console.log('Sending audio to Gemini Live session, length:', audioData.byteLength);

            // 转换音频数据为base64
            const base64Audio = btoa(
                new Uint8Array(audioData).reduce((data, byte) => data + String.fromCharCode(byte), '')
            );

            this.session.sendRealtimeInput({
                audio: {
                    data: base64Audio,
                    mimeType: 'audio/pcm;rate=16000'
                }
            });

        } catch (error) {
            console.error('Error sending audio:', error);
            throw error;
        }
    }

    async sendVideo(videoFrame: ImageData): Promise<void> {
        if (!this.session) {
            throw new Error('Session not connected');
        }

        // 检查是否在浏览器环境中
        if (typeof window === 'undefined' || typeof document === 'undefined') {
            console.warn('sendVideo called in server environment, skipping');
            return;
        }

        try {
            console.log('Sending video frame to Gemini Live session, dimensions:', videoFrame.width, 'x', videoFrame.height);

            // 将ImageData转换为base64图像
            const canvas = document.createElement('canvas');
            canvas.width = videoFrame.width;
            canvas.height = videoFrame.height;
            const ctx = canvas.getContext('2d');

            if (ctx) {
                ctx.putImageData(videoFrame, 0, 0);
                const base64Image = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];

                this.session.sendRealtimeInput({
                    media: {
                        data: base64Image,
                        mimeType: 'image/jpeg'
                    }
                });
            }

        } catch (error) {
            console.error('Error sending video frame:', error);
            throw error;
        }
    }

    close(): void {
        if (this.session) {
            console.log('Closing Gemini Live session');
            try {
                this.session.close();
            } catch (error) {
                console.error('Error closing session:', error);
            }
            this.session = null;
        }
        this.responseQueue = [];
        this.audioParts = [];
    }

    isConnected(): boolean {
        return this.session !== null;
    }

    async waitForResponse(): Promise<LiveServerMessage[]> {
        const turn: LiveServerMessage[] = [];
        let done = false;

        while (!done) {
            const message = await this.waitMessage();
            turn.push(message);
            if (message.serverContent && message.serverContent.turnComplete) {
                done = true;
            }
        }

        return turn;
    }

    private async waitMessage(): Promise<LiveServerMessage> {
        let done = false;
        let message: LiveServerMessage | undefined = undefined;

        while (!done) {
            message = this.responseQueue.shift();
            if (message) {
                done = true;
            } else {
                await new Promise((resolve) => setTimeout(resolve, 100));
            }
        }

        return message!;
    }
}

export function createLiveSession(callbacks: LiveSessionCallbacks): GeminiLiveSession {
    return new GeminiLiveSession(callbacks);
}