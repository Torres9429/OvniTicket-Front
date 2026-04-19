import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Button,
  Label,
  ListBox,
  Modal,
  Select,
} from '@heroui/react';
import { LayoutCells } from '@gravity-ui/icons';

export default function SectionConfigDialog({ open, section, zones, onClose, onSave }) {
  const [name, setName] = useState('');
  const [zoneId, setZoneId] = useState('');
  const [numRows, setNumRows] = useState(3);
  const [seatsPerRow, setSeatsPerRow] = useState(8);

  useEffect(() => {
    if (!open) return;
    setName(section?.nombre || '');
    setZoneId(section?.zoneId ? String(section.zoneId) : '');
    setNumRows(section?.numRows || section?.rows?.length || 3);
    setSeatsPerRow(section?.seatsPerRow || section?.rows?.[0]?.seats?.length || 8);
  }, [open, section]);

  const handleSave = () => {
    onSave({
      nombre: name.trim(),
      zoneId: zoneId || null,
      numRows: Math.max(1, Number(numRows) || 1),
      seatsPerRow: Math.max(1, Number(seatsPerRow) || 1),
    });
  };

  return (
    <Modal isOpen={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-[420px]">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Icon className="bg-default text-foreground">
                <LayoutCells className="size-5" />
              </Modal.Icon>
              <Modal.Heading>Configurar sección</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <p className="mb-4 text-sm text-muted">
                La sección se reconstruye al cambiar filas o asientos por fila.
              </p>
              <div className="flex flex-col gap-4">
                <div>
                  <label htmlFor="section-name" className="mb-1 block text-sm font-medium text-foreground">Nombre</label>
                  <input
                    id="section-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej: A, B, Platea..."
                    className="w-full rounded-xl border border-divider bg-surface-secondary px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                  />
                </div>

                <Select
                  aria-label="Zona asignada"
                  className="w-full"
                  placeholder="Sin zona"
                  value={zoneId || ''}
                  onChange={(val) => setZoneId(val ? String(val) : '')}
                >
                  <Label>Zona</Label>
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      <ListBox.Item id="" textValue="Sin zona">
                        Sin zona
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                      {(zones || []).map((zone) => (
                        <ListBox.Item key={zone.id} id={String(zone.id)} textValue={zone.nombre}>
                          <div className="flex items-center gap-2">
                            <div
                              className="size-3 rounded-full"
                              style={{ backgroundColor: zone.color }}
                            />
                            {zone.nombre}
                          </div>
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="section-rows" className="mb-1 block text-sm font-medium text-foreground">Filas</label>
                    <input
                      id="section-rows"
                      type="number"
                      min={1}
                      max={50}
                      value={numRows}
                      onChange={(e) => setNumRows(e.target.value)}
                      className="w-full rounded-xl border border-divider bg-surface-secondary px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label htmlFor="section-seats" className="mb-1 block text-sm font-medium text-foreground">Asientos / fila</label>
                    <input
                      id="section-seats"
                      type="number"
                      min={1}
                      max={50}
                      value={seatsPerRow}
                      onChange={(e) => setSeatsPerRow(e.target.value)}
                      className="w-full rounded-xl border border-divider bg-surface-secondary px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                    />
                  </div>
                </div>
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button slot="close" variant="secondary">
                Cancelar
              </Button>
              <Button onPress={handleSave}>
                Guardar
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

SectionConfigDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  section: PropTypes.shape({
    nombre: PropTypes.string,
    zoneId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    rows: PropTypes.array,
    numRows: PropTypes.number,
    seatsPerRow: PropTypes.number,
  }),
  zones: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    nombre: PropTypes.string.isRequired,
    color: PropTypes.string,
  })),
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
};
