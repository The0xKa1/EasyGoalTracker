import { AlertTriangle, CheckCircle2, Edit3, Link2, PlayCircle, Plus, Trash2, XCircle } from 'lucide-react';
import { ROOT_NODE_ID } from '../config';

export function NodeActionPanel({
  node,
  selectedId,
  canStartReparenting,
  reparentingId,
  onAddGoal,
  onAddObstacle,
  onSetStatus,
  onEdit,
  onToggleReparenting,
  onDelete,
}) {
  return (
    <div className={`absolute bottom-6 left-1/2 transform -translate-x-1/2 transition-all duration-300 z-20 ${node ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'}`}>
      <div className="bg-white rounded-2xl shadow-2xl border border-yellow-200 p-2 flex items-center space-x-2">
        <div className="flex items-center bg-yellow-50 rounded-xl p-1">
          <button
            onClick={onAddGoal}
            className="flex flex-col items-center justify-center px-4 py-2 rounded-lg hover:bg-yellow-200 text-yellow-800 transition-colors"
            title="添加子目标/前提"
          >
            <Plus className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium">加子节点</span>
          </button>
          <button
            onClick={onAddObstacle}
            className="flex flex-col items-center justify-center px-4 py-2 rounded-lg hover:bg-orange-200 text-orange-800 transition-colors"
            title="添加阻碍"
          >
            <AlertTriangle className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium">加障碍</span>
          </button>
        </div>

        {node?.type === 'goal' && (
          <>
            <div className="w-px h-10 bg-gray-200 mx-1" />
            <div className="flex items-center bg-gray-50 rounded-xl p-1">
              <button
                onClick={() => onSetStatus('completed')}
                className={`p-3 rounded-lg transition-colors ${node.status === 'completed' ? 'bg-green-100 text-green-700' : 'hover:bg-gray-200 text-gray-500'}`}
                title="标记为已完成"
              >
                <CheckCircle2 className="w-5 h-5" />
              </button>
              <button
                onClick={() => onSetStatus('in-progress')}
                className={`p-3 rounded-lg transition-colors ${node.status === 'in-progress' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-200 text-gray-500'}`}
                title="标记为进行中"
              >
                <PlayCircle className="w-5 h-5" />
              </button>
              <button
                onClick={() => onSetStatus('blocked')}
                className={`p-3 rounded-lg transition-colors ${node.status === 'blocked' ? 'bg-red-100 text-red-700' : 'hover:bg-gray-200 text-gray-500'}`}
                title="标记为遇到阻碍"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
          </>
        )}

        <div className="w-px h-10 bg-gray-200 mx-1" />

        <button
          onClick={onEdit}
          className="p-3 rounded-xl hover:bg-gray-100 text-gray-600 transition-colors"
          title="编辑文字"
        >
          <Edit3 className="w-5 h-5" />
        </button>

        {canStartReparenting && (
          <button
            onClick={onToggleReparenting}
            className={`px-3 py-3 rounded-xl transition-colors flex items-center ${
              reparentingId === selectedId
                ? 'bg-amber-100 text-amber-800'
                : 'hover:bg-amber-50 text-amber-700'
            }`}
            title="更换父节点"
          >
            <Link2 className="w-5 h-5" />
          </button>
        )}

        {selectedId !== ROOT_NODE_ID && (
          <button
            onClick={onDelete}
            className="p-3 rounded-xl hover:bg-red-100 text-red-600 transition-colors"
            title="删除节点"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}

export function MultiSelectPanel({ selectedCount, visible, onDeleteSelected }) {
  return (
    <div className={`absolute bottom-28 left-1/2 -translate-x-1/2 transition-all duration-300 z-20 ${visible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0 pointer-events-none'}`}>
      <div className="bg-sky-50 border border-sky-200 text-sky-900 rounded-2xl shadow-lg px-4 py-3 flex items-center gap-3">
        <div>已选择 {selectedCount} 个节点。拖动任一蓝色高亮节点即可批量移动。</div>
        <button
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onDeleteSelected();
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              onDeleteSelected();
            }
          }}
          className="px-3 py-1.5 rounded-lg bg-white border border-red-200 text-red-700 text-sm hover:bg-red-50 transition-colors flex items-center gap-2"
          title="批量删除所选节点"
        >
          <Trash2 className="w-4 h-4" />
          批量删除
        </button>
      </div>
    </div>
  );
}

export function ReparentingPanel({ node, onCancel }) {
  return (
    <div className={`absolute bottom-28 left-1/2 -translate-x-1/2 transition-all duration-300 z-20 ${node ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0 pointer-events-none'}`}>
      <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl shadow-lg px-4 py-3 flex items-center gap-3">
        <div className="text-sm font-medium">
          正在为“{node?.text || '当前节点'}”选择新父节点，点击绿色高亮节点完成，自身和后代节点不可选。
        </div>
        <button
          onClick={onCancel}
          className="px-3 py-1.5 rounded-lg bg-white border border-amber-200 text-amber-800 text-sm hover:bg-amber-100 transition-colors"
        >
          取消
        </button>
      </div>
    </div>
  );
}
