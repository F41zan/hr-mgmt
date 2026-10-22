"use client";

export default function Pagination({
  page,
  pages,
  total,
  onChange,
}: {
  page: number;
  pages: number;
  total: number;
  onChange: (page: number) => void;
}) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--color-primary-border)] text-sm">
      <span className="text-[var(--color-text-secondary)]">
        Page {page} of {pages} · {total} records
      </span>
      <div className="flex gap-2">
        <button
          className="btn-secondary px-3 py-1.5"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          Previous
        </button>
        <button
          className="btn-secondary px-3 py-1.5"
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
