'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';

interface MediaStreamState {
    video: MediaStream | null;
    audio: MediaStream | null;
}

interface ConnectionState {
    connected: boolean;
    connecting: boolean;
    error: string | null;
}

export function LiveCoachPage() {
    const [hasShownWelcome, setHasShownWelcome] = useState(false);
    const [sessionId] = useState(() => uuidv4());
    const [connectionState, setConnectionState] = useState<ConnectionState>({
        connected: false,
        connecting: false,
        error: null
    });

    // 调试：监听连接状态变化
    useEffect(() => {
        console.log('Connection state changed:', connectionState);
    }, [connectionState]);
    const [mediaState, setMediaState] = useState<MediaStreamState>({
        video: null,
        audio: null
    });
    const [isRecording, setIsRecording] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [conversation, setConversation] = useState<Array<{
        type: 'user' | 'coach';
        content: string;
        timestamp: Date;
    }>>([]);

    // 新增状态用于打字机效果
    const [currentCoachMessage, setCurrentCoachMessage] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [typingQueue, setTypingQueue] = useState<string[]>([]);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const videoRef = useRef<HTMLVideoElement>(null);
    const audioRecorderRef = useRef<MediaRecorder | null>(null);
    const videoIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const eventSourceRef = useRef<EventSource | null>(null);

    // 获取媒体权限
    const requestMediaAccess = useCallback(async () => {
        try {
            console.log('Requesting camera access...');
            const videoStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    frameRate: { ideal: 15 }
                },
                audio: false
            });
            console.log('Camera access granted');

            console.log('Requesting microphone access...');
            const audioStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 16000
                },
                video: false
            });
            console.log('Microphone access granted');

            setMediaState({
                video: videoStream,
                audio: audioStream
            });

            if (videoRef.current) {
                videoRef.current.srcObject = videoStream;
                console.log('Video stream attached to video element');
            }

            return { videoStream, audioStream };
        } catch (error) {
            console.error('Failed to access media devices:', error);
            let errorMessage = '无法访问摄像头或麦克风';

            if (error instanceof Error) {
                if (error.name === 'NotAllowedError') {
                    errorMessage = '请允许访问摄像头和麦克风权限';
                } else if (error.name === 'NotFoundError') {
                    errorMessage = '未找到摄像头或麦克风设备';
                } else if (error.name === 'NotReadableError') {
                    errorMessage = '摄像头或麦克风被其他应用占用';
                } else if (error.name === 'OverconstrainedError') {
                    errorMessage = '摄像头不支持请求的参数';
                }
            }

            setConnectionState(prev => ({
                ...prev,
                error: errorMessage
            }));
            return null;
        }
    }, []);

    // 打字机效果函数
    const typeMessage = useCallback((message: string) => {
        setIsTyping(true);
        setCurrentCoachMessage('');

        let index = 0;
        const typeChar = () => {
            if (index < message.length) {
                setCurrentCoachMessage(message.substring(0, index + 1));
                index++;
                typingTimeoutRef.current = setTimeout(typeChar, 50); // 每50ms显示一个字符
            } else {
                setIsTyping(false);
                // 打字完成后，处理队列中的下一条消息
                setTypingQueue(prev => {
                    const newQueue = [...prev];
                    newQueue.shift(); // 移除已处理的消息
                    if (newQueue.length > 0) {
                        // 如果还有消息，继续打字
                        setTimeout(() => typeMessage(newQueue[0]), 500);
                    }
                    return newQueue;
                });
            }
        };

        typeChar();
    }, []);

    // 添加教练消息到打字队列
    const addCoachMessage = useCallback((content: string) => {
        setTypingQueue(prev => {
            const newQueue = [...prev, content];
            return newQueue;
        });

        // 使用 setTimeout 来检查是否需要开始打字
        setTimeout(() => {
            setTypingQueue(currentQueue => {
                setIsTyping(currentIsTyping => {
                    if (!currentIsTyping && currentQueue.length > 0) {
                        typeMessage(currentQueue[0]);
                        return true;
                    }
                    return currentIsTyping;
                });
                return currentQueue;
            });
        }, 50);
    }, [typeMessage]);

    // 添加对话消息
    const addMessage = useCallback((type: 'user' | 'coach', content: string) => {
        if (type === 'coach') {
            // 教练消息使用打字机效果
            addCoachMessage(content);
        } else {
            // 用户消息直接添加到对话记录
            setConversation(prev => [...prev, {
                type,
                content,
                timestamp: new Date()
            }]);
        }
    }, [addCoachMessage]);

    // 连接到实时会话
    const connectToSession = useCallback(async () => {
        console.log('Starting connection process...');
        setConnectionState(prev => ({ ...prev, connecting: true, error: null }));

        try {
            // 先建立 SSE 连接
            if (!eventSourceRef.current) {
                console.log('Creating SSE connection...');
                const eventSource = new EventSource(`/api/live-session/sse?sessionId=${sessionId}`);

                eventSource.onopen = () => {
                    console.log('SSE connection opened');
                };

                eventSource.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        console.log('SSE message received:', data);

                        if (data.type === 'connected') {
                            console.log('SSE connected successfully');
                        } else if (data.type === 'coach_message') {
                            addMessage('coach', data.text);
                        } else if (data.type === 'error') {
                            console.error('Session error:', data.message);
                            setConnectionState(prev => ({
                                ...prev,
                                error: data.message
                            }));
                        } else if (data.type === 'session_closed') {
                            console.log('Session closed:', data.reason);
                            setConnectionState({
                                connected: false,
                                connecting: false,
                                error: null
                            });
                        }
                    } catch (error) {
                        console.error('Error parsing SSE message:', error);
                    }
                };

                eventSource.onerror = (error) => {
                    console.error('SSE error:', error);
                    setConnectionState(prev => ({
                        ...prev,
                        error: 'SSE连接失败'
                    }));
                };

                eventSourceRef.current = eventSource;
            }

            // 等待一小段时间确保SSE连接建立
            await new Promise(resolve => setTimeout(resolve, 1000));

            // 然后连接到 Gemini Live
            console.log('Connecting to Gemini Live...');
            const response = await fetch('/api/live-session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'connect',
                    sessionId: sessionId
                }),
            });

            const result = await response.json();
            console.log('API response:', result);

            if (result.success) {
                console.log('Setting connection state to connected');
                setConnectionState({
                    connected: true,
                    connecting: false,
                    error: null
                });

                // 只在第一次连接时显示欢迎消息
                if (!hasShownWelcome) {
                    addMessage('coach', 'Hello! I\'m your AI fitness coach. What exercise would you like to do today? I\'ll observe your movements in real-time and provide professional guidance.');
                    setHasShownWelcome(true);
                }
            } else {
                throw new Error(result.error || 'Failed to connect');
            }
        } catch (error) {
            console.error('Connection failed:', error);
            setConnectionState({
                connected: false,
                connecting: false,
                error: '连接失败，请检查网络连接'
            });
        }
    }, [sessionId, addMessage, hasShownWelcome]);

    // 断开会话连接
    const disconnectFromSession = useCallback(async () => {
        try {
            // 关闭 SSE 连接
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
                eventSourceRef.current = null;
            }

            await fetch('/api/live-session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'disconnect',
                    sessionId: sessionId
                }),
            });

            setConnectionState({
                connected: false,
                connecting: false,
                error: null
            });

            // 停止媒体流
            if (mediaState.video) {
                mediaState.video.getTracks().forEach(track => track.stop());
            }
            if (mediaState.audio) {
                mediaState.audio.getTracks().forEach(track => track.stop());
            }

            setMediaState({ video: null, audio: null });
            setIsRecording(false);

            if (videoIntervalRef.current) {
                clearInterval(videoIntervalRef.current);
                videoIntervalRef.current = null;
            }
        } catch (error) {
            console.error('Disconnect failed:', error);
        }
    }, [sessionId, mediaState]);

    // 发送文本消息
    const sendTextMessage = useCallback(async (text: string, skipAddMessage: boolean = false) => {
        if (!connectionState.connected) return;

        try {
            if (!skipAddMessage) {
                addMessage('user', text);
            }

            const response = await fetch('/api/live-session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'sendText',
                    sessionId: sessionId,
                    data: { text }
                }),
            });

            const result = await response.json();
            if (!result.success) {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Failed to send text:', error);
            addMessage('coach', '抱歉，消息发送失败，请重试。');
        }
    }, [connectionState.connected, sessionId, addMessage]);

    // 将 WebM 转换为 PCM 格式
    const convertWebMToPCM = useCallback(async (webmData: ArrayBuffer): Promise<ArrayBuffer> => {
        try {
            const audioContext = new AudioContext({ sampleRate: 16000 });
            const audioBuffer = await audioContext.decodeAudioData(webmData);

            // 获取单声道音频数据
            const channelData = audioBuffer.getChannelData(0);

            // 转换为 16-bit PCM
            const pcmData = new Int16Array(channelData.length);
            for (let i = 0; i < channelData.length; i++) {
                // 将浮点数转换为 16-bit 整数
                pcmData[i] = Math.max(-32768, Math.min(32767, channelData[i] * 32767));
            }

            await audioContext.close();
            return pcmData.buffer;
        } catch (error) {
            console.error('Error converting WebM to PCM:', error);
            throw error;
        }
    }, []);

    // 开始录音
    const startRecording = useCallback(async () => {
        if (!mediaState.audio || !connectionState.connected) return;

        try {
            const recorder = new MediaRecorder(mediaState.audio, {
                mimeType: 'audio/webm;codecs=opus'
            });

            const audioChunks: Blob[] = [];

            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunks.push(event.data);
                }
            };

            recorder.onstop = async () => {
                if (audioChunks.length > 0) {
                    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                    const arrayBuffer = await audioBlob.arrayBuffer();

                    console.log('Original WebM audio length:', arrayBuffer.byteLength);

                    try {
                        // 在前端转换为 PCM 格式
                        const pcmData = await convertWebMToPCM(arrayBuffer);
                        console.log('Converted to PCM, length:', pcmData.byteLength);

                        const base64Audio = btoa(
                            new Uint8Array(pcmData).reduce((data, byte) => data + String.fromCharCode(byte), '')
                        );

                        const response = await fetch('/api/live-session', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                action: 'sendAudio',
                                sessionId: sessionId,
                                data: { audioData: base64Audio }
                            }),
                        });

                        const result = await response.json();
                        if (!result.success) {
                            throw new Error(result.error);
                        }
                    } catch (error) {
                        console.error('Failed to send audio:', error);
                    }
                }
            };

            audioRecorderRef.current = recorder;
            recorder.start(1000); // 每秒收集数据
            setIsRecording(true);
        } catch (error) {
            console.error('Failed to start recording:', error);
        }
    }, [mediaState.audio, connectionState.connected, sessionId, convertWebMToPCM]);

    // 停止录音
    const stopRecording = useCallback(() => {
        if (audioRecorderRef.current && isRecording) {
            audioRecorderRef.current.stop();
            audioRecorderRef.current = null;
            setIsRecording(false);
        }
    }, [isRecording]);

    // 发送视频帧
    const sendVideoFrame = useCallback(async () => {
        if (!videoRef.current || !canvasRef.current || !connectionState.connected) return;

        try {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');

            if (!ctx) return;

            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

            // 简化的视频帧发送（实际实现中可能需要更高效的方式）
            const response = await fetch('/api/live-session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'sendVideo',
                    sessionId: sessionId,
                    data: { videoFrame: imageData }
                }),
            });

            const result = await response.json();
            if (!result.success) {
                console.warn('Failed to send video frame:', result.error);
            }
        } catch (error) {
            console.error('Failed to send video frame:', error);
        }
    }, [connectionState.connected, sessionId]);

    // 切换静音状态
    const toggleMute = useCallback(() => {
        if (mediaState.audio) {
            const audioTracks = mediaState.audio.getAudioTracks();
            audioTracks.forEach(track => {
                track.enabled = isMuted;
            });
            setIsMuted(!isMuted);
        }
    }, [mediaState.audio, isMuted]);

    // 开始完整会话
    const startLiveSession = useCallback(async () => {
        const media = await requestMediaAccess();
        if (media) {
            await connectToSession();

            // 开始定期发送视频帧（每2秒发送一次）
            videoIntervalRef.current = setInterval(sendVideoFrame, 2000);
        }
    }, [requestMediaAccess, connectToSession, sendVideoFrame]);

    // 清理资源
    useEffect(() => {
        return () => {
            if (videoIntervalRef.current) {
                clearInterval(videoIntervalRef.current);
            }
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
            // 不在清理函数中调用 disconnectFromSession，避免依赖问题
        };
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-4xl mx-auto">
                    {/* 页面标题 */}
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-gray-800 mb-2">
                            AI健身教练 · 实时指导
                        </h1>
                        <p className="text-gray-600">
                            开启摄像头和麦克风，与专业AI教练实时交流
                        </p>
                    </div>

                    {/* 主界面 */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* 视频区域 */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h2 className="text-xl font-semibold mb-4">视频预览</h2>

                            <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    className="w-full h-full object-cover"
                                    onLoadedMetadata={() => console.log('Video metadata loaded')}
                                    onPlay={() => console.log('Video playing')}
                                />
                                <canvas
                                    ref={canvasRef}
                                    className="hidden"
                                />

                                {/* 如果没有视频流，显示提示 */}
                                {!mediaState.video && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-75">
                                        <div className="text-white text-center">
                                            <i className="fas fa-video-slash text-4xl mb-2"></i>
                                            <p>等待摄像头权限...</p>
                                        </div>
                                    </div>
                                )}

                                {/* 连接状态指示器 */}
                                <div className="absolute top-4 left-4">
                                    <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${connectionState.connected
                                        ? 'bg-green-500 text-white'
                                        : connectionState.connecting
                                            ? 'bg-yellow-500 text-white'
                                            : 'bg-red-500 text-white'
                                        }`}>
                                        <div className={`w-2 h-2 rounded-full ${connectionState.connected ? 'bg-white' : 'bg-white opacity-50'
                                            } ${connectionState.connected ? 'animate-pulse' : ''}`} />
                                        <span>
                                            {connectionState.connected
                                                ? '已连接'
                                                : connectionState.connecting
                                                    ? '连接中...'
                                                    : '未连接'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* 控制按钮 */}
                            <div className="flex justify-center space-x-4 mt-6">
                                {!connectionState.connected && !connectionState.connecting && (
                                    <button
                                        onClick={startLiveSession}
                                        className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                                    >
                                        开始训练
                                    </button>
                                )}

                                {connectionState.connected && (
                                    <>
                                        <button
                                            onClick={isRecording ? stopRecording : startRecording}
                                            className={`px-6 py-3 rounded-lg font-medium transition-colors ${isRecording
                                                ? 'bg-red-600 text-white hover:bg-red-700'
                                                : 'bg-green-600 text-white hover:bg-green-700'
                                                }`}
                                        >
                                            {isRecording ? '停止说话' : '开始说话'}
                                        </button>

                                        <button
                                            onClick={toggleMute}
                                            className={`px-6 py-3 rounded-lg font-medium transition-colors ${isMuted
                                                ? 'bg-gray-600 text-white hover:bg-gray-700'
                                                : 'bg-blue-600 text-white hover:bg-blue-700'
                                                }`}
                                        >
                                            {isMuted ? '取消静音' : '静音'}
                                        </button>

                                        <button
                                            onClick={disconnectFromSession}
                                            className="px-6 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
                                        >
                                            结束训练
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* 对话区域 */}
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h2 className="text-xl font-semibold mb-4">实时对话</h2>

                            <div className="h-96 overflow-y-auto border rounded-lg p-4 mb-4 bg-gray-50">
                                {/* AI教练的集中对话框 */}
                                {(currentCoachMessage || typingQueue.length > 0) && (
                                    <div className="mb-6">
                                        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg p-4 shadow-lg">
                                            <div className="flex items-center mb-2">
                                                <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center mr-3">
                                                    <span className="text-sm font-bold">AI</span>
                                                </div>
                                                <span className="font-semibold">专业运动姿态与体态分析大师</span>
                                                {isTyping && (
                                                    <div className="ml-2 flex space-x-1">
                                                        <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                                                        <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                                        <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="text-white leading-relaxed">
                                                {currentCoachMessage}
                                                {isTyping && <span className="animate-pulse">|</span>}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* 用户消息历史 */}
                                {conversation.filter(msg => msg.type === 'user').length > 0 && (
                                    <div className="space-y-3">
                                        <div className="text-sm font-medium text-gray-600 mb-2">你的消息：</div>
                                        {conversation.filter(msg => msg.type === 'user').map((message, index) => (
                                            <div key={index} className="flex justify-end">
                                                <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-lg bg-blue-600 text-white">
                                                    <div>{message.content}</div>
                                                    <div className="text-xs opacity-70 mt-1">
                                                        {message.timestamp.toLocaleTimeString()}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* 空状态 */}
                                {conversation.length === 0 && !currentCoachMessage && typingQueue.length === 0 && (
                                    <div className="text-center text-gray-500 py-8">
                                        <div className="text-4xl mb-4">🏃‍♀️</div>
                                        <p>开始训练后，AI教练将在这里与你对话</p>
                                    </div>
                                )}
                            </div>

                            {/* 快捷消息 */}
                            {connectionState.connected && (
                                <div className="space-y-2">
                                    <div className="text-sm font-medium text-gray-700 mb-2">快捷消息：</div>
                                    <div className="flex flex-wrap gap-2">
                                        {[
                                            { zh: '我想练深蹲', en: 'I want to practice squats' },
                                            { zh: '检查我的姿势', en: 'Check my posture' },
                                            { zh: '我感觉累了', en: 'I feel tired' },
                                            { zh: '这个动作对吗？', en: 'Is this movement correct?' },
                                            { zh: '我有点疼痛', en: 'I have some pain' }
                                        ].map((item) => (
                                            <button
                                                key={item.zh}
                                                onClick={() => {
                                                    addMessage('user', item.zh); // 显示中文
                                                    sendTextMessage(item.en, true); // 发送英文，跳过添加消息
                                                }}
                                                className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded-full hover:bg-gray-300 transition-colors"
                                            >
                                                {item.zh}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}


                        </div>
                    </div>

                    {/* 错误消息 */}
                    {connectionState.error && (
                        <div className="mt-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                            <div className="flex items-center">
                                <span className="font-medium">错误：</span>
                                <span className="ml-2">{connectionState.error}</span>
                            </div>
                        </div>
                    )}

                    {/* 使用说明 */}
                    <div className="mt-8 bg-blue-50 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-blue-800 mb-4">使用指南</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-700">
                            <div>
                                <h4 className="font-medium mb-2">📱 权限设置</h4>
                                <p>首次使用需要允许摄像头和麦克风权限</p>
                            </div>
                            <div>
                                <h4 className="font-medium mb-2">🎯 最佳体验</h4>
                                <p>确保光线充足，摄像头能看到全身动作</p>
                            </div>
                            <div>
                                <h4 className="font-medium mb-2">🗣️ 语音交流</h4>
                                <p>点击&quot;开始说话&quot;按钮与AI教练语音对话</p>
                            </div>
                            <div>
                                <h4 className="font-medium mb-2">⚡ 实时指导</h4>
                                <p>AI教练会实时观察你的动作并给出专业建议</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}