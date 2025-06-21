"use client";

import React from 'react';

interface MobileOptimizedContainerProps {
  children: React.ReactNode;
  title: string;
  className?: string;
}

export const MobileOptimizedContainer: React.FC<MobileOptimizedContainerProps> = ({
  children,
  title,
  className = ""
}) => {
  return (
    <div className={`container mx-auto px-4 py-4 sm:py-6 lg:py-8 safe-padding ${className}`}>
      <div className="bg-slate-800 shadow-2xl rounded-lg p-4 sm:p-6 lg:p-8 xl:p-10">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-6 sm:mb-8 text-center text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-cyan-300">
          {title}
        </h1>
        {children}
      </div>
    </div>
  );
};

interface MobileSectionProps {
  children: React.ReactNode;
  title: string;
  step?: number;
  className?: string;
}

export const MobileSection: React.FC<MobileSectionProps> = ({
  children,
  title,
  step,
  className = ""
}) => {
  return (
    <div className={`p-4 sm:p-6 bg-slate-700/50 rounded-lg shadow-lg ${className}`}>
      <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-sky-300">
        {step && `${step}. `}{title}
      </h3>
      {children}
    </div>
  );
};

interface MobileButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  type?: 'button' | 'submit';
  loading?: boolean;
  loadingText?: string;
}

export const MobileButton: React.FC<MobileButtonProps> = ({
  children,
  onClick,
  disabled = false,
  variant = 'primary',
  size = 'md',
  className = "",
  type = 'button',
  loading = false,
  loadingText = "处理中..."
}) => {
  const baseClasses = "w-full font-bold rounded-lg shadow-md transition duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center touch-target";
  
  const variantClasses = {
    primary: "bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600 text-white",
    secondary: "bg-slate-600 hover:bg-slate-500 text-sky-300 border border-sky-400 hover:border-sky-300",
    danger: "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white"
  };
  
  const sizeClasses = {
    sm: "py-2 px-3 text-sm",
    md: "py-3 sm:py-4 px-4 sm:px-6 text-sm sm:text-base",
    lg: "py-4 px-6 text-base sm:text-lg"
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      {loading ? (
        <>
          <i className="fas fa-spinner fa-spin mr-2"></i>
          <span className="truncate">{loadingText}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
};

interface MobileGridProps {
  children: React.ReactNode;
  cols?: 1 | 2;
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const MobileGrid: React.FC<MobileGridProps> = ({
  children,
  cols = 1,
  gap = 'md',
  className = ""
}) => {
  const colClasses = {
    1: "grid-cols-1",
    2: "grid-cols-1 xl:grid-cols-2"
  };
  
  const gapClasses = {
    sm: "gap-4",
    md: "gap-6 sm:gap-8",
    lg: "gap-8 sm:gap-10"
  };

  return (
    <div className={`grid ${colClasses[cols]} ${gapClasses[gap]} ${className}`}>
      {children}
    </div>
  );
};

interface MobileSpacerProps {
  size?: 'sm' | 'md' | 'lg';
}

export const MobileSpacer: React.FC<MobileSpacerProps> = ({ size = 'md' }) => {
  const sizeClasses = {
    sm: "space-y-3 sm:space-y-4",
    md: "space-y-4 sm:space-y-6",
    lg: "space-y-6 sm:space-y-8"
  };

  return <div className={sizeClasses[size]} />;
};
