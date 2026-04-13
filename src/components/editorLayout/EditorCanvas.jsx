import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Stage, Layer, Rect, Transformer } from '../mapaAsientos/react-konva';
import { getZoneColor } from './layoutModel';
import SectionShape from './SectionShape';
import StageElement from './StageElement';

const MIN_SCALE = 0.25;
const MAX_SCALE = 2.25;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export default function EditorCanvas({
  layout,
  selectedItem,
  onSelectSection,
  onSelectElement,
  onMoveSection,
  onResizeSection,
  onMoveElement,
  onClearSelection,
  onRequestSectionEdit,
}) {
  const containerRef = useRef(null);
  const stageRef = useRef(null);
  const transformerRef = useRef(null);
  const sectionNodeRefs = useRef(new Map());
  const elementNodeRefs = useRef(new Map());
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  const [stagePosition, setStagePosition] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);

  const sections = layout.sections || [];
  const elements = layout.elements || [];


  const canvasBounds = useMemo(() => {
    const width = Math.max(layout.canvasWidth || 1000, 1000);
    const height = Math.max(layout.canvasHeight || 800, 800);
    return { width, height };
  }, [layout.canvasHeight, layout.canvasWidth]);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) {
        setStageSize({ width, height });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const fitScale = clamp(
      Math.min(stageSize.width / canvasBounds.width, stageSize.height / canvasBounds.height, 1),
      MIN_SCALE,
      MAX_SCALE
    );
    /* eslint-disable react-hooks/set-state-in-effect */
    setScale(fitScale);
    setStagePosition({
      x: (stageSize.width - canvasBounds.width * fitScale) / 2,
      y: (stageSize.height - canvasBounds.height * fitScale) / 2,
    });
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [canvasBounds.height, canvasBounds.width, stageSize.height, stageSize.width]);

  useEffect(() => {
    const transformer = transformerRef.current;
    if (!transformer) return;

    let selectedNode = null;
    if (selectedItem?.kind === 'section') {
      selectedNode = sectionNodeRefs.current.get(selectedItem.id);
    } else if (selectedItem?.kind === 'element') {
      selectedNode = elementNodeRefs.current.get(selectedItem.id);
    }

    if (selectedNode) {
      transformer.nodes([selectedNode]);
      transformer.getLayer()?.batchDraw();
    } else {
      transformer.nodes([]);
      transformer.getLayer()?.batchDraw();
    }
  }, [selectedItem, sections, elements]);

  const handleWheel = useCallback((event) => {
    event.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;

    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const oldScale = scale;
    const scaleBy = 1.05;
    const direction = event.evt.deltaY > 0 ? -1 : 1;
    const newScale = clamp(direction > 0 ? oldScale * scaleBy : oldScale / scaleBy, MIN_SCALE, MAX_SCALE);

    const pointerPoint = {
      x: (pointer.x - stagePosition.x) / oldScale,
      y: (pointer.y - stagePosition.y) / oldScale,
    };

    setScale(newScale);
    setStagePosition({
      x: pointer.x - pointerPoint.x * newScale,
      y: pointer.y - pointerPoint.y * newScale,
    });
  }, [scale, stagePosition.x, stagePosition.y]);

  const handleStageDragEnd = useCallback((event) => {
    if (event.target !== event.target.getStage()) return;
    setStagePosition({ x: event.target.x(), y: event.target.y() });
  }, []);

  const handleSectionDragEnd = useCallback((sectionId, event) => {
    onMoveSection(sectionId, {
      x: event.target.x(),
      y: event.target.y(),
    });
  }, [onMoveSection]);

  const handleElementDragEnd = useCallback((elementId, event) => {
    onMoveElement(elementId, {
      x: event.target.x(),
      y: event.target.y(),
    });
  }, [onMoveElement]);

  const handleSectionTransformEnd = useCallback((sectionId, event) => {
    const node = event.target;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    const rotation = node.rotation();
    const x = node.x();
    const y = node.y();
    node.scaleX(1);
    node.scaleY(1);
    onResizeSection(sectionId, { x, y, rotation, scaleX, scaleY });
  }, [onResizeSection]);

  return (
    <div ref={containerRef} className="relative">
      <Stage
        ref={stageRef}
        width={stageSize.width}
        height={stageSize.height}
        x={stagePosition.x}
        y={stagePosition.y}
        scaleX={scale}
        scaleY={scale}
        draggable
        onDragEnd={handleStageDragEnd}
        onWheel={handleWheel}
        onMouseDown={(event) => {
          const clickedStage = event.target === event.target.getStage();
          if (clickedStage) {
            onClearSelection();
          }
        }}
        onTouchStart={(event) => {
          const touchedStage = event.target === event.target.getStage();
          if (touchedStage) {
            onClearSelection();
          }
        }}
        className="bg-transparent rounded-2xl flex items-start"
      >
        <Layer>
          <Rect
            width={canvasBounds.width}
            height={canvasBounds.height}
            cornerRadius={12}
            fill="#80808000"
          />

          {elements.map((element) => (
            <StageElement
              key={element.id}
              element={element}
              isSelected={
                selectedItem?.kind === "element" &&
                selectedItem.id === element.id
              }
              nodeRef={(node) => {
                if (node) elementNodeRefs.current.set(element.id, node);
                else elementNodeRefs.current.delete(element.id);
              }}
              onSelect={() => onSelectElement(element.id)}
              onDragEnd={(event) => handleElementDragEnd(element.id, event)}
            />
          ))}
        </Layer>

        <Layer>
          {sections.map((section) => {
            const zoneColor = getZoneColor(section.zoneId, layout.zones || []);
            return (
              <SectionShape
                key={section.id}
                section={section}
                zoneColor={zoneColor}
                isSelected={
                  selectedItem?.kind === "section" &&
                  selectedItem.id === section.id
                }
                nodeRef={(node) => {
                  if (node) sectionNodeRefs.current.set(section.id, node);
                  else sectionNodeRefs.current.delete(section.id);
                }}
                onSelect={() => onSelectSection(section.id)}
                onDoubleClick={() => onRequestSectionEdit(section.id)}
                onDragEnd={(event) => handleSectionDragEnd(section.id, event)}
                onTransformEnd={(event) =>
                  handleSectionTransformEnd(section.id, event)
                }
              />
            );
          })}
        </Layer>

        <Layer>
          <Transformer
            ref={transformerRef}
            rotateEnabled
            keepRatio={false}
            enabledAnchors={[
              "top-left",
              "top-right",
              "bottom-left",
              "bottom-right",
            ]}
            boundBoxFunc={(oldBox, newBox) => {
              if (newBox.width < 40 || newBox.height < 40) {
                return oldBox;
              }
              return newBox;
            }}
          />
        </Layer>
      </Stage>
    </div>
  );
}

EditorCanvas.propTypes = {
  layout: PropTypes.shape({
    sections: PropTypes.array,
    elements: PropTypes.array,
    zones: PropTypes.array,
    canvasWidth: PropTypes.number,
    canvasHeight: PropTypes.number,
  }).isRequired,
  selectedItem: PropTypes.shape({
    kind: PropTypes.string,
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  }),
  onSelectSection: PropTypes.func.isRequired,
  onSelectElement: PropTypes.func.isRequired,
  onMoveSection: PropTypes.func.isRequired,
  onResizeSection: PropTypes.func.isRequired,
  onMoveElement: PropTypes.func.isRequired,
  onClearSelection: PropTypes.func.isRequired,
  onRequestSectionEdit: PropTypes.func.isRequired,
};

EditorCanvas.defaultProps = {
  selectedItem: null,
};
