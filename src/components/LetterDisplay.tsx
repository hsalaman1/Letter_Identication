import type { Condition } from '@/types';
import { cn } from '@/lib/utils';

interface LetterDisplayProps {
  letter: string;
  condition: Condition;
  className?: string;
}

const conditionClass: Record<Condition, string> = {
  regular: 'letter-regular',
  bold: 'letter-bold',
  hollow: 'letter-hollow',
};

export function LetterDisplay({ letter, condition, className }: LetterDisplayProps) {
  return (
    <div className={cn('letter-display', conditionClass[condition], className)}>
      {letter}
    </div>
  );
}
