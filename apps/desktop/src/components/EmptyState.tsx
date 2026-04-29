export function EmptyState({
  title,
  detail,
  action
}: {
  title: string;
  detail?: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="rounded-lg border border-dashed border-stone-300 bg-stone-50 px-4 py-6 text-sm text-stone-600">
      <p className="font-semibold">{title}</p>
      {detail ? <p className="mt-2">{detail}</p> : null}
      {action ? (
        <button
          type="button"
          className="mt-3 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-semibold text-stone-700 transition hover:border-pine hover:text-pine"
          onClick={action.onClick}
        >
          {action.label}
        </button>
      ) : null}
    </div>
  );
}
