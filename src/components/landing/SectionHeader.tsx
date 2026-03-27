import type { ReactNode } from "react";

interface SectionHeaderProps {
  /** Optional pill badge text (e.g. "The Workflow") */
  pill?: string;
  /** Optional icon to show inside the pill */
  pillIcon?: ReactNode;
  /** H2 content — use a string or JSX with <span> for accent coloring */
  title: ReactNode;
  /** Optional subtitle paragraph */
  subtitle?: string;
  /** Center-aligned (default) or left-aligned */
  align?: "center" | "left";
  /** Dark section variant (for use on dark backgrounds) */
  dark?: boolean;
  /** Bottom margin override. Default: "mb-16 sm:mb-20" */
  spacing?: string;
  /** Merged with subtitle layout; use for stronger body copy contrast (e.g. landing stripes). */
  subtitleClassName?: string;
}

/**
 * Standardized landing page section header.
 * Always use this instead of ad-hoc heading markup.
 */
const SectionHeader = ({
  pill,
  pillIcon,
  title,
  subtitle,
  align = "center",
  dark = false,
  spacing = "mb-16 sm:mb-20",
  subtitleClassName,
}: SectionHeaderProps) => {
  const centered = align === "center";

  const pillColors = dark
    ? "bg-primary/20 border-primary/30 text-on-brand-tint"
    : "bg-card border-border text-muted-foreground";

  const titleColor = dark ? "text-white" : "text-foreground";
  const subtitleColor = dark ? "text-muted-foreground" : "text-muted-foreground";

  return (
    <div className={`${centered ? "text-center" : ""} ${spacing}`}>
      {pill && (
        <div
          className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full ${pillColors} font-black text-[10px] uppercase tracking-[0.15em] mb-4 shadow-sm`}
        >
          {pillIcon}
          {pill}
        </div>
      )}

      <h2
        className={`text-balance text-3xl sm:text-4xl md:text-5xl font-bold ${titleColor} mb-6 leading-tight`}
      >
        {title}
      </h2>

      {subtitle && (
        <p
          className={`text-balance text-lg leading-relaxed ${
            subtitleClassName ?? subtitleColor
          } ${centered ? "max-w-2xl mx-auto" : "max-w-2xl"}`}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
};

export default SectionHeader;
