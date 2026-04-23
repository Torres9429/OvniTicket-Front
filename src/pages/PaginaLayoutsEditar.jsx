import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast, Spinner } from '@heroui/react'
import { getVenue } from '../services/lugares.api'
import { getLayout } from '../services/layouts.api'
import { EditorLayout } from '../components/editorLayout'

function PaginaLayoutsEditar() {
  const navigate = useNavigate()
  const { idLugar, idLayout } = useParams()

  const [venue, setVenue] = useState(null)
  const [loading, setLoading] = useState(true)
  const [existingLayoutId, setExistingLayoutId] = useState(null)
  const [initialLayout, setInitialLayout] = useState(null)

  const returnPath = `/lugares/${idLugar}/layouts`

  useEffect(() => {
    let mounted = true

    async function loadData() {
      try {
        const venueData = await getVenue(idLugar)
        if (!mounted) return

        if (!venueData) {
          navigate(returnPath)
          return
        }

        setVenue(venueData)

        // If idLayout is a real ID (not 'crear'), load that layout; otherwise creation mode
        if (idLayout && idLayout !== 'crear') {
          try {
            const layoutData = await getLayout(idLayout)
            if (layoutData && mounted) {
              const flatLayout = layoutData.layout || layoutData
              setExistingLayoutId(
                layoutData.id_layout ||
                  flatLayout.id_layout ||
                  flatLayout.id,
              )
              setInitialLayout(flatLayout)
            }
          } catch {
            toast.danger('No se pudo cargar el layout', {
              description: 'Verifica que el layout exista e intenta de nuevo.',
            })
          }
        }

        setLoading(false)
      } catch {
        if (mounted) {
          toast.danger('No se pudo cargar el lugar', {
            description: 'Verifica que el lugar exista e intenta de nuevo.',
          })
          navigate(returnPath)
        }
      }
    }

    loadData()

    return () => {
      mounted = false
    }
  }, [idLugar, idLayout, navigate, returnPath])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-52 text-muted-foreground text-sm">
        <Spinner color="current" size="sm" />
      </div>
    )
  }

  return (
    <EditorLayout
      venueId={Number(idLugar)}
      initialVenue={venue}
      existingLayoutId={existingLayoutId}
      initialLayout={initialLayout}
      onGoBack={() => navigate(returnPath)}
      onSaved={(newLayoutId) => {
        setExistingLayoutId(newLayoutId)
        toast.success('Layout guardado correctamente', {
          description:
            'Los cambios del layout se guardaron exitosamente.',
        })
      }}
    />
  )
}

export default PaginaLayoutsEditar
