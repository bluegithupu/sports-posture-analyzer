
import React from 'react';

interface VideoPlayerProps {
  src: string;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ src }) => {
  return (
    <div className="w-full aspect-video bg-black rounded-lg overflow-hidden shadow-lg">
      <video controls src={src} className="w-full h-full">
        您的浏览器不支持视频标签。 (Your browser does not support the video tag.)
      </video>
    </div>
  );
};
    