import { LucideIcon } from "lucide-react";

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{value}</p>
          <p className="mt-2 text-sm text-slate-500">{description}</p>
        </div>
        <div className="rounded-2xl bg-indigo-50 p-3 text-indigo-600">
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </article>
  );
}
