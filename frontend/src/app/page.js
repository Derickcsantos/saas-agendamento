export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white text-gray-800">
      <section className="text-center py-24 px-4">
        <h1 className="text-5xl font-bold mb-6">Agenda Agora</h1>
        <p className="max-w-2xl mx-auto text-lg text-gray-600">
          A plataforma completa para gestão e agendamento inteligente de salões e prestadores de serviço.
        </p>
        <a
          href="https://wa.me/5511999999999"
          target="_blank"
          rel="noreferrer"
          className="mt-8 inline-block bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition"
        >
          Fale com nossa equipe
        </a>
      </section>

      <section className="grid md:grid-cols-3 gap-8 px-8 py-16 text-center bg-white">
        <div>
          <h3 className="font-semibold text-xl mb-2">Multiempresas</h3>
          <p>Gerencie vários salões ou filiais com um único painel.</p>
        </div>
        <div>
          <h3 className="font-semibold text-xl mb-2">Agendamentos Inteligentes</h3>
          <p>Automatize horários e evite sobreposições.</p>
        </div>
        <div>
          <h3 className="font-semibold text-xl mb-2">Painel Completo</h3>
          <p>Acompanhe estatísticas, funcionários e clientes em tempo real.</p>
        </div>
      </section>
    </main>
  );
}
