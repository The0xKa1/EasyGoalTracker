import { Download, Github, Keyboard, LayoutTemplate, PlusCircle, Target } from 'lucide-react';

const baseButtonClassName = 'px-4 py-2 rounded-lg font-medium transition-all bg-white border border-yellow-300 text-yellow-800 hover:bg-yellow-50 hover:shadow shadow-sm';
const kbdClassName = 'inline-flex items-center rounded-md border border-yellow-300 bg-yellow-50 px-1.5 py-0.5 text-[10px] font-semibold text-yellow-900 shadow-[inset_0_-1px_0_rgba(202,138,4,0.18)]';

export default function GoalMapToolbar({
  drawioFileInputRef,
  selectionMode,
  isExporting,
  onAutoArrange,
  onAddRootGoal,
  onImportDrawio,
  onClearCanvas,
  onExportDrawio,
  onToggleSelectionMode,
  onExportPng,
}) {
  return (
    <div className="bg-yellow-100/80 backdrop-blur border-b border-yellow-200 flex items-center justify-between px-6 py-3 z-10 shadow-sm gap-4">
      <div className="flex flex-col items-start gap-2">
        <div className="flex items-center space-x-3">
          <a
            href="https://github.com/The0xKa1/EasyGoalTracker"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-white/80 border border-yellow-300 text-yellow-800 hover:bg-yellow-50 hover:shadow-sm transition-all"
          >
            <Github className="w-3 h-3" />
            <span>GitHub</span>
          </a>
          <Target className="text-yellow-600 w-6 h-6" />
          <h1 className="font-bold text-lg text-yellow-900 tracking-wide">Easy Goal Tracker</h1>
        </div>

        <div className="flex items-center gap-2 rounded-full bg-white/70 border border-yellow-200 px-3 py-1 text-[11px] text-yellow-800 leading-none">
          <Keyboard className="w-3.5 h-3.5 text-yellow-600" />
          <span className="flex items-center gap-1">
            <kbd className={kbdClassName}>Delete</kbd>
            <span>删除</span>
          </span>
          <span className="text-yellow-400">•</span>
          <span className="flex items-center gap-1">
            <kbd className={kbdClassName}>Enter</kbd>
            <span>编辑</span>
          </span>
          <span className="text-yellow-400">•</span>
          <span className="flex items-center gap-1">
            <kbd className={kbdClassName}>Esc</kbd>
            <span>退出当前模式</span>
          </span>
          <span className="text-yellow-400">•</span>
          <span className="flex items-center gap-1">
            <kbd className={kbdClassName}>Ctrl</kbd>
            <span>/</span>
            <kbd className={kbdClassName}>Cmd</kbd>
            <span>+</span>
            <kbd className={kbdClassName}>A</kbd>
            <span>全选</span>
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap justify-end">
        <input
          ref={drawioFileInputRef}
          type="file"
          accept=".drawio,.xml"
          className="hidden"
          onChange={onImportDrawio}
        />

        <button
          onClick={onAutoArrange}
          className={`${baseButtonClassName} flex items-center gap-2`}
        >
          <LayoutTemplate className="w-4 h-4" />
          一键排版
        </button>

        <button
          onClick={onAddRootGoal}
          className={`${baseButtonClassName} flex items-center gap-2`}
        >
          <PlusCircle className="w-4 h-4" />
          新增总目标
        </button>

        <button
          onClick={() => drawioFileInputRef.current?.click()}
          className={baseButtonClassName}
        >
          导入 draw.io
        </button>

        <button
          onClick={onClearCanvas}
          className="px-4 py-2 rounded-lg font-medium transition-all bg-white border border-red-300 text-red-700 hover:bg-red-50 hover:shadow shadow-sm"
        >
          一键清屏
        </button>

        <button
          onClick={onExportDrawio}
          className={baseButtonClassName}
        >
          导出 draw.io
        </button>

        <button
          onClick={onToggleSelectionMode}
          className={`px-4 py-2 rounded-lg font-medium transition-all border ${
            selectionMode
              ? 'bg-sky-100 border-sky-300 text-sky-800'
              : 'bg-white border-yellow-300 text-yellow-800 hover:bg-yellow-50 hover:shadow shadow-sm'
          }`}
        >
          {selectionMode ? '退出框选' : '框选移动'}
        </button>

        <button
          onClick={onExportPng}
          disabled={isExporting}
          className={`flex items-center px-4 py-2 rounded-lg font-medium transition-all ${
            isExporting
              ? 'bg-yellow-200 text-yellow-600 cursor-not-allowed'
              : 'bg-white border border-yellow-300 text-yellow-800 hover:bg-yellow-50 hover:shadow shadow-sm'
          }`}
        >
          <Download className="w-4 h-4 mr-2" />
          {isExporting ? '导出中...' : '导出为 PNG'}
        </button>
      </div>
    </div>
  );
}
