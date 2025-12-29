import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

/**
 * ThemeManager
 * Applies the organization's brand color to CSS variables
 * so Tailwind and components can use it dynamically.
 * 
 * This converts the hex brand color to HSL and sets:
 * - --primary (main brand color in HSL)
 * - --ring (focus ring color)
 * - --brand-light (light tint for backgrounds)
 */
export const ThemeManager: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { orgSettings } = useAuth();

  useEffect(() => {
    const brandColor = orgSettings?.brandColor || '#03dee2';
    const root = document.documentElement;
    
    // Convert hex to HSL
    const hexToHsl = (hex: string): { h: number; s: number; l: number } | null => {
      // Remove # if present
      hex = hex.replace('#', '');
      
      // Handle shorthand (#RGB)
      if (hex.length === 3) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
      }
      
      const r = parseInt(hex.substring(0, 2), 16) / 255;
      const g = parseInt(hex.substring(2, 4), 16) / 255;
      const b = parseInt(hex.substring(4, 6), 16) / 255;
      
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      let h = 0;
      let s = 0;
      const l = (max + min) / 2;
      
      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        
        switch (max) {
          case r:
            h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
            break;
          case g:
            h = ((b - r) / d + 2) / 6;
            break;
          case b:
            h = ((r - g) / d + 4) / 6;
            break;
        }
      }
      
      return {
        h: Math.round(h * 360),
        s: Math.round(s * 100),
        l: Math.round(l * 100)
      };
    };
    
    const hsl = hexToHsl(brandColor);
    if (hsl) {
      // Set the primary color in HSL format (what Tailwind expects)
      const hslValue = `${hsl.h} ${hsl.s}% ${hsl.l}%`;
      root.style.setProperty('--primary', hslValue);
      root.style.setProperty('--ring', hslValue);
      root.style.setProperty('--sidebar-primary', hslValue);
      root.style.setProperty('--sidebar-ring', hslValue);
      
      // Create a light tint for backgrounds (increase lightness significantly)
      const lightL = Math.min(95, hsl.l + 40);
      const lightHsl = `${hsl.h} ${Math.max(30, hsl.s - 20)}% ${lightL}%`;
      root.style.setProperty('--brand-light', lightHsl);
      
      // Store original hex for any direct use
      root.style.setProperty('--brand-primary', brandColor);
    }
    
  }, [orgSettings?.brandColor]);

  return <>{children}</>;
};
