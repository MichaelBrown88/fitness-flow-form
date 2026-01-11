import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { logger } from '@/lib/utils/logger';

/**
 * Sign Out page - Forces sign out and clears all local storage
 * Useful for escaping stuck auth states
 */
export default function SignOut() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const performSignOut = async () => {
      try {
        // Sign out from Firebase
        await signOut();
        
        // Clear all browser storage
        localStorage.clear();
        sessionStorage.clear();
        
        // Clear IndexedDB
        if ('indexedDB' in window && indexedDB.databases) {
          try {
            const databases = await indexedDB.databases();
            databases.forEach(db => {
              if (db.name && (db.name.includes('firebase') || db.name.includes('firestore'))) {
                indexedDB.deleteDatabase(db.name);
              }
            });
          } catch (err) {
            logger.warn('Failed to clear IndexedDB:', err);
          }
        }
        
        logger.info('Signed out and cleared all local storage');
        
        // Redirect to landing page
        navigate('/', { replace: true });
      } catch (error) {
        logger.error('Error during sign out:', error);
        // Even if sign out fails, clear storage and redirect
        localStorage.clear();
        sessionStorage.clear();
        navigate('/', { replace: true });
      }
    };

    void performSignOut();
  }, [signOut, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-600">Signing out...</p>
      </div>
    </div>
  );
}
