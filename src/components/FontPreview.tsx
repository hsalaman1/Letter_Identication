import type { Condition } from '@/types';

const previewItems: { label: string; condition: Condition }[] = [
  { label: 'Regular', condition: 'regular' },
  { label: 'Bold', condition: 'bold' },
  { label: 'Hollow', condition: 'hollow' },
];

const previewClass: Record<Condition, string> = {
  regular: 'letter-regular',
  bold: 'letter-bold',
  hollow: 'letter-hollow',
};

export function FontPreview() {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">
        Font Preview
      </div>
      <div className="grid grid-cols-3 gap-4">
        {previewItems.map(item => (
          <div key={item.condition} className="flex flex-col items-center">
            <div
              className={`${previewClass[item.condition]} text-center`}
              style={{
                fontFamily: "'Century Gothic', 'Questrial', 'Nunito', sans-serif",
                fontSize: '3.5rem',
                lineHeight: 1,
              }}
            >
              A a g
            </div>
            <div className="mt-2 text-xs font-medium uppercase tracking-wide text-slate-500">
              {item.label}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-slate-500">
        Century Gothic renders first when available; Questrial/Nunito are Google Font fallbacks.
      </p>
    </div>
  );
}
