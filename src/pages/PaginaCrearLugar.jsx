import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFormik } from 'formik'
import * as Yup from 'yup'
import {
  Button,
  Card,
  Input,
  toast,
  Spinner,
} from '@heroui/react'
import { Plus, ArrowLeft } from '@gravity-ui/icons'
import ContenedorIcono from '../components/ContenedorIcono'
import { usarAutenticacion } from '../hooks/usarAutenticacion'
import { crearLugar } from '../services/lugares.api'
import { EditorLayout } from '../components/editorLayout'

const IMAGEN_PLACEHOLDER = 'https://via.placeholder.com/400x280?text=Sin+Imagen'

const esquemaValidacion = Yup.object().shape({
  nombre: Yup.string()
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(100, 'El nombre no puede exceder 100 caracteres')
    .required('El nombre es obligatorio'),
  direccion: Yup.string()
    .min(5, 'La direccion debe tener al menos 5 caracteres')
    .max(200, 'La direccion no puede exceder 200 caracteres')
    .required('La direccion es obligatoria'),
  capacidad: Yup.number()
    .typeError('La capacidad debe ser un numero')
    .integer('La capacidad debe ser un numero entero')
    .min(1, 'La capacidad debe ser al menos 1')
    .max(100000, 'La capacidad no puede exceder 100,000')
    .required('La capacidad es obligatoria'),
  foto: Yup.string()
    .transform((v) => (v === '' || v === undefined ? null : v))
    .nullable()
    .url('Debe ser una URL valida'),
})

function PaginaCrearLugar() {
  const { usuario } = usarAutenticacion()
  const navigate = useNavigate()
  const [pasoActivo, setPasoActivo] = useState(0)
  const [idLugarEditor, setIdLugarEditor] = useState(null)
  const [paso0Cargando, setPaso0Cargando] = useState(false)
  const [paso0Error, setPaso0Error] = useState('')

  const formik = useFormik({
    initialValues: {
      nombre: '',
      direccion: '',
      capacidad: '',
      foto: '',
    },
    validationSchema: esquemaValidacion,
    onSubmit: () => {},
  })

  const vistaPreviaFoto =
    (formik.values.foto && formik.values.foto.trim()) || IMAGEN_PLACEHOLDER

  const handleSiguiente = async () => {
    setPaso0Error('')
    const errores = await formik.validateForm()
    if (errores.nombre || errores.direccion || errores.capacidad || errores.foto) {
      formik.setTouched({
        nombre: true,
        direccion: true,
        capacidad: true,
        foto: true,
      })
      return
    }
    setPaso0Cargando(true)
    try {
      const datosLugar = {
        nombre: formik.values.nombre,
        direccion: formik.values.direccion,
        capacidad: Number(formik.values.capacidad),
        foto: formik.values.foto || '',
        id_dueno: usuario?.id_usuario || usuario?.id,
      }
      const lugarCreado = await crearLugar(datosLugar)
      if (lugarCreado?.id_lugar) {
        setIdLugarEditor(lugarCreado.id_lugar)
        setPasoActivo(1)
        toast.success('Lugar creado. Ahora configura el mapa de asientos.')
      }
    } catch (error) {
      setPaso0Error(
        error?.message ||
          'No se pudo guardar el lugar. Verifica los datos e intenta nuevamente.'
      )
    } finally {
      setPaso0Cargando(false)
    }
  }

  const handleVolverADatos = () => {
    setPasoActivo(0)
  }

  const pasos = ['Datos e imagen', 'Mapa y zonas']

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
        <h1 className="text-2xl font-bold">Crear Nuevo Lugar</h1>
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
              <h3 className="text-lg font-semibold mb-4">Imagen del lugar</h3>
              <img
                src={vistaPreviaFoto}
                alt="Vista previa"
                className="w-full h-48 object-cover rounded-lg mb-4"
                onError={(e) => {
                  e.target.src = IMAGEN_PLACEHOLDER
                }}
              />
              <label className="text-sm font-medium mb-1 block">
                URL de la foto (opcional)
              </label>
              <Input
                name="foto"
                placeholder="https://ejemplo.com/foto.jpg"
                value={formik.values.foto}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                isInvalid={formik.touched.foto && Boolean(formik.errors.foto)}
                errorMessage={formik.errors.foto}
              />
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
                    isInvalid={formik.touched.nombre && Boolean(formik.errors.nombre)}
                    errorMessage={formik.errors.nombre}
                  />
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
                    isInvalid={formik.touched.direccion && Boolean(formik.errors.direccion)}
                    errorMessage={formik.errors.direccion}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Capacidad *
                  </label>
                  <Input
                    name="capacidad"
                    type="number"
                    placeholder="Capacidad maxima"
                    value={formik.values.capacidad}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    isInvalid={formik.touched.capacidad && Boolean(formik.errors.capacidad)}
                    errorMessage={formik.errors.capacidad}
                  />
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
              type="submit"
              isLoading={paso0Cargando}
              spinner={<Spinner size="sm" />}
            >
              {paso0Cargando ? 'Guardando...' : 'Siguiente: mapa y zonas'}
            </Button>
          </div>
        </form>
      )}

      {pasoActivo === 1 && idLugarEditor && (
        <div className="space-y-4">
          <EditorLayout
            idLugar={idLugarEditor}
            idDueno={usuario?.id_usuario || usuario?.id}
            onGuardado={() => {
              toast.success('Layout guardado correctamente')
            }}
          />
          <div className="flex gap-2 justify-end">
            <Button variant="flat" onPress={handleVolverADatos}>
              Volver a datos
            </Button>
            <Button color="primary" onPress={() => navigate('/mis-lugares')}>
              Ir a mis lugares
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default PaginaCrearLugar
