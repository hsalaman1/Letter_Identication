import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-lg font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 select-none',
  {
    variants: {
      variant: {
        primary: 'bg-slate-900 text-white hover:bg-slate-800 focus-visible:ring-slate-900',
        correct: 'bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-600',
        incorrect: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600',
        nr: 'bg-zinc-500 text-white hover:bg-zinc-600 focus-visible:ring-zinc-500',
        ghost: 'bg-transparent text-slate-900 hover:bg-slate-100',
        outline: 'border-2 border-slate-300 bg-white text-slate-900 hover:bg-slate-50',
        danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-600',
      },
      size: {
        md: 'h-12 px-5 text-base',
        lg: 'min-h-16 px-6 text-lg',
        xl: 'min-h-20 px-8 text-xl',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'lg',
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, ...props },
  ref,
) {
  return <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
});
