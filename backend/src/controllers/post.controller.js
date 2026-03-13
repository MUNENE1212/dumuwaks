const Post = require('../models/Post');
const User = require('../models/User');
const { processMentions, createMentionNotifications } = require('../utils/mentionUtils');

/**
 * @desc    Create a new post
 * @route   POST /api/v1/posts
 * @access  Private
 */
exports.createPost = async (req, res) => {
  try {
    const { type, caption, media, hashtags, portfolioDetails, visibility } = req.body;

    // Process mentions in caption
    let mentionedUserIds = [];
    if (caption) {
      mentionedUserIds = await processMentions(caption);
    }

    const post = await Post.create({
      author: req.user.id,
      type,
      caption,
      media: media || [],
      hashtags: hashtags || [],
      mentions: mentionedUserIds,
      portfolioDetails,
      visibility: visibility || 'public',
      status: 'published'
    });

    await post.populate('author', 'firstName lastName profilePicture role');

    // Create mention notifications
    if (mentionedUserIds.length > 0 && caption) {
      await createMentionNotifications(
        req.user.id,
        mentionedUserIds,
        'post',
        post._id,
        caption
      );
    }

    res.status(201).json({
      success: true,
      message: 'Post created successfully',
      post
    });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating post',
    });
  }
};

/**
 * @desc    Get all posts (feed)
 * @route   GET /api/v1/posts
 * @access  Public
 */
exports.getPosts = async (req, res) => {
  try {
    const { type, author, hashtag, page = 1, limit = 20, sort = '-createdAt' } = req.query;

    const query = { status: 'published', visibility: 'public' };

    if (type) query.type = type;
    // Only add author filter if it's a valid value (not 'undefined' string or empty)
    if (author && author !== 'undefined' && author.trim() !== '') {
      // Validate ObjectId format
      if (!/^[0-9a-fA-F]{24}$/.test(author)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid author ID format'
        });
      }
      query.author = author;
    }
    if (hashtag) query.hashtags = hashtag;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Fetch more posts than needed to allow for pro boosting
    const fetchLimit = parseInt(limit) * 3;

    const posts = await Post.find(query)
      .populate({
        path: 'author',
        select: 'firstName lastName profilePicture role rating subscription',
        match: { deletedAt: null } // Only populate if author exists and not deleted
      })
      .populate('comments.user', '_id firstName lastName profilePicture')
      .populate({
        path: 'sharedPost',
        populate: {
          path: 'author',
          select: 'firstName lastName profilePicture role rating'
        }
      })
      .sort(sort)
      .limit(fetchLimit);

    // Filter out posts where author is null (deleted users)
    const validPosts = posts.filter(post => post.author != null);

    const total = await Post.countDocuments(query);

    // Calculate engagement score and apply pro boost
    const postsWithScores = validPosts.map(post => {
      // Calculate base engagement score
      const likesWeight = 3;
      const commentsWeight = 5;
      const sharesWeight = 10;
      const viewsWeight = 0.1;
      const recencyBonus = Math.max(0, 100 - ((Date.now() - post.createdAt) / (1000 * 60 * 60 * 24))); // Decay over 100 days

      // Safely access engagement fields with defaults
      const likesCount = post.likes?.length || 0;
      const commentsCount = post.comments?.length || 0;
      const sharesCount = post.sharesCount || 0;
      const viewsCount = post.views || 0;

      const engagementScore =
        (likesCount * likesWeight) +
        (commentsCount * commentsWeight) +
        (sharesCount * sharesWeight) +
        (viewsCount * viewsWeight) +
        recencyBonus;

      // Apply pro boost
      let finalScore = engagementScore;
      let boostApplied = false;
      let boostMultiplier = 1.0;

      if (post.author && post.author.subscription) {
        const { plan, status, endDate, features } = post.author.subscription;
        const isActive = status === 'active';
        const notExpired = !endDate || new Date(endDate) > new Date();
        const hasBoostedPosts = features && features.boostedPosts;

        if (isActive && notExpired && hasBoostedPosts) {
          boostApplied = true;
          if (plan === 'premium') {
            boostMultiplier = 2.0; // 100% boost for premium
          } else if (plan === 'pro') {
            boostMultiplier = 1.5; // 50% boost for pro
          }
          finalScore = engagementScore * boostMultiplier;
        }
      }

      return {
        post,
        engagementScore,
        finalScore,
        boostApplied,
        boostMultiplier
      };
    });

    // Sort by final score
    postsWithScores.sort((a, b) => b.finalScore - a.finalScore);

    // Apply pagination after scoring
    const paginatedScores = postsWithScores.slice(skip, skip + parseInt(limit));

    // Add isLiked and isBookmarked flags for authenticated users
    const userId = req.user?.id;
    const postsWithFlags = paginatedScores.map(({ post, boostApplied, boostMultiplier }) => {
      const postObj = post.toObject();
      if (userId) {
        postObj.isLiked = post.likes?.some(id => id.toString() === userId) || false;
        postObj.isBookmarked = post.bookmarks?.some(id => id.toString() === userId) || false;
      } else {
        postObj.isLiked = false;
        postObj.isBookmarked = false;
      }
      postObj.likesCount = post.likes?.length || 0;
      postObj.commentsCount = post.comments?.length || 0;
      postObj.sharesCount = post.sharesCount || 0;
      postObj.views = post.views || 0;
      postObj.isBoosted = boostApplied;
      postObj.boostLevel = boostMultiplier > 1.0 ? (boostMultiplier === 2.0 ? 'premium' : 'pro') : null;
      return postObj;
    });

    res.status(200).json({
      success: true,
      count: postsWithFlags.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      posts: postsWithFlags
    });
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching posts'
    });
  }
};

