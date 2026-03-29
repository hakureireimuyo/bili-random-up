# `src/ui`

本目录存放扩展内各个前端页面的实现代码。

主要职责：
- 提供 options、popup、stats、watch-stats 等页面
- 组织页面交互、渲染逻辑和轻量页面状态

设计边界：
- 页面状态类型可以定义在各页面目录中
- 持久化数据类型与数据库交互统一走 `database`

子目录说明：
- `favorites`：收藏夹视频浏览与标签筛选页
- `options`：扩展设置页
- `popup`：浏览器工具栏弹出页
- `shared`：跨页面复用的 UI 基础组件与绑定工具
- `stats`：UP 分类与标签管理页
- `watch-stats`：观看统计展示页
