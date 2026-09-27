export function AppLoading({ label = "Memeriksa sesi…" }: { label?: string }) {
  return (
    <main className="grid min-h-screen place-items-center bg-canvas px-6">
      <div className="text-center" role="status">
        <span className="mx-auto block size-10 animate-spin rounded-full border-4 border-brand-soft border-t-brand" />
        <p className="mt-4 text-sm font-medium text-muted">{label}</p>
      </div>
    </main>
  );
}