/**
 * @desc    Get single post
 * @route   GET /api/v1/posts/:id
 * @access  Public
 */
exports.getPost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('author', 'firstName lastName profilePicture role rating')
      .populate('comments.user', '_id firstName lastName profilePicture')
      .populate({
        path: 'sharedPost',
        populate: {
          path: 'author',
          select: 'firstName lastName profilePicture role rating'
        }
      });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Increment views
    post.views = (post.views || 0) + 1;
    await post.save();

    res.status(200).json({
      success: true,
      post
    });
  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching post'
    });
  }
};

/**
 * @desc    Update post
 * @route   PUT /api/v1/posts/:id
 * @access  Private
 */
exports.updatePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    if (post.author.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this post'
      });
    }

    const { caption, media, hashtags, visibility } = req.body;

    if (caption) post.caption = caption;
    if (media) post.media = media;
    if (hashtags) post.hashtags = hashtags;
    if (visibility) post.visibility = visibility;

    await post.save();

    res.status(200).json({
      success: true,
      message: 'Post updated successfully',
      post
    });
  } catch (error) {
    console.error('Update post error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating post'
    });
  }
};

/**
 * @desc    Delete post (soft delete for everyone)
 * @route   DELETE /api/v1/posts/:id
 * @access  Private
 */
exports.deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    if (post.author.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this post'
      });
    }

    // Soft delete - mark as deleted but keep in database
    await post.deletePost(req.user.id, req.body.reason);

    // Notify via socket
    try {
      const { emitToUser } = require('../config/socket');
      emitToUser(post.author.toString(), 'post:deleted', { postId: post._id });
    } catch (socketError) {
      console.error('Socket notification error:', socketError);
    }

    res.status(200).json({
      success: true,
      message: 'Post deleted successfully'
    });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting post'
    });
  }
};

/**
 * @desc    Like/Unlike post
 * @route   POST /api/v1/posts/:id/like
 * @access  Private
 */
