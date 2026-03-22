import { Link } from 'react-router-dom';
import { ArrowLeft, Target, Users, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Navbar, Footer } from '@/components/landing';
import { Seo } from '@/components/seo/Seo';
import { ROUTES } from '@/constants/routes';
import { requireSeoForPath } from '@/constants/seo';

const values = [
  {
    icon: Target,
    title: 'Built from Frustration',
    description:
      'One Assess was born from thousands of hours wasted on spreadsheets, PDFs, and disconnected tools. We built the platform we wished we had — one system for every assessment.',
  },
  {
    icon: Users,
    title: 'Coach-First Design',
    description:
      'Every feature exists because a working coach needed it. No academic bloat, no features-for-features-sake. If it doesn\'t make your session better, it doesn\'t make the cut.',
  },
  {
    icon: Heart,
    title: 'Retention, Not Just Reports',
    description:
      'Beautiful reports are table stakes. We engineer the entire client journey — from first assessment to retest reminder — so clients stay, improve, and refer.',
  },
];

const aboutSeo = requireSeoForPath(ROUTES.ABOUT);

export default function About() {
  return (
    <div className="min-h-screen bg-white">
      <Seo
        pathname={ROUTES.ABOUT}
        title={aboutSeo.title}
        description={aboutSeo.description}
        noindex={aboutSeo.noindex}
      />
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 py-16">
        <Button variant="ghost" asChild className="mb-8">
          <Link to="/">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
        </Button>

        <article className="max-w-none">
          <h1 className="text-4xl font-bold text-foreground mb-4">About One Assess</h1>
          <p className="text-lg text-foreground-secondary mb-12 max-w-2xl leading-relaxed">
            The all-in-one fitness assessment platform built by coaches, for coaches.
            Less admin, more coaching, better retention.
          </p>

          <section className="mb-16">
            <h2 className="text-2xl font-semibold text-foreground mb-4">Our Story</h2>
            <div className="space-y-4 text-foreground-secondary leading-relaxed">
              <p>
                One Assess started with a simple observation: the best coaches in the industry were
                spending more time on admin than on coaching. Paper forms, Excel templates, separate
                apps for posture, body comp, and movement — the "assessment stack" was broken.
              </p>
              <p>
                We set out to build a single platform that handles every phase of a fitness assessment —
                from guided intake and AI-assisted posture analysis to scored reports and automated
                retest scheduling. The result is a tool that saves coaches hours per week while
                delivering a client experience that drives retention.
              </p>
            </div>
          </section>

          <section className="mb-16">
            <h2 className="text-2xl font-semibold text-foreground mb-8">What We Believe</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {values.map((v) => (
                <div
                  key={v.title}
                  className="p-6 rounded-2xl border border-slate-200 bg-slate-50/50"
                >
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 mb-4">
                    <v.icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-slate-900 mb-2">{v.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{v.description}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-16">
            <h2 className="text-2xl font-semibold text-foreground mb-4">Our Commitment</h2>
            <div className="space-y-4 text-foreground-secondary leading-relaxed">
              <p>
                We take data security seriously. One Assess is built on enterprise-grade
                infrastructure with end-to-end encryption. We are committed to GDPR and HIPAA
                compliance standards because your clients' health data deserves the highest level
                of protection.
              </p>
              <p>
                Every assessment generated through our platform stays yours. We never sell, share,
                or use your client data for anything other than delivering the service you signed
                up for.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">Get in Touch</h2>
            <p className="text-foreground-secondary leading-relaxed">
              Questions, feedback, or partnership inquiries?{' '}
              <Link to="/contact" className="text-indigo-600 font-medium hover:underline">
                Reach out to our team
              </Link>
              .
            </p>
          </section>
        </article>
      </main>

      <Footer />
    </div>
  );
}
