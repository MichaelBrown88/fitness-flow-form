import { Link } from 'react-router-dom';
import { LANDING_COPY } from '@/constants/landingCopy';

export function Footer() {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    product: [
      { label: 'Features', to: '/#features' },
      { label: 'Pricing', to: '/#pricing' },
      { label: 'FAQ', to: '/#faq' },
    ],
    company: [
      { label: 'About', href: '/about' },
      { label: 'Contact', href: '/contact' },
      { label: 'Blog', href: '/blog' },
    ],
    legal: [
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Service', href: '/terms' },
      { label: 'Cookie Policy', href: '/cookies' },
    ],
  };

  return (
    <footer className="border-t border-border bg-background px-6 py-16">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-gradient-from to-gradient-to text-sm font-bold text-primary-foreground shadow-md">
                OA
              </div>
              <span className="text-lg font-bold tracking-tight text-foreground">
                One Assess
              </span>
            </Link>
            <p className="text-sm leading-relaxed text-muted-foreground">
              The all-in-one fitness assessment platform. 
              Less admin, more coaching, better results.
            </p>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="mb-6 font-bold text-foreground">Product</h4>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.to}
                    className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="mb-6 font-bold text-foreground">Company</h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.label}>
                  <Link 
                    to={link.href}
                    className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="mb-6 font-bold text-foreground">Legal</h4>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.label}>
                  <Link 
                    to={link.href}
                    className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            
            {/* Compliance Badges */}
            <div className="mt-6 border-t border-border pt-6">
              <p className="mb-3 text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">
                Compliance
              </p>
              <div className="flex flex-col gap-3">
                {/* HIPAA Badge */}
                <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 p-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded bg-blue-600 text-xs font-bold text-white">
                    HIPAA
                  </div>
                  <span className="text-xs font-semibold text-foreground">Compliant</span>
                </div>
                
                {/* GDPR Badge */}
                <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 p-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded bg-primary text-xs font-bold text-primary-foreground">
                    GDPR
                  </div>
                  <span className="text-xs font-semibold text-foreground">Compliant</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between border-t border-border pt-8 md:flex-row">
          <div className="flex items-center gap-4">
            <p className="text-sm font-medium text-muted-foreground">
              © {currentYear} One Assess. All rights reserved.
            </p>
            {/* Subtle platform admin link - barely noticeable */}
            <Link
              to="/admin/login"
              className="text-[10px] text-muted-foreground transition-colors hover:text-foreground"
              aria-label={LANDING_COPY.footerAdminLinkAriaLabel}
            >
              ·
            </Link>
          </div>
          <div className="flex gap-6 mt-4 md:mt-0">
            <a
              href="mailto:support@one-assess.com"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              support@one-assess.com
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

