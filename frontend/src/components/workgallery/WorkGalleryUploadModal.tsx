import React, { useState, useCallback, useRef } from 'react';
import { X, Upload, Image as ImageIcon, AlertCircle, Check } from 'lucide-react';
import { clsx } from 'clsx';
import type { ServiceCategory, ImageUploadFormData } from '@/types/workGallery';
import {
  IMAGE_CONSTRAINTS,
  CATEGORY_DISPLAY_NAMES,
} from '@/types/workGallery';
import {
  validateImageFile,
  compressImage,
} from '@/services/workGallery.service';

interface WorkGalleryUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (data: ImageUploadFormData) => Promise<void>;
  currentImageCount: number;
  isUploading?: boolean;
}

const CATEGORIES: ServiceCategory[] = [
  'plumbing',
  'electrical',
  'carpentry',
  'masonry',
  'painting',
  'hvac',
  'welding',
  'other',
];

const WorkGalleryUploadModal: React.FC<WorkGalleryUploadModalProps> = ({
  isOpen,
  onClose,
  onUpload,
  currentImageCount,
  isUploading = false,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [category, setCategory] = useState<ServiceCategory>('other');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [location, setLocation] = useState('');
  const [isBeforeAfter, setIsBeforeAfter] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset form on open
  const resetForm = useCallback(() => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setCaption('');
    setCategory('other');
    setDate(new Date().toISOString().split('T')[0]);
    setLocation('');
    setIsBeforeAfter(false);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // Handle file selection
  const handleFileSelect = useCallback(
    async (file: File) => {
      setError(null);

      // Validate file
      const validation = validateImageFile(file);
      if (!validation.isValid) {
        setError(validation.error || 'Invalid file');
        return;
      }

      setSelectedFile(file);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    },
    []
  );

  // Handle drop zone events
  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  // Handle file input change
  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedFile) {
      setError('Please select an image');
      return;
    }

    if (caption.trim().length === 0) {
      setError('Please add a caption');
      return;
    }

    try {
      setIsCompressing(true);

      // Compress image if needed
      let fileToUpload = selectedFile;
      if (selectedFile.size > IMAGE_CONSTRAINTS.MAX_FILE_SIZE / 2) {
        const compressed = await compressImage(selectedFile);
        fileToUpload = new File([compressed], selectedFile.name, {
          type: 'image/jpeg',
        });
      }

      const formData: ImageUploadFormData = {
        image: fileToUpload,
        caption: caption.trim(),
        category,
        date,
        location: location.trim(),
        isBeforeAfter,
      };

      await onUpload(formData);

      // Reset and close on success
      resetForm();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to upload image');
    } finally {
      setIsCompressing(false);
    }
  };

  // Check remaining slots
  const remainingSlots = IMAGE_CONSTRAINTS.MAX_IMAGES - currentImageCount;
  const canUpload = remainingSlots > 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-000/50">
      <div className="bg-surface-200 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="work-gallery-upload-title">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-line">
          <h2 id="work-gallery-upload-title" className="text-xl font-semibold text-ink dark:text-ink">
            Add Work Image
          </h2>
          <button
            onClick={onClose}
            className="text-ink-muted hover:text-ink-muted transition-colors"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Slots Warning */}
        {!canUpload && (
          <div className="mx-4 mt-4 p-3 bg-yellow-900/20 border border-yellow-800 rounded-lg flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-yellow-200">
              You have reached the maximum of {IMAGE_CONSTRAINTS.MAX_IMAGES} work gallery images. Delete an
              existing image to add a new one.
            </p>
          </div>
        )}

        {/* Remaining Slots Indicator */}
        {canUpload && (
          <div className="mx-4 mt-4 p-3 bg-blue-900/20 border border-blue-800 rounded-lg">
            <p className="text-sm text-blue-200">
              {remainingSlots === 1
                ? 'This is your last available slot'
                : `${remainingSlots} image slot${remainingSlots > 1 ? 's' : ''} remaining`}
            </p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Image Upload Area */}
          <div>
            <label className="block text-sm font-medium text-ink-muted mb-2">
              Image <span className="text-red-500">*</span>
            </label>
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className={clsx(
                'relative border-2 border-dashed rounded-lg p-6 text-center transition-colors',
                previewUrl
                  ? 'border-primary-500 bg-primary-900/20'
                  : 'border-line-strong hover:border-line-strong'
              )}
            >
              {previewUrl ? (
                <div className="space-y-3">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="max-h-48 mx-auto rounded-lg object-cover"
                  />
                  <div className="flex items-center justify-center gap-2 text-sm text-green-400">
                    <Check className="h-4 w-4" />
                    <span>Image selected</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      setPreviewUrl(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    }}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="mx-auto h-12 w-12 rounded-full bg-surface-300 flex items-center justify-center">
                    {selectedFile ? (
                      <ImageIcon className="h-6 w-6 text-primary-600" />
                    ) : (
                      <Upload className="h-6 w-6 text-ink-muted" />
                    )}
                  </div>
                  <div className="text-sm text-ink-muted">
                    <label
                      htmlFor="file-upload"
                      className="cursor-pointer text-primary-600 hover:text-primary-700 font-medium"
                    >
                      Click to upload
                    </label>
                    {' or drag and drop'}
                  </div>
                  <p className="text-xs text-ink-muted">
                    JPG, PNG, or WebP up to 2MB
                  </p>
                  <input
                    ref={fileInputRef}
                    id="file-upload"
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleFileInputChange}
                    className="hidden"
                    disabled={!canUpload || isUploading}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Caption */}
          <div>
            <label
              htmlFor="caption"
              className="block text-sm font-medium text-ink-muted mb-2"
            >
              Caption <span className="text-red-500">*</span>
            </label>
            <textarea
              id="caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              maxLength={500}
              rows={3}
              className="w-full px-3 py-2 border border-line-strong rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-surface-300 text-ink resize-none"
              placeholder="Describe the work you did..."
              disabled={!canUpload || isUploading}
              required
            />
            <div className="flex justify-end mt-1">
              <span className="text-xs text-ink-muted">
                {caption.length}/500
              </span>
            </div>
          </div>

          {/* Category */}
          <div>
            <label
              htmlFor="category"
              className="block text-sm font-medium text-ink-muted mb-2"
            >
              Category <span className="text-red-500">*</span>
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value as ServiceCategory)}
              className="w-full px-3 py-2 border border-line-strong rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-surface-300 text-ink"
              disabled={!canUpload || isUploading}
              required
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {CATEGORY_DISPLAY_NAMES[cat]}
                </option>
              ))}
            </select>
          </div>

          {/* Location */}
          <div>
            <label
              htmlFor="location"
              className="block text-sm font-medium text-ink-muted mb-2"
            >
              Location
            </label>
            <input
              id="location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              maxLength={200}
              className="w-full px-3 py-2 border border-line-strong rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-surface-300 text-ink"
              placeholder="e.g., Westlands, Nairobi"
              disabled={!canUpload || isUploading}
            />
          </div>

          {/* Date */}
          <div>
            <label
              htmlFor="date"
              className="block text-sm font-medium text-ink-muted mb-2"
            >
              Date Work Was Done
            </label>
            <input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-line-strong rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-surface-300 text-ink"
              disabled={!canUpload || isUploading}
            />
          </div>

          {/* Before/After Toggle */}
          <div className="flex items-center gap-3">
            <input
              id="isBeforeAfter"
              type="checkbox"
              checked={isBeforeAfter}
              onChange={(e) => setIsBeforeAfter(e.target.checked)}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-line-strong rounded"
              disabled={!canUpload || isUploading}
            />
            <label
              htmlFor="isBeforeAfter"
              className="text-sm text-ink-muted"
            >
              This is part of a before/after pair
            </label>
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-red-900/20 border border-red-800 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-200">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-line-strong text-ink-muted rounded-lg hover:bg-surface-300 transition-colors"
              disabled={isUploading || isCompressing}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canUpload || !selectedFile || isUploading || isCompressing}
              className={clsx(
                'flex-1 px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2',
                canUpload && selectedFile
                  ? 'bg-primary-600 text-on-lumen hover:bg-primary-700'
                  : 'bg-line-strong text-ink-muted cursor-not-allowed'
              )}
            >
              {isCompressing ? (
                <>
                  <svg
                    className="h-4 w-4 animate-spin"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Compressing...
                </>
              ) : isUploading ? (
                <>
                  <svg
                    className="h-4 w-4 animate-spin"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Uploading...
                </>
              ) : (
                'Add Image'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WorkGalleryUploadModal;
