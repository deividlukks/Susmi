'use client'

import { ArrowRight, Sparkles } from 'lucide-react'

export function Hero() {
  return (
    <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center">
          {/* Badge */}
          <div className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-full mb-8 animate-fade-in">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-600">
              Versão 1.0.0 - MVP em Produção
            </span>
          </div>

          {/* Heading */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 animate-slide-up">
            <span className="bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
              S.U.S.M.I
            </span>
          </h1>
          <p className="text-2xl sm:text-3xl font-semibold text-gray-700 mb-4 animate-slide-up">
            Simplesmente Um Sistema Muito Inteligente
          </p>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-12 animate-slide-up">
            Plataforma completa de produtividade que integra{' '}
            <span className="font-semibold text-gray-900">tarefas</span>,{' '}
            <span className="font-semibold text-gray-900">hábitos</span>,{' '}
            <span className="font-semibold text-gray-900">projetos Kanban</span>,{' '}
            <span className="font-semibold text-gray-900">calendário</span> e{' '}
            <span className="font-semibold text-gray-900">inteligência artificial</span>.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4 animate-slide-up">
            <a
              href="http://localhost:3000/register"
              className="inline-flex items-center px-8 py-4 text-lg font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all hover:scale-105 shadow-lg hover:shadow-xl"
            >
              Começar Gratuitamente
              <ArrowRight className="ml-2 w-5 h-5" />
            </a>
            <a
              href="http://localhost:3000/login"
              className="inline-flex items-center px-8 py-4 text-lg font-medium text-blue-600 bg-white border-2 border-blue-600 rounded-lg hover:bg-blue-50 transition-all"
            >
              Fazer Login
            </a>
          </div>

          {/* Stats */}
          <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            <div className="animate-fade-in">
              <div className="text-4xl font-bold text-blue-600">10+</div>
              <div className="text-sm text-gray-600 mt-2">Módulos Integrados</div>
            </div>
            <div className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <div className="text-4xl font-bold text-blue-600">3</div>
              <div className="text-sm text-gray-600 mt-2">Agentes de IA</div>
            </div>
            <div className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <div className="text-4xl font-bold text-blue-600">20+</div>
              <div className="text-sm text-gray-600 mt-2">APIs Disponíveis</div>
            </div>
            <div className="animate-fade-in" style={{ animationDelay: '0.3s' }}>
              <div className="text-4xl font-bold text-blue-600">100%</div>
              <div className="text-sm text-gray-600 mt-2">TypeScript</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
