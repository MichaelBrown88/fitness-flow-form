import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

/**
 * ThemeManager
 * Applies the organization's brand color to CSS variables
 * so Tailwind and components can use it dynamically.
 */
export const ThemeManager: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { orgSettings } = useAuth();

  useEffect(() => {
    if (orgSettings?.brandColor) {
      const root = document.documentElement;
      const color = orgSettings.brandColor;
      
      // Inject primary color variable
      root.style.setProperty('--brand-primary', color);
      
      // Inject RGB components for Tailwind opacity support (e.g. bg-primary/20)
      const hexToRgb = (hex: string) => {
        // Handle #RRGGBB
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (result) {
          return {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
          };
        }
        // Handle #RGB
        const shortResult = /^#?([a-f\d])([a-f\d])([a-f\d])$/i.exec(hex);
        if (shortResult) {
          return {
            r: parseInt(shortResult[1] + shortResult[1], 16),
            g: parseInt(shortResult[2] + shortResult[2], 16),
            b: parseInt(shortResult[3] + shortResult[3], 16)
          };
        }
        return null;
      };

      const rgb = hexToRgb(color);
      if (rgb) {
        root.style.setProperty('--brand-primary-rgb', `${rgb.r} ${rgb.g} ${rgb.b}`);
      }
    }
  }, [orgSettings?.brandColor]);

  return <>{children}</>;
};

