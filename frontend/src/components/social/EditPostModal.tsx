import React, { useState, useRef, useEffect } from 'react';
import { X, Image, Video, Trash2 } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { updatePost, Post } from '@/store/slices/postSlice';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import axios from '@/lib/axios';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/lib/errorUtils';
import MentionTextarea from '../common/MentionTextarea';

interface EditPostModalProps {
  post: Post;
  isOpen: boolean;
  onClose: () => void;
}

const EditPostModal: React.FC<EditPostModalProps> = ({ post, isOpen, onClose }) => {
  const dispatch = useAppDispatch();
  const { isCreating } = useAppSelector((state) => state.posts);

  const [caption, setCaption] = useState(post.caption || '');
  const [type, setType] = useState<'text' | 'question' | 'tip' | 'portfolio'>(
    post.type as 'text' | 'question' | 'tip' | 'portfolio'
  );
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<Array<{ url: string; type: 'image' | 'video'; fileId?: string }>>(
    post.media || []
  );
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update state when post changes
  useEffect(() => {
    setCaption(post.caption || '');
    setType(post.type as 'text' | 'question' | 'tip' | 'portfolio');
    setSelectedMedia(post.media || []);
  }, [post]);

  const postTypes = [
    { value: 'text', label: 'Update', icon: '📝', color: 'bg-blue-50 text-blue-600' },
    { value: 'question', label: 'Question', icon: '❓', color: 'bg-purple-50 text-purple-600' },
    { value: 'tip', label: 'Tip/Tutorial', icon: '💡', color: 'bg-yellow-50 text-yellow-600' },
    { value: 'portfolio', label: 'Portfolio', icon: '🎨', color: 'bg-green-50 text-green-600' },
  ];

  const handleMediaSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingMedia(true);
    try {
      const formData = new FormData();

      // Add all selected files
      Array.from(files).forEach(file => {
        formData.append('files', file);
      });

      const response = await axios.post('/upload/post-media', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        const uploadedMedia = response.data.data.media.map((m: { url: string; type: 'image' | 'video'; fileId?: string }) => ({
          url: m.url,
          type: m.type,
          fileId: m.fileId,
        }));

        setSelectedMedia(prev => [...prev, ...uploadedMedia]);
        toast.success(`${uploadedMedia.length} file(s) uploaded successfully!`);
      }
    } catch (error: unknown) {
      console.error('Upload error:', error);
      toast.error(getErrorMessage(error, 'Failed to upload media'));
    } finally {
      setIsUploadingMedia(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveMedia = (index: number) => {
    setSelectedMedia(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!caption.trim() && selectedMedia.length === 0) {
      toast.error('Please add some text or media to your post');
      return;
    }

    const result = await dispatch(updatePost({
      postId: post._id,
      postData: {
        caption,
        type,
        media: selectedMedia,
        visibility: 'public'
      }
    }));

    if (updatePost.fulfilled.match(result)) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="edit-post-title">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 id="edit-post-title" className="text-xl font-semibold text-gray-900 dark:text-gray-100">Edit Post</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4">
          {/* Post Type Selector */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Post Type
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {postTypes.map((postType) => (
                <button
                  key={postType.value}
                  type="button"
                  onClick={() => setType(postType.value as typeof type)}
                  className={cn(
                    'p-3 rounded-lg text-sm font-medium transition-all border-2',
                    type === postType.value
                      ? `${postType.color} border-current`
                      : 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-transparent hover:bg-gray-100 dark:hover:bg-gray-600'
                  )}
                >
                  <span className="text-lg mr-1">{postType.icon}</span>
                  {postType.label}
                </button>
              ))}
            </div>
          </div>

          {/* Caption */}
          <div className="mb-4">
            <MentionTextarea
              value={caption}
              onChange={setCaption}
              placeholder={`What's on your mind?`}
              className="w-full resize-none rounded-lg border border-gray-200 dark:border-gray-700 p-3 text-sm placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-20 bg-white dark:bg-gray-800 dark:text-gray-100"
              rows={4}
              maxLength={2000}
            />
          </div>

          {/* Media Preview */}
          {selectedMedia.length > 0 && (
            <div className="mb-4 grid grid-cols-2 gap-2">
              {selectedMedia.map((media, index) => (
                <div key={index} className="relative group">
                  {media.type === 'image' ? (
                    <img
                      src={media.url}
                      alt={`Media ${index + 1}`}
                      className="w-full h-40 object-cover rounded-lg"
                    />
                  ) : (
                    <video
                      src={media.url}
                      className="w-full h-40 object-cover rounded-lg"
                      controls
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveMedia(index)}
                    className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label={`Remove media ${index + 1}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Media Upload */}
          <div className="mb-4 flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleMediaSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingMedia}
              className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors disabled:opacity-50"
            >
              <Image className="h-5 w-5" />
              {isUploadingMedia ? 'Uploading...' : 'Add Photos'}
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingMedia}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors disabled:opacity-50"
            >
              <Video className="h-5 w-5" />
              {isUploadingMedia ? 'Uploading...' : 'Add Videos'}
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isCreating}
              disabled={isCreating || (!caption.trim() && selectedMedia.length === 0)}
            >
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditPostModal;