exports.toggleLike = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Ensure likes array exists
    if (!post.likes) {
      post.likes = [];
    }

    const isLiked = post.likes.some(id => id.toString() === req.user.id);

    if (isLiked) {
      post.likes = post.likes.filter(
        id => id.toString() !== req.user.id
      );
    } else {
      post.likes.push(req.user.id);
    }

    // Update likes count
    post.likesCount = post.likes.length;

    await post.save();

    res.status(200).json({
      success: true,
      message: isLiked ? 'Post unliked' : 'Post liked',
      isLiked: !isLiked,
      likesCount: post.likesCount
    });
  } catch (error) {
    console.error('Toggle like error:', error);
    res.status(500).json({
      success: false,
      message: 'Error toggling like'
    });
  }
};

/**
 * @desc    Add comment to post
 * @route   POST /api/v1/posts/:id/comment
 * @access  Private
 */
exports.addComment = async (req, res) => {
  try {
    const { text } = req.body;

    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Process mentions in comment
    let mentionedUserIds = [];
    if (text) {
      mentionedUserIds = await processMentions(text);
    }

    post.comments.push({
      user: req.user.id,
      text,
      mentions: mentionedUserIds,
      timestamp: new Date()
    });

    await post.save();

    await post.populate('comments.user', '_id firstName lastName profilePicture');

    // Create mention notifications
    if (mentionedUserIds.length > 0 && text) {
      await createMentionNotifications(
        req.user.id,
        mentionedUserIds,
        'comment',
        post._id,
        text
      );
    }

    res.status(201).json({
      success: true,
      message: 'Comment added successfully',
      comment: post.comments[post.comments.length - 1],
      commentsCount: post.comments.length
    });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding comment'
    });
  }
};

/**
 * @desc    Add reply to comment
 * @route   POST /api/v1/posts/:id/comment/:commentId/reply
 * @access  Private
 */
exports.addReply = async (req, res) => {
  try {
    const { text } = req.body;
    const { id: postId, commentId } = req.params;

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    const comment = post.comments.id(commentId);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    // Process mentions in reply
    let mentionedUserIds = [];
    if (text) {
      mentionedUserIds = await processMentions(text);
    }

    comment.replies.push({
      user: req.user.id,
      text,
      mentions: mentionedUserIds,
      createdAt: new Date()
    });

    await post.save();

    // Populate the reply user
    await post.populate('comments.replies.user', '_id firstName lastName profilePicture role');

    // Get the newly added reply
    const newReply = comment.replies[comment.replies.length - 1];

    // Create mention notifications
    if (mentionedUserIds.length > 0 && text) {
      await createMentionNotifications(
        req.user.id,
        mentionedUserIds,
        'reply',
        post._id,
        text
      );
    }

    res.status(201).json({
      success: true,
      message: 'Reply added successfully',
      reply: newReply,
      repliesCount: comment.replies.length
    });
  } catch (error) {
    console.error('Add reply error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding reply'
    });
  }
};

/**
 * @desc    Delete comment
 * @route   DELETE /api/v1/posts/:id/comment/:commentId
 * @access  Private
 */
exports.deleteComment = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    const comment = post.comments.id(req.params.commentId);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    if (comment.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this comment'
      });
    }

    comment.deleteOne();
    await post.save();

    res.status(200).json({
      success: true,
      message: 'Comment deleted successfully',
      commentsCount: post.comments.length
    });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting comment'
    });
  }
};

/**
 * @desc    Share post (creates a new post on user's profile)
 * @route   POST /api/v1/posts/:id/share
 * @access  Private
 */
