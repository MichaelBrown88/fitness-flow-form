import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { LandingTrialCtaLink } from '@/components/landing/LandingTrialCtaLink';

export function Navbar() {
  const { user } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Features', href: '#features' },
    { label: 'How it Works', href: '#how-it-works' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'FAQ', href: '#faq' },
  ];

  return (
    <nav 
      className={`fixed top-0 w-full z-50 transition-all duration-200 ${
        isScrolled ? 'py-4' : 'py-6'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6">
        <div 
          className={`relative backdrop-blur-xl rounded-full px-6 py-3 flex items-center justify-between transition-all duration-200 ${
            isScrolled 
              ? 'bg-white/80 border border-white/40 shadow-lg shadow-black/5' 
              : 'bg-white/50 border border-white/20'
          }`}
        >
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
              OA
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900">One Assess</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="hover:text-slate-900 transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <Link 
                to="/dashboard"
                className="bg-slate-900 text-white px-5 py-2 rounded-full text-sm font-semibold hover:bg-slate-800 transition-all shadow-md hover:shadow-lg active:scale-95"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link 
                  to="/login"
                  className="text-sm font-medium text-slate-900 hover:text-slate-600 transition-colors"
                >
                  Log in
                </Link>
                <LandingTrialCtaLink className="bg-slate-900 text-white px-5 py-2 rounded-full text-sm font-semibold hover:bg-slate-800 transition-all shadow-md hover:shadow-lg active:scale-95">
                  Start Free Trial
                </LandingTrialCtaLink>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden text-slate-900"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMobileMenuOpen && (
        <div className="absolute top-24 left-4 right-4 p-6 rounded-3xl bg-white/90 backdrop-blur-2xl border border-white/40 shadow-2xl md:hidden animate-fade-in-up">
          <div className="flex flex-col gap-6 text-center">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-slate-600 font-medium hover:text-slate-900"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <div className="h-px bg-slate-200 w-full"></div>
            {user ? (
              <Link 
                to="/dashboard"
                className="bg-slate-900 text-white py-3.5 rounded-xl font-semibold w-full shadow-lg"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link 
                  to="/login"
                  className="text-slate-900 font-semibold"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Log in
                </Link>
                <LandingTrialCtaLink
                  className="bg-slate-900 text-white py-3.5 rounded-xl font-semibold w-full shadow-lg"
                  onNavigate={() => setIsMobileMenuOpen(false)}
                >
                  Start Free Trial
                </LandingTrialCtaLink>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

