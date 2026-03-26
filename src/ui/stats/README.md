# `src/ui/stats`

本目录实现标签统计与 UP 分类管理页面的基础框架。

## 重要说明

⚠️ **当前状态：数据交互已移除**

本目录正在进行底层重构，所有数据操作代码已暂时移除，仅保留UI框架和基础结构。以下功能等待底层重构完成后重新实现：

- 标签管理（添加、删除、查询）
- 分类管理（创建、修改、删除）
- 筛选功能（标签筛选、分类筛选）
- UP列表渲染和分页
- 拖拽功能
- 数据加载和保存

## 目录结构

```
src/ui/stats/
├── stats.ts            # 页面主入口
├── types.ts            # 类型定义
├── helpers.ts          # 辅助函数（状态管理）
├── dom.ts              # DOM操作工具（从通用工具导出）
├── drag.ts             # 拖拽操作（从通用工具导出）
├── page-actions.ts     # 页面操作绑定
├── tag-manager.ts      # 标签管理（基础框架）
├── category-manager.ts  # 分类管理（基础框架）
├── filter-manager.ts   # 筛选管理（基础框架）
├── up-list.ts          # UP列表渲染（基础框架）
├── stats.html          # 页面HTML
├── stats.css           # 页面样式
└── README.md          # 本文档
```

## 通用工具

以下通用功能已移至 `src/utls` 目录：

- `dom-utils.ts` - DOM操作通用工具
- `drag-utils.ts` - 拖拽操作通用工具
- `tag-utils.ts` - 标签和颜色相关工具
- `url-builder.ts` - URL构建工具

## 文件说明

### 核心文件

- **stats.ts**: 页面初始化和主入口
  - 创建初始状态
  - 绑定页面操作
  - 协调各模块渲染

- **types.ts**: 类型定义
  - StatsState: 页面状态
  - FilterState: 筛选状态
  - CategoryTagList: 分类标签列表

- **helpers.ts**: 辅助函数
  - createInitialState: 创建初始状态
  - resetFilters: 重置筛选器

### 管理器文件

- **tag-manager.ts**: 标签管理
  - renderTagList: 渲染标签列表
  - renderTagPill: 渲染标签元素
  - addTagToUp/removeTagFromUp: 标签操作

- **category-manager.ts**: 分类管理
  - renderCategories: 渲染分类列表
  - addCategory/removeCategory: 分类操作
  - addTagToCategory/removeTagFromCategory: 分类标签操作

- **filter-manager.ts**: 筛选管理
  - renderFilterTags: 渲染筛选标签
  - setupDragAndDrop: 设置拖拽功能
  - clearFilters: 清除所有筛选

- **up-list.ts**: UP列表管理
  - renderUpList: 渲染UP列表
  - refreshUpList: 刷新UP列表
  - renderPagination: 渲染分页控件

### 工具文件

- **dom.ts**: DOM操作（从通用工具导出）
- **drag.ts**: 拖拽操作（从通用工具导出）
- **page-actions.ts**: 页面操作绑定

## 设计原则

### 代码组织
- 将通用功能移至 `src/utls` 避免代码重复
- 保持各模块职责单一
- 清晰的模块边界和接口

### 数据访问
- 所有数据操作通过统一接口
- 避免直接访问底层存储
- 等待底层重构完成后统一实现

### UI框架
- 保留完整的UI结构
- 保持事件处理框架
- 维护状态管理机制
