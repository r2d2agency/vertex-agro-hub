import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/campo/consultor/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/campo/consultor/"!</div>
}
