# Easy Goal Tracker

一个简约轻便的网页版 OKR 目标跟踪工具，支持导出 PNG 和 draw.io XML 格式。


## 使用说明


<div align="center">
  <img src="./assets/demo.png" alt="应用界面示例" width="400"/>
</div>

选中某个节点，下方会出现菜单栏

<div align="center">
  <img src="./assets/menu.png" alt="菜单栏示例" width="400"/>
</div>

- 添加子节点，添加障碍
- 修改节点状态（已完成，进行中，受阻碍）
- 删除节点，更改节点的父节点

鼠标悬停在选中的子节点上会出现子节点与父节点的线条锚点，点击以变更连接处。

<div align="center">
  <img src="./assets/demo1.png" alt="锚点示例" width="400"/>
</div>


<div align="center">
  <img src="./assets/demo2.png" alt="锚点示例2" width="400"/>
</div>


## 本地启动

```powershell
npm install
npm run dev
```

默认开发地址通常是 `http://localhost:5173`。

## 导出能力

- 导出 PNG
- 导出 `.drawio` XML，可直接用 draw.io / diagrams.net 打开继续编辑
- 导入 `.drawio` / `.xml` 文件回当前应用
