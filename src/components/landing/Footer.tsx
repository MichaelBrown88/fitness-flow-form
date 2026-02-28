import { Link } from 'react-router-dom';

export function Footer() {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    product: [
      { label: 'Features', href: '#features' },
      { label: 'Pricing', href: '#pricing' },
      { label: 'FAQ', href: '#faq' },
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
    <footer className="py-16 px-6 border-t border-slate-200 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                OA
              </div>
              <span className="text-lg font-bold tracking-tight text-slate-900">One Assess</span>
            </Link>
            <p className="text-slate-400 text-sm leading-relaxed">
              The all-in-one fitness assessment platform. 
              Less admin, more coaching, better results.
            </p>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="text-slate-900 font-bold mb-6">Product</h4>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.label}>
                  <a 
                    href={link.href}
                    className="text-slate-500 hover:text-indigo-600 transition-colors text-sm font-medium"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="text-slate-900 font-bold mb-6">Company</h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.label}>
                  <Link 
                    to={link.href}
                    className="text-slate-500 hover:text-indigo-600 transition-colors text-sm font-medium"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="text-slate-900 font-bold mb-6">Legal</h4>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.label}>
                  <Link 
                    to={link.href}
                    className="text-slate-500 hover:text-indigo-600 transition-colors text-sm font-medium"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            
            {/* Compliance Badges */}
            <div className="mt-6 pt-6 border-t border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-3">Compliance</p>
              <div className="flex flex-col gap-3">
                {/* HIPAA Badge */}
                <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center text-white text-xs font-bold">HIPAA</div>
                  <span className="text-xs font-semibold text-slate-700">Compliant</span>
                </div>
                
                {/* GDPR Badge */}
                <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="w-8 h-8 rounded bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">GDPR</div>
                  <span className="text-xs font-semibold text-slate-700">Compliant</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center pt-8 border-t border-slate-100">
          <div className="flex items-center gap-4">
            <p className="text-slate-400 text-sm font-medium">© {currentYear} One Assess. All rights reserved.</p>
            {/* Subtle platform admin link - barely noticeable */}
            <Link 
              to="/admin/login" 
              className="text-slate-700 hover:text-slate-500 text-[10px] transition-colors"
            >
              ·
            </Link>
          </div>
          <div className="flex gap-6 mt-4 md:mt-0">
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-slate-900 transition-colors">
              Twitter
            </a>
            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-slate-900 transition-colors">
              LinkedIn
            </a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-slate-900 transition-colors">
              Instagram
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

