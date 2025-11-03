"use client";

import { useState } from 'react';
import { Moon, Sun, Scissors, Calendar, Users, BarChart2 } from 'lucide-react';

export default function Home() {
  const [darkMode, setDarkMode] = useState(false);

  return (
    <main
      className={`min-h-screen transition-colors duration-500 ${
        darkMode
          ? 'bg-gray-950 text-white'
          : 'bg-gradient-to-b from-white to-blue-50 text-gray-900'
      }`}
    >
      {/* Header */}
      <header className="flex justify-between items-center px-8 py-6 shadow-md bg-opacity-70 backdrop-blur-md sticky top-0 z-50">
        <h1 className="text-3xl font-bold text-[#5f459c]">Horafy</h1>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-full bg-gray-200 dark:bg-gray-800 hover:scale-110 transition"
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <a
            href="https://wa.me/5511999999999"
            target="_blank"
            rel="noreferrer"
            className="bg-[#5f459c] text-white px-6 py-2 rounded-lg font-medium hover:bg-opacity-90 transition"
          >
            Fale com a equipe
          </a>
        </div>
      </header>

      {/* Hero Section */}
      <section className="text-center py-24 px-4">
        <h2 className="text-5xl font-extrabold mb-6 tracking-tight">
          O sistema de agendamento mais completo para salões de beleza
        </h2>
        <p className="max-w-2xl mx-auto text-lg text-gray-600 dark:text-gray-300">
          Gestão inteligente, relatórios automáticos, controle de equipe e um painel 100% personalizável para o seu negócio.
        </p>
        <div className="mt-10 flex justify-center gap-4">
          <a
            href="https://wa.me/5511999999999"
            className="bg-[#5f459c] text-white px-8 py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition"
          >
            Comece Agora
          </a>
          <a
            href="#features"
            className="border border-[#5f459c] text-[#5f459c] dark:text-white px-8 py-3 rounded-lg font-semibold hover:bg-[#5f459c] hover:text-white transition"
          >
            Ver Recursos
          </a>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-8 bg-white dark:bg-gray-900">
        <div className="grid md:grid-cols-3 gap-10 max-w-6xl mx-auto text-center">
          <div className="p-8 rounded-2xl shadow-lg hover:shadow-xl transition bg-gray-50 dark:bg-gray-800">
            <Calendar className="mx-auto mb-4 text-[#5f459c]" size={40} />
            <h3 className="font-bold text-xl mb-2">Agendamento Inteligente</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Evite sobreposições e otimize horários com confirmação automática via WhatsApp.
            </p>
          </div>
          <div className="p-8 rounded-2xl shadow-lg hover:shadow-xl transition bg-gray-50 dark:bg-gray-800">
            <Users className="mx-auto mb-4 text-[#5f459c]" size={40} />
            <h3 className="font-bold text-xl mb-2">Painéis Personalizados</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Painel administrativo, do funcionário e do cliente — cada um com informações sob medida.
            </p>
          </div>
          <div className="p-8 rounded-2xl shadow-lg hover:shadow-xl transition bg-gray-50 dark:bg-gray-800">
            <BarChart2 className="mx-auto mb-4 text-[#5f459c]" size={40} />
            <h3 className="font-bold text-xl mb-2">Relatórios & Faturamento</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Acompanhe resultados, emita notas fiscais e veja o desempenho da equipe em tempo real.
            </p>
          </div>
        </div>
      </section>

      {/* Showcase Section */}
      <section className="py-20 px-8 bg-gradient-to-r from-[#5f459c] to-[#5f459c] text-white">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">Totalmente personalizável</h2>
          <p className="max-w-3xl mx-auto text-lg mb-10 opacity-90">
            Cada salão é único. O Horafy permite personalizar sua página de agendamento, cores, fotos e até o modo de exibição da equipe.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-6 bg-white/10 rounded-xl shadow-lg hover:bg-white/20 transition">
              <Scissors className="mx-auto mb-3" size={40} />
              <p className="font-medium">Salões Femininos</p>
            </div>
            <div className="p-6 bg-white/10 rounded-xl shadow-lg hover:bg-white/20 transition">
              <Scissors className="mx-auto mb-3" size={40} />
              <p className="font-medium">Barbearias</p>
            </div>
            <div className="p-6 bg-white/10 rounded-xl shadow-lg hover:bg-white/20 transition">
              <Scissors className="mx-auto mb-3" size={40} />
              <p className="font-medium">Clínicas de Estética</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-8 text-center bg-gray-100 dark:bg-gray-950">
        <h2 className="text-4xl font-bold mb-4">Pronto para elevar o nível do seu salão?</h2>
        <p className="max-w-2xl mx-auto text-gray-700 dark:text-gray-300 mb-8">
          Teste o Horafy e veja como é fácil centralizar agendamentos, pagamentos e relatórios em um só lugar.
        </p>
        <a
          href="https://wa.me/5511999999999"
          className="bg-[#5f459c] text-white px-10 py-4 rounded-lg font-semibold shadow-xl hover:scale-105 transition"
        >
          Solicitar Demonstração
        </a>
      </section>

      {/* Footer */}
      <footer className="text-center py-10 border-t border-gray-300 dark:border-gray-700">
        <p className="text-gray-600 dark:text-gray-400">
          © {new Date().getFullYear()} Horafy — Todos os direitos reservados.
        </p>
      </footer>
    </main>
  );
}
