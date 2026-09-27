import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  MoreVertical,
  Send,
  Trash2,
  Edit2,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  toggleLike,
  addComment,
  addReply,
  toggleCommentLike,
  sharePost,
  toggleBookmark,
  deletePost,
  Post,
} from '@/store/slices/postSlice';
import MentionTextarea from '../common/MentionTextarea';
import EditPostModal from './EditPostModal';
import { cn } from '@/lib/utils';
import { timeAgo } from '@/lib/utils';
import { formatRating } from '@/utils/rating';
import { getRoleStyles, UserRole } from '@/utils/roleColors';
import { Card } from '@/components/ui';

interface PostCardProps {
  post: Post;
}

const PostCard: React.FC<PostCardProps> = ({ post }) => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);

  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [isBookmarking, setIsBookmarking] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  // Early return if post author is not populated
  if (!post.author || typeof post.author !== 'object' || !post.author._id) {
    console.error('Post author is not properly populated:', post);
    return null;
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
    }
  };

  const handleCommentLike = async (commentId: string) => {
    await dispatch(toggleCommentLike({ postId: post._id, commentId }));
  };

  const handleReply = async (commentId: string) => {
    if (!replyText.trim()) return;
    const result = await dispatch(addReply({ postId: post._id, commentId, text: replyText }));
    if (addReply.fulfilled.match(result)) {
      setReplyText('');
      setReplyingTo(null);
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
      video: '🎥',
    };
    return icons[post.type] || icons.text;
  };

  // Get role-based styling
  const roleStyles = getRoleStyles(post.author.role as UserRole);

  return (
    <Card className="overflow-hidden hover:shadow-xl transition-all duration-300">
      {/* Header */}
      <div className="p-4 flex items-center gap-3">
        <Link to={`/profile/${post.author._id}`} className="flex-shrink-0">
          <img
            src={getProfilePicture(post.author)}
            alt={post.author.firstName}
            className={cn(
              "h-12 w-12 rounded-full object-cover ring-2 cursor-pointer transition-all hover:scale-105",
              `ring-2 ${roleStyles.ring.replace('ring-', 'ring-')}/30 hover:${roleStyles.ring}`
            )}
          />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link to={`/profile/${post.author._id}`}>
              <h3 className="font-semibold text-ink dark:text-ink hover:text-primary-600 transition-colors cursor-pointer">
                {post.author.firstName} {post.author.lastName}
              </h3>
            </Link>
            <span className={cn('text-xs px-2 py-0.5 rounded-full', roleStyles.badge)}>
              {roleStyles.emoji} {roleStyles.name}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-ink-muted mt-0.5">
            <span>{timeAgo(post.createdAt)}</span>
            {post.type !== 'text' && (
              <>
                <span>•</span>
                <span className={cn('flex items-center gap-1', getPostTypeColor())}>
                  <span>{getPostTypeIcon()}</span>
                  <span className="capitalize">{post.type}</span>
                </span>
              </>
            )}
          </div>
        </div>

        {/* Menu */}
        <div className="relative">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowMenu(!showMenu)}
            className="rounded-full p-2 text-ink-muted hover:bg-surface-200 transition-colors"
          >
            <MoreVertical className="h-5 w-5" />
          </motion.button>

          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.1 }}
                className="absolute right-0 z-10 mt-2 w-48 rounded-xl border border-line bg-surface-200 py-1 shadow-lg"
              >
                {isOwnPost ? (
                  <>
                    <button
                      onClick={() => {
                        setShowEditModal(true);
                        setShowMenu(false);
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-primary-400 hover:bg-primary-900/30 transition-colors"
                    >
                      <Edit2 className="h-4 w-4" />
                      <span>Edit Post</span>
                    </button>
                    <button
                      onClick={handleDelete}
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-red-900/30 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Delete Post</span>
                    </button>
                  </>
                ) : (
                  <button className="flex w-full items-center gap-2 px-4 py-2 text-sm text-ink-muted hover:bg-surface-100 transition-colors">
                    <span>Report Post</span>
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Shared Post Indicator */}
      {post.sharedPost && (
        <div className="px-3 sm:px-4 pb-2">
          <div className="flex items-center text-xs text-ink-muted mb-2">
            <Share2 className="h-3 w-3 mr-1" />
            <span>Shared</span>
          </div>
          {post.shareCaption && (
            <p className="whitespace-pre-wrap text-sm text-ink mb-3">
              {post.shareCaption}
            </p>
          )}
        </div>
      )}

      {/* Content - if shared post, show the original in a card */}
      {post.sharedPost ? (
        <div className="mx-3 sm:mx-4 mb-3 rounded-lg border border-line-strong overflow-hidden">
          {/* Original post header */}
          <div className="flex items-start space-x-2 p-3 bg-surface-100">
            <Link to={`/profile/${post.sharedPost.author._id}`}>
              <img
                src={getProfilePicture(post.sharedPost.author)}
                alt={post.sharedPost.author.firstName}
                className="h-10 w-10 rounded-full object-cover"
              />
            </Link>
            <div className="flex-1">
              <Link to={`/profile/${post.sharedPost.author._id}`}>
                <h4 className="font-semibold text-sm text-ink hover:text-primary-600">
                  {post.sharedPost.author.firstName} {post.sharedPost.author.lastName}
                </h4>
              </Link>
              <span className="text-xs text-ink-muted">{timeAgo(post.sharedPost.createdAt)}</span>
            </div>
          </div>

          {/* Original post content */}
          <div className="p-3">
            {post.sharedPost.caption && (
              <p className="whitespace-pre-wrap text-sm text-ink">
                {post.sharedPost.caption}
              </p>
            )}

            {/* Original post media */}
            {post.sharedPost.media && post.sharedPost.media.length > 0 && (
              <div className="mt-2">
                {post.sharedPost.media.map((media, index) => (
                  <div key={index} className="relative aspect-video overflow-hidden rounded">
                    {media.type === 'image' ? (
                      <img src={media.url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <video src={media.url} poster={media.thumbnail} controls className="w-full h-full object-cover" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="px-3 sm:px-4 pb-3">
            <p className="whitespace-pre-wrap text-sm sm:text-base text-ink">{post.caption}</p>

            {/* Hashtags */}
            {post.hashtags && post.hashtags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {post.hashtags.map((tag) => (
                  <span
                    key={tag}
                    className="text-sm text-primary-600 hover:underline cursor-pointer"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Media */}
          {post.media && post.media.length > 0 && (
        <div className={cn(
          'grid gap-1',
          post.media.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
        )}>
          {post.media.map((media, index) => (
            <div key={index} className="relative aspect-square overflow-hidden">
              {media.type === 'image' ? (
                <img
                  src={media.url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <video
                  src={media.url}
                  poster={media.thumbnail}
                  controls
                  className="h-full w-full object-cover"
                />
              )}
            </div>
          ))}
        </div>
          )}
        </>
      )}

      {/* Engagement Stats */}
      <div className="flex items-center justify-between border-t border-line px-4 py-2 text-xs text-ink-muted">
        <div className="flex gap-4">
          <span>{post.likesCount} likes</span>
          <span>{post.commentsCount} comments</span>
        </div>
        <div className="flex gap-4">
          <span className="hidden sm:inline">{post.sharesCount} shares</span>
          <span>{post.views} views</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-around border-t border-line px-2 py-2">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleLike}
          disabled={isLiking}
          className={cn(
            'flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
            post.isLiked
              ? 'text-red-600 bg-red-900/20'
              : 'text-ink-muted hover:bg-surface-200'
          )}
        >
          <Heart className={cn('h-5 w-5', post.isLiked && 'fill-current')} />
          <span className="hidden sm:inline">Like</span>
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowComments(!showComments)}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium text-ink-muted hover:bg-surface-200 transition-colors"
        >
          <MessageCircle className="h-5 w-5" />
          <span className="hidden sm:inline">Comment</span>
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleShare}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium text-ink-muted hover:bg-surface-200 transition-colors"
        >
          <Share2 className="h-5 w-5" />
          <span className="hidden sm:inline">Share</span>
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleBookmark}
          disabled={isBookmarking}
          className={cn(
            'flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
            post.isBookmarked
              ? 'text-primary-600 bg-primary-900/20'
              : 'text-ink-muted hover:bg-surface-200'
          )}
        >
          <Bookmark className={cn('h-5 w-5', post.isBookmarked && 'fill-current')} />
          <span className="hidden sm:inline">Save</span>
        </motion.button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="border-t border-line px-4 py-4">
          {/* Comment Form */}
          <form onSubmit={handleComment} className="mb-4 flex gap-3">
            <img
              src={getProfilePicture(user)}
              alt={user?.firstName}
              className="h-10 w-10 rounded-full object-cover flex-shrink-0"
            />
            <div className="flex-1 flex gap-2">
              <div className="flex-1">
                <MentionTextarea
                  value={commentText}
                  onChange={setCommentText}
                  placeholder="Write a comment... Use @ to mention someone"
                  className="w-full resize-none rounded-full border border-line bg-surface-200 text-ink px-4 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
                  rows={1}
                  maxLength={500}
                />
              </div>
              <motion.button
                whileTap={{ scale: 0.95 }}
                type="submit"
                disabled={!commentText.trim()}
                className="rounded-full bg-primary-500 p-2.5 text-on-lumen transition-all hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 h-fit shadow-lg shadow-primary-500/20"
              >
                <Send className="h-4 w-4" />
              </motion.button>
            </div>
          </form>

          {/* Comments List */}
          <div className="space-y-4">
            {post.comments.map((comment) => {
              // Safety check: Ensure comment.user is populated
              if (!comment.user || typeof comment.user !== 'object' || !comment.user._id) {
                return null;
              }

              return (
                <div key={comment._id} className="flex gap-3">
                  <Link to={`/profile/${comment.user._id}`}>
                    <img
                      src={getProfilePicture(comment.user)}
                      alt={comment.user.firstName}
                      className="h-8 w-8 rounded-full object-cover cursor-pointer hover:ring-2 hover:ring-primary-500 transition-all"
                    />
                  </Link>
                  <div className="flex-1">
                    <div className="rounded-2xl bg-surface-200/50 px-4 py-2.5">
                      <Link to={`/profile/${comment.user._id}`}>
                        <p className="text-sm font-semibold text-ink dark:text-ink hover:text-primary-600 transition-colors cursor-pointer">
                          {comment.user.firstName} {comment.user.lastName}
                        </p>
                      </Link>
                      <p className="text-sm text-ink-muted mt-0.5">{comment.text}</p>
                    </div>
                    <div className="mt-1.5 flex items-center gap-3 text-xs text-ink-muted">
                      <span>{timeAgo(comment.createdAt)}</span>
                      <button
                        onClick={() => handleCommentLike(comment._id)}
                        className="hover:text-primary-600 transition-colors font-medium"
                      >
                        {comment.likesCount > 0 ? `Like (${comment.likesCount})` : 'Like'}
                      </button>
                      <button
                        onClick={() => setReplyingTo(replyingTo === comment._id ? null : comment._id)}
                        className="hover:text-primary-600 transition-colors font-medium"
                      >
                        Reply
                      </button>
                    </div>

                    {/* Reply input */}
                    {replyingTo === comment._id && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-3 flex gap-2"
                      >
                        <input
                          type="text"
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Write a reply..."
                          className="flex-1 rounded-xl border border-line bg-surface-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleReply(comment._id);
                            }
                          }}
                        />
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleReply(comment._id)}
                          className="rounded-xl bg-primary-500 px-4 py-2 text-sm text-on-lumen hover:bg-primary-600 transition-all shadow-lg shadow-primary-500/20"
                        >
                          Reply
                        </motion.button>
                      </motion.div>
                    )}

                    {/* Display replies */}
                    {comment.replies && comment.replies.length > 0 && (
                      <div className="mt-3 space-y-3">
                        {comment.replies.map((reply, idx) => (
                          <div key={idx} className="flex gap-2">
                            <img
                              src={getProfilePicture(reply.user)}
                              alt={reply.user.firstName}
                              className="h-6 w-6 rounded-full object-cover"
                            />
                            <div className="flex-1">
                              <div className="rounded-xl bg-surface-200/50 px-3 py-2">
                                <p className="text-xs font-semibold text-ink dark:text-ink">
                                  {reply.user.firstName} {reply.user.lastName}
                                </p>
                                <p className="text-xs text-ink-muted">{reply.text}</p>
                              </div>
                              <span className="mt-1 text-xs text-ink-muted">{timeAgo(reply.createdAt)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Edit Post Modal */}
      <EditPostModal
        post={post}
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
      />
    </Card>
  );
};

export default PostCard;
