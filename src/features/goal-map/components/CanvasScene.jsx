import { useState } from 'react';
import { AlertTriangle, CheckCircle2, PlayCircle, XCircle } from 'lucide-react';
import { MIN_NODE_HEIGHT, MIN_NODE_WIDTH, NODE_AUTO_MAX_WIDTH } from '../config';
import { CONNECTION_ANCHORS, getConnectorGeometry, getConnectorStyle } from '../graph';

const getStatusStyles = (type, status) => {
  if (type === 'obstacle') {
    return 'bg-orange-50 border-orange-400 text-orange-900 border-dashed shadow-sm';
  }

  switch (status) {
    case 'completed':
      return 'bg-green-50 border-green-500 text-green-900 shadow-md';
    case 'in-progress':
      return 'bg-blue-50 border-blue-400 text-blue-900 shadow-md';
    case 'blocked':
      return 'bg-red-50 border-red-500 text-red-900 shadow-md';
    default:
      return 'bg-white border-gray-300 text-gray-800 shadow-sm';
  }
};

const renderStatusIcon = (type, status) => {
  if (type === 'obstacle') {
    return <AlertTriangle className="w-4 h-4 text-orange-500 mr-1.5" />;
  }

  switch (status) {
    case 'completed':
      return <CheckCircle2 className="w-4 h-4 text-green-600 mr-1.5" />;
    case 'in-progress':
      return <PlayCircle className="w-4 h-4 text-blue-500 mr-1.5" />;
    case 'blocked':
      return <XCircle className="w-4 h-4 text-red-500 mr-1.5" />;
    default:
      return null;
  }
};

const getAnchorToneClasses = (role, isActive) => {
  if (role === 'reparent-target') {
    return isActive
      ? 'bg-emerald-500 border-white shadow-[0_0_0_5px_rgba(16,185,129,0.16)]'
      : 'bg-emerald-50/95 border-emerald-300 hover:bg-emerald-100';
  }

  if (role === 'parent') {
    return isActive
      ? 'bg-sky-500 border-white shadow-[0_0_0_5px_rgba(14,165,233,0.16)]'
      : 'bg-sky-50/95 border-sky-300 hover:bg-sky-100';
  }

  return isActive
    ? 'bg-amber-500 border-white shadow-[0_0_0_5px_rgba(245,158,11,0.16)]'
    : 'bg-amber-50/95 border-amber-300 hover:bg-amber-100';
};

const getAnchorTranslate = (anchor, visible, isActive) => {
  const distance = visible ? 7 : 4;
  const xOffset = anchor.side === 'left' ? -distance : anchor.side === 'right' ? distance : 0;
  const yOffset = anchor.side === 'top' ? -distance : anchor.side === 'bottom' ? distance : 0;
  const scale = visible ? (isActive ? 1.12 : 1) : 0.84;

  return `translate(calc(-50% + ${xOffset}px), calc(-50% + ${yOffset}px)) scale(${scale})`;
};

const shouldRevealAnchor = (role, isActive, isHovered) => {
  return isHovered || isActive;
};

const getAnchorVisibilityClasses = (role, isActive, isHovered) => {
  if (shouldRevealAnchor(role, isActive, isHovered)) return 'opacity-100';
  return 'opacity-0';
};

