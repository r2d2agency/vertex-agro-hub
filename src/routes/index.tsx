import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  head: () => ({
    title: 'Vertex Agro - Gestão Inteligente para Seringais',
    meta: [
      { name: 'description', content: 'Plataforma líder em gestão de seringais, focada em produtividade e controle operacional.' },
      { property: 'og:title', content: 'Vertex Agro' },
      { property: 'og:description', content: 'Gestão Inteligente para Seringais' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
  }),
  component: () => (
    <div className="flex min-h-screen flex-col items-center justify-center p-8 text-center bg-[#0F172A] text-white">
      <h1 className="text-4xl font-bold tracking-tight sm:text-6xl text-[#3B82F6]">
        Vertex Agro
      </h1>
      <p className="mt-6 text-lg leading-8 text-slate-300">
        Gestão Inteligente para Seringais
      </p>
      <div className="mt-10 flex items-center justify-center gap-x-6">
        <a
          href="/auth"
          className="rounded-md bg-[#3B82F6] px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#2563EB] transition-colors"
        >
          Acessar Plataforma
        </a>
      </div>
      <footer className="mt-20 border-t border-slate-800 pt-8 text-sm text-slate-500">
        © {new Date().getFullYear()} Vertex Agro. Design by TNS R2D2.
      </footer>
    </div>
  ),
})
