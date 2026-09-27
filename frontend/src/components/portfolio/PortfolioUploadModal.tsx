import React, { useState } from 'react';
import { X, Upload, Image as ImageIcon, CheckCircle, AlertCircle, Plus, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from '@/lib/axios';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/lib/errorUtils';

interface PortfolioUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  bookings?: Array<{
    _id: string;
    serviceCategory: string;
    customer: {
      firstName: string;
      lastName: string;
    };
  }>;
}

/**
 * PortfolioUploadModal - Add verified work to portfolio
 * Technicians can showcase their completed projects
 */
export const PortfolioUploadModal: React.FC<PortfolioUploadModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  bookings = []
}) => {
  const [step, setStep] = useState<'details' | 'images' | 'submitting'>('details');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [serviceCategory, setServiceCategory] = useState('');
  const [location, setLocation] = useState('');
  const [selectedBooking, setSelectedBooking] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const serviceCategories = [
    'Plumbing',
    'Electrical',
    'Carpentry',
    'Appliance Repair',
    'Painting',
    'Cleaning',
    'Other'
  ];

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setServiceCategory('');
    setLocation('');
    setSelectedBooking('');
    setImages([]);
    setImagePreviews([]);
    setStep('details');
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image`);
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 5MB)`);
        return false;
      }
      return true;
    });

    setImages(prev => [...prev, ...validFiles].slice(0, 10)); // Max 10 images

    // Create previews
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title || !description || !serviceCategory || !location) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (images.length === 0) {
      toast.error('Please add at least one image');
      return;
    }

    setStep('submitting');
    setUploading(true);

    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('serviceCategory', serviceCategory);
      formData.append('location', JSON.stringify({ city: location }));

      if (selectedBooking) {
        formData.append('bookingId', selectedBooking);
      }

      // Append images
      images.forEach(file => {
        formData.append('images', file);
      });

      const response = await axios.post('/portfolio', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      toast.success(response.data.message || 'Portfolio item added successfully!');
      resetForm();
      onSuccess?.();
      onClose();
    } catch (error: unknown) {
      console.error('Error uploading portfolio item:', error);
      toast.error(getErrorMessage(error, 'Failed to upload portfolio item'));
      setStep('details');
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  const isAutoVerified = selectedBooking !== '';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-000/50">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-surface-200 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="portfolio-upload-title"
        >
          {/* Header */}
          <div className=" bg-indigo-500 p-6 text-on-lumen">
            <div className="flex items-start justify-between">
              <div>
                <h2 id="portfolio-upload-title" className="text-2xl font-bold mb-1">Add to Portfolio</h2>
                <p className="text-sm text-ink/90">
                  Showcase your verified work to attract more customers
                </p>
              </div>
              <button
                onClick={onClose}
                disabled={uploading}
                className="text-ink/80 hover:text-ink transition-colors disabled:opacity-50"
                aria-label="Close"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Progress Steps */}
            <div className="flex items-center gap-2 mt-4">
              <div className={`flex-1 h-1 rounded-full transition-colors ${
                step === 'details' || step === 'images' || step === 'submitting' ? 'bg-surface-200' : 'bg-ink/30'
              }`} />
              <div className={`flex-1 h-1 rounded-full transition-colors ${
                step === 'images' || step === 'submitting' ? 'bg-surface-200' : 'bg-ink/30'
              }`} />
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
            <form onSubmit={handleSubmit}>
              {step === 'details' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-4"
                >
                  {/* Link to Booking (Optional) */}
                  {bookings.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-ink-muted mb-2">
                        Link to Completed Booking (Optional)
                      </label>
                      <select
                        value={selectedBooking}
                        onChange={(e) => setSelectedBooking(e.target.value)}
                        className="w-full px-4 py-2 border border-line-strong rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-surface-300 text-ink text-ink"
                      >
                        <option value="">Upload without linking (requires admin approval)</option>
                        {bookings.map(booking => (
                          <option key={booking._id} value={booking._id}>
                            {booking.serviceCategory} for {booking.customer.firstName} {booking.customer.lastName} (Auto-verified)
                          </option>
                        ))}
                      </select>
                      {isAutoVerified && (
                        <div className="mt-2 flex items-center gap-2 text-xs text-green-400">
                          <CheckCircle className="w-4 h-4" />
                          <span>This will be auto-verified from your completed booking</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Title */}
                  <div>
                    <label className="block text-sm font-medium text-ink-muted mb-2">
                      Project Title *
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g., Complete Kitchen Renovation"
                      className="w-full px-4 py-2 border border-line-strong rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-surface-300 text-ink text-ink"
                      maxLength={100}
                      required
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-ink-muted mb-2">
                      Description *
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe what you did, challenges you faced, and how you solved them..."
                      className="w-full h-32 px-4 py-2 border border-line-strong rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-surface-300 text-ink text-ink resize-none"
                      maxLength={1000}
                      required
                    />
                    <p className="text-xs text-ink-muted mt-1">
                      {description.length}/1000 characters
                    </p>
                  </div>

                  {/* Service Category */}
                  <div>
                    <label className="block text-sm font-medium text-ink-muted mb-2">
                      Service Category *
                    </label>
                    <select
                      value={serviceCategory}
                      onChange={(e) => setServiceCategory(e.target.value)}
                      className="w-full px-4 py-2 border border-line-strong rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-surface-300 text-ink text-ink"
                      required
                    >
                      <option value="">Select a category</option>
                      {serviceCategories.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>

                  {/* Location */}
                  <div>
                    <label className="block text-sm font-medium text-ink-muted mb-2">
                      Location (City) *
                    </label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g., Nairobi"
                      className="w-full px-4 py-2 border border-line-strong rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-surface-300 text-ink text-ink"
                      required
                    />
                  </div>

                  {/* Continue Button */}
                  <button
                    type="button"
                    onClick={() => setStep('images')}
                    className="w-full px-6 py-3 bg-indigo-500 text-on-lumen font-semibold rounded-lg hover:bg-indigo-600 transition-all flex items-center justify-center gap-2"
                  >
                    Continue to Images
                    <Plus className="w-4 h-4" />
                  </button>
                </motion.div>
              )}

              {step === 'images' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-sm font-medium text-ink-muted mb-2">
                      Upload Images *
                    </label>
                    <p className="text-xs text-ink-muted mb-3">
                      Upload up to 10 images. Max 5MB per image. Show before/after, work in progress, or final results.
                    </p>

                    {/* Upload Area */}
                    <label className="block w-full p-8 border-2 border-dashed border-line-strong rounded-lg hover:border-purple-500 transition-colors cursor-pointer bg-surface-100/50">
                      <div className="flex flex-col items-center gap-3">
                        <div className="bg-purple-900/30 rounded-full p-3">
                          <Upload className="w-6 h-6 text-purple-400" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium text-ink-muted">
                            Click to upload or drag and drop
                          </p>
                          <p className="text-xs text-ink-muted mt-1">
                            PNG, JPG, GIF up to 5MB
                          </p>
                        </div>
                      </div>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleImageSelect}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Image Previews */}
                  {imagePreviews.length > 0 && (
                    <div className="grid grid-cols-3 gap-3">
                      {imagePreviews.map((preview, index) => (
                        <div key={index} className="relative aspect-square rounded-lg overflow-hidden group">
                          <img
                            src={preview}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute top-2 right-2 bg-red-500 text-on-lumen p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            aria-label={`Remove image ${index + 1}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <div className="absolute bottom-0 left-0 right-0 bg-surface-000/70 p-2">
                            <p className="text-ink text-xs">Image {index + 1}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Buttons */}
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setStep('details')}
                      disabled={uploading}
                      className="flex-1 px-6 py-3 border border-line-strong text-ink-muted rounded-lg hover:bg-surface-300 transition-colors font-medium disabled:opacity-50"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={uploading || images.length === 0}
                      className="flex-1 px-6 py-3 bg-indigo-500 text-on-lumen font-semibold rounded-lg hover:bg-indigo-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {uploading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-ink/30 border-t-line rounded-full animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Add to Portfolio
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}
            </form>
          </div>

          {/* Info Box */}
          {step === 'details' && (
            <div className="px-6 pb-6">
              <div className="bg-blue-900/20 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-100">
                    Build Trust with Your Portfolio
                  </p>
                  <p className="text-xs text-blue-300 mt-1">
                    Customers are 3x more likely to book technicians who showcase their work.
                    Upload high-quality images of your best projects.
                  </p>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default PortfolioUploadModal;
