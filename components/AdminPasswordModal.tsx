"use client";

import React, { useState } from 'react';

interface AdminPasswordModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const AdminPasswordModal: React.FC<AdminPasswordModalProps> = ({
    isOpen,
    onClose,
    onSuccess
}) => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!password.trim()) {
            setError('请输入管理员密码');
            return;
        }

        // 简单的前端验证，与固定值 admin12 对比
        if (password === 'admin12') {
            onSuccess();
            setPassword('');
            setError(null);
        } else {
            setError('密码错误，请重试');
        }
    };

    const handleClose = () => {
        setPassword('');
        setError(null);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-semibold text-sky-300 flex items-center">
                        <i className="fas fa-lock mr-2"></i>
                        管理员验证
                    </h3>
                    <button
                        onClick={handleClose}
                        className="text-slate-400 hover:text-slate-200 transition duration-200"
                    >
                        <i className="fas fa-times text-lg"></i>
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-slate-300 text-sm font-medium mb-2">
                            请输入管理员密码以访问历史记录
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                            placeholder="输入管理员密码"
                            autoFocus
                        />
                    </div>

                    {error && (
                        <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm">
                            <i className="fas fa-exclamation-triangle mr-2"></i>
                            {error}
                        </div>
                    )}

                    <div className="flex space-x-3">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="flex-1 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-slate-200 rounded-lg transition duration-200"
                        >
                            取消
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg transition duration-200 flex items-center justify-center"
                            disabled={!password.trim()}
                        >
                            <i className="fas fa-check mr-2"></i>
                            确认
                        </button>
                    </div>
                </form>

                <div className="mt-4 text-xs text-slate-400 text-center">
                    <i className="fas fa-info-circle mr-1"></i>
                    为了保护敏感数据，访问历史记录需要管理员权限
                </div>
            </div>
        </div>
    );
};
