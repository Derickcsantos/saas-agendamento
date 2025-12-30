export default function StatCard({ title, value, change, icon, color, progress }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{value}</p>
          <p className="text-sm text-gray-600 dark:text-gray-300">{change}</p>
        </div>
        <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center text-white`}>
          {icon}
        </div>
      </div>
      {progress !== undefined && (
        <div className="mt-4">
          <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mb-1">
            <span>Progresso</span>
            <span>{progress.toFixed(0)}%</span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full ${color.split(' ')[0]} transition-all duration-500`}
              style={{ width: `${Math.min(progress, 100)}%` }}
            ></div>
          </div>
        </div>
      )}
    </div>
  );
}