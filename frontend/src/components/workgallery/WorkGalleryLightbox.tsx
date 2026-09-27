import React, { useState, useCallback, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import type { WorkGalleryImage } from '@/types/workGallery';
import { getCategoryDisplayName, getCategoryColorClass } from '@/services/workGallery.service';
import { cn } from '@/lib/utils';

interface WorkGalleryLightboxProps {
  images: WorkGalleryImage[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
}

const WorkGalleryLightbox: React.FC<WorkGalleryLightboxProps> = ({
  images = [],
  initialIndex = 0,
  isOpen,
  onClose,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  // Reset to initial index when opening
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
    }
  }, [isOpen, initialIndex]);

  // Navigate to previous image
  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  }, [images.length]);

  // Navigate to next image
  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  }, [images.length]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') goToPrevious();
      if (e.key === 'ArrowRight') goToNext();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, goToPrevious, goToNext]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen || images.length === 0) return null;

  const currentImage = images[currentIndex];

  // Check if image has a paired before/after image
  const pairedImageId = currentImage.pairId;
  const pairedImage = pairedImageId
    ? images.find((img) => img._id === pairedImageId)
    : null;
  const showBeforeAfter = currentImage.isBeforeAfter && pairedImage;

  return (
    <div className="fixed inset-0 z-50 bg-surface-000/95 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-surface-000/50">
        <div className="flex items-center gap-3">
          <span className="text-ink text-sm font-medium">
            {currentIndex + 1} / {images.length}
          </span>
          <span
            className={cn(
              'text-xs px-2.5 py-0.5 rounded-full',
              getCategoryColorClass(currentImage.category)
            )}
          >
            {getCategoryDisplayName(currentImage.category)}
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-ink hover:text-ink-muted transition-colors p-1"
          aria-label="Close lightbox"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="relative w-full h-full flex items-center justify-center">
          {/* Image */}
          <img
            src={currentImage.url}
            alt={currentImage.caption || 'Work image'}
            className="max-w-full max-h-full object-contain"
          />

          {/* Navigation Arrows */}
          {images.length > 1 && (
            <>
              <button
                onClick={goToPrevious}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-ink/20 hover:bg-ink/30 text-ink p-3 rounded-full transition-colors"
                aria-label="Previous image"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                onClick={goToNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-ink/20 hover:bg-ink/30 text-ink p-3 rounded-full transition-colors"
                aria-label="Next image"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Footer - Image Details */}
      <div className="bg-surface-000/50 p-4">
        <div className="max-w-4xl mx-auto">
          {currentImage.caption && (
            <p className="text-ink text-lg mb-2">{currentImage.caption}</p>
          )}
          <div className="flex flex-wrap items-center gap-4 text-sm text-ink-muted">
            {currentImage.location && (
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
                {currentImage.location}
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
              {new Date(currentImage.date).toLocaleDateString()}
            </span>
            {showBeforeAfter && (
              <span className="flex items-center gap-1.5 text-primary-400">
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
                    d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                  />
                </svg>
                Before / After Available
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Thumbnail Strip */}
      {images.length > 1 && (
        <div className="bg-surface-000/70 p-3">
          <div className="flex gap-2 overflow-x-auto justify-center">
            {images.map((image, index) => (
              <button
                key={image._id}
                onClick={() => setCurrentIndex(index)}
                className={cn(
                  'flex-shrink-0 w-16 h-16 rounded overflow-hidden border-2 transition-all',
                  index === currentIndex
                    ? 'border-line scale-110'
                    : 'border-transparent opacity-60 hover:opacity-100'
                )}
              >
                <img
                  src={image.url}
                  alt={`Thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkGalleryLightbox;
