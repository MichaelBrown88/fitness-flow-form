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
}: SectionHeaderProps) => {
  const centered = align === "center";

  const pillColors = dark
    ? "bg-indigo-500/20 border-indigo-500/30 text-indigo-300"
    : "bg-white border-slate-200 text-slate-600";

  const titleColor = dark ? "text-white" : "text-slate-900";
  const subtitleColor = dark ? "text-slate-400" : "text-slate-500";

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
        className={`text-3xl sm:text-4xl md:text-5xl font-bold ${titleColor} mb-6 leading-tight`}
      >
        {title}
      </h2>

      {subtitle && (
        <p
          className={`text-lg ${subtitleColor} leading-relaxed ${
            centered ? "max-w-2xl mx-auto" : "max-w-2xl"
          }`}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
};

export default SectionHeader;
