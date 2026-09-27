import React, { useEffect, useState } from 'react';
import { TrendingUp, Users, Lightbulb, HelpCircle, Briefcase, Sparkles } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchFeed } from '@/store/slices/postSlice';
import CreatePost from './CreatePost';
import PostCard from './PostCard';
import Loading from '../ui/Loading';
import { cn } from '@/lib/utils';

type FeedFilter = 'all' | 'following' | 'question' | 'tip' | 'portfolio';

const Feed: React.FC = () => {
  const dispatch = useAppDispatch();
  const { posts, isLoading, pagination } = useAppSelector((state) => state.posts);
  const { user } = useAppSelector((state) => state.auth);

  const [activeFilter, setActiveFilter] = useState<FeedFilter>('all');

  const filters = [
    { value: 'all', label: 'For You', icon: Sparkles, color: 'text-purple-600' },
    { value: 'following', label: 'Following', icon: Users, color: 'text-blue-600' },
    { value: 'question', label: 'Questions', icon: HelpCircle, color: 'text-pink-600' },
    { value: 'tip', label: 'Tips', icon: Lightbulb, color: 'text-yellow-600' },
    { value: 'portfolio', label: 'Portfolio', icon: Briefcase, color: 'text-green-600' },
  ];

  useEffect(() => {
    const type = activeFilter === 'all' || activeFilter === 'following' ? undefined : activeFilter;
    dispatch(fetchFeed({ page: 1, limit: 20, type }));
  }, [dispatch, activeFilter]);

  const handleFilterChange = (filter: FeedFilter) => {
    setActiveFilter(filter);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4 ">
      {/* Create Post */}
      <CreatePost />

      {/* Filters */}
      <div className="rounded-lg border border-line bg-surface-200 p-2 shadow-sm">
        <div className="flex space-x-1 overflow-x-auto">
          {filters.map((filter) => {
            const Icon = filter.icon;
            return (
              <button
                key={filter.value}
                onClick={() => handleFilterChange(filter.value as FeedFilter)}
                className={cn(
                  'flex flex-1 items-center justify-center space-x-2 whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium transition-all',
                  activeFilter === filter.value
                    ? 'bg-primary-50 text-primary-700 shadow-sm'
                    : 'text-ink-muted hover:bg-surface-100'
                )}
              >
                <Icon className={cn('h-4 w-4', activeFilter === filter.value && filter.color)} />
                <span className="hidden sm:inline">{filter.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Posts Feed */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loading size="lg" text="Loading your feed..." />
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-lg border border-line bg-surface-200 p-12 text-center shadow-sm">
          <div className="mx-auto max-w-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface-300">
              <TrendingUp className="h-8 w-8 text-ink-muted" />
            </div>
            <h3 className="text-lg font-semibold text-ink">No posts yet</h3>
            <p className="mt-2 text-sm text-ink-muted">
              {activeFilter === 'following'
                ? "Follow other users to see their posts here, or switch to 'For You' to see all public posts."
                : "Be the first to share something! Create a post to get started."}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard key={post._id} post={post} />
          ))}

          {/* Load More */}
          {pagination.page < pagination.pages && (
            <div className="flex justify-center py-4">
              <button
                onClick={() => {
                  const type = activeFilter === 'all' || activeFilter === 'following' ? undefined : activeFilter;
                  dispatch(fetchFeed({ page: pagination.page + 1, limit: 20, type }));
                }}
                className="rounded-lg border border-line bg-surface-200 px-6 py-2.5 text-sm font-medium text-ink-muted shadow-sm transition-colors hover:bg-surface-100 bg-surface-100"
              >
                Load More
              </button>
            </div>
          )}
        </div>
      )}

      {/* Trending Sidebar (Desktop) - Can be added later */}
    </div>
  );
};

export default Feed;
