import {
  CONNECTOR_CORNER_RADIUS,
  EXPORT_FONT_FAMILY,
  EXPORT_FONT_SIZE,
  EXPORT_ICON_GAP,
  EXPORT_ICON_SIZE,
  EXPORT_LINE_HEIGHT,
  EXPORT_NODE_PADDING_X,
  EXPORT_PADDING,
  LAYOUT_COLLISION_GAP,
  LAYOUT_HORIZONTAL_GAP,
  LAYOUT_VERTICAL_GAP,
  MIN_NODE_HEIGHT,
  MIN_NODE_WIDTH,
  NODE_AUTO_MAX_WIDTH,
  NODE_SPAWN_GAP,
} from './config';

export const CONNECTION_ANCHORS = [
  { id: 'top-left', side: 'top', x: 0.22, y: 0 },
  { id: 'top', side: 'top', x: 0.5, y: 0 },
  { id: 'top-right', side: 'top', x: 0.78, y: 0 },
  { id: 'right-top', side: 'right', x: 1, y: 0.24 },
  { id: 'right', side: 'right', x: 1, y: 0.5 },
  { id: 'right-bottom', side: 'right', x: 1, y: 0.76 },
  { id: 'bottom-right', side: 'bottom', x: 0.78, y: 1 },
  { id: 'bottom', side: 'bottom', x: 0.5, y: 1 },
  { id: 'bottom-left', side: 'bottom', x: 0.22, y: 1 },
  { id: 'left-bottom', side: 'left', x: 0, y: 0.76 },
  { id: 'left', side: 'left', x: 0, y: 0.5 },
  { id: 'left-top', side: 'left', x: 0, y: 0.24 },
];

const ANCHOR_DIRECTION_BY_SIDE = {
  top: { x: 0, y: -1 },
  right: { x: 1, y: 0 },
  bottom: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
};

const CONNECTOR_LEAD_DISTANCE = 22;

export const getNodeWidth = (node) => node?.manualWidth ?? node?.width ?? MIN_NODE_WIDTH;

export const getNodeHeight = (node) => node?.manualHeight ?? node?.height ?? MIN_NODE_HEIGHT;

export const getAnchorDefinition = (anchorId) => (
  CONNECTION_ANCHORS.find((anchor) => anchor.id === anchorId) ?? null
);

export const getNodeAnchorPoint = (node, anchorId, offsetX = 0, offsetY = 0) => {
  const anchor = getAnchorDefinition(anchorId);
  if (!anchor) return null;

  const width = getNodeWidth(node);
  const height = getNodeHeight(node);

  return {
    ...anchor,
    x: node.x + width * anchor.x + offsetX,
    y: node.y + height * anchor.y + offsetY,
  };
};

export const resolveAnchorIdFromRatio = (x, y, preferredSide = null) => {
  const anchors = preferredSide
    ? CONNECTION_ANCHORS.filter((anchor) => anchor.side === preferredSide)
    : CONNECTION_ANCHORS;

  if (anchors.length === 0) {
    return CONNECTION_ANCHORS[0]?.id ?? null;
  }

  return anchors.reduce((closest, anchor) => {
    const distance = (anchor.x - x) ** 2 + (anchor.y - y) ** 2;

    if (!closest || distance < closest.distance) {
      return { id: anchor.id, distance };
    }

    return closest;
  }, null)?.id ?? anchors[0].id;
};

export const resolveNearestAnchorId = (node, targetPoint, preferredSide = null) => {
  const anchors = preferredSide
    ? CONNECTION_ANCHORS.filter((anchor) => anchor.side === preferredSide)
    : CONNECTION_ANCHORS;

  if (anchors.length === 0) {
    return CONNECTION_ANCHORS[0]?.id ?? null;
  }

  return anchors.reduce((closest, anchor) => {
    const point = getNodeAnchorPoint(node, anchor.id);
    const distance = (point.x - targetPoint.x) ** 2 + (point.y - targetPoint.y) ** 2;

    if (!closest || distance < closest.distance) {
      return { id: anchor.id, distance };
    }

    return closest;
  }, null)?.id ?? anchors[0].id;
};

