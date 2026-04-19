import { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Button,
  ColorArea,
  ColorField,
  ColorPicker,
  ColorSlider,
  ColorSwatch,
  ColorSwatchPicker,
  Disclosure,
  Drawer,
  Input,
  Label,
  ListBox,
  Select,
  Separator,
  TextField,
  parseColor,
} from '@heroui/react';
import { Palette, Plus, Pencil, PencilToSquare, TrashBin, LayoutCells, LayoutCellsLarge, ArrowShapeTurnUpRight, Sliders } from '@gravity-ui/icons';

const COLOR_PRESETS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e',
];

const DEFAULT_FORM = {
  nombre: '',
  color: '#3b82f6',
  precio: 0,
};
let fallbackShuffleCounter = 0;

function safeParseColor(hex) {
  try {
    return parseColor(hex || '#3b82f6');
  } catch {
    return parseColor('#3b82f6');
  }
}

function secureRandomInt(maxExclusive) {
  if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) return 0;
  const cryptoObj = globalThis.crypto;
  if (!cryptoObj?.getRandomValues) {
    fallbackShuffleCounter = (fallbackShuffleCounter + 1) % Number.MAX_SAFE_INTEGER;
    return fallbackShuffleCounter % maxExclusive;
  }

  const maxUint32 = 0x100000000;
  const threshold = maxUint32 - (maxUint32 % maxExclusive);
  const bytes = new Uint32Array(1);

  do {
    cryptoObj.getRandomValues(bytes);
  } while (bytes[0] >= threshold);

  return bytes[0] % maxExclusive;
}

