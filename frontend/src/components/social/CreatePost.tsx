import React, { useState, useRef } from 'react';
import { Image, Video, Smile, Send, X } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { createPost } from '@/store/slices/postSlice';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import axios from '@/lib/axios';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/lib/errorUtils';
import MentionTextarea from '../common/MentionTextarea';

const CreatePost: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { isCreating } = useAppSelector((state) => state.posts);

  const [caption, setCaption] = useState('');
  const [type, setType] = useState<'text' | 'question' | 'tip' | 'portfolio'>('text');
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<Array<{ url: string; type: 'image' | 'video'; fileId?: string }>>([]);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    const result = await dispatch(createPost({
      caption,
      type,
      media: selectedMedia,
      visibility: 'public'
    }));

    if (createPost.fulfilled.match(result)) {
      setCaption('');
      setType('text');
      setShowTypeSelector(false);
      setSelectedMedia([]);
    }
  };

  const getProfilePicture = () => {
    return user?.profilePicture || `https://ui-avatars.com/api/?name=${user?.firstName}+${user?.lastName}&background=random`;
  };

  const selectedType = postTypes.find(t => t.value === type);

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-indigo-50 dark:bg-gray-800 p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <img
          src={getProfilePicture()}
          alt={user?.firstName}
          className="h-10 w-10 rounded-full object-cover ring-2 ring-gray-100"
        />
        <div className="flex-1">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {user?.firstName} {user?.lastName}
          </h3>
          <p className="text-xs text-amber-500 capitalize">{user?.role}</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="mt-4">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={handleMediaSelect}
          className="hidden"
        />

        {/* Post Type Selector */}
        {showTypeSelector && (
          <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {postTypes.map((postType) => (
              <button
                key={postType.value}
                type="button"
                onClick={() => {
                  setType(postType.value as typeof type);
                  setShowTypeSelector(false);
                }}
                className={cn(
                  'flex items-center justify-center space-x-2 rounded-lg border-2 p-3 text-sm font-medium transition-all',
                  type === postType.value
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                )}
              >
                <span className="text-lg">{postType.icon}</span>
                <span>{postType.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Selected Type Badge */}
        {type !== 'text' && !showTypeSelector && (
          <div className="mb-3 flex items-center justify-between">
            <span className={cn('inline-flex items-center space-x-2 rounded-full px-3 py-1 text-sm font-medium', selectedType?.color)}>
              <span>{selectedType?.icon}</span>
              <span>{selectedType?.label}</span>
            </span>
            <button
              type="button"
              onClick={() => setType('text')}
              className="text-gray-400 hover:text-gray-600 dark:text-gray-400"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Textarea with @mention support */}
        <MentionTextarea
          value={caption}
          onChange={setCaption}
          placeholder={`What's on your mind, ${user?.firstName}? Use @ to mention someone`}
          className="w-full resize-none rounded-lg border border-gray-200 dark:border-gray-700 p-3 text-sm placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-opacity-20 bg-indigo-100 dark:bg-gray-900 dark:text-gray-100"
          rows={3}
          maxLength={2000}
        />

        {/* Selected media preview */}
        {selectedMedia.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {selectedMedia.map((media, index) => (
              <div key={index} className="relative group">
                {media.type === 'image' ? (
                  <img
                    src={media.url}
                    alt={`Upload ${index + 1}`}
                    className="h-24 w-full object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                  />
                ) : (
                  <video
                    src={media.url}
                    className="h-24 w-full object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                  />
                )}
                <button
                  type="button"
                  onClick={() => handleRemoveMedia(index)}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={() => setShowTypeSelector(!showTypeSelector)}
              className="flex items-center space-x-1 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 transition-colors hover:bg-gray-50 dark:bg-gray-900"
            >
              <span className="text-lg">{selectedType?.icon}</span>
              <span className="hidden sm:inline">Type</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingMedia}
              className="flex items-center space-x-1 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Add photo or video"
            >
              <Image className="h-4 w-4" />
              <span className="hidden sm:inline">{isUploadingMedia ? 'Uploading...' : 'Photo/Video'}</span>
            </button>

            <button
              type="button"
              className="flex items-center space-x-1 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 transition-colors hover:bg-gray-50 dark:bg-gray-900"
              disabled
              title="Coming soon"
            >
              <Smile className="h-4 w-4" />
            </button>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={(!caption.trim() && selectedMedia.length === 0) || isCreating || isUploadingMedia}
            isLoading={isCreating}
            className="flex items-center space-x-2"
          >
            <Send className="h-4 w-4" />
            <span>Post</span>
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CreatePost;