export const getStatusPalette = (type, status) => {
  if (type === 'obstacle') {
    return {
      fill: '#FFF7ED',
      border: '#FB923C',
      text: '#7C2D12',
      icon: '#F97316',
      dashed: true,
    };
  }

  switch (status) {
    case 'completed':
      return {
        fill: '#F0FDF4',
        border: '#22C55E',
        text: '#14532D',
        icon: '#16A34A',
        dashed: false,
      };
    case 'in-progress':
      return {
        fill: '#EFF6FF',
        border: '#60A5FA',
        text: '#1E3A8A',
        icon: '#3B82F6',
        dashed: false,
      };
    case 'blocked':
      return {
        fill: '#FEF2F2',
        border: '#EF4444',
        text: '#7F1D1D',
        icon: '#DC2626',
        dashed: false,
      };
    default:
      return {
        fill: '#FFFFFF',
        border: '#D1D5DB',
        text: '#1F2937',
        icon: '#6B7280',
        dashed: false,
      };
  }
};

export const wrapCanvasText = (ctx, text, maxWidth) => {
  const content = text || ' ';
  const paragraphs = content.split('\n');
  const lines = [];

  paragraphs.forEach((paragraph) => {
    if (paragraph.length === 0) {
      lines.push(' ');
      return;
    }

    let currentLine = '';

    for (const char of paragraph) {
      const candidate = currentLine + char;
      if (currentLine && ctx.measureText(candidate).width > maxWidth) {
        lines.push(currentLine);
        currentLine = char;
      } else {
        currentLine = candidate;
      }
    }

    lines.push(currentLine || ' ');
  });

  return lines;
};

export const createMeasurementContext = () => {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  return canvas.getContext('2d');
};

export const estimateNodeSize = (text, measurementContext) => {
  if (!measurementContext) {
    return { width: MIN_NODE_WIDTH, height: MIN_NODE_HEIGHT };
  }

  measurementContext.font = `700 ${EXPORT_FONT_SIZE}px ${EXPORT_FONT_FAMILY}`;

  const content = text || ' ';
  const paragraphs = content.split('\n');
  const rawLineWidth = paragraphs.reduce((maxWidth, paragraph) => {
    const width = measurementContext.measureText(paragraph || ' ').width;
    return Math.max(maxWidth, width);
  }, 0);

  const textWidth = Math.min(Math.max(rawLineWidth, 88), 220);
  const lines = wrapCanvasText(measurementContext, content, textWidth);
  const lineHeight = EXPORT_FONT_SIZE * EXPORT_LINE_HEIGHT;
  const textBlockHeight = lineHeight * Math.max(lines.length, 1);
  const iconAllowance = EXPORT_ICON_SIZE + EXPORT_ICON_GAP;

  return {
    width: Math.min(
      NODE_AUTO_MAX_WIDTH,
      Math.max(MIN_NODE_WIDTH, Math.ceil(EXPORT_NODE_PADDING_X * 2 + iconAllowance + textWidth + 18)),
    ),
    height: Math.max(
      MIN_NODE_HEIGHT,
      Math.ceil(Math.max(textBlockHeight, EXPORT_ICON_SIZE) + 24),
    ),
  };
};

