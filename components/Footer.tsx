
import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-800/50 py-4 sm:py-6 text-center safe-padding">
      <p className="text-xs sm:text-sm text-slate-400 px-4">
        &copy; {new Date().getFullYear()} 运动姿态分析大师. All rights reserved.
      </p>
      <p className="text-xs text-slate-500 mt-1 px-4">
        Powered by React, Tailwind CSS, and Gemini API.
      </p>
    </footer>
  );
};
    