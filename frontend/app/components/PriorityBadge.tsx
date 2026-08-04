type Priority = "alta" | "media" | "baja" | "desconocida";

const styles: Record<Priority, string> = {
  alta: "bg-red-100 text-red-700 border border-red-200",
  media: "bg-amber-100 text-amber-700 border border-amber-200",
  baja: "bg-green-100 text-green-700 border border-green-200",
  desconocida: "bg-gray-100 text-gray-500 border border-gray-200",
};

const icons: Record<Priority, string> = {
  alta: "⚠️",
  media: "📊",
  baja: "✅",
  desconocida: "❓",
};

export default function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide ${styles[priority]}`}>
      {icons[priority]} {priority}
    </span>
  );
}
