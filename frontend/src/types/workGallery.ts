/**
 * Work Gallery Type Definitions
 * for Technician Work Gallery Feature
 */

/**
 * Service categories for work gallery images
 */
export type ServiceCategory =
  | 'plumbing'
  | 'electrical'
  | 'carpentry'
  | 'masonry'
  | 'painting'
  | 'hvac'
  | 'welding'
  | 'other';

/**
 * Work Gallery Image interface
 * Represents a single image in a technician's work gallery
 */
export interface WorkGalleryImage {
  _id: string;
  url: string;
  publicId: string;
  caption: string;
  category: ServiceCategory;
  date: string;
  location: string;
  isBeforeAfter: boolean;
  pairId: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Work Gallery Metadata
 * Used for updating image metadata
 */
export interface WorkGalleryMetadata {
  caption?: string;
  category?: ServiceCategory;
  date?: string;
  location?: string;
  isBeforeAfter?: boolean;
  pairId?: string | null;
}

/**
 * Before/After Pair interface
 * Represents a pair of linked before/after images
 */
export interface BeforeAfterPair {
  before: WorkGalleryImage;
  after: WorkGalleryImage;
  pairId: string;
}

/**
 * Work Gallery Request
 * Used for adding a new work gallery image
 */
export interface WorkGalleryRequest {
  image: File;
  caption: string;
  category: ServiceCategory;
  date: string;
  location: string;
  isBeforeAfter: boolean;
}

/**
 * Work Gallery Response
 * API response format for work gallery operations
 */
export interface WorkGalleryResponse {
  success: boolean;
  message: string;
  data?: WorkGalleryImage;
  totalImages?: number;
  remainingSlots?: number;
}

/**
 * Technician Gallery Data
 * Public technician gallery information
 */
export interface TechnicianGalleryData {
  technicianId: string;
  technicianName: string;
  businessName?: string;
  profilePicture?: string;
  rating: {
    average: number;
    count: number;
  };
  images: WorkGalleryImage[];
  totalCount: number;
}

/**
 * Reorder Request
 * Used for reordering gallery images
 */
export interface ReorderRequest {
  imageIds: string[];
}

/**
 * Before/After Pair Request
 * Used for linking before/after images
 */
export interface BeforeAfterPairRequest {
  beforeId: string;
  afterId: string;
}

/**
 * Image Upload Form Data
 * Multipart form data for image upload
 */
export interface ImageUploadFormData {
  image: File;
  caption: string;
  category: ServiceCategory;
  date?: string;
  location?: string;
  isBeforeAfter?: boolean;
}

/**
 * Category Display Names
 * Human-readable category names
 */
export const CATEGORY_DISPLAY_NAMES: Record<ServiceCategory, string> = {
  plumbing: 'Plumbing',
  electrical: 'Electrical',
  carpentry: 'Carpentry',
  masonry: 'Masonry',
  painting: 'Painting',
  hvac: 'HVAC',
  welding: 'Welding',
  other: 'Other'
};

/**
 * Category Color Classes
 * Tailwind color classes for category badges
 */
export const CATEGORY_COLORS: Record<ServiceCategory, string> = {
  plumbing: 'bg-blue-100 text-blue-800',
  electrical: 'bg-yellow-100 text-yellow-800',
  carpentry: 'bg-amber-100 text-amber-800',
  masonry: 'bg-surface-300 text-ink',
  painting: 'bg-purple-100 text-purple-800',
  hvac: 'bg-cyan-100 text-cyan-800',
  welding: 'bg-orange-100 text-orange-800',
  other: 'bg-surface-300 text-ink'
};

/**
 * Image validation constraints
 */
export const IMAGE_CONSTRAINTS = {
  MAX_IMAGES: 10,
  MAX_FILE_SIZE: 2 * 1024 * 1024, // 2MB
  ALLOWED_FORMATS: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  MAX_CAPTION_LENGTH: 500,
  MAX_LOCATION_LENGTH: 200,
  OPTIMAL_WIDTH: 1280,
  OPTIMAL_HEIGHT: 769
} as const;

/**
 * Work Gallery State
 * Redux state for work gallery
 */
export interface WorkGalleryState {
  images: WorkGalleryImage[];
  currentTechnicianId: string | null;
  isLoading: boolean;
  isUploading: boolean;
  error: string | null;
  totalCount: number;
  remainingSlots: number;
}
