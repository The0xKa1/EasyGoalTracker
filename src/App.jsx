import { useCallback, useEffect, useRef, useState } from 'react';
import CanvasScene from './features/goal-map/components/CanvasScene';
import GoalMapToolbar from './features/goal-map/components/GoalMapToolbar';
import { MultiSelectPanel, NodeActionPanel, ReparentingPanel } from './features/goal-map/components/FloatingPanels';
import { createInitialNodes, createRootNode, generateId } from './features/goal-map/config';
import { autoLayoutNodes, findSmartPosition, findSmartRootPosition, getDeletionSet, getDescendantIds, getExportBounds, getNodeHeight, getNodeWidth, getNormalizedRect } from './features/goal-map/graph';
import { downloadDrawio, exportNodesToPng, parseDrawioXml } from './features/goal-map/io';
import { useCanvasInteractions } from './features/goal-map/useCanvasInteractions';

export default function App() {
  const [nodes, setNodes] = useState(createInitialNodes);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [reparentingId, setReparentingId] = useState(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [marqueeRect, setMarqueeRect] = useState(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isExporting, setIsExporting] = useState(false);

  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const nodeRefs = useRef(new Map());
  const drawioFileInputRef = useRef(null);

  const setSelection = useCallback((ids, anchorId = null) => {
    const uniqueIds = [...new Set(ids)];
    setSelectedIds(uniqueIds);

    if (uniqueIds.length === 1) {
      setSelectedId(uniqueIds[0]);
      return;
    }

    if (anchorId && uniqueIds.includes(anchorId)) {
      setSelectedId(anchorId);
      return;
    }

    setSelectedId((current) => (
      current && uniqueIds.includes(current)
        ? current
        : uniqueIds[0] ?? null
    ));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds([]);
    setSelectedId(null);
  }, []);

  const getCanvasPoint = useCallback((clientX, clientY) => {
    if (!containerRef.current) return { x: 0, y: 0 };

    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: (clientX - rect.left - transform.x) / transform.scale,
      y: (clientY - rect.top - transform.y) / transform.scale,
    };
  }, [transform]);

  const fitNodesInViewport = useCallback((layoutedNodes) => {
    if (!containerRef.current || layoutedNodes.length === 0) {
      setTransform({ x: 0, y: 0, scale: 1 });
      return;
    }

    const bounds = getExportBounds(layoutedNodes);
    const rect = containerRef.current.getBoundingClientRect();
    const viewportPadding = 72;
    const availableWidth = Math.max(rect.width - viewportPadding * 2, 1);
    const availableHeight = Math.max(rect.height - viewportPadding * 2, 1);
    const fitScale = Math.min(
      1,
      availableWidth / Math.max(bounds.width, 1),
      availableHeight / Math.max(bounds.height, 1),
    );
    const contentCenterX = bounds.minX + bounds.width / 2;
    const contentCenterY = bounds.minY + bounds.height / 2;

    setTransform({
      x: rect.width / 2 - contentCenterX * fitScale,
      y: rect.height / 2 - contentCenterY * fitScale,
      scale: fitScale,
    });
  }, []);

  const updateNode = useCallback((id, updates) => {
    setNodes((previous) => previous.map((node) => (
      node.id === id ? { ...node, ...updates } : node
    )));
  }, []);

  const { handlePointerDown } = useCanvasInteractions({
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
    setMarqueeRect,
    setTransform,
    setSelection,
    clearSelection,
    getCanvasPoint,
  });

  useEffect(() => {
    let hasChanges = false;

    const updatedNodes = nodes.map((node) => {
      const element = nodeRefs.current.get(node.id);
      if (!element) return node;

      const { offsetWidth, offsetHeight } = element;
      if (Math.abs(node.width - offsetWidth) > 1 || Math.abs(node.height - offsetHeight) > 1) {
        hasChanges = true;
        return { ...node, width: offsetWidth, height: offsetHeight };
      }

      return node;
    });

    if (hasChanges) {
      setNodes(updatedNodes);
    }
  }, [nodes]);

  const resetTransientUi = useCallback(() => {
    setEditingId(null);
    setReparentingId(null);
    setSelectionMode(false);
    setMarqueeRect(null);
  }, []);

  const addNode = useCallback((parentId, type) => {
    const parent = nodes.find((node) => node.id === parentId);
    if (!parent) return;

    const nextPosition = findSmartPosition(nodes, parent);
    const newNode = {
      id: generateId(),
      text: type === 'goal' ? '新目标/前提' : '新障碍',
      type,
      status: type === 'goal' ? 'in-progress' : 'blocked',
      x: nextPosition.x,
      y: nextPosition.y + (type === 'obstacle' ? 18 : 0),
      parentId,
      width: getNodeWidth({}),
      height: getNodeHeight({}),
    };

    setNodes((previous) => [...previous, newNode]);
    setSelection([newNode.id], newNode.id);
    setEditingId(newNode.id);
    setReparentingId(null);
  }, [nodes, setSelection]);

  const addRootGoal = useCallback(() => {
    const nextPosition = findSmartRootPosition(nodes);
    const newRoot = createRootNode({
      x: nextPosition.x,
      y: nextPosition.y,
    });

    setNodes((previous) => [...previous, newRoot]);
    setSelection([newRoot.id], newRoot.id);
    setEditingId(newRoot.id);
    setReparentingId(null);
    setSelectionMode(false);
    setMarqueeRect(null);
  }, [nodes, setSelection]);

  const autoArrange = useCallback(() => {
    const layoutedNodes = autoLayoutNodes(nodes);
    setNodes(layoutedNodes);
    resetTransientUi();
    clearSelection();
    fitNodesInViewport(layoutedNodes);
  }, [clearSelection, fitNodesInViewport, nodes, resetTransientUi]);

  const deleteNodes = useCallback((ids) => {
    const idsToDelete = getDeletionSet(nodes, ids);
    if (idsToDelete.size === 0) return;

    setNodes((previous) => previous.filter((node) => !idsToDelete.has(node.id)));
    if (selectedIds.some((nodeId) => idsToDelete.has(nodeId))) {
      clearSelection();
    }
    if (reparentingId && idsToDelete.has(reparentingId)) setReparentingId(null);
    if (editingId && idsToDelete.has(editingId)) setEditingId(null);
  }, [clearSelection, editingId, nodes, reparentingId, selectedIds]);

  const exportToPNG = useCallback(async () => {
    if (isExporting) return;

    setIsExporting(true);
    setReparentingId(null);
    setSelectionMode(false);
    setMarqueeRect(null);

    try {
      await exportNodesToPng(nodes);
    } catch (error) {
      console.error('Export failed:', error);
      alert('导出失败，请稍后再试。');
    } finally {
      setIsExporting(false);
    }
  }, [isExporting, nodes]);

  const exportToDrawio = useCallback(() => {
    try {
      downloadDrawio(nodes);
    } catch (error) {
      console.error('Draw.io export failed:', error);
      alert('导出 draw.io 失败，请稍后再试。');
    }
  }, [nodes]);

  const clearCanvas = useCallback(() => {
    const confirmed = window.confirm('确定要一键清屏吗？当前画布内容将被清空，仅保留一个总目标节点。');
    if (!confirmed) return;

    setNodes(createInitialNodes());
    nodeRefs.current.clear();
    clearSelection();
    resetTransientUi();
    setTransform({ x: 0, y: 0, scale: 1 });
  }, [clearSelection, resetTransientUi]);

  const importFromDrawio = useCallback(async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const xmlText = await file.text();
      const importedNodes = parseDrawioXml(xmlText);
      setNodes(importedNodes);
      nodeRefs.current.clear();
      clearSelection();
      resetTransientUi();
      setTransform({ x: 0, y: 0, scale: 1 });
    } catch (error) {
      console.error('Draw.io import failed:', error);
      alert('导入 draw.io 失败，请确认文件格式正确。');
    } finally {
      event.target.value = '';
    }
  }, [clearSelection, resetTransientUi]);

  const selectedNode = nodes.find((node) => node.id === selectedId);
  const reparentBlockedIds = reparentingId ? getDescendantIds(nodes, reparentingId) : new Set();
  if (reparentingId) reparentBlockedIds.add(reparentingId);

  const canStartReparenting = selectedIds.length === 1 && Boolean(selectedId);
  const canDeleteSelectedNode = selectedIds.length === 1 && Boolean(selectedNode);
  const isValidReparentTarget = (nodeId) => Boolean(reparentingId) && !reparentBlockedIds.has(nodeId);
  const isInvalidReparentTarget = (nodeId) => Boolean(reparentingId) && reparentBlockedIds.has(nodeId);
  const reparentingNode = nodes.find((node) => node.id === reparentingId);
  const floatingSelectedNode = selectedIds.length === 1 ? selectedNode : null;
  const anchorSpecs = reparentingNode
    ? [
        {
          nodeId: reparentingNode.id,
          role: 'child',
          connectionNodeId: reparentingNode.id,
          activeAnchorId: reparentingNode.childAnchorId ?? null,
        },
        ...nodes
          .filter((node) => isValidReparentTarget(node.id))
          .map((node) => ({
            nodeId: node.id,
            role: 'reparent-target',
            connectionNodeId: reparentingNode.id,
            activeAnchorId: node.id === reparentingNode.parentId
              ? reparentingNode.parentAnchorId ?? null
              : null,
          })),
      ]
    : selectedIds.length === 1 && selectedNode?.parentId
      ? [
          {
            nodeId: selectedNode.id,
            role: 'child',
            connectionNodeId: selectedNode.id,
            activeAnchorId: selectedNode.childAnchorId ?? null,
          },
          {
            nodeId: selectedNode.parentId,
            role: 'parent',
            connectionNodeId: selectedNode.id,
            activeAnchorId: selectedNode.parentAnchorId ?? null,
          },
        ]
      : [];

  const handleAnchorPointerDown = (event, anchorSpec, nodeId, anchorId) => {
    event.preventDefault();
    event.stopPropagation();

    if (anchorSpec.role === 'child') {
      updateNode(anchorSpec.connectionNodeId, { childAnchorId: anchorId });
      setSelection([anchorSpec.connectionNodeId], anchorSpec.connectionNodeId);
      return;
    }

    if (anchorSpec.role === 'parent') {
      updateNode(anchorSpec.connectionNodeId, { parentAnchorId: anchorId });
      setSelection([anchorSpec.connectionNodeId], anchorSpec.connectionNodeId);
      return;
    }

    if (anchorSpec.role === 'reparent-target' && isValidReparentTarget(nodeId)) {
      updateNode(anchorSpec.connectionNodeId, {
        parentId: nodeId,
        parentAnchorId: anchorId,
      });
      setSelection([anchorSpec.connectionNodeId], anchorSpec.connectionNodeId);
      setReparentingId(null);
    }
  };

  return (
    <div className="w-full h-screen bg-yellow-50 overflow-hidden flex flex-col font-sans select-none text-gray-800">
      <GoalMapToolbar
        drawioFileInputRef={drawioFileInputRef}
        selectionMode={selectionMode}
        isExporting={isExporting}
        onAutoArrange={autoArrange}
        onAddRootGoal={addRootGoal}
        onImportDrawio={importFromDrawio}
        onClearCanvas={clearCanvas}
        onExportDrawio={exportToDrawio}
        onToggleSelectionMode={() => {
          setReparentingId(null);
          setSelectionMode((current) => !current);
          setMarqueeRect(null);
        }}
        onExportPng={exportToPNG}
      />

      <div
        ref={containerRef}
        className="flex-1 relative cursor-grab active:cursor-grabbing overflow-hidden"
        onPointerDown={(event) => handlePointerDown(event, 'pan')}
      >
        <div
          style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})` }}
          className="absolute inset-0 origin-top-left"
        >
          <CanvasScene
            nodes={nodes}
            selectedId={selectedId}
            selectedIds={selectedIds}
            editingId={editingId}
            reparentingId={reparentingId}
            isValidReparentTarget={isValidReparentTarget}
            isInvalidReparentTarget={isInvalidReparentTarget}
            marqueeRect={marqueeRect ? getNormalizedRect(marqueeRect) : null}
            interactive
            canvasRef={canvasRef}
            registerNodeRef={(nodeId, element) => {
              if (element) nodeRefs.current.set(nodeId, element);
              else nodeRefs.current.delete(nodeId);
            }}
            onNodePointerDown={(event, nodeId) => handlePointerDown(event, 'node', nodeId)}
            onResizePointerDown={(event, nodeId) => handlePointerDown(event, 'resize', nodeId)}
            onNodeDoubleClick={(event, nodeId) => {
              if (reparentingId) return;
              event.stopPropagation();
              setSelection([nodeId], nodeId);
              setEditingId(nodeId);
              setSelectedId(nodeId);
            }}
            onNodeTextChange={(nodeId, text) => updateNode(nodeId, { text })}
            onNodeEditEnd={() => setEditingId(null)}
            anchorSpecs={anchorSpecs}
            onAnchorPointerDown={handleAnchorPointerDown}
          />
        </div>
      </div>

      <NodeActionPanel
        node={floatingSelectedNode}
        selectedId={selectedId}
        canStartReparenting={canStartReparenting}
        canDelete={canDeleteSelectedNode}
        reparentingId={reparentingId}
        onAddGoal={() => addNode(selectedId, 'goal')}
        onAddObstacle={() => addNode(selectedId, 'obstacle')}
        onSetStatus={(status) => updateNode(selectedId, { status })}
        onEdit={() => {
          setReparentingId(null);
          setEditingId(selectedId);
        }}
        onToggleReparenting={() => {
          setEditingId(null);
          setReparentingId((current) => current === selectedId ? null : selectedId);
        }}
        onDelete={() => {
          setReparentingId(null);
          deleteNodes([selectedId]);
        }}
      />

      <MultiSelectPanel
        selectedCount={selectedIds.length}
        visible={selectedIds.length > 1 && !reparentingNode}
        onDeleteSelected={() => deleteNodes([...selectedIds])}
      />

      <ReparentingPanel
        node={reparentingNode}
        onCancel={() => setReparentingId(null)}
      />

      <div className="absolute bottom-6 right-6 text-xs text-yellow-600/70 pointer-events-none">
        {reparentingNode
          ? '更换父节点模式：先点当前节点上的琥珀色锚点，再点绿色候选父节点上的锚点完成连线'
          : selectionMode
            ? '框选移动模式：拖拽空白处框选多个节点，随后拖动蓝色高亮节点批量移动'
            : '按住空白处拖拽平移 • 滚轮缩放 • 双击节点修改文字 • 选中节点后可直接点锚点微调连线 • 顶部可新增总目标'}
      </div>
    </div>
  );
}
