export default function Loading() {
  return (
    <main className="container-site py-16" aria-busy="true" aria-label="Carregando">
      <div className="h-3 w-40 animate-pulse rounded bg-foreground/10" />
      <div className="mt-5 h-10 w-full max-w-xl animate-pulse rounded bg-foreground/10" />
      <div className="mt-4 h-4 w-full max-w-md animate-pulse rounded bg-foreground/5" />
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="surface h-48 animate-pulse" />
        ))}
      </div>
    </main>
  );
}
