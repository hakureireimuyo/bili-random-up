
# Database 模块说明

## 概述

本模块负责管理 Bilibili Discovery 系统的所有数据存储和访问，基于 IndexedDB 实现。

### 设计原则

1. **数据结构独立** - 每个数据结构单独一个文件
2. **接口规范分离** - 数据结构定义和接口实现分开存储
3. **职责明确** - 每个接口都有清晰的职责和能力边界
4. **可扩展性** - 支持未来功能扩展
5. **数据驱动** - Repository 作为唯一数据入口，确保数据流可控

## 架构设计

### 数据流架构

```
[ UI 层 ]
    ↓
[ Repository 层 ]  ← ⭐ 对外接口层（薄层）
    ↓
[ DataManager 层 ]  ← ⭐ 核心调度层
    ↓
[ Strategy 层 ]  ← ⭐ 策略决策层
    ↓
[ Query 层 ]     [ Cache 层 ]
    ↓
[ IndexedDB 层 ]
```

### 各层职责

#### 1. Repository 层（对外接口层）
- **职责**：作为对外接口层，只负责将 UI 请求转为数据请求描述
- **核心功能**：
  - 将 UI 请求转为"数据请求描述"
  - 不直接操作 cache
  - 不直接访问 DB
  - 不做复杂逻辑
- **特点**：
  - 薄层设计
  - 作为 API 入口
  - 职责单一

#### 2. DataManager 层（核心调度层）
- **职责**：统一调度数据流
- **核心功能**：
  - 判断数据来源（cache / DB）
  - 控制加载范围
  - 调用 Query
  - 管理 cache 生命周期
  - 保证数据一致性
- **特点**：
  - 核心调度逻辑
  - 数据流控制
  - 缓存管理

#### 3. Strategy 层（策略层）
- **职责**：决定"怎么查"，而不是"去查"
- **核心功能**：
  - 决定是否走索引
  - 决定是否需要从数据库加载
  - 决定加载多少数据
  - 决定是否使用缓存
- **特点**：
  - 策略决策
  - 查询计划生成
  - 可扩展性强

#### 4. Cache 层（缓存层）
- **职责**：纯内存存储，不包含任何逻辑
- **特点**：
  - 只是数据结构（Map、Set等）
  - 不决定何时更新或删除
  - 不包含查询逻辑
  - 作为 Repository 的内部实现细节

#### 5. Query 层（查询层）
- **职责**：纯计算工具，负责数据过滤和排序
- **特点**：
  - 无副作用
  - 不知道 cache 和 DB 的存在
  - 只对给定的数据进行计算
  - 可作为"策略"被 Repository 调用

#### 6. Implementations 层（IndexedDB 访问层）
- **职责**：提供对 IndexedDB 的底层访问
- **特点**：
  - 只负责数据的持久化存储
  - 不包含业务逻辑
  - 提供基础的 CRUD 操作

## 模块说明

### Repository 模块（对外接口层）
- **tag-repository.ts** - 标签数据仓库，作为对外接口层，只负责将 UI 请求转为数据请求描述
- **video-repository.ts** - 视频数据仓库，作为对外接口层，只负责将 UI 请求转为数据请求描述

### Manager 模块（核心调度层）
- **tag-data-manager.ts** - 标签数据管理器，统一调度标签数据流
- **video-data-manager.ts** - 视频数据管理器，统一调度视频数据流

### Strategy 模块（策略层）
- **tag-strategy.ts** - 标签数据查询策略，决定"怎么查"
- **video-strategy.ts** - 视频数据查询策略，决定"怎么查"

### Plan 模块（查询计划）
- **query-plan.ts** - 查询计划定义，连接 Repository、DataManager 和 Strategy 层

### Cache 模块
- **data-cache/** - 数据缓存，存储完整的数据对象
  - tag-data-cache.ts - 标签数据缓存
  - video-data-cache.ts - 视频数据缓存
- **index-cache/** - 索引缓存，存储用于快速查询的索引数据
  - tag-index-cache.ts - 标签索引缓存
  - video-index-cache.ts - 视频索引缓存
- **lru-cache.ts** - LRU 缓存实现
- **fifo-cache.ts** - FIFO 缓存实现

### Query 模块
- **tag/** - 标签查询
  - tag-query.ts - 标签查询接口
  - tag-query-engine.ts - 标签查询引擎（纯计算工具）
  - debug.ts - 调试工具
- **video/** - 视频查询
  - video-query.ts - 视频查询接口
  - video-query-engine.ts - 视频查询引擎（纯计算工具）
  - debug.ts - 调试工具
- **types.ts** - 查询类型定义

### Implementations 模块
提供对 IndexedDB 的底层访问实现，包括各种数据仓库的具体实现。

### IndexedDB 模块
- **config.ts** - 数据库配置
- **db-manager.ts** - 数据库管理器
- **db-utils.ts** - 数据库工具类
- **USAGE.md** - 使用说明

## 设计原则

1. **单一职责** - 每个模块只负责一类数据的操作
2. **明确边界** - 每个方法都有清晰的能力边界
3. **可测试性** - 接口设计便于单元测试
4. **可扩展性** - 支持未来功能扩展
5. **类型安全** - 完整的 TypeScript 类型定义
6. **数据驱动** - Repository 作为唯一数据入口，确保数据流可控
