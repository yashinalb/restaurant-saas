export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-12">
      <div className="max-w-7xl mx-auto px-4 py-6 text-sm text-brand-text-muted flex items-center justify-between">
        <span>© {new Date().getFullYear()} Restaurant</span>
        <span>Powered by Restaurant SaaS</span>
      </div>
    </footer>
  );
}
