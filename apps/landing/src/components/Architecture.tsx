'use client'

import { Database, Server, Cpu, Package } from 'lucide-react'

const apps = [
  {
    icon: Server,
    name: 'API (NestJS)',
    port: '4000',
    description: 'Backend REST + WebSocket com 20+ módulos',
    color: 'bg-green-100 text-green-600',
  },
  {
    icon: Cpu,
    name: 'Web App',
    port: '3000',
    description: 'Aplicação principal do usuário (Next.js)',
    color: 'bg-blue-100 text-blue-600',
  },
  {
    icon: Server,
    name: 'Admin Panel',
    port: '3002',
    description: 'Painel administrativo separado',
    color: 'bg-purple-100 text-purple-600',
  },
  {
    icon: Cpu,
    name: 'AI Service',
    port: '8000',
    description: 'Serviço Python FastAPI com LLMs',
    color: 'bg-purple-100 text-purple-600',
  },
]

const packages = [
  { name: '@susmi/ui', description: 'Componentes compartilhados' },
  { name: '@susmi/types', description: 'Tipos TypeScript' },
  { name: '@susmi/config', description: 'Configurações centralizadas' },
  { name: '@susmi/utils', description: 'Funções utilitárias' },
  { name: '@susmi/auth', description: 'Lógica de autenticação' },
  { name: '@susmi/hooks', description: 'React hooks compartilhados' },
  { name: '@susmi/store', description: 'Estado global' },
]

export function Architecture() {
  return (
    <section id="architecture" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Arquitetura Monorepo
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Organização profissional com Turborepo e pnpm workspaces
          </p>
        </div>

        {/* Apps */}
        <div className="mb-16">
          <h3 className="text-2xl font-bold text-gray-900 mb-8 flex items-center">
            <Server className="w-6 h-6 mr-3 text-blue-600" />
            Aplicações
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {apps.map((app, index) => {
              const Icon = app.icon
              return (
                <div
                  key={index}
                  className="bg-gray-50 p-6 rounded-xl hover:shadow-lg transition-all"
                >
                  <div className={`w-12 h-12 ${app.color} rounded-lg flex items-center justify-center mb-4`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="text-sm font-mono text-gray-500 mb-1">
                    :{app.port}
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">
                    {app.name}
                  </h4>
                  <p className="text-sm text-gray-600">{app.description}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Packages */}
        <div>
          <h3 className="text-2xl font-bold text-gray-900 mb-8 flex items-center">
            <Package className="w-6 h-6 mr-3 text-blue-600" />
            Pacotes Compartilhados
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {packages.map((pkg, index) => (
              <div
                key={index}
                className="bg-gray-50 p-4 rounded-lg border-l-4 border-blue-600 hover:bg-blue-50 transition-colors"
              >
                <div className="font-mono text-sm font-semibold text-blue-600 mb-1">
                  {pkg.name}
                </div>
                <div className="text-sm text-gray-600">{pkg.description}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Database */}
        <div className="mt-16 bg-gradient-to-br from-blue-50 to-purple-50 p-8 rounded-xl">
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mr-4">
              <Database className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900">
                Banco de Dados
              </h3>
              <p className="text-gray-600">PostgreSQL + Prisma ORM + Redis</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="bg-white p-4 rounded-lg">
              <div className="font-semibold text-gray-900">11 Models</div>
              <div className="text-sm text-gray-600">Users, Tasks, Habits, Events, Projects...</div>
            </div>
            <div className="bg-white p-4 rounded-lg">
              <div className="font-semibold text-gray-900">Supabase</div>
              <div className="text-sm text-gray-600">PostgreSQL gerenciado com pooling</div>
            </div>
            <div className="bg-white p-4 rounded-lg">
              <div className="font-semibold text-gray-900">Type-Safe</div>
              <div className="text-sm text-gray-600">Prisma Client gerado automaticamente</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