export const getExportBounds = (nodes) => {
  if (nodes.length === 0) {
    return {
      minX: -EXPORT_PADDING,
      minY: -EXPORT_PADDING,
      width: EXPORT_PADDING * 2,
      height: EXPORT_PADDING * 2,
    };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  nodes.forEach((node) => {
    minX = Math.min(minX, node.x);
    minY = Math.min(minY, node.y);
    maxX = Math.max(maxX, node.x + getNodeWidth(node));
    maxY = Math.max(maxY, node.y + getNodeHeight(node));
  });

  return {
    minX: minX - EXPORT_PADDING,
    minY: minY - EXPORT_PADDING,
    width: maxX - minX + EXPORT_PADDING * 2,
    height: maxY - minY + EXPORT_PADDING * 2,
  };
};

export const getDescendantIds = (nodes, nodeId) => {
  const descendants = new Set();
  let foundNew = true;

  while (foundNew) {
    foundNew = false;
    nodes.forEach((node) => {
      if (node.parentId && (node.parentId === nodeId || descendants.has(node.parentId)) && !descendants.has(node.id)) {
        descendants.add(node.id);
        foundNew = true;
      }
    });
  }

  return descendants;
};

export const getDeletionSet = (nodes, seedIds) => {
  const idsToDelete = new Set(seedIds.filter(Boolean));

  let addedNew = true;
  while (addedNew) {
    addedNew = false;
    nodes.forEach((node) => {
      if (node.parentId && idsToDelete.has(node.parentId) && !idsToDelete.has(node.id)) {
        idsToDelete.add(node.id);
        addedNew = true;
      }
    });
  }

  return idsToDelete;
};

export const autoLayoutNodes = (nodes) => {
  const measurementContext = createMeasurementContext();
  const resizedNodes = nodes.map((node) => {
    const { width, height } = estimateNodeSize(node.text, measurementContext);
    return {
      ...node,
      width,
      height,
      manualWidth: undefined,
      manualHeight: undefined,
    };
  });

  if (resizedNodes.length === 0) return nodes;

  const nodeById = new Map(resizedNodes.map((node) => [node.id, node]));
  const childrenByParent = new Map();

  resizedNodes.forEach((node) => {
    const parentId = node.parentId && nodeById.has(node.parentId) ? node.parentId : null;
    if (!childrenByParent.has(parentId)) {
      childrenByParent.set(parentId, []);
    }
    childrenByParent.get(parentId).push({
      ...node,
      parentId,
    });
  });

  const resizedNodeById = new Map(
    resizedNodes.map((node) => [node.id, { ...node, parentId: node.parentId && nodeById.has(node.parentId) ? node.parentId : null }]),
  );

  const rootNodes = [...resizedNodeById.values()]
    .filter((node) => !node.parentId)
    .sort((a, b) => a.x - b.x || a.y - b.y);

  if (rootNodes.length === 0) {
    return nodes;
  }

  childrenByParent.forEach((children) => {
    children.sort((a, b) => {
      const typeScore = a.type === b.type ? 0 : a.type === 'goal' ? -1 : 1;
      if (typeScore !== 0) return typeScore;
      return a.x - b.x || a.y - b.y;
    });
  });

  const depthMap = new Map();
  const walkDepth = (nodeId, depth) => {
    depthMap.set(nodeId, depth);
    const children = childrenByParent.get(nodeId) ?? [];
    children.forEach((child) => walkDepth(child.id, depth + 1));
  };
  rootNodes.forEach((rootNode) => walkDepth(rootNode.id, 0));

  const depthHeights = [];
  resizedNodes.forEach((node) => {
    const depth = depthMap.get(node.id) ?? 0;
    depthHeights[depth] = Math.max(depthHeights[depth] ?? 0, node.height);
  });

  const yByDepth = [120];
  for (let depth = 1; depth < depthHeights.length; depth += 1) {
    yByDepth[depth] = yByDepth[depth - 1] + (depthHeights[depth - 1] ?? MIN_NODE_HEIGHT) + LAYOUT_VERTICAL_GAP;
  }

  const subtreeWidthCache = new Map();
  const getSubtreeWidth = (nodeId) => {
    if (subtreeWidthCache.has(nodeId)) return subtreeWidthCache.get(nodeId);

    const node = resizedNodeById.get(nodeId);
    if (!node) return MIN_NODE_WIDTH;

    const children = childrenByParent.get(nodeId) ?? [];
    if (children.length === 0) {
      subtreeWidthCache.set(nodeId, node.width);
      return node.width;
    }

    const childrenWidth = children.reduce((sum, child, index) => (
      sum + getSubtreeWidth(child.id) + (index > 0 ? LAYOUT_HORIZONTAL_GAP : 0)
    ), 0);
    const subtreeWidth = Math.max(node.width, childrenWidth);
    subtreeWidthCache.set(nodeId, subtreeWidth);
    return subtreeWidth;
  };

  const positioned = new Map();
  const positionSubtree = (nodeId, leftX) => {
    const node = resizedNodeById.get(nodeId);
    if (!node) return;

    const depth = depthMap.get(nodeId) ?? 0;
    const subtreeWidth = getSubtreeWidth(nodeId);
    const x = leftX + (subtreeWidth - node.width) / 2;
    const y = yByDepth[depth];

    positioned.set(nodeId, { ...node, x, y });

    const children = childrenByParent.get(nodeId) ?? [];
    if (children.length === 0) return;

    const childrenWidth = children.reduce((sum, child, index) => (
      sum + getSubtreeWidth(child.id) + (index > 0 ? LAYOUT_HORIZONTAL_GAP : 0)
    ), 0);
    let currentLeft = leftX + (subtreeWidth - childrenWidth) / 2;

    children.forEach((child) => {
      positionSubtree(child.id, currentLeft);
      currentLeft += getSubtreeWidth(child.id) + LAYOUT_HORIZONTAL_GAP;
    });
  };

  const ROOT_TREE_GAP = LAYOUT_HORIZONTAL_GAP * 3;
  let currentForestLeft = 160;
  rootNodes.forEach((rootNode) => {
    positionSubtree(rootNode.id, currentForestLeft);
    currentForestLeft += getSubtreeWidth(rootNode.id) + ROOT_TREE_GAP;
  });

  const positionedNodes = resizedNodes.map((node) => positioned.get(node.id) ?? node);
  const nodesByDepth = new Map();

  positionedNodes.forEach((node) => {
    const depth = depthMap.get(node.id) ?? 0;
    if (!nodesByDepth.has(depth)) {
      nodesByDepth.set(depth, []);
    }
    nodesByDepth.get(depth).push(node);
  });

  nodesByDepth.forEach((depthNodes) => {
    depthNodes.sort((a, b) => a.x - b.x || a.y - b.y);
    for (let index = 1; index < depthNodes.length; index += 1) {
      const previous = depthNodes[index - 1];
      const current = depthNodes[index];
      const minimumLeft = previous.x + previous.width + LAYOUT_COLLISION_GAP;
      if (current.x < minimumLeft) {
        current.x = minimumLeft;
      }
    }
  });

  return positionedNodes;
};

export const findSmartRootPosition = (nodes) => {
  const rootNodes = nodes.filter((node) => !node.parentId);
  if (rootNodes.length === 0) {
    return { x: 400, y: 220 };
  }

  const topY = Math.min(...rootNodes.map((node) => node.y));
  const rightEdge = Math.max(...rootNodes.map((node) => node.x + getNodeWidth(node)));

  return {
    x: rightEdge + 160,
    y: topY,
  };
};

export const getNormalizedRect = (rect) => ({
  x: Math.min(rect.x, rect.x + rect.width),
  y: Math.min(rect.y, rect.y + rect.height),
  width: Math.abs(rect.width),
  height: Math.abs(rect.height),
});

export const rectanglesIntersect = (a, b) => (
  a.x < b.x + b.width &&
  a.x + a.width > b.x &&
  a.y < b.y + b.height &&
  a.y + a.height > b.y
);

export const getExpandedNodeRect = (node, padding = NODE_SPAWN_GAP) => ({
  x: node.x - padding,
  y: node.y - padding,
  width: getNodeWidth(node) + padding * 2,
  height: getNodeHeight(node) + padding * 2,
});

export const getOverlapArea = (a, b) => {
  const overlapX = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
  const overlapY = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
  return overlapX * overlapY;
};

export const getConnectorStyle = (node) => {
  const isObstacle = node.type === 'obstacle';
  return {
    stroke: isObstacle ? '#F59E0B' : '#A8B3C7',
    strokeWidth: isObstacle ? 2.6 : 2.2,
    dash: isObstacle ? '7 5' : null,
    lineDash: isObstacle ? [7, 5] : [],
    radius: isObstacle ? 14 : CONNECTOR_CORNER_RADIUS,
  };
};

const moveTowards = (from, to, distance) => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  return {
    x: from.x + (dx / length) * distance,
    y: from.y + (dy / length) * distance,
  };
};

