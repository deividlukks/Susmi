'use client'

const technologies = {
  frontend: [
    { name: 'Next.js 16', description: 'App Router + Server Components' },
    { name: 'React 19', description: 'UI library' },
    { name: 'TailwindCSS', description: 'Utility-first CSS' },
    { name: 'Radix UI', description: 'Accessible components' },
    { name: 'React Query', description: 'Server state management' },
    { name: 'Zustand', description: 'Client state' },
    { name: 'Socket.IO', description: 'Real-time updates' },
  ],
  backend: [
    { name: 'NestJS 11', description: 'Progressive framework' },
    { name: 'Prisma ORM', description: 'Type-safe database' },
    { name: 'PostgreSQL', description: 'Relational database' },
    { name: 'Redis', description: 'Cache & sessions' },
    { name: 'JWT', description: 'Authentication' },
    { name: 'Socket.IO', description: 'WebSocket server' },
    { name: 'Swagger', description: 'API documentation' },
  ],
  ai: [
    { name: 'FastAPI', description: 'Python web framework' },
    { name: 'OpenAI GPT-4', description: 'LLM integration' },
    { name: 'Anthropic Claude', description: 'LLM alternative' },
    { name: 'TikToken', description: 'Token counting' },
  ],
  infra: [
    { name: 'Turborepo', description: 'Build orchestration' },
    { name: 'pnpm', description: 'Fast package manager' },
    { name: 'TypeScript', description: 'Type safety' },
    { name: 'Vercel', description: 'Frontend hosting' },
    { name: 'Supabase', description: 'Database hosting' },
  ],
}

export function TechStack() {
  return (
    <section id="tech-stack" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Stack Tecnológica Moderna
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Construído com as melhores ferramentas e tecnologias do mercado
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Frontend */}
          <div className="bg-white p-8 rounded-xl shadow-lg">
            <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <span className="w-3 h-3 bg-blue-600 rounded-full mr-3"></span>
              Frontend
            </h3>
            <div className="space-y-4">
              {technologies.frontend.map((tech, index) => (
                <div key={index} className="flex items-start">
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">{tech.name}</div>
                    <div className="text-sm text-gray-600">{tech.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Backend */}
          <div className="bg-white p-8 rounded-xl shadow-lg">
            <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <span className="w-3 h-3 bg-green-600 rounded-full mr-3"></span>
              Backend
            </h3>
            <div className="space-y-4">
              {technologies.backend.map((tech, index) => (
                <div key={index} className="flex items-start">
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">{tech.name}</div>
                    <div className="text-sm text-gray-600">{tech.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Service */}
          <div className="bg-white p-8 rounded-xl shadow-lg">
            <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <span className="w-3 h-3 bg-purple-600 rounded-full mr-3"></span>
              AI Service
            </h3>
            <div className="space-y-4">
              {technologies.ai.map((tech, index) => (
                <div key={index} className="flex items-start">
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">{tech.name}</div>
                    <div className="text-sm text-gray-600">{tech.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Infrastructure */}
          <div className="bg-white p-8 rounded-xl shadow-lg">
            <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <span className="w-3 h-3 bg-orange-600 rounded-full mr-3"></span>
              Infraestrutura
            </h3>
            <div className="space-y-4">
              {technologies.infra.map((tech, index) => (
                <div key={index} className="flex items-start">
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">{tech.name}</div>
                    <div className="text-sm text-gray-600">{tech.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
