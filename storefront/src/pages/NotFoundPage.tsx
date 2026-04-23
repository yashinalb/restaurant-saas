import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="max-w-xl mx-auto px-4 py-24 text-center">
      <h1 className="text-5xl font-bold text-brand-primary mb-3">404</h1>
      <p className="text-brand-text-muted mb-6">That page doesn't exist.</p>
      <Link to="/" className="text-brand-primary font-semibold hover:underline">Back home</Link>
    </div>
  );
}
