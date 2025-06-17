
import React from 'react';

// Removed onApiKeySettingsClick prop as the settings button is removed.
// interface HeaderProps {
//   onApiKeySettingsClick: () => void;
// }

export const Header: React.FC = () => {
  return (
    <header className="bg-slate-800/80 backdrop-blur-md shadow-lg sticky top-0 z-50 safe-padding">
      <div className="container mx-auto px-4 py-3 sm:py-4 flex justify-between items-center">
        <div className="flex items-center space-x-2 sm:space-x-3">
          <i className="fas fa-person-running text-2xl sm:text-3xl text-sky-400"></i>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-cyan-300 leading-tight">
            <span className="hidden sm:inline">运动姿态分析大师</span>
            <span className="sm:hidden">运动分析</span>
          </h1>
        </div>
        {/* Settings button removed to comply with API key handling guidelines */}
        {/* <button
          onClick={onApiKeySettingsClick}
          title="API Key Settings"
          className="text-slate-400 hover:text-sky-400 transition-colors duration-200"
        >
          <i className="fas fa-cog text-xl"></i>
        </button> */}
      </div>
    </header>
  );
};
