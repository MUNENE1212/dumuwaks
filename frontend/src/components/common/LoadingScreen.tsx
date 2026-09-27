import React from 'react';

interface LoadingScreenProps {
  message?: string;
  fullScreen?: boolean;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = 'Loading...',
  fullScreen = true,
}) => {
  const containerClasses = fullScreen
    ? 'fixed inset-0 z-50 flex items-center justify-center bg-surface-100'
    : 'flex items-center justify-center p-8';

  return (
    <div className={containerClasses}>
      <div className="flex flex-col items-center space-y-6">
        {/* Logo with pulse animation */}
        <div className="relative">
          {/* Pulse rings */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-32 h-32 rounded-full border-4 border-primary-800 animate-ping opacity-20"></div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-28 h-28 rounded-full border-4 border-primary-700 animate-pulse opacity-30"></div>
          </div>

          {/* Logo */}
          <div className="relative z-10 w-24 h-24 flex items-center justify-center rounded-full bg-surface-200 shadow-xl">
            <img
              src="/images/logo-loading.png"
              alt="Dumuwaks"
              className="w-20 h-20 object-contain animate-pulse"
              onError={(e) => {
                // Fallback to JPG if PNG doesn't exist
                e.currentTarget.src = '/images/logo.jpg';
                e.currentTarget.style.width = '80px';
                e.currentTarget.style.height = '80px';
              }}
            />
          </div>
        </div>

        {/* Loading text */}
        <div className="text-center space-y-2">
          <p className="text-ink-muted text-sm">{message}</p>

          {/* Loading dots */}
          <div className="flex justify-center space-x-2 pt-2">
            <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
