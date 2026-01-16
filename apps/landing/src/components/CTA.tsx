'use client'

import { ArrowRight, Github, BookOpen } from 'lucide-react'

export function CTA() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-600 to-blue-400">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-4xl font-bold text-white mb-6">
          Pronto para aumentar sua produtividade?
        </h2>
        <p className="text-xl text-blue-50 mb-12">
          Comece gratuitamente agora e transforme a forma como você gerencia suas tarefas e hábitos
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4 mb-12">
          <a
            href="http://localhost:3000/register"
            className="inline-flex items-center px-8 py-4 text-lg font-medium text-blue-600 bg-white rounded-lg hover:bg-gray-50 transition-all hover:scale-105 shadow-xl"
          >
            Criar Conta Grátis
            <ArrowRight className="ml-2 w-5 h-5" />
          </a>
          <a
            href="http://localhost:3000/login"
            className="inline-flex items-center px-8 py-4 text-lg font-medium text-white border-2 border-white rounded-lg hover:bg-white hover:text-blue-600 transition-all"
          >
            Fazer Login
          </a>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-8 text-blue-50">
          <a
            href="http://localhost:4000/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center hover:text-white transition-colors"
          >
            <BookOpen className="w-5 h-5 mr-2" />
            Documentação da API
          </a>
          <a
            href="#"
            className="inline-flex items-center hover:text-white transition-colors"
          >
            <Github className="w-5 h-5 mr-2" />
            Ver no GitHub
          </a>
        </div>
      </div>
    </section>
  )
}
