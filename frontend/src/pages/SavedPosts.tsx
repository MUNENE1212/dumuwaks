import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchFeed } from '@/store/slices/postSlice';
import { Loader2, BookmarkIcon } from 'lucide-react';
import PostCard from '@/components/social/PostCard';

const SavedPosts = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const { posts, isLoading, error } = useAppSelector(
    (state) => state.posts
  );
  const { user } = useAppSelector((state) => state.auth);

  useEffect(() => {
    // Fetch all posts when component mounts
    dispatch(fetchFeed({ page: 1, limit: 50 }));
  }, [dispatch]);

  // Filter for bookmarked posts
  const bookmarkedPosts = posts.filter((post: any) => post.bookmarkedBy?.includes(user?._id));

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4" />
          <p className="text-ink-muted">Loading saved posts...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <BookmarkIcon className="h-16 w-16 text-ink-muted mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-ink mb-2">
            Error Loading Saved Posts
          </h2>
          <p className="text-ink-muted mb-4">{error}</p>
          <button
            onClick={() => dispatch(fetchFeed({ page: 1, limit: 50 }))}
            className="px-4 py-2 bg-blue-600 text-on-lumen rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!bookmarkedPosts || bookmarkedPosts.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-100">
        <div className="text-center max-w-md px-4">
          <BookmarkIcon className="h-20 w-20 text-ink-muted mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-ink mb-2">
            No Saved Posts Yet
          </h2>
          <p className="text-ink-muted mb-6">
            Save posts to see them here. Click the bookmark icon on any post to
            save it for later.
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-blue-600 text-on-lumen rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Explore Posts
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-100 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <BookmarkIcon className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-ink">Saved Posts</h1>
          </div>
          <p className="text-ink-muted">
            {bookmarkedPosts.length} {bookmarkedPosts.length === 1 ? 'post' : 'posts'} saved
          </p>
        </div>

        {/* Posts Grid */}
        <div className="space-y-6">
          {bookmarkedPosts.map((post: any) => (
            <PostCard key={post._id} post={post} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default SavedPosts;
