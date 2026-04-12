import { Link } from 'react-router-dom'
import { Button, Card } from '@heroui/react'
import { Lock, ArrowLeft } from '@gravity-ui/icons'
import ContenedorIcono from '../components/ContenedorIcono'

function PaginaSinAcceso() {
  return (
    <div className="p-6 min-h-screen flex items-center justify-center">
      <Card className="p-8 max-w-md w-full text-center">
        <ContenedorIcono tamano="xl" color="danger" className="mx-auto mb-4">
          <Lock className="size-10 text-danger" />
        </ContenedorIcono>
        <h1 className="text-2xl font-bold mb-2">Acceso Denegado</h1>
        <p className="text-muted mb-6">
          No tienes permisos suficientes para acceder a esta pagina. Si crees que esto es un error,
          contacta al administrador.
        </p>
        <Button as={Link} to="/dashboard" color="primary">
          <ArrowLeft className="size-4 mr-1" />
          Volver al inicio
        </Button>
      </Card>
    </div>
  )
}

export default PaginaSinAcceso
