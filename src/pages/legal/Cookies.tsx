import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Navbar, Footer } from '@/components/landing';
import { Seo } from '@/components/seo/Seo';
import { ROUTES } from '@/constants/routes';
import { requireSeoForPath } from '@/constants/seo';

const cookiesSeo = requireSeoForPath(ROUTES.COOKIES);

export default function Cookies() {
  return (
    <div className="min-h-screen bg-white">
      <Seo
        pathname={ROUTES.COOKIES}
        title={cookiesSeo.title}
        description={cookiesSeo.description}
        noindex={cookiesSeo.noindex}
      />
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 py-16">
        <Button variant="ghost" asChild className="mb-8">
          <Link to="/">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
        </Button>

        <article className="prose prose-slate max-w-none">
          <h1 className="text-4xl font-bold text-foreground mb-4">Cookie Policy</h1>

          <p className="text-sm text-foreground-secondary mb-8">
            Last updated:{' '}
            {new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">1. What Are Cookies</h2>
            <p className="text-foreground-secondary leading-relaxed mb-4">
              Cookies are small text files stored on your device when you visit a website. They help
              the website remember your preferences, keep you signed in, and understand how you
              interact with the service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              2. How One Assess Uses Cookies
            </h2>
            <p className="text-foreground-secondary leading-relaxed mb-4">
              We use cookies and similar technologies for the following purposes:
            </p>

            <h3 className="text-xl font-semibold text-foreground mb-3">
              2.1 Essential Cookies (Required)
            </h3>
            <p className="text-foreground-secondary leading-relaxed mb-4">
              These cookies are necessary for the Service to function. They enable core features
              such as authentication, session management, and security. You cannot opt out of
              essential cookies while using the Service.
            </p>
            <ul className="list-disc list-inside text-foreground-secondary space-y-2 mb-4 ml-4">
              <li>Authentication tokens (keeping you signed in)</li>
              <li>Session state (maintaining your active session)</li>
              <li>Security tokens (CSRF protection)</li>
            </ul>

            <h3 className="text-xl font-semibold text-foreground mb-3">
              2.2 Functional Cookies (Optional)
            </h3>
            <p className="text-foreground-secondary leading-relaxed mb-4">
              These cookies remember your preferences and settings to provide a more personalized
              experience.
            </p>
            <ul className="list-disc list-inside text-foreground-secondary space-y-2 mb-4 ml-4">
              <li>Theme preferences (light/dark mode)</li>
              <li>Dashboard layout preferences</li>
              <li>PWA install prompt dismissal</li>
            </ul>

            <h3 className="text-xl font-semibold text-foreground mb-3">
              2.3 Analytics Cookies (Optional)
            </h3>
            <p className="text-foreground-secondary leading-relaxed mb-4">
              These cookies help us understand how users interact with the Service so we can improve
              the experience. All analytics data is aggregated and anonymized.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              3. Managing Your Cookie Preferences
            </h2>
            <p className="text-foreground-secondary leading-relaxed mb-4">
              You can control and manage cookies through your browser settings. Most browsers allow
              you to:
            </p>
            <ul className="list-disc list-inside text-foreground-secondary space-y-2 mb-4 ml-4">
              <li>View what cookies are stored on your device</li>
              <li>Delete individual or all cookies</li>
              <li>Block cookies from specific or all websites</li>
              <li>Set preferences for first-party vs third-party cookies</li>
            </ul>
            <p className="text-foreground-secondary leading-relaxed">
              Please note that disabling essential cookies will prevent you from using the Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              4. Third-Party Cookies
            </h2>
            <p className="text-foreground-secondary leading-relaxed mb-4">
              We use a limited number of third-party services that may set their own cookies:
            </p>
            <ul className="list-disc list-inside text-foreground-secondary space-y-2 mb-4 ml-4">
              <li>
                <strong>Firebase (Google):</strong> Authentication and hosting
              </li>
              <li>
                <strong>Stripe:</strong> Payment processing (only during checkout)
              </li>
            </ul>
            <p className="text-foreground-secondary leading-relaxed">
              Each third-party provider has its own cookie and privacy policy. We recommend reviewing
              their respective policies for more information.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">5. Updates to This Policy</h2>
            <p className="text-foreground-secondary leading-relaxed mb-4">
              We may update this Cookie Policy from time to time. Material changes will be
              communicated through the Service or via email.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">6. Contact</h2>
            <p className="text-foreground-secondary leading-relaxed">
              If you have questions about our use of cookies, please contact us at{' '}
              <a href="mailto:privacy@one-assess.com" className="text-indigo-600 hover:underline">
                privacy@one-assess.com
              </a>
              .
            </p>
          </section>
        </article>
      </main>

      <Footer />
    </div>
  );
}
