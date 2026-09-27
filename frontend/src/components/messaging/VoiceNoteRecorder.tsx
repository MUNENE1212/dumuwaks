/**
 * VoiceNoteRecorder Component
 *
 * Records audio using MediaRecorder API for voice messages.
 * Maximum recording time: 60 seconds (crucial for Kenyan users who prefer speaking).
 * Features:
 * - Visual waveform during recording
 * - Recording time display with countdown
 * - Play/pause controls for preview
 * - Send and cancel actions
 *
 * @module components/messaging/VoiceNoteRecorder
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface VoiceNoteRecorderProps {
  onSend: (audioBlob: Blob, duration: number) => void;
  onCancel: () => void;
  maxDuration?: number; // in seconds
  className?: string;
}

const VoiceNoteRecorder: React.FC<VoiceNoteRecorderProps> = ({
  onSend,
  onCancel,
  maxDuration = 60,
  className,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  // Generate waveform visualization
  const updateWaveform = useCallback(() => {
    if (!analyserRef.current || !isRecording) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    // Downsample to 40 bars
    const bars = 40;
    const step = Math.floor(dataArray.length / bars);
    const newWaveform: number[] = [];

    for (let i = 0; i < bars; i++) {
      let sum = 0;
      for (let j = 0; j < step; j++) {
        sum += dataArray[i * step + j];
      }
      newWaveform.push(sum / step / 255); // Normalize to 0-1
    }

    setWaveformData(newWaveform);

    if (isRecording) {
      animationFrameRef.current = requestAnimationFrame(updateWaveform);
    }
  }, [isRecording]);

  // Start recording
  const startRecording = async () => {
    try {
      setPermissionDenied(false);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Setup audio context for visualization
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      // Setup MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      setRecordingTime(0);
      setAudioBlob(null);
      setAudioUrl(null);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= maxDuration) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);

      // Start waveform animation
      updateWaveform();
    } catch (error: unknown) {
      console.error('Error starting recording:', error);
      if (error instanceof DOMException && (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError')) {
        setPermissionDenied(true);
      }
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    }
  };

  // Pause/resume recording
  const togglePause = () => {
    if (!mediaRecorderRef.current) return;

    if (isPaused) {
      mediaRecorderRef.current.resume();
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= maxDuration) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
      updateWaveform();
    } else {
      mediaRecorderRef.current.pause();
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    }
    setIsPaused(!isPaused);
  };

  // Cancel recording
  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    }
    setAudioBlob(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setWaveformData([]);
    setRecordingTime(0);
    onCancel();
  };

  // Play/pause preview
  const togglePlayback = () => {
    if (!audioUrl) return;

    if (!audioRef.current) {
      audioRef.current = new Audio(audioUrl);
      audioRef.current.onended = () => setIsPlaying(false);
    }

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  // Send voice note
  const handleSend = () => {
    if (audioBlob && recordingTime > 0) {
      onSend(audioBlob, recordingTime);
      // Cleanup
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      setAudioBlob(null);
      setAudioUrl(null);
      setWaveformData([]);
      setRecordingTime(0);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    }
  };

  // Format time display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Recording state
  if (isRecording) {
    return (
      <div className={cn('flex flex-col gap-3 p-4 bg-surface-200 rounded-lg', className)}>
        {/* Waveform visualization */}
        <div className="flex items-center justify-center h-16 gap-0.5">
          {waveformData.map((value, index) => (
            <div
              key={index}
              className={cn(
                'w-1 rounded-full transition-all duration-75',
                isPaused ? 'bg-ink-faint' : 'bg-primary'
              )}
              style={{ height: `${Math.max(4, value * 100)}%` }}
            />
          ))}
          {waveformData.length === 0 && (
            <div className="text-sm text-ink-muted">Initializing...</div>
          )}
        </div>

        {/* Timer and controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={cn(
              'text-lg font-mono font-medium',
              recordingTime >= maxDuration - 10 ? '' : 'text-ink-muted'
            )}>
              {formatTime(recordingTime)}
            </span>
            <span className="text-sm text-ink-muted">/ {formatTime(maxDuration)}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={cancelRecording}
              className="p-2 text-ink-muted hover:text-red-500 hover:bg-red-900/20 rounded-full transition-colors"
              title="Cancel"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <button
              onClick={togglePause}
              className="p-2 text-ink-muted hover:text-primary hover:bg-surface-300 rounded-full transition-colors"
              title={isPaused ? 'Resume' : 'Pause'}
            >
              {isPaused ? (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              )}
            </button>

            <button
              onClick={stopRecording}
              className="p-3 bg-red-500 text-on-lumen rounded-full hover:bg-red-600 transition-colors"
              title="Stop recording"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Preview state (after recording, before sending)
  if (audioBlob && audioUrl) {
    return (
      <div className={cn('flex flex-col gap-3 p-4 bg-surface-200 rounded-lg', className)}>
        {/* Audio preview */}
        <div className="flex items-center gap-3">
          <button
            onClick={togglePlayback}
            className="p-3 bg-primary text-on-lumen rounded-full hover:bg-primary-dark transition-colors"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          <div className="flex-1">
            <div className="flex items-center gap-2 text-sm text-ink-muted">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
              </svg>
              <span>Voice message</span>
              <span className="font-mono">{formatTime(recordingTime)}</span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={cancelRecording}
            className="px-4 py-2 text-ink-muted hover:bg-surface-300 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            className="px-4 py-2 bg-primary text-on-lumen rounded-lg hover:bg-primary-dark transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            Send
          </button>
        </div>
      </div>
    );
  }

  // Initial state (ready to record)
  return (
    <div className={cn('flex flex-col items-center gap-3 p-4', className)}>
      {permissionDenied && (
        <div className="w-full p-3 bg-red-900/20 border border-red-800 rounded-lg text-sm text-red-400 text-center">
          Microphone access denied. Please enable microphone permissions in your browser settings.
        </div>
      )}

      <button
        onClick={startRecording}
        className="flex flex-col items-center gap-2 p-6 bg-surface-200 hover:bg-surface-300 rounded-full transition-colors group"
        title="Record voice message"
      >
        <div className="p-4 bg-red-500 rounded-full group-hover:bg-red-600 transition-colors">
          <svg className="w-8 h-8 text-ink" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
          </svg>
        </div>
        <span className="text-sm text-ink-muted">Tap to record voice message</span>
      </button>

      <span className="text-xs text-ink-muted">Max {maxDuration} seconds</span>
    </div>
  );
};

export default VoiceNoteRecorder;
