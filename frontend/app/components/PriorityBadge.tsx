const cfg: Record<string, { label: string; cls: string; dot: string }> = {
  alta:        { label: "Alta",  cls: "text-red-400 bg-red-500/8 border-red-500/20",       dot: "bg-red-500" },
  media:       { label: "Media", cls: "text-amber-400 bg-amber-500/8 border-amber-500/20", dot: "bg-amber-500" },
  baja:        { label: "Baja",  cls: "text-emerald-400 bg-emerald-500/8 border-emerald-500/20", dot: "bg-emerald-500" },
  desconocida: { label: "—",     cls: "text-zinc-500 bg-zinc-800/40 border-zinc-700/30",   dot: "bg-zinc-600" },
};

export default function PriorityBadge({ priority }: { priority: string }) {
  const c = cfg[priority] ?? cfg.desconocida;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${c.cls} flex-shrink-0`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}
