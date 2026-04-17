import { useEffect, useState } from 'react';
import { loadClientNames } from '@/hooks/useSession';
import { cn } from '@/lib/utils';

type Theme = 'slate' | 'blue';

interface StudentNameFieldProps {
  value: string;
  onChange: (value: string) => void;
  theme?: Theme;
  placeholder?: string;
}

export function StudentNameField({
  value,
  onChange,
  theme = 'slate',
  placeholder = 'e.g. Sam Rivera',
}: StudentNameFieldProps) {
  const [savedNames, setSavedNames] = useState<string[]>([]);

  useEffect(() => {
    setSavedNames(loadClientNames());
  }, []);

  const focusRing = theme === 'blue' ? 'focus:border-blue-600' : 'focus:border-slate-900';
  const activeChip =
    theme === 'blue'
      ? 'border-blue-600 bg-blue-600 text-white'
      : 'border-slate-900 bg-slate-900 text-white';
  const inactiveChip = 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50';

  const normalized = value.trim().toLowerCase();
  const hasSelection = normalized.length > 0 && savedNames.some(n => n.toLowerCase() === normalized);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="block text-sm font-semibold text-slate-700">Student name</label>
        {hasSelection && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="text-xs font-semibold text-slate-500 hover:text-slate-700 hover:underline"
          >
            Clear
          </button>
        )}
      </div>

      {savedNames.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {savedNames.map(name => {
            const selected = name.toLowerCase() === normalized;
            return (
              <button
                key={name}
                type="button"
                onClick={() => onChange(name)}
                className={cn(
                  'rounded-full border-2 px-3 py-1.5 text-sm font-semibold transition-colors',
                  selected ? activeChip : inactiveChip,
                )}
              >
                {name}
              </button>
            );
          })}
        </div>
      )}

      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'w-full rounded-lg border-2 border-slate-300 px-4 py-3 text-lg focus:outline-none',
          focusRing,
        )}
      />
    </div>
  );
}
