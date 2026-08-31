export default function Loading() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-16 md:py-24">
      <div className="animate-pulse space-y-4">
        <div className="h-4 bg-sage/10 rounded w-24" />
        <div className="h-8 bg-sage/10 rounded w-64 mt-8" />
        <div className="h-3 bg-sage/10 rounded w-40" />
        <div className="border-t border-sage/10 pt-10 space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-3 bg-sage/10 rounded" style={{ width: `${70 + Math.random() * 30}%` }} />
          ))}
        </div>
      </div>
    </main>
  );
}
