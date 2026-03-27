import { useCallback, useEffect, useRef } from 'react';
import { MIN_NODE_HEIGHT, MIN_NODE_WIDTH } from './config';
import { getDescendantIds, getNodeHeight, getNodeWidth, getNormalizedRect, rectanglesIntersect } from './graph';

export function useCanvasInteractions({
  containerRef,
  nodes,
  selectedIds,
  editingId,
  reparentingId,
  selectionMode,
  transform,
  marqueeRect,
  setNodes,
  setSelectedId,
  setReparentingId,
  setMarqueeRect,
  setTransform,
  setSelection,
  clearSelection,
  getCanvasPoint,
  updateNode,
}) {
  const dragInfo = useRef({
    active: false,
    type: null,
    id: null,
    startX: 0,
    startY: 0,
    initX: 0,
    initY: 0,
    initWidth: 0,
    initHeight: 0,
  });

  const handlePointerDown = useCallback((event, type, id = null) => {
    if (editingId && type !== 'resize') return;

    if (reparentingId && type === 'node') {
      event.stopPropagation();

      if (id === reparentingId) {
        setSelectedId(id);
        return;
      }

      const blockedIds = getDescendantIds(nodes, reparentingId);
      blockedIds.add(reparentingId);

      if (!blockedIds.has(id)) {
        updateNode(reparentingId, { parentId: id });
        setSelectedId(reparentingId);
        setReparentingId(null);
      }
      return;
    }

    if (selectionMode && type === 'pan' && event.button === 0) {
      const point = getCanvasPoint(event.clientX, event.clientY);
      dragInfo.current = {
        active: true,
        type: 'marquee',
        id: null,
        startX: point.x,
        startY: point.y,
        initX: point.x,
        initY: point.y,
      };
      setMarqueeRect({ x: point.x, y: point.y, width: 0, height: 0 });
      return;
    }

    if (event.button === 1 || type === 'pan') {
      type = 'pan';
      if (!reparentingId) {
        clearSelection();
      }
    } else if (type === 'node' || type === 'resize') {
      event.stopPropagation();
      if (type === 'node') {
        if (selectedIds.length > 1 && selectedIds.includes(id)) {
          setSelectedId(id);
        } else {
          setSelection([id], id);
        }
      } else {
        setSelection([id], id);
      }
    }

    const targetNode = nodes.find((node) => node.id === id);
    const isGroupDrag = type === 'node' && selectedIds.length > 1 && selectedIds.includes(id);
    const groupIds = isGroupDrag ? selectedIds : [];
    const groupPositions = isGroupDrag
      ? Object.fromEntries(
          nodes
            .filter((node) => groupIds.includes(node.id))
            .map((node) => [node.id, { x: node.x, y: node.y }]),
        )
      : null;

    dragInfo.current = {
      active: true,
      type: isGroupDrag ? 'group' : type,
      id,
      startX: event.clientX,
      startY: event.clientY,
      initX: type === 'pan' ? transform.x : targetNode?.x || 0,
      initY: type === 'pan' ? transform.y : targetNode?.y || 0,
      initWidth: getNodeWidth(targetNode),
      initHeight: getNodeHeight(targetNode),
      groupIds,
      groupPositions,
    };
  }, [
    clearSelection,
    editingId,
    getCanvasPoint,
    nodes,
    reparentingId,
    selectedIds,
    selectionMode,
    setMarqueeRect,
    setReparentingId,
    setSelectedId,
    setSelection,
    transform.x,
    transform.y,
    updateNode,
  ]);

  const handlePointerMove = useCallback((event) => {
    if (!dragInfo.current.active) return;
    event.preventDefault();

    const { type, id, startX, startY, initX, initY, initWidth, initHeight, groupIds, groupPositions } = dragInfo.current;

    if (type === 'pan') {
      setTransform((previous) => ({
        ...previous,
        x: initX + (event.clientX - startX),
        y: initY + (event.clientY - startY),
      }));
      return;
    }

    if (type === 'marquee') {
      const point = getCanvasPoint(event.clientX, event.clientY);
      setMarqueeRect({
        x: startX,
        y: startY,
        width: point.x - startX,
        height: point.y - startY,
      });
      return;
    }

    if (type === 'group') {
      const deltaX = (event.clientX - startX) / transform.scale;
      const deltaY = (event.clientY - startY) / transform.scale;

      setNodes((previous) => previous.map((node) => {
        if (!groupIds.includes(node.id)) return node;
        const initial = groupPositions[node.id];
        return { ...node, x: initial.x + deltaX, y: initial.y + deltaY };
      }));
      return;
    }

    if (type === 'node') {
      const deltaX = (event.clientX - startX) / transform.scale;
      const deltaY = (event.clientY - startY) / transform.scale;

      setNodes((previous) => previous.map((node) => (
        node.id === id
          ? { ...node, x: initX + deltaX, y: initY + deltaY }
          : node
      )));
      return;
    }

    if (type === 'resize') {
      const deltaX = (event.clientX - startX) / transform.scale;
      const deltaY = (event.clientY - startY) / transform.scale;

      setNodes((previous) => previous.map((node) => (
        node.id === id
          ? {
              ...node,
              manualWidth: Math.max(MIN_NODE_WIDTH, initWidth + deltaX),
              manualHeight: Math.max(MIN_NODE_HEIGHT, initHeight + deltaY),
            }
          : node
      )));
    }
  }, [getCanvasPoint, setMarqueeRect, setNodes, setTransform, transform.scale]);

  const handlePointerUp = useCallback(() => {
    if (dragInfo.current.type === 'marquee') {
      const normalizedRect = marqueeRect ? getNormalizedRect(marqueeRect) : null;
      const nextSelectedIds = normalizedRect && normalizedRect.width > 4 && normalizedRect.height > 4
        ? nodes
            .filter((node) => rectanglesIntersect(normalizedRect, {
              x: node.x,
              y: node.y,
              width: getNodeWidth(node),
              height: getNodeHeight(node),
            }))
            .map((node) => node.id)
        : [];

      setSelection(nextSelectedIds, nextSelectedIds[0] ?? null);
      setMarqueeRect(null);
    }

    dragInfo.current.active = false;
  }, [marqueeRect, nodes, setMarqueeRect, setSelection]);

  const handleWheel = useCallback((event) => {
    event.preventDefault();
    if (!containerRef.current) return;

    const zoomSensitivity = 0.0015;
    const delta = -event.deltaY * zoomSensitivity;
    const newScale = Math.min(Math.max(0.2, transform.scale * (1 + delta)), 3);

    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    setTransform({
      x: mouseX - (mouseX - transform.x) * (newScale / transform.scale),
      y: mouseY - (mouseY - transform.y) * (newScale / transform.scale),
      scale: newScale,
    });
  }, [containerRef, setTransform, transform]);

  useEffect(() => {
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [handlePointerMove, handlePointerUp]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [containerRef, handleWheel]);

  return {
    handlePointerDown,
  };
}
