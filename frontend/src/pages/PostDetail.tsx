import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchPost,
  toggleLike,
  addComment,
  sharePost,
  toggleBookmark,
  deletePost,
  type Post,
} from '@/store/slices/postSlice';
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  MoreVertical,
  Send,
  Trash2,
  ArrowLeft,
  Flag,
} from 'lucide-react';
import MentionTextarea from '@/components/common/MentionTextarea';
import { timeAgo } from '@/lib/utils';
import { getRoleStyles, type UserRole } from '@/utils/roleColors';
import { formatRating } from '@/utils/rating';

const PostDetail = () => {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const { currentPost: post, isLoading, error } = useAppSelector((state) => state.posts);
  const { user } = useAppSelector((state) => state.auth);

  const [commentText, setCommentText] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [isBookmarking, setIsBookmarking] = useState(false);

  useEffect(() => {
    if (postId) {
      dispatch(fetchPost(postId));
    }
  }, [postId, dispatch]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <h2 className="text-2xl font-bold text-ink mb-2">Post Not Found</h2>
        <p className="text-ink-muted mb-4">{error || 'The post you are looking for does not exist.'}</p>
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-blue-600 text-on-lumen rounded-lg hover:bg-blue-700 transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  const isOwnPost = user?._id === post.author._id;

  const handleLike = async () => {
    if (isLiking) return; // Prevent multiple concurrent requests
    setIsLiking(true);
    try {
      await dispatch(toggleLike(post._id));
    } finally {
      setIsLiking(false);
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    const result = await dispatch(addComment({ postId: post._id, text: commentText }));
    if (addComment.fulfilled.match(result)) {
      setCommentText('');
    }
  };

  const handleShare = async () => {
    await dispatch(sharePost(post._id));
  };

  const handleBookmark = async () => {
    if (isBookmarking) return; // Prevent multiple concurrent requests
    setIsBookmarking(true);
    try {
      await dispatch(toggleBookmark(post._id));
    } finally {
      setIsBookmarking(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this post?')) {
      await dispatch(deletePost(post._id));
      navigate(-1);
    }
  };

  const getProfilePicture = (author: any) => {
    if (!author) return 'https://ui-avatars.com/api/?name=User&background=random';
    return author.profilePicture || `https://ui-avatars.com/api/?name=${author.firstName || 'User'}+${author.lastName || ''}&background=random`;
  };

  const getPostTypeColor = () => {
    const colors: Record<string, string> = {
      text: 'text-ink-muted',
      question: 'text-purple-600',
      tip: 'text-yellow-600',
      portfolio: 'text-green-600',
      achievement: 'text-blue-600',
      image: 'text-blue-600',
      video: 'text-red-600',
    };
    return colors[post.type] || colors.text;
  };

  const getPostTypeIcon = () => {
    const icons: Record<string, string> = {
      text: '📝',
      question: '❓',
      tip: '💡',
      portfolio: '🎨',
      achievement: '🏆',
      image: '🖼️',
      video: '🎬',
    };
    return icons[post.type] || icons.text;
  };

  return (
    <div className="min-h-screen bg-surface-100">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="mb-4 flex items-center text-ink-muted hover:text-ink transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back
        </button>

        {/* Post Card */}
        <div className="bg-surface-200 rounded-lg shadow-md overflow-hidden">
          {/* Post Header */}
          <div className="p-4 border-b border-line">
            <div className="flex items-start justify-between">
              <Link
                to={`/profile/${post.author._id}`}
                className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
              >
                <img
                  src={getProfilePicture(post.author)}
                  alt={`${post.author.firstName} ${post.author.lastName}`}
                  className="h-12 w-12 rounded-full object-cover"
                />
                <div>
                  <div className="flex items-center space-x-2">
                    <h4 className="font-semibold text-ink">
                      {post.author.firstName} {post.author.lastName}
                    </h4>
                    <span
                      className={getRoleStyles(post.author.role as UserRole).badge}
                    >
                      {post.author.role}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-ink-muted">
                    <span>{timeAgo(post.createdAt)}</span>
                    {post.author.rating && (
                      <>
                        <span>•</span>
                        <span>⭐ {formatRating(post.author.rating.average)}</span>
                      </>
                    )}
                  </div>
                </div>
              </Link>

              {/* Post Actions Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-2 rounded-full hover:bg-surface-300 transition-colors"
                >
                  <MoreVertical className="h-5 w-5 text-ink-muted" />
                </button>

                {showMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                    <div className="absolute right-0 mt-2 w-48 bg-surface-300 rounded-lg shadow-xl border border-line-strong z-20">
                      {isOwnPost ? (
                        <button
                          onClick={handleDelete}
                          className="w-full px-4 py-2 text-left text-red-400 hover:bg-red-900/20 flex items-center space-x-2 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span>Delete Post</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => {}}
                          className="w-full px-4 py-2 text-left text-ink-muted hover:bg-surface-400 flex items-center space-x-2 rounded-lg transition-colors"
                        >
                          <Flag className="h-4 w-4" />
                          <span>Report Post</span>
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Post Type Badge */}
            <div className="mt-3 flex items-center space-x-2">
              <span className={`text-sm font-medium ${getPostTypeColor()}`}>
                {getPostTypeIcon()} {post.type.charAt(0).toUpperCase() + post.type.slice(1)}
              </span>
            </div>
          </div>

          {/* Post Content */}
          <div className="p-4">
            <p className="text-ink whitespace-pre-wrap leading-relaxed">
              {post.caption}
            </p>

            {/* Hashtags */}
            {post.hashtags && post.hashtags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {post.hashtags.map((tag, index) => (
                  <span
                    key={index}
                    className="text-blue-400 hover:underline cursor-pointer text-sm"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Media */}
            {post.media && post.media.length > 0 && (
              <div className={`mt-4 grid gap-2 ${post.media.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                {post.media.map((item, index) => (
                  <div key={index} className="relative rounded-lg overflow-hidden">
                    {item.type === 'image' ? (
                      <img
                        src={item.url}
                        alt={`Post media ${index + 1}`}
                        className="w-full h-auto object-cover"
                      />
                    ) : (
                      <video
                        src={item.url}
                        controls
                        className="w-full h-auto"
                        poster={item.thumbnail}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Post Stats */}
          <div className="px-4 py-2 border-t border-line">
            <div className="flex justify-between text-sm text-ink-muted">
              <span>{post.likesCount} likes</span>
              <div className="flex space-x-4">
                <span>{post.commentsCount} comments</span>
                <span>{post.sharesCount} shares</span>
                <span>{post.views} views</span>
              </div>
            </div>
          </div>

          {/* Post Actions */}
          <div className="px-4 py-3 border-t border-line">
            <div className="flex justify-around">
              <button
                onClick={handleLike}
                disabled={isLiking}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  post.isLiked
                    ? 'text-red-400 bg-red-900/20'
                    : 'text-ink-muted hover:bg-surface-300'
                }`}
              >
                <Heart className={`h-5 w-5 ${post.isLiked ? 'fill-current' : ''}`} />
                <span className="font-medium">Like</span>
              </button>

              <button
                className="flex items-center space-x-2 px-4 py-2 rounded-lg text-ink-muted hover:bg-surface-300 transition-colors"
              >
                <MessageCircle className="h-5 w-5" />
                <span className="font-medium">Comment</span>
              </button>

              <button
                onClick={handleShare}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg text-ink-muted hover:bg-surface-300 transition-colors"
              >
                <Share2 className="h-5 w-5" />
                <span className="font-medium">Share</span>
              </button>

              <button
                onClick={handleBookmark}
                disabled={isBookmarking}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  post.isBookmarked
                    ? 'text-blue-400 bg-blue-900/20'
                    : 'text-ink-muted hover:bg-surface-300'
                }`}
              >
                <Bookmark className={`h-5 w-5 ${post.isBookmarked ? 'fill-current' : ''}`} />
              </button>
            </div>
          </div>

          {/* Comments Section */}
          <div className="border-t border-line">
            {/* Comment Input */}
            <form onSubmit={handleComment} className="p-4 border-b border-line">
              <div className="flex items-start space-x-3">
                <img
                  src={getProfilePicture(user)}
                  alt="Your profile"
                  className="h-10 w-10 rounded-full object-cover"
                />
                <div className="flex-1">
                  <MentionTextarea
                    value={commentText}
                    onChange={setCommentText}
                    placeholder="Write a comment..."
                    className="w-full px-3 py-2 border border-line-strong rounded-lg focus:ring-2 focus:ring-blue-500 bg-surface-300 text-ink"
                    maxLength={500}
                  />
                  <div className="flex justify-end mt-2">
                    <button
                      type="submit"
                      disabled={!commentText.trim()}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-on-lumen rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Send className="h-4 w-4" />
                      <span>Post</span>
                    </button>
                  </div>
                </div>
              </div>
            </form>

            {/* Comments List */}
            <div className="divide-y divide-line">
              {post.comments && post.comments.length > 0 ? (
                post.comments.map((comment) => (
                  <div key={comment._id} className="p-4">
                    <div className="flex items-start space-x-3">
                      <Link to={`/profile/${comment.user._id}`}>
                        <img
                          src={getProfilePicture(comment.user)}
                          alt={`${comment.user.firstName} ${comment.user.lastName}`}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      </Link>
                      <div className="flex-1">
                        <div className="bg-surface-300 rounded-lg px-4 py-2">
                          <Link
                            to={`/profile/${comment.user._id}`}
                            className="font-semibold text-ink hover:underline"
                          >
                            {comment.user.firstName} {comment.user.lastName}
                          </Link>
                          <p className="text-ink mt-1">{comment.text}</p>
                        </div>
                        <div className="flex items-center space-x-4 mt-2 text-sm text-ink-muted">
                          <span>{timeAgo(comment.createdAt)}</span>
                          <button className="hover:text-blue-400">Like</button>
                          <span>{comment.likesCount} likes</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-ink-muted">
                  No comments yet. Be the first to comment!
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostDetail;
