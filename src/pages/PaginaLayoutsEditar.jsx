import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast, Spinner } from '@heroui/react'
import { getVenue } from '../services/lugares.api'
import { getLayout } from '../services/layouts.api'
import { EditorLayout } from '../components/editorLayout'
import { useAuth } from '../hooks/useAuth'

function PaginaLayoutsEditar() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { idLugar, idLayout } = useParams()

  const [venue, setVenue] = useState(null)
  const [loading, setLoading] = useState(true)
  const [existingLayoutId, setExistingLayoutId] = useState(null)
  const [initialLayout, setInitialLayout] = useState(null)

  const currentOwnerId =
    user?.userId || user?.id_usuario || user?.id || null

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

        // If idLayout is a real ID, load that layout; if '0', creation mode
        if (idLayout && idLayout !== '0') {
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
  }, [idLugar, idLayout, navigate])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-52 text-muted-foreground text-sm">
        <Spinner color="current" size="sm" />
      </div>
    )
  }

  return (
    <EditorLayout
      idLugar={Number(idLugar)}
      idDueno={currentOwnerId}
      venueInicial={venue}
      idLayoutExistente={existingLayoutId}
      layoutInicial={initialLayout}
      onVolver={() => navigate(returnPath)}
      onGuardado={(newLayoutId) => {
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
