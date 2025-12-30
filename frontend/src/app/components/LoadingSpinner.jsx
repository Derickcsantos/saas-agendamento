// components/LoadingSpinner.tsx
export default function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="relative">
          <div className="w-24 h-24 border-4 border-gray-200 dark:border-gray-700 rounded-full"></div>
          <div className="w-24 h-24 border-4 border-purple-500 border-t-transparent rounded-full absolute top-0 left-0 animate-spin"></div>
        </div>
        <p className="mt-6 text-gray-600 dark:text-gray-400 text-lg font-medium">
          Carregando dashboard...
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
          Preparando suas ferramentas de marketing
        </p>
      </div>
    </div>
  );
}