export const MIN_NODE_WIDTH = 140;
export const MIN_NODE_HEIGHT = 50;
export const EXPORT_PADDING = 80;
export const EXPORT_FONT_SIZE = 16;
export const EXPORT_LINE_HEIGHT = 1.35;
export const EXPORT_FONT_FAMILY = '"Microsoft YaHei", "PingFang SC", sans-serif';
export const EXPORT_NODE_RADIUS = 12;
export const EXPORT_NODE_PADDING_X = 12;
export const EXPORT_ICON_SIZE = 16;
export const EXPORT_ICON_GAP = 6;
export const NODE_SPAWN_GAP = 28;
export const CONNECTOR_CORNER_RADIUS = 18;
export const NODE_AUTO_MAX_WIDTH = 320;
export const LAYOUT_HORIZONTAL_GAP = 44;
export const LAYOUT_VERTICAL_GAP = 76;
export const LAYOUT_COLLISION_GAP = 28;

export const generateId = () => Math.random().toString(36).slice(2, 11);

export const createRootNode = (overrides = {}) => ({
  id: generateId(),
  text: '总目标',
  type: 'goal',
  status: 'in-progress',
  x: 400,
  y: 300,
  parentId: null,
  width: MIN_NODE_WIDTH,
  height: MIN_NODE_HEIGHT,
  ...overrides,
});

export const createInitialNodes = () => [createRootNode({ id: 'root' })];
