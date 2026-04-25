import * as React from "react";
import * as ToastPrimitives from "@radix-ui/react-toast";
import { cva, type VariantProps } from "class-variance-authority";
import { AlertTriangle, CheckCircle2, Info, TriangleAlert, X } from "lucide-react";

import { cn } from "@/lib/utils";

const ToastProvider = ToastPrimitives.Provider;

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      "fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse gap-2 p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]",
      className,
    )}
    {...props}
  />
));
ToastViewport.displayName = ToastPrimitives.Viewport.displayName;

// Kit aesthetic: always-dark surface (#0A0A0A) with light text. Coloured icon
// tile carries the variant. Border + shadow keep the toast readable in both
// light and dark modes (in dark mode it sits ~equal to the card surface, so
// the hairline border separates it from the page).
const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-[14px] border border-white/[0.08] bg-[#0A0A0A] p-3 pr-9 text-[#F5F5F5] shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full",
  {
    variants: {
      variant: {
        default: "",
        success: "",
        warning: "",
        info: "",
        destructive: "",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> & VariantProps<typeof toastVariants>
>(({ className, variant, ...props }, ref) => {
  return <ToastPrimitives.Root ref={ref} className={cn(toastVariants({ variant }), className)} {...props} />;
});
Toast.displayName = ToastPrimitives.Root.displayName;

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      "inline-flex h-8 shrink-0 items-center justify-center rounded-full border border-white/[0.16] bg-transparent px-3 text-xs font-semibold text-[#F5F5F5] transition-colors hover:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-white/30 disabled:pointer-events-none disabled:opacity-50",
      className,
    )}
    {...props}
  />
));
ToastAction.displayName = ToastPrimitives.Action.displayName;

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      "absolute right-2 top-2 rounded-md p-1 text-[#A3A3A3] opacity-0 transition-opacity hover:text-[#F5F5F5] group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-white/30",
      className,
    )}
    toast-close=""
    {...props}
  >
    <X className="h-4 w-4" />
  </ToastPrimitives.Close>
));
ToastClose.displayName = ToastPrimitives.Close.displayName;

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title ref={ref} className={cn("text-[13px] font-semibold leading-snug text-[#F5F5F5]", className)} {...props} />
));
ToastTitle.displayName = ToastPrimitives.Title.displayName;

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description ref={ref} className={cn("text-xs leading-relaxed text-[#A3A3A3]", className)} {...props} />
));
ToastDescription.displayName = ToastPrimitives.Description.displayName;

type ToastVariant = NonNullable<VariantProps<typeof toastVariants>["variant"]>;

const VARIANT_ICON_TILE: Record<ToastVariant, { icon: React.ComponentType<{ className?: string }>; tile: string; icon_color: string } | null> = {
  default: null,
  success: {
    icon: CheckCircle2,
    tile: "bg-[hsl(var(--score-green)/0.18)]",
    icon_color: "text-[hsl(var(--score-green))]",
  },
  warning: {
    icon: AlertTriangle,
    tile: "bg-[hsl(var(--score-amber)/0.18)]",
    icon_color: "text-[hsl(var(--score-amber))]",
  },
  info: {
    icon: Info,
    tile: "bg-white/[0.10]",
    icon_color: "text-[#A3A3A3]",
  },
  destructive: {
    icon: TriangleAlert,
    tile: "bg-[hsl(var(--score-red)/0.18)]",
    icon_color: "text-[hsl(var(--score-red))]",
  },
};

function ToastIconTile({ variant }: { variant: ToastVariant }) {
  const config = VARIANT_ICON_TILE[variant];
  if (!config) return null;
  const Icon = config.icon;
  return (
    <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", config.tile)} aria-hidden>
      <Icon className={cn("h-4 w-4", config.icon_color)} />
    </div>
  );
}

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>;

type ToastActionElement = React.ReactElement<typeof ToastAction>;

export {
  type ToastProps,
  type ToastActionElement,
  type ToastVariant,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
  ToastIconTile,
};
