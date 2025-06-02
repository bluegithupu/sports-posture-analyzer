// 简单的状态管理工具 - 暂时简化版本
export interface AppState {
    currentAnalysis: {
        jobId: string | null;
        status: 'idle' | 'uploading' | 'analyzing' | 'completed' | 'failed';
        progress: number;
        message: string;
        error: string | null;
        result: string | null;
    };
    settings: {
        autoRefreshHistory: boolean;
        maxFileSize: number;
        theme: 'light' | 'dark';
    };
    notifications: Array<{
        id: string;
        type: 'success' | 'error' | 'warning' | 'info';
        message: string;
        timestamp: number;
    }>;
}

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

// 简化版本 - 实际实现可以后续完善
export function AppStateProvider({ children }: { children: React.ReactNode }) {
    return children as React.ReactElement;
}

export function useAppState() {
    return {
        state: {} as AppState,
        dispatch: (() => { }) as React.Dispatch<AppAction>
    };
}

export function useCurrentAnalysis() {
    return {} as AppState['currentAnalysis'];
}

export function useSettings() {
    return {
        settings: {} as AppState['settings'],
        updateSettings: (() => { }) as (settings: Partial<AppState['settings']>) => void
    };
}

export function useNotifications() {
    return {
        notifications: [] as AppState['notifications'],
        addNotification: (() => { }) as (notification: Omit<AppState['notifications'][0], 'id' | 'timestamp'>) => void,
        removeNotification: (() => { }) as (id: string) => void,
        clearNotifications: (() => { }) as () => void
    };
}
