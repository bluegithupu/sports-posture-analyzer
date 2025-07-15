"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export const Navigation: React.FC = () => {
    const pathname = usePathname();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const navItems = [
        { path: '/', label: '图片分析', icon: 'fas fa-image' },
        { path: '/video-analysis', label: '视频分析', icon: 'fas fa-video' },
        { path: '/live-coach', label: '实时教练', icon: 'fas fa-user-friends' },
        { path: '/history', label: '历史记录', icon: 'fas fa-history' }
    ];

    const toggleMobileMenu = () => {
        setIsMobileMenuOpen(!isMobileMenuOpen);
    };

    const closeMobileMenu = () => {
        setIsMobileMenuOpen(false);
    };

    return (
        <nav className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-40">
            <div className="container mx-auto px-4">
                <div className="flex items-center justify-between h-16">
                    {/* Logo - Always visible */}
                    <Link
                        href="/"
                        className="flex items-center space-x-2 text-sky-400 hover:text-sky-300 transition duration-200"
                        onClick={closeMobileMenu}
                    >
                        <i className="fas fa-dumbbell text-xl"></i>
                        <span className="font-bold text-lg sm:text-xl">运动体态分析</span>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex space-x-1">
                        {navItems.map((item) => {
                            const isActive = pathname === item.path;
                            return (
                                <Link
                                    key={item.path}
                                    href={item.path}
                                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition duration-200 touch-target ${isActive
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

                    {/* Mobile Menu Button */}
                    <button
                        onClick={toggleMobileMenu}
                        className="md:hidden flex items-center justify-center w-10 h-10 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 transition duration-200 touch-target"
                        aria-label="Toggle mobile menu"
                        aria-expanded={isMobileMenuOpen}
                    >
                        <i className={`fas ${isMobileMenuOpen ? 'fa-times' : 'fa-bars'} text-lg`}></i>
                    </button>
                </div>

                {/* Mobile Navigation Menu */}
                {isMobileMenuOpen && (
                    <div className="md:hidden animate-slide-down">
                        <div className="px-2 pt-2 pb-3 space-y-1 bg-slate-800/90 backdrop-blur-sm rounded-lg mt-2 border border-slate-700">
                            {navItems.map((item) => {
                                const isActive = pathname === item.path;
                                return (
                                    <Link
                                        key={item.path}
                                        href={item.path}
                                        onClick={closeMobileMenu}
                                        className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition duration-200 touch-target ${isActive
                                            ? 'bg-sky-600 text-white'
                                            : 'text-slate-300 hover:text-white hover:bg-slate-700'
                                            }`}
                                    >
                                        <i className={`${item.icon} text-lg`}></i>
                                        <span className="font-medium">{item.label}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </nav>
    );
};