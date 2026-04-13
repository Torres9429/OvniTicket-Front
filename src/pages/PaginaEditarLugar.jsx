import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useFormik } from 'formik'
import * as Yup from 'yup'
import {
  Button,
  Card,
  Input,
  toast,
  Spinner,
} from '@heroui/react'
import { Pencil, ArrowLeft } from '@gravity-ui/icons'
import ContenedorIcono from '../components/ContenedorIcono'
import { useAutenticacion } from '../hooks/usarAutenticacion'
import { obtenerLugar, actualizarLugar as actualizarLugarApi } from '../services/lugares.api'
import { obtenerLayoutUltimaVersion } from '../services/layouts.api'
import { EditorLayout } from '../components/editorLayout'

const esquemaValidacion = Yup.object().shape({
  nombre: Yup.string()
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(100, 'El nombre no puede exceder 100 caracteres')
    .required('El nombre es obligatorio'),
  ciudad: Yup.string()
    .min(2, 'La ciudad debe tener al menos 2 caracteres')
    .max(100, 'La ciudad no puede exceder 100 caracteres')
    .required('La ciudad es obligatoria'),
  pais: Yup.string()
    .min(2, 'El pais debe tener al menos 2 caracteres')
    .max(100, 'El pais no puede exceder 100 caracteres')
    .required('El pais es obligatorio'),
  direccion: Yup.string()
    .min(5, 'La direccion debe tener al menos 5 caracteres')
    .max(200, 'La direccion no puede exceder 200 caracteres')
    .required('La direccion es obligatoria'),
  estatus: Yup.string()
    .oneOf(['BORRADOR', 'PUBLICADO', 'INHABILITADO'], 'Estatus invalido')
    .required('El estatus es obligatorio'),
})

