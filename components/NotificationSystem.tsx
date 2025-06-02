"use client";

import React, { useEffect } from 'react';
import { useNotifications } from '../lib/store';

export const NotificationSystem: React.FC = () => {
    const { notifications, removeNotification } = useNotifications();

    // 自动移除通知
    useEffect(() => {
        notifications.forEach(notification => {
            const timer = setTimeout(() => {
                removeNotification(notification.id);
            }, 5000); // 5秒后自动移除

            return () => clearTimeout(timer);
        });
    }, [notifications, removeNotification]);

    if (notifications.length === 0) {
        return null;
    }

    const getNotificationStyles = (type: string) => {
        switch (type) {
            case 'success':
                return 'bg-green-500 border-green-600';
            case 'error':
                return 'bg-red-500 border-red-600';
            case 'warning':
                return 'bg-yellow-500 border-yellow-600';
            case 'info':
            default:
                return 'bg-blue-500 border-blue-600';
        }
    };

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'success':
                return '✓';
            case 'error':
                return '✕';
            case 'warning':
                return '⚠';
            case 'info':
            default:
                return 'ℹ';
        }
    };

    return (
        <div className="fixed top-4 right-4 z-50 space-y-2">
            {notifications.map(notification => (
                <div
                    key={notification.id}
                    className={`
                        ${getNotificationStyles(notification.type)}
                        text-white px-4 py-3 rounded-lg shadow-lg border-l-4
                        transform transition-all duration-300 ease-in-out
                        max-w-sm animate-slide-in-right
                    `}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <span className="text-lg mr-2">
                                {getNotificationIcon(notification.type)}
                            </span>
                            <span className="text-sm font-medium">
                                {notification.message}
                            </span>
                        </div>
                        <button
                            onClick={() => removeNotification(notification.id)}
                            className="ml-3 text-white hover:text-gray-200 transition-colors"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}; 