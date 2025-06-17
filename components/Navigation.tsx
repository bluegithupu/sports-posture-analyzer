"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export const Navigation: React.FC = () => {
    const pathname = usePathname();

    const navItems = [
        { path: '/', label: '图片分析', icon: 'fas fa-image' },
        { path: '/video-analysis', label: '视频分析', icon: 'fas fa-video' },
        { path: '/history', label: '历史记录', icon: 'fas fa-history' }
    ];

    return (
        <nav className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700">
            <div className="container mx-auto px-4">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center space-x-8">
                        <Link href="/" className="flex items-center space-x-2 text-sky-400 hover:text-sky-300 transition duration-200">
                            <i className="fas fa-dumbbell text-xl"></i>
                            <span className="font-bold text-lg">运动体态分析</span>
                        </Link>

                        <div className="flex space-x-1">
                            {navItems.map((item) => {
                                const isActive = pathname === item.path;
                                return (
                                    <Link
                                        key={item.path}
                                        href={item.path}
                                        className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition duration-200 ${isActive
                                            ? 'bg-sky-600 text-white'
                                            : 'text-slate-300 hover:text-white hover:bg-slate-700'
                                            }`}
                                    >
                                        <i className={item.icon}></i>
                                        <span>{item.label}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
}; 