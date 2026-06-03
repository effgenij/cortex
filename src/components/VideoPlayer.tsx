'use client';

import { useRef } from 'react';

interface VideoPlayerProps {
  src: string;
  title: string;
}

export function VideoPlayer({ src, title }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  return (
    <video
      ref={videoRef}
      controls
      style={{ width: '100%', borderRadius: 'var(--mantine-radius-md)' }}
      title={title}
      preload="metadata"
    >
      <source src={`/api/media?path=${encodeURIComponent(src)}`} type="video/mp4" />
      Ваш браузер не поддерживает видео.
    </video>
  );
}
