import { Hero } from '@/components/Hero'
import { Features } from '@/components/Features'
import { TechStack } from '@/components/TechStack'
import { Architecture } from '@/components/Architecture'
import { CTA } from '@/components/CTA'
import { Footer } from '@/components/Footer'
import { Header } from '@/components/Header'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <Header />
      <Hero />
      <Features />
      <TechStack />
      <Architecture />
      <CTA />
      <Footer />
    </main>
  )
}
