import axios from '@/lib/axios';
import type {
  WorkGalleryImage,
  WorkGalleryMetadata,
  TechnicianGalleryData,
  ReorderRequest,
  BeforeAfterPairRequest,
  ImageUploadFormData,
  WorkGalleryResponse
} from '@/types/workGallery';

/**
 * Work Gallery Service
 * API service for technician work gallery operations
 */

const API_BASE = '/work-gallery';

/**
 * Get technician's work gallery (public)
 * @param technicianId - The ID of the technician
 * @returns Promise with technician gallery data
 */
export const getTechnicianGallery = async (
  technicianId: string
): Promise<TechnicianGalleryData> => {
  const response = await axios.get(`${API_BASE}/technician/${technicianId}`);
  return response.data.data;
};

/**
 * Get current user's work gallery
 * @returns Promise with user's work gallery images
 */
export const getMyGallery = async (): Promise<{
  data: WorkGalleryImage[];
  totalCount: number;
  remainingSlots: number;
}> => {
  const response = await axios.get(`${API_BASE}/my-gallery`);
  return response.data;
};

/**
 * Add work gallery image
 * @param formData - Form data containing image and metadata
 * @returns Promise with added image data
 */
export const addWorkImage = async (
  formData: ImageUploadFormData
): Promise<WorkGalleryResponse> => {
  const { image, caption, category, date, location, isBeforeAfter } = formData;

  // Create FormData for multipart upload
  const formDataObj = new FormData();
  formDataObj.append('image', image);
  formDataObj.append('caption', caption);
  formDataObj.append('category', category);
  if (date) formDataObj.append('date', date);
  if (location) formDataObj.append('location', location);
  if (isBeforeAfter !== undefined) {
    formDataObj.append('isBeforeAfter', String(isBeforeAfter));
  }

  const response = await axios.post(`${API_BASE}`, formDataObj, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

/**
 * Update work gallery image metadata
 * @param imageId - The ID of the image to update
 * @param data - Updated metadata
 * @returns Promise with updated image data
 */
export const updateWorkImage = async (
  imageId: string,
  data: WorkGalleryMetadata
): Promise<WorkGalleryResponse> => {
  const response = await axios.put(`${API_BASE}/${imageId}`, data);
  return response.data;
};

/**
 * Delete work gallery image
 * @param imageId - The ID of the image to delete
 * @returns Promise with deletion confirmation
 */
export const deleteWorkImage = async (
  imageId: string
): Promise<WorkGalleryResponse> => {
  const response = await axios.delete(`${API_BASE}/${imageId}`);
  return response.data;
};

/**
 * Reorder work gallery images
 * @param imageIds - Array of image IDs in the desired order
 * @returns Promise with reordered images
 */
export const reorderGallery = async (
  imageIds: string[]
): Promise<WorkGalleryResponse> => {
  const response = await axios.put(`${API_BASE}/reorder`, { imageIds });
  return response.data;
};

/**
 * Set before/after pair for images
 * @param beforeId - The ID of the "before" image
 * @param afterId - The ID of the "after" image
 * @returns Promise with paired images data
 */
export const setBeforeAfterPair = async (
  beforeId: string,
  afterId: string
): Promise<{ before: WorkGalleryImage; after: WorkGalleryImage }> => {
  const response = await axios.post(`${API_BASE}/before-after`, {
    beforeId,
    afterId,
  });
  return response.data;
};

/**
 * Validate image file before upload
 * @param file - The file to validate
 * @returns Object with isValid flag and error message
 */
export const validateImageFile = (file: File): {
  isValid: boolean;
  error?: string;
} => {
  // Check file size (2MB max)
  if (file.size > 2 * 1024 * 1024) {
    return {
      isValid: false,
      error: 'Image size must be less than 2MB',
    };
  }

  // Check file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: 'Only JPG, PNG, and WebP formats are allowed',
    };
  }

  return { isValid: true };
};

/**
 * Compress image using canvas
 * @param file - The image file to compress
 * @param maxSize - Maximum dimension (width or height)
 * @param quality - JPEG quality (0-1)
 * @returns Promise with compressed blob
 */
export const compressImage = async (
  file: File,
  maxSize: number = 1280,
  quality: number = 0.85
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    img.onload = () => {
      // Calculate new dimensions
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxSize) {
          height = (height * maxSize) / width;
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width = (width * maxSize) / height;
          height = maxSize;
        }
      }

      canvas.width = width;
      canvas.height = height;

      // Draw and compress
      ctx?.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to compress image'));
          }
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Get category display name
 * @param category - The service category
 * @returns Human-readable category name
 */
export const getCategoryDisplayName = (category: string): string => {
  const names: Record<string, string> = {
    plumbing: 'Plumbing',
    electrical: 'Electrical',
    carpentry: 'Carpentry',
    masonry: 'Masonry',
    painting: 'Painting',
    hvac: 'HVAC',
    welding: 'Welding',
    other: 'Other',
  };
  return names[category] || category;
};

/**
 * Get category color class
 * @param category - The service category
 * @returns Tailwind color classes
 */
export const getCategoryColorClass = (category: string): string => {
  const colors: Record<string, string> = {
    plumbing: 'bg-blue-100 text-blue-800 border-blue-200',
    electrical: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    carpentry: 'bg-amber-100 text-amber-800 border-amber-200',
    masonry: 'bg-surface-300 text-ink border-line',
    painting: 'bg-purple-100 text-purple-800 border-purple-200',
    hvac: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    welding: 'bg-orange-100 text-orange-800 border-orange-200',
    other: 'bg-surface-300 text-ink border-line',
  };
  return colors[category] || colors.other;
};
