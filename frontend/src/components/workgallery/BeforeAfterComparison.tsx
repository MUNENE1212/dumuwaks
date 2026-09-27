import React, { useState, useRef, MouseEvent, TouchEvent } from 'react';
import { X, Maximize2 } from 'lucide-react';
import { clsx } from 'clsx';
import type { WorkGalleryImage } from '@/types/workGallery';

interface BeforeAfterComparisonProps {
  beforeImage: WorkGalleryImage;
  afterImage: WorkGalleryImage;
  onClose: () => void;
  isOpen: boolean;
}

const BeforeAfterComparison: React.FC<BeforeAfterComparisonProps> = ({
  beforeImage,
  afterImage,
  onClose,
  isOpen,
}) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle slider position change
  const updateSliderPosition = (clientX: number) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  };

  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    updateSliderPosition(e.clientX);
  };

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (isDragging) {
      updateSliderPosition(e.clientX);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    setIsDragging(true);
    updateSliderPosition(e.touches[0].clientX);
  };

  const handleTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    if (isDragging) {
      updateSliderPosition(e.touches[0].clientX);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Add/remove event listeners for drag
  React.useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove as any);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove as any);
      window.addEventListener('touchend', handleTouchEnd);
    } else {
      window.removeEventListener('mousemove', handleMouseMove as any);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove as any);
      window.removeEventListener('touchend', handleTouchEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove as any);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove as any);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-000/80">
      <div className="bg-surface-200 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-line">
          <div>
            <h2 className="text-xl font-semibold text-ink dark:text-ink">
              Before & After Comparison
            </h2>
            {beforeImage.caption && (
              <p className="text-sm text-ink-muted mt-1">
                {beforeImage.caption}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-ink-muted hover:text-ink-muted transition-colors p-1"
            aria-label="Close comparison"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Comparison Container */}
        <div
          ref={containerRef}
          className="relative aspect-video bg-surface-300"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* After Image (Background) */}
          <img
            src={afterImage.url}
            alt="After"
            className="absolute inset-0 w-full h-full object-cover"
          />

          {/* Before Image (Foreground - Clipped) */}
          <div
            className="absolute inset-0 overflow-hidden"
            style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
          >
            <img
              src={beforeImage.url}
              alt="Before"
              className="absolute inset-0 w-full h-full object-cover"
              style={{ width: `${100 / (sliderPosition / 100)}%` }}
            />
          </div>

          {/* Slider Handle */}
          <div
            className="absolute top-0 bottom-0 w-1 bg-surface-200 shadow-lg cursor-ew-resize"
            style={{ left: `${sliderPosition}%` }}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
          >
            {/* Slider Handle Circle */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-surface-200 rounded-full shadow-lg flex items-center justify-center">
              <div className="flex gap-0.5">
                <div className="w-0.5 h-4 bg-ink-faint rounded" />
                <div className="w-0.5 h-4 bg-ink-faint rounded" />
              </div>
            </div>
          </div>

          {/* Labels */}
          <div className="absolute top-4 left-4 bg-surface-000/70 text-ink px-3 py-1.5 rounded-full text-sm font-medium">
            Before
          </div>
          <div className="absolute top-4 right-4 bg-surface-000/70 text-ink px-3 py-1.5 rounded-full text-sm font-medium">
            After
          </div>
        </div>

        {/* Image Details */}
        <div className="p-4 border-t border-line">
          <div className="flex flex-wrap items-center gap-4 text-sm text-ink-muted">
            <span className="flex items-center gap-1.5">
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                />
              </svg>
              {beforeImage.category}
            </span>
            {beforeImage.location && (
              <span className="flex items-center gap-1.5">
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                {beforeImage.location}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              {new Date(beforeImage.date).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BeforeAfterComparison;
