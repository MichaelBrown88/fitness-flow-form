import { Link } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const NotFound = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="text-center max-w-md">
        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 mb-3">
          Page not found
        </p>
        <h1 className="text-6xl font-bold text-slate-900 mb-4">404</h1>
        <p className="text-base text-slate-500 mb-10 leading-relaxed">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button asChild className="h-11 px-6 rounded-xl font-bold">
            <Link to={ROUTES.DASHBOARD}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-11 px-6 rounded-xl font-bold">
            <Link to={ROUTES.ASSESSMENT}>
              Start New Assessment
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
