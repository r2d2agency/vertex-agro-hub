import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: () => (
    <div className="flex min-h-screen flex-col items-center justify-center p-8 text-center">
      <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-6xl">
        Vertex Agro
      </h1>
      <p className="mt-6 text-lg leading-8 text-slate-600">
        Gestão Inteligente para Seringais
      </p>
      <div className="mt-10 flex items-center justify-center gap-x-6">
        <a
          href="/auth"
          className="rounded-md bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          Acessar Plataforma
        </a>
      </div>
      <footer className="mt-20 border-t border-slate-100 pt-8 text-sm text-slate-500">
        © {new Date().getFullYear()} Vertex Agro. Design by TNS R2D2.
      </footer>
    </div>
  ),
})
