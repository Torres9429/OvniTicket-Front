import { LayoutCells, Megaphone, Route, TrashBin } from '@gravity-ui/icons';

export default function EditorToolbar({
  onAddSection,
  onAddStageElement,
  onAddAisle,
  onDeleteSelected,
  hasSelection,
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
      <button
        onClick={onAddSection}
        className="flex items-center justify-center gap-2 px-4 py-4 rounded-xl text-sm font-bold transition-all shadow-sm border border-divider bg-accent text-accent-foreground hover:opacity-90"
      >
        <LayoutCells className="size-5" />
        <span>AGREGAR SECCION</span>
      </button>

      <button
        onClick={onAddStageElement}
        className="flex items-center justify-center gap-2 px-4 py-4 rounded-xl text-sm font-bold transition-all shadow-sm border border-divider bg-default text-default-foreground hover:bg-default-100"
      >
        <Megaphone className="size-5" />
        <span>AGREGAR ESCENARIO</span>
      </button>

      <button
        onClick={onAddAisle}
        className="flex items-center justify-center gap-2 px-4 py-4 rounded-xl text-sm font-bold transition-all shadow-sm border border-divider bg-warning text-warning-foreground hover:opacity-90"
      >
        <Route className="size-5" />
        <span>AGREGAR PASILLO</span>
      </button>

      <button
        onClick={onDeleteSelected}
        disabled={!hasSelection}
        className="flex items-center justify-center gap-2 px-4 py-4 rounded-xl text-sm font-bold transition-all shadow-sm border border-divider bg-danger text-danger-foreground hover:opacity-90 disabled:opacity-50"
      >
        <TrashBin className="size-5" />
        <span>ELIMINAR</span>
      </button>
    </div>
  );
}
