import React, { useState, useCallback, useEffect } from 'react';
import { Plus, GripVertical, Pencil, Trash2, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WorkGalleryImage } from '@/types/workGallery';
import { IMAGE_CONSTRAINTS } from '@/types/workGallery';
import { getCategoryDisplayName, getCategoryColorClass } from '@/services/workGallery.service';
import WorkGalleryUploadModal from './WorkGalleryUploadModal';

interface WorkGallerySettingsProps {
  images: WorkGalleryImage[];
  isLoading: boolean;
  isUploading: boolean;
  onUpload: (data: any) => Promise<void>;
  onDelete: (imageId: string) => Promise<void>;
  onUpdate: (imageId: string, data: any) => Promise<void>;
  onReorder: (imageIds: string[]) => Promise<void>;
  remainingSlots: number;
}

const WorkGallerySettings: React.FC<WorkGallerySettingsProps> = ({
  images = [],
  isLoading,
  isUploading,
  onUpload,
  onDelete,
  onUpdate,
  onReorder,
  remainingSlots,
}) => {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [editingImage, setEditingImage] = useState<WorkGalleryImage | null>(null);
  const [editCaption, setEditCaption] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [draggedItem, setDraggedItem] = useState<number | null>(null);
  const [reorderedImages, setReorderedImages] = useState<WorkGalleryImage[]>(images);

  // Update local state when images change
  useEffect(() => {
    setReorderedImages([...images].sort((a, b) => a.order - b.order));
  }, [images]);

  // Handle drag start
  const handleDragStart = (index: number) => {
    setDraggedItem(index);
  };

  // Handle drag over
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedItem === null || draggedItem === index) return;

    const newImages = [...reorderedImages];
    const [removed] = newImages.splice(draggedItem, 1);
    newImages.splice(index, 0, removed);

    setReorderedImages(newImages);
    setDraggedItem(index);
  };

  // Handle drag end
  const handleDragEnd = async () => {
    setDraggedItem(null);

    // Check if order changed
    const newOrderIds = reorderedImages.map((img) => img._id);
    const currentOrderIds = images.sort((a, b) => a.order - b.order).map((img) => img._id);

    if (JSON.stringify(newOrderIds) !== JSON.stringify(currentOrderIds)) {
      await onReorder(newOrderIds);
    }
  };

  // Handle edit
  const handleEdit = (image: WorkGalleryImage) => {
    setEditingImage(image);
    setEditCaption(image.caption || '');
    setEditLocation(image.location || '');
  };

  // Handle save edit
  const handleSaveEdit = async () => {
    if (!editingImage) return;

    await onUpdate(editingImage._id, {
      caption: editCaption,
      location: editLocation,
    });

    setEditingImage(null);
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditingImage(null);
    setEditCaption('');
    setEditLocation('');
  };

  // Handle delete
  const handleDelete = async (imageId: string) => {
    if (confirm('Are you sure you want to delete this image? This action cannot be undone.')) {
      await onDelete(imageId);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-surface-200 rounded-xl shadow-sm p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-surface-300 rounded w-1/3" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="aspect-square bg-surface-300 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface-200 rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-line">
        <div>
          <h3 className="font-semibold text-ink dark:text-ink">
            Work Gallery
          </h3>
          <p className="text-sm text-ink-muted mt-1">
            Showcase your best work to attract customers ({images.length}/{IMAGE_CONSTRAINTS.MAX_IMAGES})
          </p>
        </div>
        <button
          onClick={() => setIsUploadModalOpen(true)}
          disabled={remainingSlots === 0 || isUploading}
          className={cn(
            'inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors',
            remainingSlots > 0 && !isUploading
              ? 'bg-primary-600 text-on-lumen hover:bg-primary-700'
              : 'bg-line-strong text-ink-muted cursor-not-allowed'
          )}
        >
          <Plus className="h-4 w-4" />
          Add Image
        </button>
      </div>

      {/* Full Warning */}
      {remainingSlots === 0 && (
        <div className="mx-4 mt-4 p-3 bg-yellow-900/20 border border-yellow-800 rounded-lg">
          <p className="text-sm text-yellow-200">
            You have reached the maximum of {IMAGE_CONSTRAINTS.MAX_IMAGES} images. Delete an existing image to add a new one.
          </p>
        </div>
      )}

      {/* Images Grid */}
      <div className="p-4">
        {reorderedImages.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-line rounded-lg">
            <svg
              className="mx-auto h-12 w-12 text-ink-muted"
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
            <h3 className="mt-2 text-sm font-medium text-ink dark:text-ink">
              No images yet
            </h3>
            <p className="mt-1 text-sm text-ink-muted">
              Add up to {IMAGE_CONSTRAINTS.MAX_IMAGES} images to showcase your work
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {reorderedImages.map((image, index) => (
              <div
                key={image._id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={cn(
                  'relative group rounded-lg overflow-hidden border-2 transition-all',
                  draggedItem === index
                    ? 'border-primary-500 scale-105'
                    : 'border-line'
                )}
              >
                {/* Drag Handle */}
                <div className="absolute top-2 left-2 bg-surface-000/50 text-ink p-1.5 rounded cursor-grab opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <GripVertical className="h-4 w-4" />
                </div>

                {/* Image */}
                <img
                  src={image.url}
                  alt={image.caption || 'Work image'}
                  className="w-full aspect-square object-cover"
                />

                {/* Overlay */}
                <div className="absolute inset-0 bg-surface-000/60 opacity-0 group-hover:opacity-100 transition-opacity">
                  {/* Actions */}
                  <div className="absolute bottom-0 left-0 right-0 p-3 flex gap-2">
                    <button
                      onClick={() => handleEdit(image)}
                      className="flex-1 bg-ink/90 hover:bg-surface-200 text-ink py-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Pencil className="h-4 w-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(image._id)}
                      className="bg-red-500/90 hover:bg-red-500 text-on-lumen py-2 px-3 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Category Badge */}
                <div className="absolute top-2 right-2">
                  <span
                    className={cn(
                      'text-xs font-medium px-2 py-1 rounded-full',
                      getCategoryColorClass(image.category)
                    )}
                  >
                    {getCategoryDisplayName(image.category)}
                  </span>
                </div>

                {/* Order Badge */}
                <div className="absolute top-2 left-2 bg-surface-200/90 text-ink text-ink text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
                  {index + 1}
                </div>

                {/* Edit Mode Overlay */}
                {editingImage?._id === image._id && (
                  <div className="absolute inset-0 bg-surface-200 p-3 flex flex-col">
                    <div className="flex-1 space-y-2">
                      <textarea
                        value={editCaption}
                        onChange={(e) => setEditCaption(e.target.value)}
                        placeholder="Add a caption..."
                        className="w-full h-20 px-2 py-1.5 text-sm border border-line-strong rounded-md resize-none bg-surface-300 text-ink"
                        maxLength={500}
                      />
                      <input
                        type="text"
                        value={editLocation}
                        onChange={(e) => setEditLocation(e.target.value)}
                        placeholder="Location"
                        className="w-full px-2 py-1.5 text-sm border border-line-strong rounded-md bg-surface-300 text-ink"
                        maxLength={200}
                      />
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={handleSaveEdit}
                        className="flex-1 bg-primary-600 text-on-lumen py-1.5 rounded-md flex items-center justify-center gap-1"
                      >
                        <Check className="h-4 w-4" />
                        Save
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="bg-surface-300 text-ink-muted py-1.5 px-3 rounded-md"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <WorkGalleryUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUpload={onUpload}
        currentImageCount={images.length}
        isUploading={isUploading}
      />
    </div>
  );
};

export default WorkGallerySettings;
