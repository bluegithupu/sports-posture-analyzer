// 简单的状态管理工具
// 使用 React Context 和 useReducer 实现轻量级状态管理

import React, { createContext, useContext, useReducer, ReactNode } from 'react';

// 应用状态类型定义
export interface AppState {
    // 当前分析任务
    currentAnalysis: {
        jobId: string | null;
        status: 'idle' | 'uploading' | 'analyzing' | 'completed' | 'failed';
        progress: number;
        message: string;
        error: string | null;
        result: string | null;
    };

    // 用户设置
    settings: {
        autoRefreshHistory: boolean;
        maxFileSize: number; // MB
        theme: 'light' | 'dark';
    };

    // 通知系统
    notifications: Array<{
        id: string;
        type: 'success' | 'error' | 'warning' | 'info';
        message: string;
        timestamp: number;
    }>;
}

// 初始状态
const initialState: AppState = {
    currentAnalysis: {
        jobId: null,
        status: 'idle',
        progress: 0,
        message: '',
        error: null,
        result: null,
    },
    settings: {
        autoRefreshHistory: true,
        maxFileSize: 5000, // 5GB
        theme: 'dark',
    },
    notifications: [],
};

// Action 类型定义
export type AppAction =
    | { type: 'START_ANALYSIS'; payload: { jobId: string } }
    | { type: 'UPDATE_ANALYSIS_PROGRESS'; payload: { progress: number; message: string } }
    | { type: 'COMPLETE_ANALYSIS'; payload: { result: string } }
    | { type: 'FAIL_ANALYSIS'; payload: { error: string } }
    | { type: 'RESET_ANALYSIS' }
    | { type: 'UPDATE_SETTINGS'; payload: Partial<AppState['settings']> }
    | { type: 'ADD_NOTIFICATION'; payload: Omit<AppState['notifications'][0], 'id' | 'timestamp'> }
    | { type: 'REMOVE_NOTIFICATION'; payload: { id: string } }
    | { type: 'CLEAR_NOTIFICATIONS' };

// Reducer 函数
function appReducer(state: AppState, action: AppAction): AppState {
    switch (action.type) {
        case 'START_ANALYSIS':
            return {
                ...state,
                currentAnalysis: {
                    jobId: action.payload.jobId,
                    status: 'uploading',
                    progress: 0,
                    message: '开始分析...',
                    error: null,
                    result: null,
                },
            };

        case 'UPDATE_ANALYSIS_PROGRESS':
            return {
                ...state,
                currentAnalysis: {
                    ...state.currentAnalysis,
                    status: 'analyzing',
                    progress: action.payload.progress,
                    message: action.payload.message,
                },
            };

        case 'COMPLETE_ANALYSIS':
            return {
                ...state,
                currentAnalysis: {
                    ...state.currentAnalysis,
                    status: 'completed',
                    progress: 100,
                    message: '分析完成',
                    result: action.payload.result,
                },
            };

        case 'FAIL_ANALYSIS':
            return {
                ...state,
                currentAnalysis: {
                    ...state.currentAnalysis,
                    status: 'failed',
                    error: action.payload.error,
                    message: '分析失败',
                },
            };

        case 'RESET_ANALYSIS':
            return {
                ...state,
                currentAnalysis: initialState.currentAnalysis,
            };

        case 'UPDATE_SETTINGS':
            return {
                ...state,
                settings: {
                    ...state.settings,
                    ...action.payload,
                },
            };

        case 'ADD_NOTIFICATION':
            const newNotification = {
                ...action.payload,
                id: Date.now().toString(),
                timestamp: Date.now(),
            };
            return {
                ...state,
                notifications: [...state.notifications, newNotification],
            };

        case 'REMOVE_NOTIFICATION':
            return {
                ...state,
                notifications: state.notifications.filter(n => n.id !== action.payload.id),
            };

        case 'CLEAR_NOTIFICATIONS':
            return {
                ...state,
                notifications: [],
            };

        default:
            return state;
    }
}

// Context 创建
const AppStateContext = createContext<{
    state: AppState;
    dispatch: React.Dispatch<AppAction>;
} | null>(null);

// Provider 组件
export function AppStateProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(appReducer, initialState);

    return (
        <AppStateContext.Provider value= {{ state, dispatch }
}>
    { children }
    </AppStateContext.Provider>
    );
}

// Hook 用于访问状态
export function useAppState() {
    const context = useContext(AppStateContext);
    if (!context) {
        throw new Error('useAppState must be used within AppStateProvider');
    }
    return context;
}

// 便捷的 Hook 用于特定状态
export function useCurrentAnalysis() {
    const { state } = useAppState();
    return state.currentAnalysis;
}

export function useSettings() {
    const { state, dispatch } = useAppState();

    const updateSettings = (settings: Partial<AppState['settings']>) => {
        dispatch({ type: 'UPDATE_SETTINGS', payload: settings });
    };

    return {
        settings: state.settings,
        updateSettings,
    };
}

export function useNotifications() {
    const { state, dispatch } = useAppState();

    const addNotification = (notification: Omit<AppState['notifications'][0], 'id' | 'timestamp'>) => {
        dispatch({ type: 'ADD_NOTIFICATION', payload: notification });
    };

    const removeNotification = (id: string) => {
        dispatch({ type: 'REMOVE_NOTIFICATION', payload: { id } });
    };

    const clearNotifications = () => {
        dispatch({ type: 'CLEAR_NOTIFICATIONS' });
    };

    return {
        notifications: state.notifications,
        addNotification,
        removeNotification,
        clearNotifications,
    };
} 