const moveInDirection = (point, direction, distance) => ({
  x: point.x + direction.x * distance,
  y: point.y + direction.y * distance,
});

const dedupeConnectorPoints = (points) => points.filter((point, index) => {
  const previous = points[index - 1];
  if (!previous) return true;
  return Math.abs(previous.x - point.x) > 0.5 || Math.abs(previous.y - point.y) > 0.5;
});

const buildRoundedPathFromPoints = (points, radius) => {
  if (points.length < 2) return '';

  let path = `M ${points[0].x} ${points[0].y}`;
  for (let index = 1; index < points.length - 1; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const next = points[index + 1];
    const previousDistance = Math.hypot(current.x - previous.x, current.y - previous.y);
    const nextDistance = Math.hypot(next.x - current.x, next.y - current.y);
    const cornerRadius = Math.min(radius, previousDistance / 2, nextDistance / 2);

    if (cornerRadius < 0.5) {
      path += ` L ${current.x} ${current.y}`;
      continue;
    }

    const segmentStart = moveTowards(current, previous, cornerRadius);
    const segmentEnd = moveTowards(current, next, cornerRadius);
    path += ` L ${segmentStart.x} ${segmentStart.y} Q ${current.x} ${current.y} ${segmentEnd.x} ${segmentEnd.y}`;
  }

  const lastPoint = points[points.length - 1];
  path += ` L ${lastPoint.x} ${lastPoint.y}`;
  return path;
};

