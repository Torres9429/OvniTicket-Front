import { useState } from 'react'
import {
  Button,
  Card,
  Input,
  Chip,
  toast,
  Spinner,
} from '@heroui/react'
import { Person, Pencil, Check, Xmark } from '@gravity-ui/icons'
import ContenedorIcono from '../components/ContenedorIcono'
import { useAutenticacion } from '../hooks/usarAutenticacion'

function PaginaPerfil() {
  const { usuario, actualizarPerfil } = useAutenticacion()
  const [editando, setEditando] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [formulario, setFormulario] = useState({
    nombre: usuario?.nombre || '',
    apellidos: usuario?.apellidos || '',
    correo: usuario?.correo || '',
  })

  const handleGuardar = async () => {
    setCargando(true)
    try {
      await actualizarPerfil?.(formulario)
      toast.success('Perfil actualizado correctamente')
      setEditando(false)
    } catch {
      toast.error('No se pudo actualizar el perfil')
    } finally {
      setCargando(false)
    }
  }

  const handleCancelar = () => {
    setFormulario({
      nombre: usuario?.nombre || '',
      apellidos: usuario?.apellidos || '',
      correo: usuario?.correo || '',
    })
    setEditando(false)
  }

  if (!usuario) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[300px]">
        <Spinner size="lg" />
        <p className="mt-4 text-muted">Cargando perfil...</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Mi Perfil</h1>
        <p className="text-muted mt-1">Gestiona tu informacion personal</p>
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <ContenedorIcono tamano="xl" color="primary">
            <Person className="size-10 text-primary" />
          </ContenedorIcono>
          <div>
            <h2 className="text-xl font-semibold">
              {usuario.nombre} {usuario.apellidos}
            </h2>
            <Chip color="primary" size="sm" variant="flat">
              {usuario.rol}
            </Chip>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Nombre</label>
            <Input
              value={formulario.nombre}
              onChange={(e) =>
                setFormulario((prev) => ({ ...prev, nombre: e.target.value }))
              }
              isReadOnly={!editando}
              className={!editando ? 'bg-default-100' : ''}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Apellidos</label>
            <Input
              value={formulario.apellidos}
              onChange={(e) =>
                setFormulario((prev) => ({ ...prev, apellidos: e.target.value }))
              }
              isReadOnly={!editando}
              className={!editando ? 'bg-default-100' : ''}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Correo electronico</label>
            <Input
              type="email"
              value={formulario.correo}
              onChange={(e) =>
                setFormulario((prev) => ({ ...prev, correo: e.target.value }))
              }
              isReadOnly={!editando}
              className={!editando ? 'bg-default-100' : ''}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Rol</label>
            <Input value={usuario.rol} isReadOnly className="bg-default-100" />
          </div>
        </div>

        <div className="flex gap-2 justify-end mt-6">
          {!editando ? (
            <Button color="primary" onPress={() => setEditando(true)}>
              <Pencil className="size-4 mr-1" />
              Editar perfil
            </Button>
          ) : (
            <>
              <Button variant="flat" onPress={handleCancelar} isDisabled={cargando}>
                <Xmark className="size-4 mr-1" />
                Cancelar
              </Button>
              <Button
                color="success"
                onPress={handleGuardar}
                isLoading={cargando}
                spinner={<Spinner size="sm" />}
              >
                <Check className="size-4 mr-1" />
                Guardar
              </Button>
            </>
          )}
        </div>
      </Card>
    </div>
  )
}

export default PaginaPerfil
