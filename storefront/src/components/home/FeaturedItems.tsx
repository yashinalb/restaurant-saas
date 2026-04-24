/**
 * Featured menu items strip.
 * Placeholder — real data is wired in by the menu task. Keeps visual balance
 * on the homepage under the hero banner.
 */
export default function FeaturedItems() {
  return (
    <section className="max-w-7xl mx-auto px-4 pb-12">
      <h2 className="text-xl font-bold text-brand-text mb-4">Featured</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
            <div className="h-32 bg-gray-100 rounded mb-3" />
            <div className="h-4 bg-gray-100 rounded mb-2 w-2/3" />
            <div className="h-3 bg-gray-100 rounded w-1/2" />
          </div>
        ))}
      </div>
    </section>
  );
}
