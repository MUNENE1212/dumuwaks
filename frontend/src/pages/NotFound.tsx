import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui';

const NotFound: React.FC = () => {
  return (
    <div className="flex items-start justify-center py-6 sm:py-14 bg-surface-100 px-4 py-12">
      <div className="text-center">
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-primary-600">404</h1>
          <div className="mt-4">
            <h2 className="text-3xl font-semibold text-ink">
              Page Not Found
            </h2>
            <p className="mt-2 text-lg text-ink-muted">
              Sorry, Dumuwaks couldn't find the page you're looking for.
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center space-y-3 sm:flex-row sm:space-x-4 sm:space-y-0">
          <Link to="/">
            <Button variant="primary" size="lg" className="flex items-center">
              <Home className="mr-2 h-5 w-5" />
              Go Home
            </Button>
          </Link>
          <Button
            variant="outline"
            size="lg"
            onClick={() => window.history.back()}
            className="flex items-center"
          >
            <ArrowLeft className="mr-2 h-5 w-5" />
            Go Back
          </Button>
        </div>

        <div className="mt-8">
          <p className="text-sm text-ink-muted">
            Need help?{' '}
            <Link to="/support" className="text-primary-600 hover:text-primary-700">
              Contact Dumuwaks support
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
