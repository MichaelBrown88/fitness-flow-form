import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Navbar, Footer } from '@/components/landing';

export default function Contact() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const email = data.get('email') as string;
    const subject = data.get('subject') as string;
    const message = data.get('message') as string;

    window.location.href = `mailto:support@one-assess.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(`From: ${email}\n\n${message}`)}`;
    setSubmitted(true);
  };

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

        <div className="grid md:grid-cols-2 gap-16">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-4">Contact Us</h1>
            <p className="text-foreground-secondary leading-relaxed mb-8">
              Have a question about One Assess? Want to discuss enterprise pricing or a custom
              integration? We'd love to hear from you.
            </p>

            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 mb-1">Email</h3>
                  <a
                    href="mailto:support@one-assess.com"
                    className="text-sm text-indigo-600 hover:underline"
                  >
                    support@one-assess.com
                  </a>
                </div>
              </div>
            </div>

            <div className="mt-10 p-6 rounded-2xl bg-slate-50 border border-slate-200">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-2">
                Response Time
              </p>
              <p className="text-sm text-slate-600 leading-relaxed">
                We typically respond within one business day. For urgent issues,
                include "URGENT" in your subject line.
              </p>
            </div>
          </div>

          <div>
            {submitted ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-8 rounded-2xl border border-emerald-200 bg-emerald-50">
                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mb-4">
                  <Send className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 mb-2">Message Ready</h3>
                <p className="text-sm text-slate-500">
                  Your email client should have opened with the message pre-filled.
                  If it didn't, email us directly at{' '}
                  <a href="mailto:support@one-assess.com" className="text-indigo-600 hover:underline">
                    support@one-assess.com
                  </a>
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email">Your Email</Label>
                  <Input id="email" name="email" type="email" required placeholder="you@example.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input id="subject" name="subject" required placeholder="How can we help?" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <textarea
                    id="message"
                    name="message"
                    required
                    rows={6}
                    placeholder="Tell us what you need..."
                    className="flex w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                  />
                </div>
                <Button type="submit" className="w-full h-12 bg-slate-900 text-white hover:bg-slate-800">
                  Send Message
                </Button>
              </form>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
