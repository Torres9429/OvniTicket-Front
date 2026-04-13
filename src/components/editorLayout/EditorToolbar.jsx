import { LayoutCells, LayoutCellsLarge, LayoutSplitColumns, Megaphone, Route, TrashBin } from '@gravity-ui/icons';
import { Button, ButtonGroup, Tooltip } from '@heroui/react';

export default function EditorToolbar({
  onAddSection,
  onAddStageElement,
  onAddAisle,
  onDeleteSelected,
  hasSelection,
}) {
  return (
    <div>
      <ButtonGroup orientation="horizontal" variant="tertiary">
        <Tooltip delay={0}>
          <Button
            isIconOnly
            variant="tertiary"
            aria-label="Agregar sección"
            onPress={onAddSection}
          >
            <LayoutCellsLarge />
          </Button>
          <Tooltip.Content>
            <span>Sección</span>
          </Tooltip.Content>
        </Tooltip>
        <Tooltip delay={0}>
          <Button
            isIconOnly
            variant="tertiary"
            aria-label="Agregar escenario"
            onPress={onAddStageElement}
          >
            <ButtonGroup.Separator />
            <Megaphone />
          </Button>
          <Tooltip.Content>
            <span>Escenario</span>
          </Tooltip.Content>
        </Tooltip>
        <Tooltip delay={0}>
          <Button
            isIconOnly
            variant="tertiary"
            aria-label="Agregar pasillo"
            onPress={onAddAisle}
          >
            <ButtonGroup.Separator />
            <LayoutSplitColumns />
          </Button>
          <Tooltip.Content>
            <span>Pasillo</span>
          </Tooltip.Content>
        </Tooltip>
        <Tooltip delay={0}>
          <Button
            isIconOnly
            variant="danger"
            aria-label="Eliminar seleccionado"
            isDisabled={!hasSelection}
            onPress={onDeleteSelected}
          >
            <ButtonGroup.Separator />
            <TrashBin />
          </Button>
          <Tooltip.Content>
            <span>Eliminar</span>
          </Tooltip.Content>
        </Tooltip>
      </ButtonGroup>
    </div>
  );
}
