import React from 'react';
import { Link } from 'react-router-dom';
import { Home, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui';

interface ErrorPageProps {
  error?: string;
  statusCode?: number;
}

const ErrorPage: React.FC<ErrorPageProps> = ({
  error = 'Something went wrong',
  statusCode = 500
}) => {
  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-100 px-4 py-12">
      <div className="text-center">
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-red-600">{statusCode}</h1>
          <div className="mt-4">
            <h2 className="text-3xl font-semibold text-ink">
              {statusCode === 500 ? 'Server Error' : 'Error'}
            </h2>
            <p className="mt-2 text-lg text-ink-muted">
              {error}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center space-y-3 sm:flex-row sm:space-x-4 sm:space-y-0">
          <Button
            variant="primary"
            size="lg"
            onClick={handleRefresh}
            className="flex items-center"
          >
            <RefreshCw className="mr-2 h-5 w-5" />
            Try Again
          </Button>
          <Link to="/">
            <Button variant="outline" size="lg" className="flex items-center">
              <Home className="mr-2 h-5 w-5" />
              Go Home
            </Button>
          </Link>
        </div>

        <div className="mt-8">
          <p className="text-sm text-ink-muted">
            If this problem persists, please{' '}
            <Link to="/support" className="text-primary-600 hover:text-primary-700">
              contact Dumuwaks support
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ErrorPage;
