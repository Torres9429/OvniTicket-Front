import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  Card,
  Input,
  TextArea,
  Chip,
  toast,
  Spinner,
} from '@heroui/react'
import { Factory, ArrowLeft, Check, PaperPlane } from '@gravity-ui/icons'
import ContenedorIcono from '../components/ContenedorIcono'
import { useAuth } from '../hooks/useAuth'

function PaginaSolicitarDueno() {
  const { usuario: user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [form, setForm] = useState({
    motivo: '',
    experiencia: '',
    telefono: '',
  })

  const handleSubmit = async () => {
    setLoading(true)
    try {
      // API call to submit request
      await new Promise((resolve) => setTimeout(resolve, 1000))
      toast.success('Solicitud enviada correctamente')
      setSubmitted(true)
    } catch {
      toast.error('No se pudo enviar la solicitud')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="p-6 min-h-screen flex items-center justify-center">
        <Card className="p-8 max-w-md w-full text-center">
          <ContenedorIcono size="xl" color="success" className="mx-auto mb-4">
            <Check className="size-10 text-success" />
          </ContenedorIcono>
          <h1 className="text-2xl font-bold mb-2">Solicitud Enviada</h1>
          <p className="text-muted mb-6">
            Tu solicitud para obtener el rol de dueño ha sido enviada. Un administrador la revisara
            y te notificara por correo electronico.
          </p>
          <Button onPress={() => navigate('/dashboard')} color="primary">
            <ArrowLeft className="size-4 mr-1" />
            Volver al inicio
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button isIconOnly variant="flat" onPress={() => navigate('/dashboard')}>
          <ArrowLeft className="size-5" />
        </Button>
        <h1 className="text-2xl font-bold">Solicitar Rol de Dueño</h1>
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <ContenedorIcono size="md" color="primary">
            <Factory className="size-6 text-primary" />
          </ContenedorIcono>
          <div>
            <h2 className="text-lg font-semibold">Formulario de solicitud</h2>
            <p className="text-sm text-muted">
              Completa la informacion para solicitar el rol de dueño/organizador
            </p>
          </div>
        </div>

        <div className="mb-4 p-4 bg-primary/10 rounded-lg">
          <p className="text-sm">
            <strong>Usuario:</strong> {user?.nombre} {user?.apellidos}
          </p>
          <p className="text-sm">
            <strong>Correo:</strong> {user?.correo}
          </p>
          <p className="text-sm">
            <strong>Rol actual:</strong>{' '}
            <Chip color="primary" size="sm" variant="flat">
              {user?.rol}
            </Chip>
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">
              Motivo de la solicitud *
            </label>
            <TextArea
              placeholder="Explica por que deseas obtener el rol de dueño y que tipo de eventos/lugares planeas gestionar..."
              value={form.motivo}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, motivo: e.target.value }))
              }
              minRows={3}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">
              Experiencia previa (opcional)
            </label>
            <TextArea
              placeholder="Describe cualquier experiencia previa en la organizacion de eventos..."
              value={form.experiencia}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, experiencia: e.target.value }))
              }
              minRows={2}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">
              Telefono de contacto *
            </label>
            <Input
              type="tel"
              placeholder="+52 123 456 7890"
              value={form.telefono}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, telefono: e.target.value }))
              }
            />
          </div>
        </div>

        <div className="flex gap-2 justify-end mt-6">
          <Button variant="flat" onPress={() => navigate('/dashboard')}>
            Cancelar
          </Button>
          <Button
            color="primary"
            onPress={handleSubmit}
            isLoading={loading}
            spinner={<Spinner size="sm" />}
            isDisabled={!form.motivo || !form.telefono}
          >
            <PaperPlane className="size-4 mr-1" />
            Enviar solicitud
          </Button>
        </div>
      </Card>
    </div>
  )
}

export default PaginaSolicitarDueno
