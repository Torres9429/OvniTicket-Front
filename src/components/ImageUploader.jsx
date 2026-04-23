import { useRef, useState } from 'react'
import { Button, FieldError, Label, Spinner } from '@heroui/react'
import { uploadImage } from '../services/cloudinary'

/**
 * Componente reutilizable para subir imágenes a Cloudinary (unsigned upload).
 *
 * Props:
 *   value     {string}   URL actual de la imagen (controlado externamente)
 *   onChange  {function} Llamada con la nueva URL tras subir, o '' al limpiar
 *   isInvalid {boolean}  Aplica estilos de error al dropzone
 *   error     {string}   Mensaje de error externo (ej. validación del formulario)
 */
export default function ImageUploader({ value = '', onChange, isInvalid = false, error }) {
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const inputRef = useRef(null)

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const localPreview = URL.createObjectURL(file)
    setPreviewUrl(localPreview)
    setUploadError(null)
    setUploading(true)

    try {
      const url = await uploadImage(file)
      onChange(url)
    } catch (err) {
      setUploadError(err.message)
      setPreviewUrl(null)
      onChange('')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleClear = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setUploadError(null)
    onChange('')
    if (inputRef.current) inputRef.current.value = ''
  }

  const displayUrl = previewUrl || value

  return (
    <div className="flex flex-col gap-2 w-full">
      <Label>Foto del evento</Label>

      {displayUrl ? (
        <div className="flex flex-col gap-2">
          <div className="relative w-full rounded-lg overflow-hidden border border-default-200 bg-default-50" style={{ aspectRatio: '16/9' }}>
            <img
              src={displayUrl}
              alt="Vista previa"
              className="w-full h-full object-cover"
            />
            {uploading && (
              <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-2">
                <Spinner color="white" size="sm" />
                <span className="text-white text-xs font-medium">Subiendo imagen...</span>
              </div>
            )}
            {!uploading && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs transition-colors"
                aria-label="Quitar imagen"
              >
                ✕
              </button>
            )}
          </div>
          {!uploading && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="self-start"
              onPress={() => inputRef.current?.click()}
            >
              Cambiar imagen
            </Button>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => !uploading && inputRef.current?.click()}
          disabled={uploading}
          className={[
            'w-full border-2 border-dashed rounded-lg px-4 py-8',
            'flex flex-col items-center justify-center gap-2 transition-colors',
            isInvalid
              ? 'border-danger-400 bg-danger-50/20'
              : 'border-default-300 hover:border-primary-400 hover:bg-primary-50/10',
            uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
          ].join(' ')}
        >
          {uploading ? (
            <>
              <Spinner color="current" size="sm" />
              <span className="text-sm text-muted-foreground">Subiendo...</span>
            </>
          ) : (
            <>
              <span className="text-3xl select-none">🖼</span>
              <span className="text-sm text-muted-foreground font-medium">Selecciona una imagen</span>
              <span className="text-xs text-muted-foreground/70">JPG, PNG o WEBP · máx. 5 MB</span>
            </>
          )}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
      />

      {(uploadError || error) && (
        <FieldError>{uploadError || error}</FieldError>
      )}
    </div>
  )
}
