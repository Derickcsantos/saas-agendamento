'use client'

export default function Card({ title, value }) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-4 border">
      <h3 className="text-sm text-gray-500">{title}</h3>
      <p className="text-2xl font-semibold text-indigo-600">{value ?? 0}</p>
    </div>
  );
}
