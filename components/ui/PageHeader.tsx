export default function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-text)]">{title}</h1>
        {subtitle && (
          <p className="text-[var(--color-text-secondary)] mt-1">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}
