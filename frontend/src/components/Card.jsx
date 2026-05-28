export default function Card({ title, value, icon, className }) {
  return (
    <div className={`rounded-3xl border border-slate-200 bg-white p-5 shadow-card ${className || ''}`}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-slate-400">{title}</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
        </div>
        <div className="rounded-2xl bg-slate-100 p-3 text-sky-600">{icon}</div>
      </div>
    </div>
  );
}
