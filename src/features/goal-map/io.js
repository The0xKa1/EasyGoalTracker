import {
  EXPORT_FONT_FAMILY,
  EXPORT_FONT_SIZE,
  EXPORT_ICON_GAP,
  EXPORT_ICON_SIZE,
  EXPORT_LINE_HEIGHT,
  EXPORT_NODE_PADDING_X,
  EXPORT_NODE_RADIUS,
  EXPORT_PADDING,
  MIN_NODE_HEIGHT,
  MIN_NODE_WIDTH,
  generateId,
} from './config';
import {
  buildRoundedPathOnCanvas,
  getConnectorGeometry,
  getConnectorStyle,
  getExportBounds,
  getAnchorDefinition,
  getNodeHeight,
  getNodeWidth,
  resolveAnchorIdFromRatio,
  getStatusPalette,
  wrapCanvasText,
} from './graph';

const drawRoundedRect = (ctx, x, y, width, height, radius) => {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
};

const drawStatusCanvasIcon = (ctx, type, status, centerX, centerY) => {
  const { icon } = getStatusPalette(type, status);
  ctx.save();
  ctx.strokeStyle = icon;
  ctx.fillStyle = icon;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (type === 'obstacle') {
    const half = EXPORT_ICON_SIZE / 2;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - half);
    ctx.lineTo(centerX + half * 0.92, centerY + half);
    ctx.lineTo(centerX - half * 0.92, centerY + half);
    ctx.closePath();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(centerX, centerY - 2.5);
    ctx.lineTo(centerX, centerY + 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(centerX, centerY + 5, 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  ctx.beginPath();
  ctx.arc(centerX, centerY, EXPORT_ICON_SIZE / 2, 0, Math.PI * 2);
  ctx.stroke();

  if (status === 'completed') {
    ctx.beginPath();
    ctx.moveTo(centerX - 3.5, centerY + 0.5);
    ctx.lineTo(centerX - 0.5, centerY + 3.5);
    ctx.lineTo(centerX + 4.5, centerY - 3);
    ctx.stroke();
  } else if (status === 'blocked') {
    ctx.beginPath();
    ctx.moveTo(centerX - 3.5, centerY - 3.5);
    ctx.lineTo(centerX + 3.5, centerY + 3.5);
    ctx.moveTo(centerX + 3.5, centerY - 3.5);
    ctx.lineTo(centerX - 3.5, centerY + 3.5);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(centerX - 2, centerY - 4);
    ctx.lineTo(centerX + 4, centerY);
    ctx.lineTo(centerX - 2, centerY + 4);
    ctx.closePath();
    ctx.stroke();
  }

  ctx.restore();
};

const drawNodeToCanvas = (ctx, node, offsetX, offsetY) => {
  const width = getNodeWidth(node);
  const height = getNodeHeight(node);
  const x = node.x + offsetX;
  const y = node.y + offsetY;
  const palette = getStatusPalette(node.type, node.status);

  ctx.save();
  ctx.shadowColor = 'rgba(15, 23, 42, 0.08)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 2;
  drawRoundedRect(ctx, x, y, width, height, EXPORT_NODE_RADIUS);
  ctx.fillStyle = palette.fill;
  ctx.fill();
  ctx.restore();

  ctx.save();
  drawRoundedRect(ctx, x, y, width, height, EXPORT_NODE_RADIUS);
  ctx.strokeStyle = palette.border;
  ctx.lineWidth = 2;
  if (palette.dashed) ctx.setLineDash([6, 4]);
  ctx.stroke();
  ctx.restore();

  const contentCenterY = y + height / 2;
  const iconCenterX = x + EXPORT_NODE_PADDING_X + EXPORT_ICON_SIZE / 2;
  const textAreaX = x + EXPORT_NODE_PADDING_X + EXPORT_ICON_SIZE + EXPORT_ICON_GAP;
  const textAreaWidth = width - EXPORT_NODE_PADDING_X * 2 - EXPORT_ICON_SIZE - EXPORT_ICON_GAP;

  drawStatusCanvasIcon(ctx, node.type, node.status, iconCenterX, contentCenterY);

  ctx.save();
  ctx.fillStyle = palette.text;
  ctx.font = `700 ${EXPORT_FONT_SIZE}px ${EXPORT_FONT_FAMILY}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const textLines = wrapCanvasText(ctx, node.text, Math.max(textAreaWidth, 1));
  const lineHeight = EXPORT_FONT_SIZE * EXPORT_LINE_HEIGHT;
  const textBlockHeight = lineHeight * textLines.length;
  const textCenterX = textAreaX + textAreaWidth / 2;
  const firstLineY = contentCenterY - textBlockHeight / 2 + lineHeight / 2;

  textLines.forEach((line, index) => {
    ctx.fillText(line, textCenterX, firstLineY + index * lineHeight);
  });
  ctx.restore();
};

const escapeXml = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;');

const formatDrawioText = (text) => String(text ?? '')
  .split('\n')
  .map((line) => escapeXml(line))
  .join('&lt;br&gt;');

const getDrawioNodeStyle = (node) => {
  const palette = getStatusPalette(node.type, node.status);
  const parts = [
    'rounded=1',
    'whiteSpace=wrap',
    'html=1',
    'arcSize=14',
    'fontSize=16',
    'fontStyle=1',
    `fontFamily=${EXPORT_FONT_FAMILY.replaceAll('"', '')}`,
    `fillColor=${palette.fill}`,
    `strokeColor=${palette.border}`,
    `fontColor=${palette.text}`,
    'align=center',
    'verticalAlign=middle',
    'spacing=10',
  ];

  if (palette.dashed) {
    parts.push('dashed=1', 'dashPattern=6 4');
  }

  return `${parts.join(';')};`;
};

const getDrawioEdgeStyle = (node) => {
  const isObstacle = node.type === 'obstacle';
  const parts = [
    'edgeStyle=orthogonalEdgeStyle',
    'html=1',
    'rounded=0',
    'orthogonalLoop=1',
    'jettySize=auto',
    'curved=1',
    `strokeColor=${isObstacle ? '#FCD34D' : '#D1D5DB'}`,
    `strokeWidth=${isObstacle ? 3 : 2}`,
  ];

  if (isObstacle) {
    parts.push('dashed=1', 'dashPattern=6 4');
  }

  const parentAnchor = getAnchorDefinition(node.parentAnchorId);
  const childAnchor = getAnchorDefinition(node.childAnchorId);

  if (parentAnchor) {
    parts.push(
      `exitX=${parentAnchor.x}`,
      `exitY=${parentAnchor.y}`,
      'exitDx=0',
      'exitDy=0',
    );
  }

  if (childAnchor) {
    parts.push(
      `entryX=${childAnchor.x}`,
      `entryY=${childAnchor.y}`,
      'entryDx=0',
      'entryDy=0',
    );
  }

  return `${parts.join(';')};`;
};

export const downloadDrawio = (nodes) => {
  const xml = buildDrawioXml(nodes);
  const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = `目标思维导图_${Date.now()}.drawio`;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
};

export const exportNodesToPng = async (nodes) => {
  const { minX, minY, width, height } = getExportBounds(nodes);

  if (document.fonts?.ready) {
    await document.fonts.ready;
  }
  await new Promise((resolve) => requestAnimationFrame(() => resolve()));

  const exportScale = Math.max(window.devicePixelRatio || 1, 2) * 2;
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(width * exportScale);
  canvas.height = Math.ceil(height * exportScale);

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context unavailable');

  ctx.scale(exportScale, exportScale);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  ctx.fillStyle = '#FEFCE8';
  ctx.fillRect(0, 0, width, height);

  const offsetX = -minX;
  const offsetY = -minY;

  nodes.forEach((node) => {
    if (!node.parentId) return;
    const parent = nodes.find((candidate) => candidate.id === node.parentId);
    if (!parent) return;

    const connector = getConnectorGeometry(parent, node, offsetX, offsetY);
    const connectorStyle = getConnectorStyle(node);

    ctx.save();
    ctx.beginPath();
    buildRoundedPathOnCanvas(ctx, connector.points, connectorStyle.radius);
    ctx.strokeStyle = connectorStyle.stroke;
    ctx.lineWidth = connectorStyle.strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (connectorStyle.lineDash.length > 0) ctx.setLineDash(connectorStyle.lineDash);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(connector.end.x, connector.end.y, node.type === 'obstacle' ? 3.8 : 3.2, 0, Math.PI * 2);
    ctx.fillStyle = '#FEFCE8';
    ctx.fill();
    ctx.strokeStyle = connectorStyle.stroke;
    ctx.lineWidth = node.type === 'obstacle' ? 2 : 1.8;
    ctx.stroke();
    ctx.restore();
  });

  nodes.forEach((node) => {
    drawNodeToCanvas(ctx, node, offsetX, offsetY);
  });

  const link = document.createElement('a');
  link.download = `目标思维导图_${Date.now()}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
};

export const buildDrawioXml = (nodes) => {
  const { minX, minY, width, height } = getExportBounds(nodes);
  const pageWidth = Math.max(1200, Math.ceil(width + EXPORT_PADDING * 2));
  const pageHeight = Math.max(800, Math.ceil(height + EXPORT_PADDING * 2));
  const dx = Math.max(1200, pageWidth);
  const dy = Math.max(800, pageHeight);
  const diagramId = `diagram-${generateId()}`;
  const modifiedAt = new Date().toISOString();

  const vertexXml = nodes.map((node) => {
    const x = Math.round(node.x - minX);
    const y = Math.round(node.y - minY);
    const nodeWidth = Math.round(getNodeWidth(node));
    const nodeHeight = Math.round(getNodeHeight(node));

    return [
      `      <mxCell id="${escapeXml(node.id)}" value="${formatDrawioText(node.text)}" style="${escapeXml(getDrawioNodeStyle(node))}" vertex="1" parent="1">`,
      `        <mxGeometry x="${x}" y="${y}" width="${nodeWidth}" height="${nodeHeight}" as="geometry" />`,
      '      </mxCell>',
    ].join('\n');
  }).join('\n');

  const edgeXml = nodes
    .filter((node) => node.parentId)
    .map((node) => [
      `      <mxCell id="edge-${escapeXml(node.id)}" value="" style="${escapeXml(getDrawioEdgeStyle(node))}" edge="1" parent="1" source="${escapeXml(node.parentId)}" target="${escapeXml(node.id)}">`,
      '        <mxGeometry relative="1" as="geometry" />',
      '      </mxCell>',
    ].join('\n'))
    .join('\n');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<mxfile host="app.diagrams.net" modified="${modifiedAt}" agent="OpenAI Codex" version="24.7.17" type="device">`,
    `  <diagram id="${diagramId}" name="Page-1">`,
    `    <mxGraphModel dx="${dx}" dy="${dy}" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="${pageWidth}" pageHeight="${pageHeight}" math="0" shadow="0">`,
    '      <root>',
    '        <mxCell id="0" />',
    '        <mxCell id="1" parent="0" />',
    vertexXml,
    edgeXml,
    '      </root>',
    '    </mxGraphModel>',
    '  </diagram>',
    '</mxfile>',
  ].filter(Boolean).join('\n');
};

const parseDrawioStyle = (styleText) => (
  String(styleText ?? '')
    .split(';')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .reduce((accumulator, entry) => {
      const [rawKey, ...rawValueParts] = entry.split('=');
      const key = rawKey?.trim();
      if (!key) return accumulator;
      accumulator[key] = rawValueParts.join('=').trim();
      return accumulator;
    }, {})
);

const decodeDrawioValue = (value) => {
  const rawValue = String(value ?? '');
  const normalizedBreaks = rawValue.replace(/<br\s*\/?>/gi, '\n');
  return normalizedBreaks
    .replace(/<\/?div[^>]*>/gi, '\n')
    .replace(/<\/?p[^>]*>/gi, '\n')
    .replace(/<\/?[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim() || '未命名节点';
};

const inferNodeMetaFromDrawioStyle = (style) => {
  const strokeColor = String(style.strokeColor ?? '').toLowerCase();
  const fillColor = String(style.fillColor ?? '').toLowerCase();
  const dashed = style.dashed === '1';

  if (dashed || strokeColor === '#fb923c' || strokeColor === '#f59e0b' || fillColor === '#fff7ed') {
    return { type: 'obstacle', status: 'blocked' };
  }

  if (strokeColor === '#22c55e' || fillColor === '#f0fdf4') {
    return { type: 'goal', status: 'completed' };
  }

  if (strokeColor === '#ef4444' || fillColor === '#fef2f2') {
    return { type: 'goal', status: 'blocked' };
  }

  return { type: 'goal', status: 'in-progress' };
};

export const parseDrawioXml = (xmlText) => {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, 'application/xml');
  const parserError = xmlDoc.querySelector('parsererror');
  if (parserError) {
    throw new Error('draw.io XML 解析失败');
  }

  const vertexCells = Array.from(xmlDoc.querySelectorAll('mxCell[vertex="1"]'));
  const vertexIds = new Set(vertexCells.map((cell) => cell.getAttribute('id')).filter(Boolean));
  const edgeCells = Array.from(xmlDoc.querySelectorAll('mxCell[edge="1"]'));
  const incomingEdgeMetaMap = new Map();

  edgeCells.forEach((cell) => {
    const source = cell.getAttribute('source');
    const target = cell.getAttribute('target');
    if (!source || !target) return;
    if (!vertexIds.has(source) || !vertexIds.has(target)) return;
    if (!incomingEdgeMetaMap.has(target)) {
      const style = parseDrawioStyle(cell.getAttribute('style'));
      const exitX = Number(style.exitX);
      const exitY = Number(style.exitY);
      const entryX = Number(style.entryX);
      const entryY = Number(style.entryY);

      incomingEdgeMetaMap.set(target, {
        parentId: source,
        parentAnchorId: Number.isFinite(exitX) && Number.isFinite(exitY)
          ? resolveAnchorIdFromRatio(exitX, exitY)
          : null,
        childAnchorId: Number.isFinite(entryX) && Number.isFinite(entryY)
          ? resolveAnchorIdFromRatio(entryX, entryY)
          : null,
      });
    }
  });

  const importedNodes = vertexCells.map((cell) => {
    const geometry = cell.querySelector('mxGeometry');
    if (!geometry) return null;

    const id = cell.getAttribute('id');
    if (!id) return null;

    const style = parseDrawioStyle(cell.getAttribute('style'));
    const { type, status } = inferNodeMetaFromDrawioStyle(style);
    const x = Number(geometry.getAttribute('x') ?? 0);
    const y = Number(geometry.getAttribute('y') ?? 0);
    const width = Math.max(MIN_NODE_WIDTH, Number(geometry.getAttribute('width') ?? MIN_NODE_WIDTH));
    const height = Math.max(MIN_NODE_HEIGHT, Number(geometry.getAttribute('height') ?? MIN_NODE_HEIGHT));
    const incomingEdgeMeta = incomingEdgeMetaMap.get(id);

    return {
      id,
      text: decodeDrawioValue(cell.getAttribute('value')),
      type,
      status,
      x,
      y,
      parentId: incomingEdgeMeta?.parentId ?? null,
      parentAnchorId: incomingEdgeMeta?.parentAnchorId ?? undefined,
      childAnchorId: incomingEdgeMeta?.childAnchorId ?? undefined,
      width,
      height,
      manualWidth: width,
      manualHeight: height,
    };
  }).filter(Boolean);

  if (importedNodes.length === 0) {
    throw new Error('draw.io 文件中没有可导入的节点');
  }

  return importedNodes;
};
