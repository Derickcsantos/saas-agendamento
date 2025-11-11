'use client'
export default function Table({ title, columns, data }) {
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border">
      <h4 className="font-semibold text-gray-700 mb-4">{title}</h4>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left border-collapse">
          <thead className="bg-gray-50 border-b">
            <tr>
              {columns.map((col) => (
                <th key={col} className="py-2 px-3 text-gray-600 font-medium">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length > 0 ? (
              data.map((row, idx) => (
                <tr
                  key={idx}
                  className="border-b hover:bg-gray-50 transition-colors"
                >
                  {columns.map((col) => (
                    <td key={col} className="py-2 px-3">
                      {row[col.toLowerCase()] ?? "-"}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columns.length}
                  className="text-center text-gray-400 py-4"
                >
                  Nenhum dado disponível
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
