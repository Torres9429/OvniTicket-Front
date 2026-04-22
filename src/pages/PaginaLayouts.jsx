import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Button,
  Chip,
  Label,
  toast,
} from '@heroui/react';
import {
  Pencil,
  SquareCheck,
  SquareMinus,
  ArrowShapeTurnUpLeft,
} from '@gravity-ui/icons';
import PaginaAdmin from '../components/PaginaAdmin';
import { EditorCanvas } from '../components/editorLayout';
import { normalizeLayoutZones } from '../components/editorLayout/layoutModel';
import { getVenue } from '../services/lugares.api';
import {
  getLayoutsByVenue,
  getLayout,
  deactivateLayout,
} from '../services/layouts.api';

const STATUS_COLOR = {
  BORRADOR: 'warning',
  PUBLICADO: 'accent',
};

const columns = [
  { key: 'version', label: 'Versión' },
  { key: 'grid', label: 'Cuadrícula' },
];

const formatReadableDate = (dateString) => {
  if (!dateString) return null;
  const isDatetime = dateString.includes("T");
  const dateWithTime = isDatetime ? dateString : dateString + "T12:00:00";
  const date = new Date(dateWithTime);
  const options = isDatetime
    ? {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    : { day: "numeric", month: "long", year: "numeric" };
  return date.toLocaleDateString("es-MX", options);
};

export default function PaginaLayouts() {
  const navigate = useNavigate();
  const { idLugar } = useParams();

  const [venue, setVenue] = useState(null);

  useEffect(() => {
    async function loadVenue() {
      try {
        const data = await getVenue(idLugar);
        setVenue(data);
      } catch {
        toast.danger('Error al cargar el lugar', {
          description: 'No se pudo obtener la información del lugar.',
        });
      }
    }
    loadVenue();
  }, [idLugar]);

  const fetchData = useCallback(async () => {
    const data = await getLayoutsByVenue(idLugar);
    return Array.isArray(data) ? data : [];
  }, [idLugar]);

  const handleToggleStatus = async (item, currentStatus) => {
    if (currentStatus === 'PUBLICADO' || currentStatus === 'BORRADOR') {
      await deactivateLayout(item.id_layout);
    }
    return 'Estatus del layout actualizado correctamente';
  };

  const handleDelete = async (item) => {
    await deactivateLayout(item.id_layout);
  };

  const handleViewDetail = async (item) => {
    setDetailLoading(true);
    try {
      const data = await getLayout(item.id_layout);
      setLocalDetailRecord(data);
      return data;
    } finally {
      setDetailLoading(false);
    }
  };

  const handleGoToEditor = (item) => {
    navigate(`/lugares/${idLugar}/layouts/${item.id_layout}`);
  };

  const handleCreateLayout = () => {
    navigate(`/lugares/${idLugar}/layouts/0`);
  };

  const renderCell = (item, key) => {
    if (key === 'version') {
      return <span className="font-medium">v{item.version}</span>;
    }
    if (key === 'grid') {
      return `${item.grid_rows} × ${item.grid_cols}`;
    }
    return item[key];
  };

  const renderExtraActions = (item) => (
    <Button
      variant="ghost"
      isIconOnly
      size="sm"
      onPress={() => handleGoToEditor(item)}
      aria-label="Editar layout"
    >
      <Pencil />
    </Button>
  );

  const renderDetail = ({ detailRecord, onClose }) => (
    <div className="flex flex-col gap-5 w-full pt-6 pb-6">
      <div
        className="overflow-hidden rounded-xl border border-divider"
        style={{ height: 280 }}
      >
        <EditorCanvas
          layout={normalizeLayoutZones(detailRecord?.layout_data || {})}
          selectedItem={null}
          onSelectSection={() => {}}
          onSelectElement={() => {}}
          onMoveSection={() => {}}
          onResizeSection={() => {}}
          onMoveElement={() => {}}
          onClearSelection={() => {}}
          onRequestSectionEdit={() => {}}
        />
      </div>

      <div className="flex justify-between items-center">
        <Label className="text-sm font-medium">Estado del layout:</Label>
        <Chip
          color={STATUS_COLOR[detailRecord.estatus] || 'default'}
          variant="soft"
        >
          {detailRecord.estatus === 'PUBLICADO' ? <SquareCheck /> : <SquareMinus />}
          <Chip.Label className="uppercase">
            {detailRecord.estatus || 'no definido'}
          </Chip.Label>
        </Chip>
      </div>

      <div className="flex flex-col gap-1">
        <Label className="text-sm">Versión</Label>
        <span className="text-sm">{detailRecord.version}</span>
      </div>

      <div className="flex flex-col gap-1">
        <Label className="text-sm">Cuadrícula</Label>
        <span className="text-sm">
          {detailRecord.grid_rows} × {detailRecord.grid_cols}
        </span>
      </div>

      <div className="flex flex-col gap-1">
        <Label className="text-sm">Fecha de creación</Label>
        <span className="text-sm">
          {detailRecord.fecha_creacion
            ? formatReadableDate(detailRecord.fecha_creacion)
            : '—'}
        </span>
      </div>

      <div className="flex flex-col gap-1">
        <Label className="text-sm">Última actualización</Label>
        <span className="text-sm">
          {detailRecord.fecha_actualizacion
            ? formatReadableDate(detailRecord.fecha_actualizacion)
            : '—'}
        </span>
      </div>

      <div className="flex gap-2 w-full mt-4">
        <Button variant="ghost" onPress={onClose}>
          Cerrar
        </Button>
        <Button
          onPress={() => {
            onClose();
            handleGoToEditor(detailRecord);
          }}
          fullWidth
        >
          <Pencil />
          Editar layout
        </Button>
      </div>
    </div>
  );

  const headerActions = (
    <Button
      aria-label="Volver a mis lugares"
      variant="ghost"
      onPress={() => navigate('/lugares')}
    >
      <ArrowShapeTurnUpLeft />
      Regresar
    </Button>
  );

  const pageTitle = venue ? `Layouts de ${venue.nombre}` : 'Layouts';

  return (
    <PaginaAdmin
      title={pageTitle}
      subtitle="Administra los layouts del lugar"
      fetchData={fetchData}
      columns={columns}
      renderCell={renderCell}
      renderRowActions={renderExtraActions}
      idField="id_layout"
      getItemName={(item) => `v${item.version}`}
      onCreate={handleCreateLayout}
      onViewDetail={handleViewDetail}
      onToggleStatus={handleToggleStatus}
      onDelete={handleDelete}
      renderDetail={renderDetail}
      statusField="estatus"
      activeStatusValue="PUBLICADO"
      createButtonText="Crear layout"
      enableEdit={false}
      headerActions={headerActions}
    />
  );
}