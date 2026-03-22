import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation, type To } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { LandingTrialCtaLink } from '@/components/landing/LandingTrialCtaLink';
import { LANDING_GUEST_CHECKOUT_ENABLED } from '@/constants/platform';
import { landingTrialAriaLabel } from '@/constants/landingCopy';
import { ROUTES } from '@/constants/routes';

const NAV_LINKS = [
  { label: 'Features', hash: 'features' as const },
  { label: 'How it Works', hash: 'how-it-works' as const },
  { label: 'Pricing', hash: 'pricing' as const },
  { label: 'FAQ', hash: 'faq' as const },
];

const MOBILE_MENU_ID = 'landing-nav-mobile-panel';

/** In-app section targets — `pathname` is always home so /pricing visitors jump to the same sections. */
function marketingSectionTo(sectionId: string): To {
  return { pathname: ROUTES.HOME, hash: sectionId };
}

export function Navbar() {
  const { user } = useAuth();
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeHash, setActiveHash] = useState<string>('');
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const mobilePanelRef = useRef<HTMLDivElement>(null);
  const goesToPricing = LANDING_GUEST_CHECKOUT_ENABLED;

  const isMarketingPath =
    location.pathname === ROUTES.HOME || location.pathname === ROUTES.PRICING;

  useEffect(() => {
    const hash = location.hash.replace(/^#/, '');
    if (hash && NAV_LINKS.some((l) => l.hash === hash)) {
      setActiveHash(hash);
    }
  }, [location.hash]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!isMarketingPath) {
      setActiveHash('');
      return;
    }

    const elements = NAV_LINKS.map(({ hash }) => document.getElementById(hash)).filter(
      (el): el is HTMLElement => Boolean(el),
    );
    if (elements.length === 0) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target.id) {
          setActiveHash(visible[0].target.id);
        }
      },
      { rootMargin: '-40% 0px -45% 0px', threshold: [0, 0.1, 0.25, 0.5, 1] },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [isMarketingPath]);

  const closeMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
    menuButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!isMobileMenuOpen) return undefined;

    const panel = mobilePanelRef.current;
    if (!panel) return undefined;

    const selector =
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const getFocusables = () =>
      Array.from(panel.querySelectorAll<HTMLElement>(selector)).filter(
        (el) => el.offsetParent !== null || el.getClientRects().length > 0,
      );

    const focusables = getFocusables();
    focusables[0]?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeMobileMenu();
        return;
      }
      if (e.key !== 'Tab') return;

      const list = getFocusables();
      if (list.length === 0) return;

      const first = list[0];
      const last = list[list.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (e.shiftKey) {
        if (active === first || !panel.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isMobileMenuOpen, closeMobileMenu]);

  return (
    <nav
      className={`fixed top-0 w-full z-50 transition-all duration-200 ${
        isScrolled ? 'py-4' : 'py-6'
      }`}
      aria-label="Primary"
    >
      {isMarketingPath ? (
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-slate-900 focus:px-4 focus:py-2 focus:text-sm focus:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
        >
          Skip to main content
        </a>
      ) : null}
      <div className="max-w-7xl mx-auto px-6">
        <div
          className={`relative backdrop-blur-xl rounded-full px-6 py-3 flex items-center justify-between transition-all duration-200 ${
            isScrolled
              ? 'bg-white/80 border border-white/40 shadow-lg shadow-black/5'
              : 'bg-white/50 border border-white/20'
          }`}
        >
          <Link to={ROUTES.HOME} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
              OA
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900">One Assess</span>
          </Link>

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            {NAV_LINKS.map((link) => {
              const isActive = activeHash === link.hash;
              return (
                <Link
                  key={link.label}
                  to={marketingSectionTo(link.hash)}
                  className={`transition-colors hover:text-slate-900 ${
                    isActive ? 'text-slate-900 font-semibold' : ''
                  }`}
                  aria-current={isActive ? 'true' : undefined}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <Link
                to={ROUTES.DASHBOARD}
                className="bg-slate-900 text-white px-5 py-2 rounded-full text-sm font-semibold hover:bg-slate-800 transition-all shadow-md hover:shadow-lg active:scale-95"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  to={ROUTES.LOGIN}
                  className="text-sm font-medium text-slate-900 hover:text-slate-600 transition-colors"
                >
                  Log in
                </Link>
                <LandingTrialCtaLink
                  className="bg-slate-900 text-white px-5 py-2 rounded-full text-sm font-semibold hover:bg-slate-800 transition-all shadow-md hover:shadow-lg active:scale-95"
                  ariaLabel={landingTrialAriaLabel('nav', goesToPricing)}
                >
                  Start Free Trial
                </LandingTrialCtaLink>
              </>
            )}
          </div>

          <button
            ref={menuButtonRef}
            type="button"
            className="md:hidden text-slate-900"
            onClick={() => setIsMobileMenuOpen((o) => !o)}
            aria-label="Toggle menu"
            aria-expanded={isMobileMenuOpen}
            aria-controls={MOBILE_MENU_ID}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {isMobileMenuOpen ? (
        <div
          ref={mobilePanelRef}
          id={MOBILE_MENU_ID}
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation"
          className="absolute top-24 left-4 right-4 p-6 rounded-3xl bg-white/90 backdrop-blur-2xl border border-white/40 shadow-2xl md:hidden animate-fade-in-up"
        >
          <div className="flex flex-col gap-6 text-center">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.label}
                to={marketingSectionTo(link.hash)}
                className="text-slate-600 font-medium hover:text-slate-900"
                onClick={closeMobileMenu}
              >
                {link.label}
              </Link>
            ))}
            <div className="h-px bg-slate-200 w-full" />
            {user ? (
              <Link
                to={ROUTES.DASHBOARD}
                className="bg-slate-900 text-white py-3.5 rounded-xl font-semibold w-full shadow-lg"
                onClick={closeMobileMenu}
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  to={ROUTES.LOGIN}
                  className="text-slate-900 font-semibold"
                  onClick={closeMobileMenu}
                >
                  Log in
                </Link>
                <LandingTrialCtaLink
                  className="bg-slate-900 text-white py-3.5 rounded-xl font-semibold w-full shadow-lg"
                  onNavigate={closeMobileMenu}
                  ariaLabel={landingTrialAriaLabel('mobileNav', goesToPricing)}
                >
                  Start Free Trial
                </LandingTrialCtaLink>
              </>
            )}
          </div>
        </div>
      ) : null}
    </nav>
  );
}
