import type { Components } from 'react-markdown';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import { cn } from '@/lib/utils';

/**
 * Renders assistant copy that uses lightweight Markdown (headings, bold, lists).
 * Root JSON responses stay JSON-only; the "message" string may include Markdown for programs and long answers.
 */
const markdownComponents: Partial<Components> = {
  h1: ({ children, ...props }) => (
    <h3
      className="mt-4 scroll-m-20 border-b border-border/50 pb-1.5 text-[15px] font-semibold tracking-tight text-foreground first:mt-0"
      {...props}
    >
      {children}
    </h3>
  ),
  h2: ({ children, ...props }) => (
    <h3
      className="mt-4 scroll-m-20 border-b border-border/45 pb-1.5 text-[15px] font-semibold tracking-tight text-foreground first:mt-0"
      {...props}
    >
      {children}
    </h3>
  ),
  h3: ({ children, ...props }) => (
    <h4 className="mt-3 text-sm font-semibold text-foreground first:mt-0" {...props}>
      {children}
    </h4>
  ),
  p: ({ children, ...props }) => (
    <p className="mb-2 text-[13px] leading-relaxed text-foreground last:mb-0" {...props}>
      {children}
    </p>
  ),
  strong: ({ children, ...props }) => (
    <strong className="font-semibold text-foreground" {...props}>
      {children}
    </strong>
  ),
  em: ({ children, ...props }) => (
    <em className="italic text-foreground/90" {...props}>
      {children}
    </em>
  ),
  ul: ({ children, ...props }) => (
    <ul className="my-2.5 list-disc space-y-1.5 pl-5 marker:text-foreground-tertiary" {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }) => (
    <ol className="my-2.5 list-decimal space-y-1.5 pl-5 marker:text-muted-foreground" {...props}>
      {children}
    </ol>
  ),
  li: ({ children, ...props }) => (
    <li className="text-[13px] leading-relaxed text-foreground [&>p]:mb-0 [&>p]:inline" {...props}>
      {children}
    </li>
  ),
  hr: () => <hr className="my-4 border-0 border-t border-border/55" />,
  blockquote: ({ children, ...props }) => (
    <blockquote
      className="my-3 rounded-r-md border-l-2 border-primary/40 bg-muted/35 py-2 pl-3 pr-2 text-[13px] italic leading-relaxed text-muted-foreground dark:bg-muted/25"
      {...props}
    >
      {children}
    </blockquote>
  ),
  code: ({ children, className, ...props }) => {
    const isFenced = typeof className === 'string' && /language-/.test(className);
    if (isFenced) {
      return (
        <code className={cn('block font-mono text-[12px] text-foreground', className)} {...props}>
          {children}
        </code>
      );
    }
    return (
      <code
        className="rounded bg-muted/90 px-1 py-0.5 font-mono text-[12px] text-foreground dark:bg-muted/50"
        {...props}
      >
        {children}
      </code>
    );
  },
  pre: ({ children, ...props }) => (
    <pre
      className="my-2 overflow-x-auto rounded-lg border border-border/50 bg-background/80 p-3 dark:bg-background/40"
      {...props}
    >
      {children}
    </pre>
  ),
  table: ({ children, ...props }) => (
    <div className="my-3 overflow-x-auto rounded-lg border border-border/50">
      <table className="min-w-full text-[12px] leading-relaxed" {...props}>
        {children}
      </table>
    </div>
  ),
  thead: ({ children, ...props }) => (
    <thead className="bg-muted/50" {...props}>{children}</thead>
  ),
  th: ({ children, ...props }) => (
    <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-muted-foreground whitespace-nowrap" {...props}>
      {children}
    </th>
  ),
  td: ({ children, ...props }) => (
    <td className="px-3 py-2 text-[12px] text-foreground border-t border-border/40" {...props}>
      {children}
    </td>
  ),
  a: ({ children, href, ...props }) => (
    <a
      href={href}
      className="font-medium text-foreground-secondary underline underline-offset-2 hover:opacity-80"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    >
      {children}
    </a>
  ),
  img: () => null,
};

export function AssistantMessageMarkdown({ content }: { content: string }) {
  return (
    <div className="assistant-markdown min-w-0 max-w-full">
      <ReactMarkdown remarkPlugins={[remarkBreaks]} components={markdownComponents}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
