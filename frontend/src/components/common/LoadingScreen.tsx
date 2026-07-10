type LoadingScreenProps = {
  label?: string;
};

export function LoadingScreen({ label = 'Loading...' }: LoadingScreenProps) {
  return (
    <div className="grid min-h-[240px] place-items-center rounded-lg border border-border bg-white p-8 text-center shadow-panel">
      <div>
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-primary-100 border-t-primary-600" />
        <p className="mt-4 text-sm font-medium text-muted">{label}</p>
      </div>
    </div>
  );
}
