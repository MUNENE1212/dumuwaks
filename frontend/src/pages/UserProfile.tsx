import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchUserProfile,
  fetchUserPosts,
  toggleFollow,
  clearProfile,
} from '@/store/slices/userSlice';
import { MapPin, Calendar, Briefcase, Star, Users, FileText, UserPlus, UserMinus } from 'lucide-react';
import { Button } from '@/components/ui';
import PostCard from '@/components/social/PostCard';
import toast from 'react-hot-toast';
import { formatRating, getRatingCount } from '@/utils/rating';

const UserProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const { user: currentUser } = useAppSelector((state) => state.auth);
  const { currentProfile, profilePosts, loading } = useAppSelector((state) => state.user);
  const [isFollowing, setIsFollowing] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'portfolio'>('posts');

  const isOwnProfile = currentUser?._id === id;

  useEffect(() => {
    if (id) {
      dispatch(fetchUserProfile(id));
      dispatch(fetchUserPosts(id));
    }

    return () => {
      dispatch(clearProfile());
    };
  }, [dispatch, id]);

  useEffect(() => {
    // Check if current user is following this profile
    if (currentUser && currentProfile) {
      const following = (currentUser as any).following || [];
      setIsFollowing(following.includes(currentProfile._id));
    }
  }, [currentUser, currentProfile]);

  const handleFollowToggle = async () => {
    if (!id) return;

    const result = await dispatch(toggleFollow(id));
    if (toggleFollow.fulfilled.match(result)) {
      setIsFollowing(result.payload.isFollowing);
      toast.success(
        result.payload.isFollowing ? 'Following user' : 'Unfollowed user'
      );
    } else {
      toast.error('Failed to update follow status');
    }
  };

  const getProfilePicture = () => {
    if (!currentProfile) return '';
    return (
      currentProfile.profilePicture ||
      `https://ui-avatars.com/api/?name=${currentProfile.firstName}+${currentProfile.lastName}&background=random`
    );
  };

  if (loading && !currentProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-ink-muted">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!currentProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-ink">User not found</h2>
          <p className="mt-2 text-ink-muted">The profile you're looking for doesn't exist.</p>
          <Link to="/dashboard">
            <Button className="mt-4">Go to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  const portfolioPosts = profilePosts.filter((post) => post.type === 'portfolio');

  return (
    <div className="min-h-screen bg-surface-100 py-8">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Profile Header */}
        <div className="rounded-lg bg-surface-200 p-8 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-start md:space-x-6">
            {/* Profile Picture */}
            <img
              src={getProfilePicture()}
              alt={`${currentProfile.firstName} ${currentProfile.lastName}`}
              className="h-32 w-32 rounded-full object-cover ring-4 ring-line"
            />

            {/* Profile Info */}
            <div className="mt-4 flex-1 md:mt-0">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-ink">
                    {currentProfile.firstName} {currentProfile.lastName}
                  </h1>
                  <p className="mt-1 text-lg capitalize text-ink-muted">
                    {currentProfile.role}
                  </p>
                </div>

                {/* Action Buttons */}
                {!isOwnProfile && currentUser && (
                  <div className="mt-4 md:mt-0">
                    <Button
                      onClick={handleFollowToggle}
                      variant={isFollowing ? 'outline' : 'primary'}
                      className="w-full md:w-auto"
                    >
                      {isFollowing ? (
                        <>
                          <UserMinus className="mr-2 h-4 w-4" />
                          Unfollow
                        </>
                      ) : (
                        <>
                          <UserPlus className="mr-2 h-4 w-4" />
                          Follow
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {isOwnProfile && (
                  <Link to="/settings">
                    <Button variant="outline">Edit Profile</Button>
                  </Link>
                )}
              </div>

              {/* Bio */}
              {currentProfile.bio && (
                <p className="mt-4 text-ink-muted">{currentProfile.bio}</p>
              )}

              {/* Stats */}
              <div className="mt-6 flex flex-wrap gap-6">
                <div className="flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-ink-muted" />
                  <span className="text-ink-muted">
                    <strong>{currentProfile.postsCount || 0}</strong> Posts
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-ink-muted" />
                  <span className="text-ink-muted">
                    <strong>{currentProfile.followersCount || 0}</strong> Followers
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-ink-muted" />
                  <span className="text-ink-muted">
                    <strong>{currentProfile.followingCount || 0}</strong> Following
                  </span>
                </div>
                {currentProfile.rating && currentProfile.rating.count > 0 && (
                  <div className="flex items-center space-x-2">
                    <Star className="h-5 w-5 text-yellow-500" />
                    <span className="text-ink-muted">
                      <strong>{formatRating(currentProfile.rating)}</strong> (
                      {getRatingCount(currentProfile.rating)} reviews)
                    </span>
                  </div>
                )}
              </div>

              {/* Additional Info */}
              <div className="mt-4 flex flex-wrap gap-4 text-sm text-ink-muted">
                {currentProfile.location?.city && (
                  <div className="flex items-center space-x-1">
                    <MapPin className="h-4 w-4" />
                    <span>
                      {currentProfile.location.city}
                      {currentProfile.location.county &&
                        `, ${currentProfile.location.county}`}
                    </span>
                  </div>
                )}
                <div className="flex items-center space-x-1">
                  <Calendar className="h-4 w-4" />
                  <span>
                    Joined {new Date(currentProfile.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Technician-specific info */}
              {currentProfile.role === 'technician' && currentProfile.skills && (
                <div className="mt-4">
                  <h3 className="font-semibold text-ink">Skills</h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {currentProfile.skills.slice(0, 5).map((skill: any, index: number) => (
                      <span
                        key={index}
                        className="rounded-full bg-primary-100 px-3 py-1 text-sm text-primary-700"
                      >
                        {skill.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-6 border-b border-line bg-surface-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('posts')}
              className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
                activeTab === 'posts'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-ink-muted hover:border-line-strong hover:text-ink'
              }`}
            >
              All Posts ({profilePosts.length})
            </button>
            {currentProfile.role === 'technician' && (
              <button
                onClick={() => setActiveTab('portfolio')}
                className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
                  activeTab === 'portfolio'
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-ink-muted hover:border-line-strong hover:text-ink'
                }`}
              >
                Portfolio ({portfolioPosts.length})
              </button>
            )}
          </nav>
        </div>

        {/* Posts Grid */}
        <div className="mt-6 space-y-6">
          {activeTab === 'posts' && (
            <>
              {profilePosts.length > 0 ? (
                profilePosts.map((post) => <PostCard key={post._id} post={post} />)
              ) : (
                <div className="rounded-lg bg-surface-200 p-8 text-center">
                  <FileText className="mx-auto h-12 w-12 text-ink-muted" />
                  <p className="mt-2 text-ink-muted">No posts yet</p>
                </div>
              )}
            </>
          )}

          {activeTab === 'portfolio' && (
            <>
              {portfolioPosts.length > 0 ? (
                portfolioPosts.map((post) => <PostCard key={post._id} post={post} />)
              ) : (
                <div className="rounded-lg bg-surface-200 p-8 text-center">
                  <Briefcase className="mx-auto h-12 w-12 text-ink-muted" />
                  <p className="mt-2 text-ink-muted">No portfolio items yet</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
