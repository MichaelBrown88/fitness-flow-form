import { Link } from 'react-router-dom';
import { ArrowLeft, Rss } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Navbar, Footer } from '@/components/landing';
import { Seo } from '@/components/seo/Seo';
import { ROUTES } from '@/constants/routes';
import { SEO_NOINDEX_BLOG } from '@/constants/seo';

export default function Blog() {
  return (
    <div className="min-h-screen bg-background">
      <Seo
        pathname={ROUTES.BLOG}
        title={SEO_NOINDEX_BLOG.title}
        description={SEO_NOINDEX_BLOG.description}
        noindex
      />
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
          <p className="text-sm text-muted-foreground">
            Coming soon. In the meantime,{' '}
            <Link to={ROUTES.SIGNUP} className="text-indigo-600 font-medium hover:underline">
              create your account
            </Link>{' '}
            to experience One Assess firsthand.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
