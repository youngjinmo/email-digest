import * as DialogPrimitive from '@radix-ui/react-dialog';
import { ServerCrash } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogPortal, DialogOverlay } from '@/components/ui/dialog';
import React from 'react';

const SHOW_OUTAGE_MODAL = true;

export const ServiceOutageModal = () => {
  if (!SHOW_OUTAGE_MODAL) return null;

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          className={cn(
            'fixed left-[50%] top-[50%] z-50 grid w-full max-w-md translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg',
          )}
        >
          <div className="flex flex-col items-center gap-4 text-center">
            <ServerCrash className="h-10 w-10 text-amber-500" />
            <div className="flex flex-col gap-2">
              <h2 className="text-lg font-semibold leading-none tracking-tight">
                Service Temporarily Unavailable
              </h2>
              <p className="text-sm text-muted-foreground">
                We are currently experiencing an outage with our external email service provider
                (Mailgun). <br />
                Email delivery is temporarily unavailable.
                <br />
                <br />
                We are aware of the issue and actively working on a resolution. We apologize for the
                inconvenience.
              </p>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
};
