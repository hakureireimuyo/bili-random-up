# 书页查询机制使用指南

## 概述

书页查询机制是一种高性能的复杂查询解决方案，特别适用于需要分页展示大量数据的场景。它通过维护结果ID列表和按需加载数据的方式，实现了高效的内存管理和数据访问。

## 核心概念

### 书 (Book)

书是一个查询结果的容器，包含：
- 结果ID列表：符合查询条件的所有记录的ID
- 页数据缓存：已加载的页数据
- 当前状态：当前页码、总页数等
- 查询条件：创建书时使用的查询条件

### 页 (Page)

页是书中的一个分页单元，包含：
- 页码
- 数据列表
- 是否已加载
- 加载时间戳

### 索引 (Index)

索引是轻量级的数据结构，用于快速查询：
- 创作者ID
- 创作者名称
- 标签ID列表
- 是否已关注

## 使用方法

### 1. 基本用法

```typescript
import { CreatorRepository } from './database/repositories/creator-repository.js';

const repo = new CreatorRepository();

// 创建名称查询书
const bookId = await repo.createNameQueryBook(
  'bilibili',  // 平台
  '游戏',      // 搜索关键词
  false,       // 是否只查询已关注的
  { pageSize: 20 }  // 查询选项
);

// 获取第一页数据
const page1 = await repo.getPage(bookId, 0);
console.log(page1.items);  // 第一页的Creator列表
console.log(page1.state);  // 分页状态信息

// 获取第二页数据
const page2 = await repo.getPage(bookId, 1, { preloadNext: true });
```

### 2. 标签查询

```typescript
// 创建标签查询书
const bookId = await repo.createTagQueryBook(
  'bilibili',
  [
    { tagId: 'tag1', operator: 'AND' },
    { tagId: 'tag2', operator: 'OR' },
    { tagId: 'tag3', operator: 'NOT' }
  ],
  false,
  { pageSize: 20 }
);

// 获取数据
const page = await repo.getPage(bookId, 0);
```

### 3. 更新查询条件

```typescript
// 更新查询条件
await repo.updateQueryCondition(bookId, {
  type: 'name',
  platform: 'bilibili',
  keyword: '科技',
  isFollowing: true
});

// 获取新条件下的数据
const page = await repo.getPage(bookId, 0);
```

### 4. 预加载

```typescript
// 获取第一页，并预加载下一页
const page1 = await repo.getPage(bookId, 0, {
  pageSize: 20,
  preloadNext: true,
  preloadCount: 2  // 预加载2页
});
```

### 5. 清理资源

```typescript
// 删除单本书
repo.deleteBook(bookId);

// 清理过期的书（1小时未访问的）
repo.cleanupExpiredBooks(3600000);

// 清空所有缓存
repo.clearCache();
```

## 性能优化

### 1. 索引缓存

系统会自动维护创作者索引缓存，用于快速查询。索引缓存包含：
- 创作者ID
- 创作者名称
- 标签ID列表
- 是否已关注

### 2. 数据缓存

系统会自动缓存已加载的完整Creator数据，避免重复从数据库读取。

### 3. 预加载

通过设置`preloadNext`和`preloadCount`选项，可以预加载后续页面的数据，提升用户体验。

### 4. 按需加载

只有在真正需要显示数据时，才会从数据库加载完整数据，减少内存占用。

## 架构说明

### 目录结构

```
src/database/
├── cache/              # 缓存模块
│   ├── index-cache.ts  # 索引缓存
│   └── data-cache.ts   # 数据缓存
├── manager/            # 管理模块
│   └── book-manager.ts # 书管理器
├── query/              # 查询模块
│   ├── types.ts        # 类型定义
│   └── query-engine.ts # 查询引擎
├── repositories/       # Repository层
│   └── creator-repository.ts
└── implementations/    # 基础实现层
    └── creator-repository.impl.ts
```

### 模块职责

1. **cache** - 管理索引和数据的内存缓存
2. **manager** - 管理书的生命周期和页数据加载
3. **query** - 实现高性能的查询逻辑
4. **repositories** - 对外提供统一的查询接口
5. **implementations** - 提供基础的数据库操作

## 注意事项

1. **书ID的唯一性**：书ID由查询条件自动生成，相同的查询条件会生成相同的书ID
2. **内存管理**：定期清理过期的书，避免内存泄漏
3. **并发访问**：同一本书可以被多个地方同时访问，系统会自动处理并发
4. **数据一致性**：当数据更新时，会自动更新索引和数据缓存

## 示例场景

### 场景1：搜索UP主

```typescript
// 用户输入搜索关键词
const keyword = '游戏';

// 创建查询书
const bookId = await repo.createNameQueryBook('bilibili', keyword);

// 获取第一页
const page1 = await repo.getPage(bookId, 0);

// 显示数据
renderCreators(page1.items);

// 用户点击下一页
const page2 = await repo.getPage(bookId, 1, { preloadNext: true });
renderCreators(page2.items);
```

### 场景2：标签筛选

```typescript
// 用户选择标签
const tags = ['游戏', '娱乐'];

// 创建查询书
const bookId = await repo.createTagQueryBook('bilibili', [
  { tagId: tags[0], operator: 'AND' },
  { tagId: tags[1], operator: 'OR' }
]);

// 获取数据
const page = await repo.getPage(bookId, 0);
renderCreators(page.items);
```

### 场景3：动态更新查询条件

```typescript
// 初始查询
let bookId = await repo.createNameQueryBook('bilibili', '游戏');
let page = await repo.getPage(bookId, 0);
renderCreators(page.items);

// 用户修改查询条件
bookId = await repo.createNameQueryBook('bilibili', '科技');
page = await repo.getPage(bookId, 0);
renderCreators(page.items);
```