export const buildRoundedPathOnCanvas = (ctx, points, radius) => {
  if (points.length < 2) return;

  ctx.moveTo(points[0].x, points[0].y);

  for (let index = 1; index < points.length - 1; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const next = points[index + 1];
    const previousDistance = Math.hypot(current.x - previous.x, current.y - previous.y);
    const nextDistance = Math.hypot(next.x - current.x, next.y - current.y);
    const cornerRadius = Math.min(radius, previousDistance / 2, nextDistance / 2);

    if (cornerRadius < 0.5) {
      ctx.lineTo(current.x, current.y);
      continue;
    }

    const segmentStart = moveTowards(current, previous, cornerRadius);
    const segmentEnd = moveTowards(current, next, cornerRadius);
    ctx.lineTo(segmentStart.x, segmentStart.y);
    ctx.quadraticCurveTo(current.x, current.y, segmentEnd.x, segmentEnd.y);
  }

  const lastPoint = points[points.length - 1];
  ctx.lineTo(lastPoint.x, lastPoint.y);
};

export const getConnectorGeometry = (parent, node, offsetX = 0, offsetY = 0) => {
  const parentWidth = getNodeWidth(parent);
  const parentHeight = getNodeHeight(parent);
  const nodeWidth = getNodeWidth(node);
  const nodeHeight = getNodeHeight(node);

  const parentCenter = {
    x: parent.x + parentWidth / 2 + offsetX,
    y: parent.y + parentHeight / 2 + offsetY,
  };
  const nodeCenter = {
    x: node.x + nodeWidth / 2 + offsetX,
    y: node.y + nodeHeight / 2 + offsetY,
  };

  const autoParentAnchorId = resolveNearestAnchorId(parent, nodeCenter);
  const autoChildAnchorId = resolveNearestAnchorId(node, parentCenter);
  const parentAnchorId = node.parentAnchorId ?? autoParentAnchorId;
  const childAnchorId = node.childAnchorId ?? autoChildAnchorId;

  const parentAnchor = getAnchorDefinition(parentAnchorId) ?? getAnchorDefinition(autoParentAnchorId);
  const childAnchor = getAnchorDefinition(childAnchorId) ?? getAnchorDefinition(autoChildAnchorId);
  const start = getNodeAnchorPoint(parent, parentAnchor.id, offsetX, offsetY);
  const end = getNodeAnchorPoint(node, childAnchor.id, offsetX, offsetY);
  const startDirection = ANCHOR_DIRECTION_BY_SIDE[parentAnchor.side] ?? { x: 0, y: 1 };
  const endDirection = ANCHOR_DIRECTION_BY_SIDE[childAnchor.side] ?? { x: 0, y: -1 };
  const startLead = moveInDirection(start, startDirection, CONNECTOR_LEAD_DISTANCE);
  const endLead = moveInDirection(end, endDirection, CONNECTOR_LEAD_DISTANCE);

  let points = [start, startLead];

  if (Math.abs(startLead.x - endLead.x) < 0.5 || Math.abs(startLead.y - endLead.y) < 0.5) {
    points.push(endLead);
  } else if (Math.abs(startDirection.x) > 0 && Math.abs(endDirection.x) > 0) {
    const midX = startLead.x + (endLead.x - startLead.x) / 2;
    points.push({ x: midX, y: startLead.y }, { x: midX, y: endLead.y }, endLead);
  } else if (Math.abs(startDirection.y) > 0 && Math.abs(endDirection.y) > 0) {
    const midY = startLead.y + (endLead.y - startLead.y) / 2;
    points.push({ x: startLead.x, y: midY }, { x: endLead.x, y: midY }, endLead);
  } else if (Math.abs(startDirection.x) > 0) {
    points.push({ x: endLead.x, y: startLead.y }, endLead);
  } else {
    points.push({ x: startLead.x, y: endLead.y }, endLead);
  }

  points.push(end);
  points = dedupeConnectorPoints(points);

  return {
    points,
    start,
    end,
    parentAnchorId: parentAnchor.id,
    childAnchorId: childAnchor.id,
    path: buildRoundedPathFromPoints(points, getConnectorStyle(node).radius),
  };
};

