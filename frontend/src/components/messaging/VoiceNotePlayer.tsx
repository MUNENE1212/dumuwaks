/**
 * VoiceNotePlayer Component
 *
 * Audio player component for playing voice messages.
 * Features:
 * - Waveform visualization
 * - Progress bar with seek functionality
 * - Play/pause controls
 * - Duration display
 *
 * @module components/messaging/VoiceNotePlayer
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface VoiceNotePlayerProps {
  audioUrl: string;
  duration: number; // in seconds
  isOwn?: boolean;
  className?: string;
}

const VoiceNotePlayer: React.FC<VoiceNotePlayerProps> = ({
  audioUrl,
  duration,
  isOwn = false,
  className,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Initialize audio element
  useEffect(() => {
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    audio.addEventListener('loadedmetadata', () => {
      setIsLoading(false);
      generateWaveform();
    });

    audio.addEventListener('timeupdate', () => {
      setCurrentTime(audio.currentTime);
    });

    audio.addEventListener('ended', () => {
      setIsPlaying(false);
      setCurrentTime(0);
    });

    audio.addEventListener('error', () => {
      setError('Failed to load audio');
      setIsLoading(false);
    });

    return () => {
      audio.pause();
      audio.src = '';
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [audioUrl]);

  // Generate pseudo-random waveform for visualization
  // In a production app, you'd analyze the actual audio file
  const generateWaveform = useCallback(() => {
    const bars = 50;
    const waveform: number[] = [];

    // Use duration as seed for consistent waveform
    const seed = duration;
    for (let i = 0; i < bars; i++) {
      // Pseudo-random based on position
      const value = Math.sin(seed * (i + 1) * 0.3) * 0.5 + 0.5;
      const variance = Math.cos(seed * (i + 1) * 0.7) * 0.3;
      waveform.push(Math.max(0.2, Math.min(1, value + variance)));
    }

    setWaveformData(waveform);
  }, [duration]);

  // Draw waveform on canvas
  useEffect(() => {
    if (!canvasRef.current || waveformData.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const barWidth = width / waveformData.length;
    const progress = currentTime / duration;

    ctx.clearRect(0, 0, width, height);

    waveformData.forEach((value, index) => {
      const x = index * barWidth;
      const barHeight = value * height * 0.8;
      const y = (height - barHeight) / 2;

      // Color based on progress
      const isPlayed = index / waveformData.length < progress;
      if (isPlayed) {
        ctx.fillStyle = isOwn ? 'rgba(255, 255, 255, 0.9)' : '#e8a317'; // Circuit Blue
      } else {
        ctx.fillStyle = isOwn ? 'rgba(255, 255, 255, 0.4)' : 'rgba(155, 164, 176, 0.5)';
      }

      ctx.fillRect(x, y, barWidth - 1, barHeight);
    });
  }, [waveformData, currentTime, duration, isOwn]);

  // Toggle play/pause
  const togglePlayback = () => {
    if (!audioRef.current || error) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(err => {
        console.error('Error playing audio:', err);
        setError('Failed to play audio');
      });
    }
    setIsPlaying(!isPlaying);
  };

  // Handle seek
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !waveformData.length) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const progress = x / rect.width;
    const newTime = progress * duration;

    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // Format time display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const remainingTime = duration - currentTime;

  if (error) {
    return (
      <div className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg',
        'bg-red-900/20 text-red-400 text-sm',
        className
      )}>
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div className={cn(
      'flex items-center gap-3 min-w-[200px] max-w-[280px]',
      className
    )}>
      {/* Play/Pause button */}
      <button
        onClick={togglePlayback}
        disabled={isLoading}
        className={cn(
          'flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full transition-colors',
          isOwn
            ? 'bg-ink/20 hover:bg-ink/30 text-ink'
            : 'bg-primary hover:bg-primary-dark text-on-lumen',
          isLoading && 'opacity-50 cursor-not-allowed'
        )}
        title={isPlaying ? 'Pause' : 'Play'}
      >
        {isLoading ? (
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : isPlaying ? (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
          </svg>
        ) : (
          <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      {/* Waveform / Progress */}
      <div className="flex-1 min-w-0">
        <div
          className="relative h-8 cursor-pointer group"
          onClick={handleSeek}
          title="Click to seek"
        >
          <canvas
            ref={canvasRef}
            className="w-full h-full"
            style={{ display: 'block' }}
          />

          {/* Hover indicator */}
          <div className="absolute inset-0 bg-surface-000/0 group-hover:bg-ink/5 transition-colors rounded" />
        </div>

        {/* Time display */}
        <div className={cn(
          'flex justify-between text-xs mt-1',
          isOwn ? '' : 'text-ink-muted'
        )}>
          <span className="font-mono">
            {isPlaying ? formatTime(currentTime) : '0:00'}
          </span>
          <span className="font-mono">
            {isPlaying ? `-${formatTime(remainingTime)}` : formatTime(duration)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default VoiceNotePlayer;
