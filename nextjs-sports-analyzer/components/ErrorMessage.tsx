
import React from 'react';

interface ErrorMessageProps {
  message: string;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ message }) => {
  return (
    <div className="bg-red-700/30 border border-red-500 text-red-300 px-4 py-3 rounded-lg relative" role="alert">
      <strong className="font-bold"><i className="fas fa-exclamation-triangle mr-2"></i>错误! (Error!)</strong>
      <span className="block sm:inline ml-2">{message}</span>
    </div>
  );
};
    