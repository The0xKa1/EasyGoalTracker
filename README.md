# Easy Goal Tracker

基于 Vite + React + Tailwind CSS 的目标与障碍解析白板应用。

## 本地启动

```powershell
npm install
npm run dev
```

默认开发地址通常是 `http://localhost:5173`。

## 生产构建

```powershell
npm run build
```

构建产物输出在 `dist/` 目录。

## 导出能力

- 导出 PNG
- 导出 `.drawio` XML，可直接用 draw.io / diagrams.net 打开继续编辑
- 导入 `.drawio` / `.xml` 文件回当前应用

## 技术栈

- Vite
- React
- Tailwind CSS
- lucide-react
- html2canvas
