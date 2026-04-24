import { Loader2 } from 'lucide-react';

interface LoadingProps {
  label?: string;
  fullscreen?: boolean;
}

export default function Loading({ label, fullscreen }: LoadingProps) {
  const content = (
    <div className="flex items-center gap-2 text-brand-text-muted">
      <Loader2 className="w-5 h-5 animate-spin" />
      {label && <span className="text-sm">{label}</span>}
    </div>
  );
  if (fullscreen) {
    return <div className="min-h-[40vh] flex items-center justify-center">{content}</div>;
  }
  return <div className="py-8 flex items-center justify-center">{content}</div>;
}