function PaginaEditarLugar() {
  const { usuario } = useAutenticacion()
  const navigate = useNavigate()
  const { id: lugarId } = useParams()
  const [lugar, setLugar] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [pasoActivo, setPasoActivo] = useState(0)
  const [paso0Cargando, setPaso0Cargando] = useState(false)
  const [paso0Error, setPaso0Error] = useState('')
  const [idLayoutExistente, setIdLayoutExistente] = useState(null)
  const [layoutInicial, setLayoutInicial] = useState(null)
  const idDuenoActual = usuario?.idUsuario || usuario?.id_usuario || usuario?.id || lugar?.id_dueno || null

  useEffect(() => {
    let montado = true

    async function cargarLugar() {
      try {
        const encontrado = await obtenerLugar(lugarId)
        if (!montado) return

        if (!encontrado) {
          navigate('/mis-lugares')
          return
        }

        setLugar(encontrado)

        // Buscar la ultima version del layout y pasar el snapshot al editor
        try {
          const layoutDelLugar = await obtenerLayoutUltimaVersion(lugarId, { includeDrafts: true })
          if (layoutDelLugar && montado) {
            const layoutPlano = layoutDelLugar.layout || layoutDelLugar
            setIdLayoutExistente(layoutDelLugar.id_layout || layoutPlano.id_layout || layoutPlano.id)
            setLayoutInicial(layoutPlano)
          }
        } catch {
          // No hay layout, se creará uno nuevo
        }

        setCargando(false)
      } catch {
        if (montado) {
          navigate('/mis-lugares')
        }
      }
    }

    cargarLugar()

    return () => {
      montado = false
    }
  }, [lugarId, usuario, navigate])

  const formik = useFormik({
    initialValues: {
      nombre: lugar?.nombre || '',
      ciudad: lugar?.ciudad || '',
      pais: lugar?.pais || '',
      direccion: lugar?.direccion || '',
      estatus: lugar?.estatus || 'BORRADOR',
    },
    validationSchema: esquemaValidacion,
    enableReinitialize: true,
    onSubmit: () => {},
  })

  const handleSiguiente = async () => {
    setPaso0Error('')
    const errores = await formik.validateForm()
    if (errores.nombre || errores.ciudad || errores.pais || errores.direccion || errores.estatus) {
      formik.setTouched({
        nombre: true,
        ciudad: true,
        pais: true,
        direccion: true,
        estatus: true,
      })
      return
    }
    setPaso0Cargando(true)
    try {
      if (!idDuenoActual) {
        throw new Error('No se pudo determinar el dueño del lugar (id_dueno).')
      }

      await actualizarLugarApi(lugarId, {
        nombre: formik.values.nombre,
        ciudad: formik.values.ciudad,
        pais: formik.values.pais,
        direccion: formik.values.direccion,
        estatus: formik.values.estatus,
        id_dueno: idDuenoActual,
      })
      toast.success('Lugar actualizado correctamente')
      setPasoActivo(1)
    } catch (error) {
      setPaso0Error(
        error?.message ||
          'No se pudo actualizar el lugar. Verifica los datos e intenta nuevamente.'
      )
    } finally {
      setPaso0Cargando(false)
    }
  }

  const handleVolverADatos = () => {
    setPasoActivo(0)
  }

  const pasos = ['Datos e imagen', 'Mapa y zonas']

  if (cargando) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[300px]">
        <Spinner size="lg" />
        <p className="mt-4 text-muted">Cargando lugar...</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button
          isIconOnly
          variant="flat"
          onPress={() => navigate('/mis-lugares')}
        >
          <ArrowLeft className="size-5" />
        </Button>
        <h1 className="text-2xl font-bold">Editar Lugar</h1>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-4 mb-6">
        {pasos.map((paso, index) => (
          <div key={paso} className="flex items-center">
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                index <= pasoActivo
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-default text-default-foreground'
              }`}
            >
              {index + 1}
            </div>
            <span
              className={`ml-2 text-sm ${
                index <= pasoActivo ? 'text-primary font-medium' : 'text-muted'
              }`}
            >
              {paso}
            </span>
            {index < pasos.length - 1 && (
              <div className="w-8 h-px bg-border mx-2" />
            )}
          </div>
        ))}
      </div>

      {pasoActivo === 0 && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSiguiente()
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {paso0Error && (
              <div className="md:col-span-2">
                <div className="p-4 bg-danger/10 text-danger rounded-lg">
                  {paso0Error}
                </div>
              </div>
            )}

            <Card className="p-4">
              <h3 className="text-lg font-semibold mb-4">Ubicacion y estado</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Ciudad *
                  </label>
                  <Input
                    name="ciudad"
                    placeholder="Ciudad"
                    value={formik.values.ciudad}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                  />
                  {formik.touched.ciudad && formik.errors.ciudad && (
                    <p className="mt-1 text-xs text-danger">{formik.errors.ciudad}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Pais *
                  </label>
                  <Input
                    name="pais"
                    placeholder="Pais"
                    value={formik.values.pais}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                  />
                  {formik.touched.pais && formik.errors.pais && (
                    <p className="mt-1 text-xs text-danger">{formik.errors.pais}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Estatus *
                  </label>
                  <select
                    name="estatus"
                    value={formik.values.estatus}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    className="w-full px-3 py-2 border rounded border-default-300 bg-transparent text-sm"
                  >
                    <option value="BORRADOR">BORRADOR</option>
                    <option value="PUBLICADO">PUBLICADO</option>
                    <option value="INHABILITADO">INHABILITADO</option>
                  </select>
                  {formik.touched.estatus && formik.errors.estatus && (
                    <p className="mt-1 text-xs text-danger">{formik.errors.estatus}</p>
                  )}
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="text-lg font-semibold mb-4">Informacion del lugar</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Nombre *
                  </label>
                  <Input
                    name="nombre"
                    placeholder="Nombre del lugar"
                    value={formik.values.nombre}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                  />
                  {formik.touched.nombre && formik.errors.nombre && (
                    <p className="mt-1 text-xs text-danger">{formik.errors.nombre}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Direccion *
                  </label>
                  <Input
                    name="direccion"
                    placeholder="Direccion del lugar"
                    value={formik.values.direccion}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                  />
                  {formik.touched.direccion && formik.errors.direccion && (
                    <p className="mt-1 text-xs text-danger">{formik.errors.direccion}</p>
                  )}
                </div>
              </div>
            </Card>
          </div>

          <div className="flex gap-2 justify-end mt-6">
            <Button variant="flat" onPress={() => navigate('/mis-lugares')}>
              Cancelar
            </Button>
            <Button
              color="primary"
              type="button"
              onPress={handleSiguiente}
              isLoading={paso0Cargando}
              spinner={<Spinner size="sm" />}
            >
              {paso0Cargando ? 'Guardando...' : 'Siguiente: mapa y zonas'}
            </Button>
          </div>
        </form>
      )}

      {pasoActivo === 1 && (
        <div className="space-y-4">
          <EditorLayout
            idLugar={Number(lugarId)}
            idDueno={idDuenoActual}
            venueInicial={lugar}
            idLayoutExistente={idLayoutExistente}
            layoutInicial={layoutInicial}
            onVolver={handleVolverADatos}
            onGuardado={(nuevoIdLayout) => {
              setIdLayoutExistente(nuevoIdLayout)
              toast.success('Layout guardado correctamente')
            }}
          />
          <div className="flex gap-2 justify-end">
            <Button color="primary" onPress={() => navigate('/mis-lugares')}>
              Ir a mis lugares
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default PaginaEditarLugar