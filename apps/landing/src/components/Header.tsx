'use client'

import { Menu, X } from 'lucide-react'
import { useState } from 'react'

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
      setIsMenuOpen(false)
    }
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-400 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">S</span>
            </div>
            <span className="text-xl font-bold text-gray-900">S.U.S.M.I</span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <button
              onClick={() => scrollToSection('features')}
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              Funcionalidades
            </button>
            <button
              onClick={() => scrollToSection('tech-stack')}
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              Tecnologias
            </button>
            <button
              onClick={() => scrollToSection('architecture')}
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              Arquitetura
            </button>
            <a
              href="http://localhost:3000/login"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Acessar Plataforma
            </a>
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 text-gray-600 hover:text-gray-900"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200">
            <nav className="flex flex-col space-y-4">
              <button
                onClick={() => scrollToSection('features')}
                className="text-left text-gray-600 hover:text-gray-900 transition-colors"
              >
                Funcionalidades
              </button>
              <button
                onClick={() => scrollToSection('tech-stack')}
                className="text-left text-gray-600 hover:text-gray-900 transition-colors"
              >
                Tecnologias
              </button>
              <button
                onClick={() => scrollToSection('architecture')}
                className="text-left text-gray-600 hover:text-gray-900 transition-colors"
              >
                Arquitetura
              </button>
              <a
                href="http://localhost:3000/login"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors text-center"
              >
                Acessar Plataforma
              </a>
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}
