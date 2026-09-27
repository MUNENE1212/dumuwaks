import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Maximize2, Edit2, Trash2, GripVertical } from 'lucide-react';
import { clsx } from 'clsx';
import type { WorkGalleryImage } from '@/types/workGallery';
import { getCategoryDisplayName, getCategoryColorClass } from '@/services/workGallery.service';

interface WorkGalleryCarouselProps {
  images: WorkGalleryImage[];
  editable?: boolean;
  onEdit?: (image: WorkGalleryImage) => void;
  onDelete?: (imageId: string) => void;
  onReorder?: (images: WorkGalleryImage[]) => void;
  onImageClick?: (image: WorkGalleryImage) => void;
  technicianName?: string;
  isLoading?: boolean;
}

const WorkGalleryCarousel: React.FC<WorkGalleryCarouselProps> = ({
  images = [],
  editable = false,
  onEdit,
  onDelete,
  onReorder,
  onImageClick,
  technicianName,
  isLoading = false,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState(0);
  const [isEditMode, setIsEditMode] = useState(false);
  const [draggedItem, setDraggedItem] = useState<number | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  const sortedImages = [...images].sort((a, b) => a.order - b.order);
  const hasImages = sortedImages.length > 0;

  // Navigate to previous image
  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev === 0 ? sortedImages.length - 1 : prev - 1));
  }, [sortedImages.length]);

  // Navigate to next image
  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev === sortedImages.length - 1 ? 0 : prev + 1));
  }, [sortedImages.length]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goToPrevious();
      if (e.key === 'ArrowRight') goToNext();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToPrevious, goToNext]);

  // Touch/drag handlers for swipe
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (isEditMode) return;
    setIsDragging(true);
    setStartPos(e.touches[0].clientX);
  }, [isEditMode]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging || isEditMode) return;
    const currentPos = e.touches[0].clientX;
    const diff = startPos - currentPos;

    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        goToNext();
      } else {
        goToPrevious();
      }
      setIsDragging(false);
    }
  }, [isDragging, startPos, goToNext, goToPrevious, isEditMode]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Drag and drop handlers for reordering
  const handleDragStart = (index: number) => {
    setDraggedItem(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedItem === null || draggedItem === index) return;

    const newImages = [...sortedImages];
    const [removed] = newImages.splice(draggedItem, 1);
    newImages.splice(index, 0, removed);

    // Update order values
    newImages.forEach((img, idx) => {
      img.order = idx + 1;
    });

    onReorder?.(newImages);
    setDraggedItem(index);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  if (isLoading) {
    return (
      <div className="bg-surface-200 rounded-xl shadow-sm p-6">
        <div className="aspect-video bg-surface-300 rounded-lg animate-pulse" />
      </div>
    );
  }

  // Empty state
  if (!hasImages) {
    return (
      <div className="bg-surface-200 rounded-xl shadow-sm p-6">
        <div className="text-center py-12">
          <div className="mx-auto h-16 w-16 rounded-full bg-surface-300 flex items-center justify-center mb-4">
            <svg
              className="h-8 w-8 text-ink-muted"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-ink dark:text-ink mb-2">
            No Work Gallery Yet
          </h3>
          <p className="text-ink-muted max-w-sm mx-auto">
            {technicianName
              ? `${technicianName} hasn't added any work photos yet.`
              : 'Showcase your best work to attract more customers.'}
          </p>
        </div>
      </div>
    );
  }

  const currentImage = sortedImages[currentIndex];

  return (
    <div className="bg-surface-200 rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-line">
        <h3 className="font-semibold text-ink dark:text-ink">
          Work Gallery
          <span className="ml-2 text-sm font-normal text-ink-muted">
            ({currentIndex + 1} of {sortedImages.length})
          </span>
        </h3>
        {editable && (
          <button
            onClick={() => setIsEditMode(!isEditMode)}
            className={clsx(
              'text-sm font-medium transition-colors',
              isEditMode
                ? 'text-primary-600 hover:text-primary-700'
                : 'text-ink-muted hover:text-ink'
            )}
          >
            {isEditMode ? 'Done' : 'Edit'}
          </button>
        )}
      </div>

      {/* Carousel */}
      <div
        ref={carouselRef}
        className={clsx(
          'relative',
          isEditMode ? 'cursor-move' : 'cursor-pointer'
        )}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Main Image */}
        <div
          className="relative aspect-video bg-surface-300"
          onClick={() => !isEditMode && onImageClick?.(currentImage)}
        >
          <img
            src={currentImage.url}
            alt={currentImage.caption || 'Work image'}
            className="w-full h-full object-cover"
            loading="lazy"
          />

          {/* Before/After Badge */}
          {currentImage.isBeforeAfter && (
            <div className="absolute top-3 left-3 bg-surface-000/70 text-ink text-xs font-medium px-2 py-1 rounded-full">
              Before / After
            </div>
          )}

          {/* Expand Button */}
          {!isEditMode && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onImageClick?.(currentImage);
              }}
              className="absolute top-3 right-3 bg-surface-000/50 hover:bg-surface-000/70 text-ink p-2 rounded-full transition-colors"
              aria-label="Expand image"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          )}

          {/* Edit Mode Overlay */}
          {isEditMode && (
            <div className="absolute inset-0 bg-surface-000/20 flex items-center justify-center gap-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit?.(currentImage);
                }}
                className="bg-surface-200 hover:bg-surface-300 text-ink p-3 rounded-full shadow-lg transition-colors"
                aria-label="Edit image"
              >
                <Edit2 className="h-5 w-5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm('Delete this image?')) {
                    onDelete?.(currentImage._id);
                  }
                }}
                className="bg-surface-200 hover:bg-red-50 text-red-600 p-3 rounded-full shadow-lg transition-colors"
                aria-label="Delete image"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>

        {/* Navigation Arrows */}
        {sortedImages.length > 1 && !isEditMode && (
          <>
            <button
              onClick={goToPrevious}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-surface-200/90 hover:bg-surface-200 text-ink text-ink p-2 rounded-full shadow-lg transition-all hover:scale-110"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={goToNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-surface-200/90 hover:bg-surface-200 text-ink text-ink p-2 rounded-full shadow-lg transition-all hover:scale-110"
              aria-label="Next image"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        {/* Dots Indicator */}
        {sortedImages.length > 1 && !isEditMode && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {sortedImages.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={clsx(
                  'h-2 rounded-full transition-all',
                  index === currentIndex
                    ? 'w-6 bg-surface-200'
                    : 'w-2 bg-ink/50 hover:bg-ink/75'
                )}
                aria-label={`Go to image ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Image Details */}
      <div className="p-4">
        {/* Category Badge */}
        <div className="mb-2">
          <span
            className={clsx(
              'inline-block text-xs font-medium px-2.5 py-0.5 rounded-full border',
              getCategoryColorClass(currentImage.category)
            )}
          >
            {getCategoryDisplayName(currentImage.category)}
          </span>
        </div>

        {/* Caption */}
        {currentImage.caption && (
          <p className="text-ink-muted text-sm mb-3">
            {currentImage.caption}
          </p>
        )}

        {/* Location and Date */}
        <div className="flex items-center gap-4 text-xs text-ink-muted">
          {currentImage.location && (
            <span className="flex items-center gap-1">
              <svg
                className="h-3.5 w-3.5"
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
          <span className="flex items-center gap-1">
            <svg
              className="h-3.5 w-3.5"
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
        </div>

        {/* Thumbnail Strip */}
        {sortedImages.length > 1 && (
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {sortedImages.map((image, index) => (
              <button
                key={image._id}
                onClick={() => setCurrentIndex(index)}
                className={clsx(
                  'flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all',
                  index === currentIndex
                    ? 'border-primary-500 scale-105'
                    : 'border-transparent hover:border-line-strong'
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
        )}
      </div>
    </div>
  );
};

export default WorkGalleryCarousel;