export const findSmartPosition = (nodes, parent) => {
  const parentWidth = getNodeWidth(parent);
  const parentHeight = getNodeHeight(parent);
  const nodeWidth = MIN_NODE_WIDTH;
  const nodeHeight = MIN_NODE_HEIGHT;
  const siblings = nodes
    .filter((node) => node.parentId === parent.id)
    .sort((a, b) => a.x - b.x || a.y - b.y);

  const siblingCount = siblings.length + 1;
  const slotWidth = nodeWidth + 48;
  const rowStartX = parent.x + parentWidth / 2 - ((siblingCount - 1) * slotWidth) / 2 - nodeWidth / 2;
  const preferredY = siblings.length > 0
    ? Math.min(...siblings.map((node) => node.y))
    : parent.y + parentHeight + 96;

  const candidates = [];
  const slotRange = Math.max(6, siblingCount + 3);
  for (let slotIndex = 0; slotIndex < slotRange; slotIndex += 1) {
    const slotX = rowStartX + slotIndex * slotWidth;
    candidates.push({ x: slotX, y: preferredY });
    candidates.push({ x: slotX, y: preferredY + 96 });
    candidates.push({ x: slotX, y: preferredY - 96 });
  }

  const evaluatedCandidates = candidates.map((candidate) => {
    const candidateRect = {
      x: candidate.x - NODE_SPAWN_GAP,
      y: candidate.y - NODE_SPAWN_GAP,
      width: nodeWidth + NODE_SPAWN_GAP * 2,
      height: nodeHeight + NODE_SPAWN_GAP * 2,
    };

    let overlapArea = 0;
    let intersects = false;

    nodes.forEach((node) => {
      const existingRect = getExpandedNodeRect(node);
      const currentOverlap = getOverlapArea(candidateRect, existingRect);
      overlapArea += currentOverlap;
      if (currentOverlap > 0 || rectanglesIntersect(candidateRect, existingRect)) {
        intersects = true;
      }
    });

    const targetCenterX = parent.x + parentWidth / 2;
    const distancePenalty = Math.abs((candidate.x + nodeWidth / 2) - targetCenterX) + Math.abs(candidate.y - preferredY) * 1.2;

    return {
      candidate,
      intersects,
      overlapArea,
      distancePenalty,
    };
  });

  const nonOverlapping = evaluatedCandidates
    .filter(({ intersects }) => !intersects)
    .sort((a, b) => a.distancePenalty - b.distancePenalty);

  if (nonOverlapping.length > 0) {
    return nonOverlapping[0].candidate;
  }

  return evaluatedCandidates
    .sort((a, b) => {
      if (a.overlapArea !== b.overlapArea) return a.overlapArea - b.overlapArea;
      return a.distancePenalty - b.distancePenalty;
    })[0]
    .candidate;
};
