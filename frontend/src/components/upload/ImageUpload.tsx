import React, { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Loader2, Check } from 'lucide-react';
import axios from '@/lib/axios';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { getErrorMessage } from '@/lib/errorUtils';

interface ImageUploadProps {
  onUploadComplete?: (url: string, fileId: string) => void;
  currentImage?: string;
  uploadType?: 'profile-picture' | 'post-media' | 'booking-photos';
  bookingId?: string;
  className?: string;
  buttonText?: string;
  accept?: string;
  maxSizeMB?: number;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  onUploadComplete,
  currentImage,
  uploadType = 'profile-picture',
  bookingId,
  className,
  buttonText = 'Upload Image',
  accept = 'image/jpeg,image/png,image/gif,image/webp',
  maxSizeMB = 10,
}) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentImage || null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSizeMB) {
      toast.error(`File size must be less than ${maxSizeMB}MB`);
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload file
    handleUpload(file);
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    setUploadSuccess(false);

    try {
      const formData = new FormData();
      formData.append('file', file);

      let endpoint = '';

      // Determine endpoint based on upload type
      switch (uploadType) {
        case 'profile-picture':
          endpoint = '/upload/profile-picture';
          break;
        case 'post-media':
          endpoint = '/upload/post-media';
          formData.delete('file');
          formData.append('files', file);
          break;
        case 'booking-photos':
          if (!bookingId) {
            toast.error('Booking ID is required');
            setUploading(false);
            return;
          }
          endpoint = `/upload/booking/${bookingId}/photos`;
          formData.delete('file');
          formData.append('files', file);
          break;
        default:
          endpoint = '/upload/profile-picture';
      }

      const response = await axios.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        setUploadSuccess(true);
        toast.success('Image uploaded successfully!');

        // Extract URL based on response structure
        let url = '';
        let fileId = '';

        if (uploadType === 'profile-picture') {
          url = response.data.data.url;
          fileId = response.data.data.fileId;
        } else {
          // For post-media and booking-photos, use the first uploaded file
          url = response.data.data.media?.[0]?.url || response.data.data.photos?.[0]?.url;
          fileId = response.data.data.media?.[0]?.fileId || response.data.data.photos?.[0]?.fileId;
        }

        if (onUploadComplete && url) {
          onUploadComplete(url, fileId);
        }

        // Reset success indicator after 2 seconds
        setTimeout(() => setUploadSuccess(false), 2000);
      }
    } catch (error: unknown) {
      console.error('Upload error:', error);
      toast.error(getErrorMessage(error, 'Failed to upload image'));
      setPreview(currentImage || null);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={cn('w-full', className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
        disabled={uploading}
      />

      {preview ? (
        <div className="relative group">
          <img
            src={preview}
            alt="Preview"
            className="w-full h-48 object-cover rounded-lg border-2 border-gray-200 dark:border-gray-700"
          />

          {/* Overlay with actions */}
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all rounded-lg flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
              <button
                onClick={handleButtonClick}
                disabled={uploading}
                className="bg-white dark:bg-gray-800 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="Change image"
              >
                <Upload className="h-5 w-5 text-gray-700 dark:text-gray-300" />
              </button>
              <button
                onClick={handleRemoveImage}
                disabled={uploading}
                className="bg-white dark:bg-gray-800 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="Remove image"
              >
                <X className="h-5 w-5 text-red-600" />
              </button>
            </div>
          </div>

          {/* Upload status indicators */}
          {uploading && (
            <div className="absolute top-2 right-2 bg-white dark:bg-gray-800 rounded-full p-2 shadow-lg">
              <Loader2 className="h-5 w-5 text-primary-600 animate-spin" />
            </div>
          )}
          {uploadSuccess && (
            <div className="absolute top-2 right-2 bg-green-500 rounded-full p-2 shadow-lg">
              <Check className="h-5 w-5 text-white" />
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={handleButtonClick}
          disabled={uploading}
          className={cn(
            'w-full h-48 border-2 border-dashed rounded-lg transition-colors flex flex-col items-center justify-center gap-3',
            'border-gray-300 dark:border-gray-600 hover:border-primary-500 dark:hover:border-primary-500',
            'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-750',
            uploading && 'opacity-50 cursor-not-allowed'
          )}
        >
          {uploading ? (
            <>
              <Loader2 className="h-10 w-10 text-primary-600 animate-spin" />
              <p className="text-sm text-gray-600 dark:text-gray-400">Uploading...</p>
            </>
          ) : (
            <>
              <ImageIcon className="h-10 w-10 text-gray-400 dark:text-gray-500" />
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {buttonText}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Max size: {maxSizeMB}MB
                </p>
              </div>
            </>
          )}
        </button>
      )}
    </div>
  );
};

export default ImageUpload;
