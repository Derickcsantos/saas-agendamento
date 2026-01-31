import { Suspense } from "react";
import QueuePage from "./QueuePage";

export const metadata = {
  title: "Fila em Tempo Real",
};

export default async function Page({ params }) {
  const { slug } = await params;

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando fila...</p>
        </div>
      </div>
    }>
      <QueuePage slug={slug} />
    </Suspense>
  );
}
