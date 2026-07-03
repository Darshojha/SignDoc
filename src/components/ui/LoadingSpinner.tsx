export function LoadingSpinner() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div
        aria-label="Loading"
        className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--color-border)] border-t-[var(--color-primary)]"
      />
    </div>
  );
}
