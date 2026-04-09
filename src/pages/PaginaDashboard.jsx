import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Button,
  Card,
  Chip,
  toast,
} from '@heroui/react'
import { Factory, Calendar, Person, Ticket } from '@gravity-ui/icons'
import ContenedorIcono from '../components/ContenedorIcono'
import { usarAutenticacion } from '../hooks/usarAutenticacion'

/* ─── constantes de roles ─── */
const ROLES = {
  ADMIN: 'admin',
  DUENO: 'dueno',
  CLIENTE: 'cliente',
  ORGANIZADOR: 'organizador',
}

function PaginaDashboard() {
  const { usuario } = usarAutenticacion()

  const renderRoleContent = () => {
    if (!usuario) return null

    const rol = usuario.rol?.toLowerCase()

    switch (rol) {
      case ROLES.ADMIN:
      case 'administrador':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <ContenedorIcono tamano="md" color="info">
                  <Factory className="size-6 text-info" />
                </ContenedorIcono>
                <h3 className="text-lg font-semibold">Control operativo</h3>
              </div>
              <p className="text-sm text-muted mb-4">
                Gestiona usuarios, solicitudes y venues desde acciones rapidas.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button as={Link} to="/admin/usuarios" color="primary" size="sm">
                  <Person className="size-4 mr-1" />
                  Usuarios
                </Button>
                <Button as={Link} to="/admin/solicitudes" color="secondary" size="sm">
                  <Ticket className="size-4 mr-1" />
                  Solicitudes
                </Button>
                <Button as={Link} to="/admin/venues" variant="flat" color="primary" size="sm">
                  <Factory className="size-4 mr-1" />
                  Venues
                </Button>
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <ContenedorIcono tamano="md" color="secondary">
                  <Person className="size-6 text-secondary" />
                </ContenedorIcono>
                <h3 className="text-lg font-semibold">Estado del sistema</h3>
              </div>
              <p className="text-sm text-muted mb-4">
                Flujo administrativo centralizado para aprobaciones y supervision.
              </p>
              <div className="flex flex-wrap gap-2">
                <Chip color="primary" size="sm">Administrador</Chip>
                <Chip color="secondary" size="sm">Acceso total</Chip>
              </div>
            </Card>
          </div>
        )
      case ROLES.DUENO:
      case 'dueno':
      case 'dueño':
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-6 md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <ContenedorIcono tamano="md" color="info">
                  <Factory className="size-6 text-info" />
                </ContenedorIcono>
                <h3 className="text-lg font-semibold">Gestion de venues</h3>
              </div>
              <p className="text-sm text-muted mb-4">
                Crea venues, disena el mapa de asientos y prepara publicaciones.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button as={Link} to="/mis-lugares" color="primary" size="sm">
                  <Factory className="size-4 mr-1" />
                  Mis lugares
                </Button>
                <Button as={Link} to="/mis-lugares/crear" color="secondary" size="sm">
                  <Plus className="size-4 mr-1" />
                  Crear venue
                </Button>
                <Button as={Link} to="/mis-eventos" variant="flat" color="primary" size="sm">
                  <Calendar className="size-4 mr-1" />
                  Mis eventos
                </Button>
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <ContenedorIcono tamano="md" color="secondary">
                  <Person className="size-6 text-secondary" />
                </ContenedorIcono>
                <h3 className="text-lg font-semibold">Recomendacion</h3>
              </div>
              <p className="text-sm text-muted mb-4">
                Mantener layouts actualizados mejora conversion y reduce errores de compra.
              </p>
              <Chip color="secondary" size="sm">Rol dueño</Chip>
            </Card>
          </div>
        )
      case ROLES.CLIENTE:
      case 'cliente':
      case ROLES.ORGANIZADOR:
      default:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <ContenedorIcono tamano="md" color="info">
                  <Ticket className="size-6 text-info" />
                </ContenedorIcono>
                <h3 className="text-lg font-semibold">Tu espacio de compra</h3>
              </div>
              <p className="text-sm text-muted mb-4">
                Consulta eventos, administra tu perfil y sigue tus compras.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button as={Link} to="/mis-eventos" color="primary" size="sm">
                  <Calendar className="size-4 mr-1" />
                  Mis eventos
                </Button>
                <Button as={Link} to="/perfil" variant="flat" color="secondary" size="sm">
                  <Person className="size-4 mr-1" />
                  Mi perfil
                </Button>
                <Button as={Link} to="/solicitar-dueno" variant="flat" color="primary" size="sm">
                  <Factory className="size-4 mr-1" />
                  Solicitar rol dueño
                </Button>
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <ContenedorIcono tamano="md" color="primary">
                  <Person className="size-6 text-primary" />
                </ContenedorIcono>
                <h3 className="text-lg font-semibold">Estado de cuenta</h3>
              </div>
              <p className="text-sm text-muted mb-4">
                Acceso rapido a historial y configuracion personal.
              </p>
              <Chip color="primary" size="sm">Rol {usuario.rol || 'cliente'}</Chip>
            </Card>
          </div>
        )
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">
          Bienvenido, {usuario ? usuario.nombre : ''}
        </h1>
        {usuario && (
          <div className="mt-2">
            <Chip color="primary" size="sm" variant="flat">
              {usuario.rol}
            </Chip>
          </div>
        )}
      </div>
      {renderRoleContent()}
    </div>
  )
}

export default PaginaDashboard
