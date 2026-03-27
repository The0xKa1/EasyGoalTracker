import { Download, LayoutTemplate, Target } from 'lucide-react';

const baseButtonClassName = 'px-4 py-2 rounded-lg font-medium transition-all bg-white border border-yellow-300 text-yellow-800 hover:bg-yellow-50 hover:shadow shadow-sm';

export default function GoalMapToolbar({
  drawioFileInputRef,
  selectionMode,
  isExporting,
  onAutoArrange,
  onImportDrawio,
  onClearCanvas,
  onExportDrawio,
  onToggleSelectionMode,
  onExportPng,
}) {
  return (
    <div className="h-14 bg-yellow-100/80 backdrop-blur border-b border-yellow-200 flex items-center justify-between px-6 z-10 shadow-sm">
      <div className="flex items-center space-x-2">
        <Target className="text-yellow-600 w-6 h-6" />
        <h1 className="font-bold text-lg text-yellow-900 tracking-wide">Easy Goal Tracker</h1>
      </div>

      <div className="flex items-center gap-3">
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
