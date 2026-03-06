import React, { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getGradient, type GradientId } from '@/lib/design/gradients';

/**
 * ThemeManager
 * Applies the organization's gradient selection to CSS variables
 * so Tailwind and components can use it dynamically.
 * 
 * Organizations can select from predefined gradients that work
 * cohesively with Apple's neutral color palette.
 * 
 * Sets:
 * - --gradient-from, --gradient-to (HSL values)
 * - --gradient-from-hex, --gradient-to-hex (for SVG/CSS)
 * - --gradient-light, --gradient-medium, --gradient-dark (tints)
 * - --primary, --ring (uses gradient-from)
 */
export const ThemeManager: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { orgSettings } = useAuth();

  useEffect(() => {
    const root = document.documentElement;
    // Only apply org gradient when custom branding is enabled; otherwise use One Assess default.
    const useOrgGradient = orgSettings?.customBrandingEnabled === true;
    const gradientId = (useOrgGradient ? (orgSettings?.gradientId || 'purple-indigo') : 'purple-indigo') as GradientId;
    const gradient = getGradient(gradientId);
    
    // Convert hex colors to HSL for CSS variables
    const hexToHsl = (hex: string): string => {
      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const b = parseInt(hex.slice(5, 7), 16) / 255;

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      let h = 0;
      let s = 0;
      const l = (max + min) / 2;

      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
          case g: h = ((b - r) / d + 2) / 6; break;
          case b: h = ((r - g) / d + 4) / 6; break;
        }
      }

      return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
    };
    
    // Set gradient CSS variables
    root.style.setProperty('--gradient-from', hexToHsl(gradient.fromHex));
    root.style.setProperty('--gradient-to', hexToHsl(gradient.toHex));
    root.style.setProperty('--gradient-from-hex', gradient.fromHex);
    root.style.setProperty('--gradient-to-hex', gradient.toHex);
    
    // Set primary color to gradient-from
    root.style.setProperty('--primary', hexToHsl(gradient.fromHex));
    root.style.setProperty('--ring', hexToHsl(gradient.fromHex));
    root.style.setProperty('--sidebar-primary', hexToHsl(gradient.fromHex));
    root.style.setProperty('--sidebar-ring', hexToHsl(gradient.fromHex));
    
    // Set gradient tints (light, medium, dark)
    // These are approximate - we'll use Tailwind classes for exact values
    const fromHsl = hexToHsl(gradient.fromHex).split(' ');
    const lightHsl = `${fromHsl[0]} ${Math.max(30, parseInt(fromHsl[1]) - 20)}% 97%`;
    const mediumHsl = `${fromHsl[0]} ${Math.max(30, parseInt(fromHsl[1]) - 20)}% 94%`;
    const darkHsl = `${fromHsl[0]} ${fromHsl[1]} 51%`;
    
    root.style.setProperty('--gradient-light', lightHsl);
    root.style.setProperty('--gradient-medium', mediumHsl);
    root.style.setProperty('--gradient-dark', darkHsl);
    
    // Store original hex for any direct use
    root.style.setProperty('--brand-primary', gradient.fromHex);
    
  }, [orgSettings?.gradientId, orgSettings?.customBrandingEnabled]);

  return <>{children}</>;
};
