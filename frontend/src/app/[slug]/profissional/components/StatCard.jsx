"use client";

export default function StatCard({ title, value, icon, palette, subtitle }) {
  return (
    <div
      className="bg-white rounded-xl shadow-md border hover:shadow-lg transition-all duration-300 p-6"
      style={{ borderColor: `${palette?.medium_color}30` }}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">
            {title}
          </p>
          <p className="text-3xl font-bold mt-2 text-gray-800">
            {value || 0}
          </p>
          {subtitle && (
            <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
          )}
        </div>

        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{
            backgroundColor: `${palette?.strong_color}15`,
            color: palette?.strong_color,
          }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}
