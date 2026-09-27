import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import VoiceNotePlayer from './VoiceNotePlayer';

// Mock HTMLAudioElement with plain functions (not vi.fn — survives mockReset)
class MockAudio {
  src = '';
  currentTime = 0;
  duration = 30;
  paused = true;
  private listeners: Record<string, Array<() => void>> = {};

  addEventListener(event: string, callback: () => void) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
    // Fire loadedmetadata synchronously so audio initializes before interaction
    if (event === 'loadedmetadata') {
      queueMicrotask(callback);
    }
  }

  removeEventListener(event: string, callback: () => void) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }

  play() {
    this.paused = false;
    return Promise.resolve();
  }

  pause() {
    this.paused = true;
  }
}

// Mock HTMLCanvasElement.getContext (jsdom doesn't support canvas)
HTMLCanvasElement.prototype.getContext = function(this: HTMLCanvasElement) {
  return {
    fillStyle: '',
    fillRect: () => {},
    clearRect: () => {},
    beginPath: () => {},
    arc: () => {},
    fill: () => {},
    scale: () => {},
    canvas: this,
  };
} as any;

// Mock getBoundingClientRect on canvas elements
HTMLCanvasElement.prototype.getBoundingClientRect = () => ({
  width: 200,
  height: 50,
  top: 0,
  left: 0,
  bottom: 50,
  right: 200,
  x: 0,
  y: 0,
  toJSON: () => {},
});

// @ts-expect-error - Mocking global
global.Audio = MockAudio;

describe('VoiceNotePlayer', () => {
  const defaultProps = {
    audioUrl: 'https://example.com/audio.webm',
    duration: 30,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render play button initially', async () => {
    render(<VoiceNotePlayer {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByTitle('Play')).toBeInTheDocument();
    });
  });

  it('should display duration', async () => {
    render(<VoiceNotePlayer {...defaultProps} duration={65} />);

    await waitFor(() => {
      expect(screen.getByText('1:05')).toBeInTheDocument();
    });
  });

  it('should display initial time as 0:00', async () => {
    render(<VoiceNotePlayer {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('0:00')).toBeInTheDocument();
    });
  });

  it('should toggle between play and pause', async () => {
    render(<VoiceNotePlayer {...defaultProps} />);

    // Wait for audio initialization (loadedmetadata fires via queueMicrotask)
    await waitFor(() => {
      expect(screen.getByTitle('Play')).toBeInTheDocument();
    });

    const playButton = screen.getByTitle('Play');
    await act(async () => {
      fireEvent.click(playButton);
    });

    await waitFor(() => {
      expect(screen.getByTitle('Pause')).toBeInTheDocument();
    });
  });

  it('should apply different styles for own messages', async () => {
    render(<VoiceNotePlayer {...defaultProps} isOwn={true} />);

    await waitFor(() => {
      const button = screen.getByTitle('Play');
      expect(button).toHaveClass('bg-ink/20');
    });
  });

  it('should apply different styles for other messages', async () => {
    render(<VoiceNotePlayer {...defaultProps} isOwn={false} />);

    await waitFor(() => {
      const button = screen.getByTitle('Play');
      expect(button).toHaveClass('bg-primary');
    });
  });

  it('should accept custom className', async () => {
    const { container } = render(<VoiceNotePlayer {...defaultProps} className="custom-class" />);

    await waitFor(() => {
      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  it('should format time correctly', async () => {
    render(<VoiceNotePlayer {...defaultProps} duration={125} />);

    await waitFor(() => {
      expect(screen.getByText('2:05')).toBeInTheDocument();
    });
  });
});
