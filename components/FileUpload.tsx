
import React, { useRef } from 'react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      onFileSelect(event.target.files[0]);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full">
      <input
        type="file"
        accept="video/*"
        onChange={handleFileChange}
        ref={fileInputRef}
        className="hidden"
        id="videoUpload"
      />
      <button
        onClick={handleClick}
        className="w-full bg-slate-600 hover:bg-slate-500 text-sky-300 font-semibold py-3 px-4 rounded-lg border border-sky-400 hover:border-sky-300 transition duration-300 ease-in-out flex items-center justify-center space-x-2"
      >
        <i className="fas fa-video"></i>
        <span>选择视频文件</span>
      </button>
      <p className="text-xs text-slate-400 mt-2 text-center">支持常见视频格式 (MP4, MOV, AVI, etc.)</p>
    </div>
  );
};
    