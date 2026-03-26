import React, { useState } from 'react';
import { Info } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';

interface CardInfoDrawerProps {
  title: string;
  children: React.ReactNode;
}

export function CardInfoDrawer({ title, children }: CardInfoDrawerProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className="absolute top-3 right-3 z-10 p-1 rounded-full text-muted-foreground/60 hover:text-muted-foreground transition-colors"
        aria-label={`More info about ${title}`}
      >
        <Info className="w-3.5 h-3.5" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="max-w-lg mx-auto rounded-t-2xl max-h-[70vh]">
          <SheetHeader className="text-left mb-4">
            <SheetTitle className="text-base font-bold text-foreground">{title}</SheetTitle>
            <SheetDescription className="sr-only">Detailed information about {title}</SheetDescription>
          </SheetHeader>
          <div className="overflow-y-auto text-sm text-foreground-secondary leading-relaxed space-y-3 pb-4">
            {children}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