exports.sharePost = async (req, res) => {
  try {
    const { caption } = req.body; // Optional caption when sharing

    const originalPost = await Post.findById(req.params.id);

    if (!originalPost) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Check if user already shared this post
    const existingShare = await Post.findOne({
      author: req.user.id,
      sharedPost: originalPost._id
    });

    if (existingShare) {
      return res.status(400).json({
        success: false,
        message: 'You have already shared this post'
      });
    }

    // Increment share count on original post
    await originalPost.share(req.user.id);

    // Create a new post that references the original
    const sharedPost = await Post.create({
      author: req.user.id,
      type: 'text',
      sharedPost: originalPost._id,
      shareCaption: caption || '',
      status: 'published',
      visibility: 'public'
    });

    await sharedPost.populate([
      { path: 'author', select: 'firstName lastName profilePicture role rating' },
      {
        path: 'sharedPost',
        populate: {
          path: 'author',
          select: 'firstName lastName profilePicture role rating'
        }
      }
    ]);

    res.status(201).json({
      success: true,
      message: 'Post shared successfully',
      sharesCount: originalPost.sharesCount,
      sharedPost
    });
  } catch (error) {
    console.error('Share post error:', error);
    res.status(500).json({
      success: false,
      message: 'Error sharing post'
    });
  }
};

/**
 * @desc    Toggle bookmark on post
 * @route   POST /api/v1/posts/:id/bookmark
 * @access  Private
 */
exports.toggleBookmark = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    const isBookmarked = post.bookmarks.includes(req.user.id);

    if (isBookmarked) {
      await post.unbookmark(req.user.id);
    } else {
      await post.bookmark(req.user.id);
    }

    res.status(200).json({
      success: true,
      message: isBookmarked ? 'Bookmark removed' : 'Post bookmarked',
      bookmarked: !isBookmarked,
      bookmarksCount: post.bookmarksCount
    });
  } catch (error) {
    console.error('Toggle bookmark error:', error);
    res.status(500).json({
      success: false,
      message: 'Error toggling bookmark'
    });
  }
};

/**
 * @desc    Get bookmarked/saved posts
 * @route   GET /api/v1/posts/bookmarked
 * @access  Private
 */
exports.getBookmarkedPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Find all posts where the current user has bookmarked them
    const posts = await Post.find({
      bookmarks: req.user.id,
      status: 'published'
    })
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('author', 'firstName lastName profilePicture role rating')
      .populate({
        path: 'sharedPost',
        populate: {
          path: 'author',
          select: 'firstName lastName profilePicture role rating'
        }
      });

    const total = await Post.countDocuments({
      bookmarks: req.user.id,
      status: 'published'
    });

    const userId = req.user.id;
    const processedPosts = posts.map(post => {
      const postObj = post.toObject();
      postObj.isLiked = post.likes?.some(id => id.toString() === userId) || false;
      postObj.isBookmarked = true; // Always true for bookmarked posts
      postObj.likesCount = post.likes?.length || 0;
      postObj.commentsCount = post.comments?.length || 0;
      postObj.sharesCount = post.shares?.length || 0;
      return postObj;
    });

    res.status(200).json({
      success: true,
      posts: processedPosts,
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Get bookmarked posts error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching bookmarked posts'
    });
  }
};

/**
 * @desc    Like/Unlike comment
 * @route   POST /api/v1/posts/:id/comment/:commentId/like
 * @access  Private
 */
exports.toggleCommentLike = async (req, res) => {
  try {
    const { id: postId, commentId } = req.params;

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    const comment = post.comments.id(commentId);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    const isLiked = comment.likes.includes(req.user.id);

    if (isLiked) {
      comment.likes = comment.likes.filter(id => id.toString() !== req.user.id);
      comment.likesCount = comment.likes.length;
    } else {
      comment.likes.push(req.user.id);
      comment.likesCount = comment.likes.length;
    }

    await post.save();

    res.status(200).json({
      success: true,
      message: isLiked ? 'Comment unliked' : 'Comment liked',
      isLiked: !isLiked,
      likesCount: comment.likesCount
    });
  } catch (error) {
    console.error('Toggle comment like error:', error);
    res.status(500).json({
      success: false,
      message: 'Error toggling comment like'
    });
  }
};