export default function ZonePanel({
  zones,
  sections,
  onAddZone,
  onUpdateZone,
  onDeleteZone,
  onAssignSectionZone,
}) {
  const [panelExpanded, setPanelExpanded] = useState(true);
  const [zonesExpanded, setZonesExpanded] = useState(true);
  const [sectionsExpanded, setSectionsExpanded] = useState(true);
  const [allSectionsExpanded, setAllSectionsExpanded] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingZoneId, setEditingZoneId] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [pickerColor, setPickerColor] = useState(safeParseColor('#3b82f6'));

  useEffect(() => {
    if (!modalOpen) {
      setEditingZoneId(null);
      setForm(DEFAULT_FORM);
      setPickerColor(safeParseColor('#3b82f6'));
    }
  }, [modalOpen]);

  useEffect(() => {
    try {
      setForm((prev) => ({ ...prev, color: pickerColor.toString('hex') }));
    } catch {
      // ignore color parse errors
    }
  }, [pickerColor]);

  const sectionsWithoutZone = useMemo(
    () => (sections || []).filter((s) => !s.zoneId),
    [sections],
  );

  const sectionsWithZone = useMemo(
    () => (sections || []).filter((s) => s.zoneId),
    [sections],
  );

  const openCreate = () => {
    setEditingZoneId(null);
    setForm(DEFAULT_FORM);
    setPickerColor(safeParseColor('#3b82f6'));
    setModalOpen(true);
  };

  const openEdit = (zone) => {
    setEditingZoneId(zone.id);
    setForm({
      nombre: zone.nombre || '',
      color: zone.color || '#3b82f6',
      precio: Number(zone.precio ?? 0),
    });
    setPickerColor(safeParseColor(zone.color || '#3b82f6'));
    setModalOpen(true);
  };

  const shuffleColor = () => {
    const h = secureRandomInt(360);
    const s = 50 + secureRandomInt(50);
    const l = 40 + secureRandomInt(30);
    setPickerColor(parseColor(`hsl(${h}, ${s}%, ${l}%)`));
  };

  const handleSubmit = () => {
    if (!form.nombre.trim()) return;
    const payload = {
      nombre: form.nombre.trim(),
      color: form.color,
      precio: Number(form.precio) || 0,
    };

    if (editingZoneId) {
      onUpdateZone(editingZoneId, payload);
    } else {
      onAddZone(payload);
    }
    setModalOpen(false);
  };

  return (
    <div className="absolute bottom-3 right-3 z-15 flex max-h-[80%] w-96 flex-col gap-0 overflow-y-auto no-scrollbar rounded-2xl bg-surface p-3">
      <Disclosure
        isExpanded={panelExpanded}
        onExpandedChange={setPanelExpanded}
      >
        <Disclosure.Heading className="p-0">
          <Button
            className="w-full justify-between px-5 py-3"
            slot="trigger"
            variant="ghost"
          >
            <div className="flex gap-2 items-center">
              <Sliders />
              Layout settings
            </div>
            <Disclosure.Indicator />
          </Button>
          <p className="text-sm text-muted px-5 pb-3">
            Use the wheel to zoom and drag the background to move the view
          </p>
        </Disclosure.Heading>
        <Disclosure.Content>
          <Disclosure.Body className="flex flex-col gap-0 p-0">
            <Disclosure
              isExpanded={zonesExpanded}
              onExpandedChange={setZonesExpanded}
            >
              <Disclosure.Heading>
                <Button
                  fullWidth
                  className="justify-between rounded-xl"
                  slot="trigger"
                  variant="ghost"
                >
                  <span className="flex items-center gap-2 text-sm">
                    <Palette />
                    Zones ({(zones || []).length})
                  </span>
                  <Disclosure.Indicator />
                </Button>
              </Disclosure.Heading>
              <Disclosure.Content>
                <Disclosure.Body className="flex flex-col gap-2 pt-1 pb-1 px-1 items-end">
                  {(zones || []).length === 0 && (
                    <p className="text-xs text-muted w-full text-center py-3">
                      No zones created.
                    </p>
                  )}

                  {(zones || []).map((zone) => {
                    const totalSections = (sections || []).filter(
                      (s) => String(s.zoneId) === String(zone.id),
                    ).length;
                    return (
                      <div
                        key={zone.id}
                        className="flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 transition-colors hover:border-divider"
                        style={{ backgroundColor: zone.color + "18" }}
                      >
                        <div
                          className="size-9 shrink-0 rounded-full shadow-sm"
                          style={{
                            backgroundColor: zone.color,
                            border: `2px solid ${zone.color}44`,
                          }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {zone.nombre}
                          </p>
                          <p className="text-xs text-muted">
                            {totalSections}{" "}
                            {totalSections === 1 ? "section" : "sections"} · $
                            {zone.precio || 0}
                          </p>
                        </div>
                        <div className="flex gap-0.5">
                          <Button
                            isIconOnly
                            aria-label="Edit zone"
                            size="sm"
                            className="bg-transparent"
                            variant="ghost"
                            onPress={() => openEdit(zone)}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            isIconOnly
                            aria-label="Delete zone"
                            size="sm"
                            variant="ghost"
                            className="bg-transparent"
                            onPress={() => onDeleteZone(zone.id)}
                          >
                            <TrashBin className="size-3.5 text-danger" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}

                  <Button
                    className="mt-1"
                    variant="tertiary"
                    size="sm"
                    onPress={openCreate}
                  >
                    <Plus />
                    Add zone
                  </Button>
                </Disclosure.Body>
              </Disclosure.Content>
            </Disclosure>

            <Separator className="my-1 mx-0" />

            <Disclosure
              isExpanded={sectionsExpanded}
              onExpandedChange={setSectionsExpanded}
            >
              <Disclosure.Heading>
                <Button
                  fullWidth
                  className="justify-between rounded-xl"
                  slot="trigger"
                  variant="ghost"
                >
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <LayoutCells className="size-4" />
                    Without zone ({sectionsWithoutZone.length})
                  </span>
                  <Disclosure.Indicator />
                </Button>
              </Disclosure.Heading>
              <Disclosure.Content>
                <Disclosure.Body className="flex flex-col gap-1.5 pt-1 pb-1 px-1">
                  {sectionsWithoutZone.length === 0 ? (
                    <p className="text-xs text-muted text-center py-3">
                      All sections have a zone.
                    </p>
                  ) : (
                    sectionsWithoutZone.map((section) => (
                      <div
                        key={section.id}
                        className="flex items-center gap-2 rounded-xl border border-divider bg-default/50 px-3 py-2"
                      >
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                          {section.nombre}
                        </span>
                        <Select
                          aria-label="Assign zone"
                          className="w-[140px]"
                          placeholder="Zone"
                          value={section.zoneId ? String(section.zoneId) : ""}
                          onChange={(val) =>
                            onAssignSectionZone(
                              section.id,
                              val ? String(val) : null,
                            )
                          }
                        >
                          <Select.Trigger>
                            <Select.Value />
                            <Select.Indicator />
                          </Select.Trigger>
                          <Select.Popover>
                            <ListBox>
                              <ListBox.Item id="" textValue="No zone">
                                No zone
                                <ListBox.ItemIndicator />
                              </ListBox.Item>
                              {(zones || []).map((z) => (
                                <ListBox.Item
                                  key={z.id}
                                  id={String(z.id)}
                                  textValue={z.nombre}
                                >
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="size-3 rounded-full"
                                      style={{ backgroundColor: z.color }}
                                    />
                                    {z.nombre}
                                  </div>
                                  <ListBox.ItemIndicator />
                                </ListBox.Item>
                              ))}
                            </ListBox>
                          </Select.Popover>
                        </Select>
                      </div>
                    ))
                  )}
                </Disclosure.Body>
              </Disclosure.Content>
            </Disclosure>

            <Separator className="my-1 mx-0" />

            <Disclosure
              isExpanded={allSectionsExpanded}
              onExpandedChange={setAllSectionsExpanded}
            >
              <Disclosure.Heading>
                <Button
                  fullWidth
                  className="justify-between rounded-xl"
                  slot="trigger"
                  variant="ghost"
                >
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <LayoutCellsLarge className="size-4" />
                    With zone ({sectionsWithZone.length})
                  </span>
                  <Disclosure.Indicator />
                </Button>
              </Disclosure.Heading>
              <Disclosure.Content>
                <Disclosure.Body className="flex flex-col gap-1.5 pt-1 pb-1 px-1">
                  {sectionsWithZone.length === 0 ? (
                    <p className="text-xs text-muted text-center py-3">
                      No section has an assigned zone.
                    </p>
                  ) : (
                    sectionsWithZone.map((section) => {
                      const currentZone = (zones || []).find(
                        (z) => String(z.id) === String(section.zoneId),
                      );
                      return (
                        <div
                          key={section.id}
                          className="flex items-center gap-2 rounded-xl border border-divider bg-default/50 px-3 py-2"
                        >
                          <div
                            className="size-4 shrink-0 rounded-full shadow-sm"
                            style={{
                              backgroundColor: currentZone?.color || "#888",
                            }}
                          />
                          <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                            {section.nombre}
                          </span>
                          <Select
                            aria-label="Change zone"
                            className="w-[140px]"
                            placeholder="Zone"
                            value={section.zoneId ? String(section.zoneId) : ""}
                            onChange={(val) =>
                              onAssignSectionZone(
                                section.id,
                                val ? String(val) : null,
                              )
                            }
                          >
                            <Select.Trigger>
                              <Select.Value />
                              <Select.Indicator />
                            </Select.Trigger>
                            <Select.Popover>
                              <ListBox>
                                <ListBox.Item id="" textValue="No zone">
                                  No zone
                                  <ListBox.ItemIndicator />
                                </ListBox.Item>
                                {(zones || []).map((z) => (
                                  <ListBox.Item
                                    key={z.id}
                                    id={String(z.id)}
                                    textValue={z.nombre}
                                  >
                                    <div className="flex items-center gap-2">
                                      <div
                                        className="size-3 rounded-full"
                                        style={{ backgroundColor: z.color }}
                                      />
                                      {z.nombre}
                                    </div>
                                    <ListBox.ItemIndicator />
                                  </ListBox.Item>
                                ))}
                              </ListBox>
                            </Select.Popover>
                          </Select>
                        </div>
                      );
                    })
                  )}
                </Disclosure.Body>
              </Disclosure.Content>
            </Disclosure>
          </Disclosure.Body>
        </Disclosure.Content>
      </Disclosure>

      <Drawer isOpen={modalOpen} onOpenChange={setModalOpen} aria-label="Zone form">
        <Drawer.Backdrop>
          <Drawer.Content placement="right">
            <Drawer.Dialog>
              {({ close }) => (
                <>
                  <Drawer.CloseTrigger />
                  <Drawer.Header>
                    <Drawer.Heading className="flex items-center gap-3">
                      <div className="flex flex-col gap-2">
                        <h3>{editingZoneId ? "Edit zone" : "Add zone"}</h3>
                        <p className="text-sm text-muted">
                          {editingZoneId
                            ? "Update zone information and save changes"
                            : "Configure the new zone for the layout"}
                        </p>
                      </div>
                    </Drawer.Heading>
                  </Drawer.Header>

                  <Drawer.Body className="flex flex-col relative no-scrollbar">
                    <div className="flex flex-col gap-5 w-full pt-6 pb-6">
                      <TextField
                        name="nombre"
                        aria-label="Zone name"
                        isRequired
                        fullWidth
                        variant="secondary"
                      >
                        <Label>Name</Label>
                        <Input
                          placeholder="E.g., VIP, General, Platinum..."
                          value={form.nombre}
                          onChange={(e) =>
                            setForm((prev) => ({ ...prev, nombre: e.target.value }))
                          }
                        />
                      </TextField>

                      <TextField
                        name="precio"
                        aria-label="Zone base price"
                        fullWidth
                        variant="secondary"
                      >
                        <Label>Base price</Label>
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          value={form.precio}
                          onChange={(e) =>
                            setForm((prev) => ({ ...prev, precio: e.target.value }))
                          }
                        />
                      </TextField>

                      <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-2">
                          <Label>Zone color</Label>
                        </div>
                        <ColorPicker value={pickerColor} onChange={setPickerColor} className='flex flex-col'>
                          <ColorSwatchPicker
                            className="justify-between w-full pb-2"
                            size="xs"
                          >
                            {COLOR_PRESETS.map((preset) => (
                              <ColorSwatchPicker.Item key={preset} color={preset}>
                                <ColorSwatchPicker.Swatch />
                              </ColorSwatchPicker.Item>
                            ))}
                          </ColorSwatchPicker>
                          <ColorArea
                            aria-label="Color area"
                            className="max-w-full"
                            colorSpace="hsb"
                            xChannel="saturation"
                            yChannel="brightness"
                          >
                            <ColorArea.Thumb />
                          </ColorArea>
                          <div className="flex items-center gap-2">
                            <ColorSlider
                              aria-label="Hue"
                              channel="hue"
                              className="flex-1"
                              colorSpace="hsb"
                            >
                              <ColorSlider.Track>
                                <ColorSlider.Thumb />
                              </ColorSlider.Track>
                            </ColorSlider>
                            <Button
                              isIconOnly
                              aria-label="Random color"
                              size="sm"
                              variant="ghost"
                              onPress={shuffleColor}
                            >
                              <ArrowShapeTurnUpRight className="size-4" />
                            </Button>
                          </div>
                          <ColorField aria-label="Hex code">
                            <ColorField.Group variant="secondary">
                              <ColorField.Prefix>
                                <ColorSwatch size="xs" />
                              </ColorField.Prefix>
                              <ColorField.Input />
                            </ColorField.Group>
                          </ColorField>
                        </ColorPicker>
                      </div>
                    </div>
                  </Drawer.Body>

                  <Drawer.Footer>
                    <Button variant="ghost" onPress={close}>
                      Cancel
                    </Button>
                    <Button
                      onPress={handleSubmit}
                      fullWidth
                      className="font-semibold"
                    >
                      {editingZoneId ? (
                        <>
                          <PencilToSquare />
                          Update
                        </>
                      ) : (
                        <>
                          <Plus />
                          Create zone
                        </>
                      )}
                    </Button>
                  </Drawer.Footer>
                </>
              )}
            </Drawer.Dialog>
          </Drawer.Content>
        </Drawer.Backdrop>
      </Drawer>
    </div>
  );
}

ZonePanel.propTypes = {
  zones: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    nombre: PropTypes.string,
    color: PropTypes.string,
    precio: PropTypes.number,
  })),
  sections: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    nombre: PropTypes.string,
    zoneId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  })),
  onAddZone: PropTypes.func.isRequired,
  onUpdateZone: PropTypes.func.isRequired,
  onDeleteZone: PropTypes.func.isRequired,
  onAssignSectionZone: PropTypes.func.isRequired,
};
