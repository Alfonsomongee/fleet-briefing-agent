type Priority = "alta" | "media" | "baja" | "desconocida";

const cfg: Record<Priority, { dot: string; label: string; badge: string }> = {
  alta:        { dot: "bg-red-500",   label: "text-red-700",   badge: "bg-red-50 ring-1 ring-red-200" },
  media:       { dot: "bg-amber-500", label: "text-amber-700", badge: "bg-amber-50 ring-1 ring-amber-200" },
  baja:        { dot: "bg-green-500", label: "text-green-700", badge: "bg-green-50 ring-1 ring-green-200" },
  desconocida: { dot: "bg-slate-300", label: "text-slate-500", badge: "bg-slate-50 ring-1 ring-slate-200" },
};

export default function PriorityBadge({ priority }: { priority: Priority }) {
  const c = cfg[priority] ?? cfg.desconocida;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold uppercase tracking-widest ${c.badge} ${c.label}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${c.dot}`} />
      {priority}
    </span>
  );
}