export default function CanvasScene({
  nodes,
  offsetX = 0,
  offsetY = 0,
  width,
  height,
  selectedId,
  editingId,
  interactive = true,
  canvasRef = null,
  registerNodeRef = null,
  onNodePointerDown,
  onResizePointerDown,
  onNodeDoubleClick,
  onNodeTextChange,
  onNodeEditEnd,
  reparentingId = null,
  isValidReparentTarget = () => false,
  isInvalidReparentTarget = () => false,
  selectedIds = [],
  marqueeRect = null,
  anchorSpecs = [],
  onAnchorPointerDown,
}) {
  const [hoveredNodeId, setHoveredNodeId] = useState(null);
  const anchorSpecByNodeId = new Map(anchorSpecs.map((spec) => [spec.nodeId, spec]));

  return (
    <div
      ref={canvasRef}
      className="absolute inset-0 origin-top-left"
      style={interactive ? undefined : { width, height }}
    >
      <svg
        className="absolute inset-0 overflow-visible pointer-events-none z-0"
        width={interactive ? '100%' : width}
        height={interactive ? '100%' : height}
        viewBox={interactive ? undefined : `0 0 ${width} ${height}`}
        preserveAspectRatio="none"
      >
        {nodes.map((node) => {
          if (!node.parentId) return null;

          const parent = nodes.find((candidate) => candidate.id === node.parentId);
          if (!parent) return null;

          const connector = getConnectorGeometry(parent, node, offsetX, offsetY);
          const connectorStyle = getConnectorStyle(node);

          return (
            <g key={`link-${node.id}`}>
              <path
                d={connector.path}
                fill="none"
                stroke={connectorStyle.stroke}
                strokeWidth={connectorStyle.strokeWidth}
                strokeDasharray={connectorStyle.dash ?? 'none'}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.95}
              />
              <circle
                cx={connector.end.x}
                cy={connector.end.y}
                r={node.type === 'obstacle' ? 3.8 : 3.2}
                fill="#FEFCE8"
                stroke={connectorStyle.stroke}
                strokeWidth={node.type === 'obstacle' ? 2 : 1.8}
              />
            </g>
          );
        })}
      </svg>

      {nodes.map((node) => (
        (() => {
          const anchorSpec = anchorSpecByNodeId.get(node.id);
          const isHovered = hoveredNodeId === node.id;

          return (
            <div
              key={node.id}
              ref={registerNodeRef ? (element) => registerNodeRef(node.id, element) : undefined}
              className={`absolute flex items-center justify-center p-3 border-2 rounded-xl transition-shadow duration-200 z-10 overflow-visible ${
                interactive ? 'cursor-pointer' : ''
              } ${getStatusStyles(node.type, node.status)} ${
                interactive && reparentingId === node.id
                  ? 'ring-4 ring-amber-400/70 shadow-xl'
                  : interactive && selectedId === node.id
                    ? 'ring-4 ring-yellow-400/50 shadow-xl'
                    : interactive && selectedIds.includes(node.id)
                      ? 'ring-4 ring-sky-300/70 shadow-lg'
                      : interactive && reparentingId && isValidReparentTarget(node.id)
                        ? 'ring-4 ring-emerald-300/60 shadow-lg hover:ring-emerald-400/80'
                        : interactive && reparentingId && isInvalidReparentTarget(node.id)
                          ? 'opacity-60 ring-2 ring-red-200/80'
                          : interactive
                            ? 'hover:shadow-lg'
                            : ''
              }`}
              style={{
                left: node.x + offsetX,
                top: node.y + offsetY,
                width: node.manualWidth ?? undefined,
                height: node.manualHeight ?? undefined,
                minWidth: MIN_NODE_WIDTH,
                minHeight: MIN_NODE_HEIGHT,
                maxWidth: node.manualWidth ? 'none' : NODE_AUTO_MAX_WIDTH,
              }}
              onPointerDown={interactive ? (event) => onNodePointerDown(event, node.id) : undefined}
              onDoubleClick={interactive ? (event) => onNodeDoubleClick(event, node.id) : undefined}
              onPointerEnter={interactive ? () => setHoveredNodeId(node.id) : undefined}
              onPointerLeave={interactive ? () => setHoveredNodeId((current) => (current === node.id ? null : current)) : undefined}
            >
              <div className="flex items-center justify-center w-full h-full min-h-full">
                <div className="flex-shrink-0 pointer-events-none">
                  {renderStatusIcon(node.type, node.status)}
                </div>

                {interactive && editingId === node.id ? (
                  <div className="relative flex-1 flex items-center justify-center min-w-[80px] h-full">
                    <span
                      className="font-bold leading-[1.35] whitespace-pre-wrap break-words opacity-0 pointer-events-none px-1 py-0.5"
                      aria-hidden="true"
                      style={{ minHeight: '1.5em' }}
                    >
                      {node.text || ' '}
                    </span>
                    <textarea
                      autoFocus
                      className="absolute inset-0 w-full h-full bg-transparent outline-none text-center font-bold leading-[1.35] resize-none overflow-y-auto px-1 py-0.5"
                      value={node.text}
                      onChange={(event) => onNodeTextChange(node.id, event.target.value)}
                      onBlur={onNodeEditEnd}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' && !event.shiftKey) {
                          event.preventDefault();
                          onNodeEditEnd();
                        }
                      }}
                      onPointerDown={(event) => event.stopPropagation()}
                    />
                  </div>
                ) : (
                  <span className="font-bold leading-[1.35] break-words whitespace-pre-wrap text-center flex-1 pointer-events-none px-1 py-0.5">
                    {node.text}
                  </span>
                )}
              </div>

              {interactive && anchorSpec && CONNECTION_ANCHORS.map((anchor) => {
                const isActive = anchorSpec.activeAnchorId === anchor.id;
                const isVisible = shouldRevealAnchor(anchorSpec.role, isActive, isHovered);

                return (
                  <button
                    key={`${node.id}-${anchor.id}`}
                    type="button"
                    className={`absolute z-30 border-[1.5px] rounded-full transition-[opacity,transform,background-color,box-shadow] duration-200 ease-out ${
                      isActive ? 'w-3.5 h-3.5' : 'w-3 h-3'
                    } ${getAnchorToneClasses(anchorSpec.role, isActive)} ${getAnchorVisibilityClasses(anchorSpec.role, isActive, isHovered)}`}
                    style={{
                      left: `${anchor.x * 100}%`,
                      top: `${anchor.y * 100}%`,
                      transform: getAnchorTranslate(anchor, isVisible, isActive),
                      pointerEvents: isVisible ? 'auto' : 'none',
                    }}
                    title={anchorSpec.role === 'child' ? '设置当前节点连线锚点' : '设置父节点连线锚点'}
                    onPointerDown={(event) => onAnchorPointerDown?.(event, anchorSpec, node.id, anchor.id)}
                  />
                );
              })}

              {interactive && selectedId === node.id && (
                <div
                  className="absolute right-0 bottom-0 w-5 h-5 cursor-nwse-resize flex items-end justify-end p-1 z-20"
                  onPointerDown={(event) => onResizePointerDown(event, node.id)}
                >
                  <div className="w-2.5 h-2.5 border-r-[3px] border-b-[3px] border-yellow-500 rounded-br-[4px] opacity-70 hover:opacity-100" />
                </div>
              )}
            </div>
          );
        })()
      ))}

      {interactive && marqueeRect && (
        <div
          className="absolute border-2 border-sky-400 bg-sky-200/20 pointer-events-none z-30"
          style={{
            left: marqueeRect.x,
            top: marqueeRect.y,
            width: marqueeRect.width,
            height: marqueeRect.height,
          }}
        />
      )}
    </div>
  );
}
