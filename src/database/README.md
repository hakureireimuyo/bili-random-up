# Database 模块使用指南

## 概述

本模块是项目的数据层核心，采用分层架构设计，提供高性能的数据存储、查询和缓存能力。整体架构分为四个主要层次：

```
┌─────────────────────────────────────────────────────────┐
│                    业务层 (UI/业务逻辑)                    │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│              Repository 层 (数据中枢与唯一入口)              │
│  - 数据库访问  - 缓存管理  - 查询协调  - 数据一致性         │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│           Query-Server 层 (高性能查询引擎)                 │
│  - Cache Layer  - Query Layer  - Book Layer            │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│              Implementations 层 (数据访问实现)             │
│  - Repository 实现  - 批量操作  - 基础CRUD                │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│              IndexedDB 层 (底层存储)                      │
│  - 数据库管理  - 事务处理  - 索引操作                     │
└─────────────────────────────────────────────────────────┘
```

## 目录结构

```
database/
├── types/              # 数据类型定义
├── indexeddb/          # IndexedDB 基础设施
├── implementations/    # 数据访问实现
├── repositories/       # Repository 层
├── query-server/       # 查询服务器
│   ├── cache/         # 缓存层
│   ├── query/         # 查询层
│   └── book/          # 书管理层
└── app-state.ts       # 应用状态管理
```

## 快速开始

### 1. 初始化数据库

```typescript
import { dbManager } from './database/indexeddb';

// 初始化数据库
const db = await dbManager.init();
```

### 2. 使用 Repository 进行数据操作

#### 创作者数据操作

```typescript
import { CreatorRepository } from './database/repositories/creator-repository';

const creatorRepo = new CreatorRepository();

// 获取单个创作者
const creator = await creatorRepo.getCreator('creator-id');

// 批量获取创作者
const creators = await creatorRepo.getCreators(['id1', 'id2', 'id3']);

// 创建或更新创作者
await creatorRepo.upsertCreator({
  id: 'creator-id',
  name: '创作者名称',
  platform: 'bilibili',
  // ... 其他字段
});

// 删除创作者
await creatorRepo.deleteCreator('creator-id');
```

#### 视频数据操作

```typescript
import { VideoRepository } from './database/repositories/video-repository';

const videoRepo = new VideoRepository();

// 获取单个视频
const video = await videoRepo.getVideo('video-id');

// 批量获取视频
const videos = await videoRepo.getVideos(['id1', 'id2', 'id3']);

// 创建或更新视频
await videoRepo.upsertVideo({
  id: 'video-id',
  title: '视频标题',
  creatorId: 'creator-id',
  // ... 其他字段
});

// 删除视频
await videoRepo.deleteVideo('video-id');
```

### 3. 使用应用状态管理

```typescript
import { setAppState, getAppState, deleteAppState } from './database/app-state';

// 设置应用状态
await setAppState('user-preferences', {
  theme: 'dark',
  language: 'zh-CN'
});

// 获取应用状态
const preferences = await getAppState('user-preferences');

// 删除应用状态
await deleteAppState('user-preferences');

// 清除指定前缀的状态
await clearAppStateByPrefix('temp-');
```

### 4. 使用查询功能

#### 创建查询服务

```typescript
import { CacheManager } from './database/query-server/cache/cache-manager';
import { BookManager } from './database/query-server/book/base-book-manager';
import { CreatorRepository } from './database/repositories/creator-repository';

// 获取缓存管理器
const cacheManager = CacheManager.getInstance();

// 创建书管理器
const bookManager = new BookManager();

// 创建 Repository
const creatorRepo = new CreatorRepository();

// 创建 Book
const book = bookManager.createBook(
  'creator-query-book',
  queryService,  // 查询服务实例
  cacheManager.getCreatorDataCache(),
  creatorRepo
);

// 执行查询
await book.updateIndex({
  keyword: '搜索关键词',
  // ... 其他查询条件
});

// 获取分页数据
const page1 = await book.getPage(1, 20);
```

### 5. 如无必要,永远不要直接使用IndexedDB（）

## 核心概念

### Repository 层

Repository 层是系统的数据中枢与唯一数据入口，负责：

- **数据访问**：封装所有数据库操作
- **缓存管理**：统一管理 IndexCache、TagCache 和 DataCache
- **数据一致性**：在数据库与缓存之间建立一致性保障机制
- **查询协调**：调度查询服务，返回标准化结果
- **数据转换**：index ↔ id ↔ 完整对象

### Query-Server 层

Query-Server 提供高性能的数据查询和分页管理功能：

- **Cache Layer**：管理索引和完整数据的内存缓存
- **Query Layer**：执行查询逻辑，返回结果ID列表
- **Book Layer**：管理查询结果和分页数据

### Implementations 层

实现层提供对底层存储的直接访问：

- 实现 Repository 接口
- 提供批量操作能力
- 绕过缓存层直接操作数据库

### IndexedDB 层

封装 IndexedDB 基础设施：

- 数据库初始化和管理
- 通用的 CRUD 操作
- 索引查询
- 事务管理

## 最佳实践

### 1. 选择合适的数据访问方式

- **UI 交互场景**：使用 Repository 层，享受缓存和查询优化
- **批量导入/导出**：使用 Implementations 层，直接操作数据库,且不会将数据写入缓存
- **复杂查询**：使用 Query-Server 层，利用查询引擎和缓存

### 2. 缓存管理

- 所有缓存更新必须通过 Repository 层
- 不要在业务层直接操作缓存
- 合理使用 DataCache 的容量限制和过期时间

### 3. 查询优化

- 使用索引查询提高性能
- 批量操作使用批量方法
- 避免在循环中执行数据库操作

### 4. 错误处理

```typescript
try {
  const creator = await creatorRepo.getCreator('creator-id');
  // 处理数据
} catch (error) {
  console.error('获取创作者失败:', error);
  // 错误处理逻辑
}
```

## 注意事项

1. **事务管理**：所有写操作都在事务中执行，事务在操作完成后自动提交
2. **数据一致性**：批量操作会自动回滚，使用游标遍历时注意事务超时
3. **性能优化**：合理使用缓存和索引，避免不必要的数据库查询
4. **类型安全**：充分利用 TypeScript 的类型系统，确保数据类型正确

## 更多信息

- [IndexedDB 详细文档](./indexeddb/USAGE.md)
- [Query-Server 架构说明](./query-server/README.md)
- [Repository 层职责说明](./repositories/README.md)
- [Implementations 层说明](./implementations/README.md)
