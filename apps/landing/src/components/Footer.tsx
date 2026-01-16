'use client'

export function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Logo and Description */}
          <div className="md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-400 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">S</span>
              </div>
              <span className="text-xl font-bold text-white">S.U.S.M.I</span>
            </div>
            <p className="text-gray-400 max-w-md">
              Simplesmente Um Sistema Muito Inteligente. Plataforma completa de produtividade com IA integrada.
            </p>
            <div className="mt-4 text-sm text-gray-500">
              Versão 1.0.0 - MVP
            </div>
          </div>

          {/* Product */}
          <div>
            <h3 className="text-white font-semibold mb-4">Produto</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#features" className="hover:text-white transition-colors">
                  Funcionalidades
                </a>
              </li>
              <li>
                <a href="#tech-stack" className="hover:text-white transition-colors">
                  Tecnologias
                </a>
              </li>
              <li>
                <a href="#architecture" className="hover:text-white transition-colors">
                  Arquitetura
                </a>
              </li>
              <li>
                <a href="http://localhost:4000/docs" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                  API Docs
                </a>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-white font-semibold mb-4">Recursos</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="http://localhost:3000/login" className="hover:text-white transition-colors">
                  Login
                </a>
              </li>
              <li>
                <a href="http://localhost:3000/register" className="hover:text-white transition-colors">
                  Criar Conta
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Suporte
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  GitHub
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-gray-800">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-sm text-gray-500">
              © 2026 S.U.S.M.I. Todos os direitos reservados.
            </div>
            <div className="flex space-x-6 text-sm">
              <a href="#" className="hover:text-white transition-colors">
                Privacidade
              </a>
              <a href="#" className="hover:text-white transition-colors">
                Termos
              </a>
              <a href="#" className="hover:text-white transition-colors">
                Cookies
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
