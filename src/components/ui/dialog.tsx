import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  children?: ReactNode;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  children,
}: ConfirmDialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <DialogPrimitive.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2',
            'rounded-xl bg-white p-6 shadow-xl',
          )}
        >
          <div className="flex items-start justify-between">
            <DialogPrimitive.Title className="text-xl font-bold text-slate-900">{title}</DialogPrimitive.Title>
            <DialogPrimitive.Close className="rounded p-1 text-slate-500 hover:bg-slate-100" aria-label="Close">
              <X size={20} />
            </DialogPrimitive.Close>
          </div>
          {description && (
            <DialogPrimitive.Description className="mt-2 text-slate-600">
              {description}
            </DialogPrimitive.Description>
          )}
          {children}
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="min-h-12 rounded-lg border-2 border-slate-300 bg-white px-5 font-semibold text-slate-900 hover:bg-slate-50"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="min-h-12 rounded-lg bg-red-600 px-5 font-semibold text-white hover:bg-red-700"
            >
              {confirmLabel}
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
