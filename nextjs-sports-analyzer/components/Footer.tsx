
import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-800/50 py-6 text-center">
      <p className="text-sm text-slate-400">
        &copy; {new Date().getFullYear()} 运动姿态分析大师. All rights reserved.
      </p>
      <p className="text-xs text-slate-500 mt-1">
        Powered by React, Tailwind CSS, and Gemini API.
      </p>
    </footer>
  );
};
    