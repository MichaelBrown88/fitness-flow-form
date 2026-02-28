import { Link } from 'react-router-dom';
import { ArrowLeft, Rss } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Navbar, Footer } from '@/components/landing';

export default function Blog() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 py-16">
        <Button variant="ghost" asChild className="mb-8">
          <Link to="/">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
        </Button>

        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600 mx-auto mb-6">
            <Rss className="w-7 h-7" />
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-4">Blog</h1>
          <p className="text-lg text-foreground-secondary mb-8 max-w-md mx-auto leading-relaxed">
            We're working on articles about fitness assessment best practices,
            client retention strategies, and product updates.
          </p>
          <p className="text-sm text-slate-400">
            Coming soon. In the meantime,{' '}
            <Link to="/onboarding" className="text-indigo-600 font-medium hover:underline">
              start your free trial
            </Link>{' '}
            to experience One Assess firsthand.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
