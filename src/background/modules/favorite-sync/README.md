
# 收藏同步模块 (favorite-sync)

## 职责

负责从B站同步收藏数据到本地数据库，包括：
- 从B站API获取收藏视频列表
- 获取视频详细信息（标题、描述、时长、标签等）
- 确保UP主和标签数据存在
- 将视频数据保存到本地数据库
- 将视频添加到收藏夹
- 提供收藏视频搜索功能（支持排序和过滤）

## 设计原则

1. **依赖注入**：通过构造函数注入所有依赖，不直接创建实例
2. **配置驱动**：将可配置项提取为配置对象，支持自定义
3. **接口隔离**：定义清晰的数据源接口，支持不同数据源适配
4. **职责分离**：
   - `types.ts`：类型定义（包括精确的API响应类型和错误类型）
   - `config.ts`：配置管理
   - `data-converters.ts`：数据转换（类型安全的数据转换函数）
   - `data-adapters.ts`：数据源适配（统一的请求间隔控制）
   - `favorite-sync-service.ts`：核心业务逻辑

## 重构改进点

### 1. 类型安全增强
- 使用精确的类型定义替代 `any` 类型
- 新增 B站API响应类型（`BiliApiVideoDetail`、`BiliApiTag` 等）
- 新增同步错误类型（`SyncErrorType`、`SyncError`）
- 所有仓库依赖使用具体的 Repository 类型

### 2. 代码复用优化
- 提取 `RequestRateLimiter` 基类，统一管理请求间隔控制
- 新增批量转换函数 `toDBTags`
- 提取通用的停止检查逻辑 `shouldStopSync`

### 3. 功能增强
- 搜索功能新增排序支持（按添加时间、发布时间、标题排序）
- 同步结果新增跳过数量统计
- 配置项新增最大获取限制和最大连续已存在视频数

### 4. 错误处理改进
- 数据源适配器添加错误捕获和日志
- 新增详细的错误类型定义
- 失败视频记录包含时间戳和错误类型

### 5. 代码可维护性
- 所有函数添加详细的 JSDoc 注释
- 统一的日志格式和前缀
- 清晰的代码结构和职责划分

## 使用示例

```typescript
import { FavoriteSyncService, BiliApiVideoDataSource, BiliApiFavoriteDataSource } from "./favorite-sync/index.js";
import { VideoRepository, CollectionRepository, CollectionItemRepository, CreatorRepository, TagRepository } from "../../database/implementations/index.js";
import { getVideoDetail, getVideoTagsDetail, getAllFavoriteVideos } from "../../api/bili-api.js";

// 创建数据源适配器
const videoDataSource = new BiliApiVideoDataSource(getVideoDetail, getVideoTagsDetail);
const favoriteDataSource = new BiliApiFavoriteDataSource(getAllFavoriteVideos);

// 创建依赖对象
const dependencies = {
  videoDataSource,
  favoriteDataSource,
  videoRepository: new VideoRepository(),
  collectionRepository: new CollectionRepository(),
  collectionItemRepository: new CollectionItemRepository(),
  creatorRepository: new CreatorRepository(),
  tagRepository: new TagRepository()
};

// 创建服务实例
const service = new FavoriteSyncService(dependencies, {
  batchSize: 20,
  maxFetchLimit: 1000,
  maxConsecutiveExisting: 5
});

// 同步收藏视频
const result = await service.syncFavoriteVideos(userId);
console.log(`Synced ${result.syncedCount} videos, skipped ${result.skippedCount || 0}`);

// 搜索收藏视频（带排序）
const videos = await service.searchFavoriteVideos({
  keyword: "前端",
  tagId: "123",
  sortBy: "addedAt",
  sortOrder: "desc"
});
```

## 数据流

```
API层 (bili-api.ts)
    ↓
数据源适配器 (data-adapters.ts)
    ↓
业务逻辑层 (favorite-sync-service.ts)
    ↓
数据转换层 (data-converters.ts)
    ↓
数据库实现层 (database/implementations)
```

## 配置说明

### FavoriteSyncConfig

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| defaultCollectionId | string | "bilibili_favorites" | 默认收藏夹ID |
| defaultCollectionName | string | "B站收藏夹" | 默认收藏夹名称 |
| defaultCollectionDescription | string | "从B站同步的收藏视频" | 默认收藏夹描述 |
| batchSize | number | 10 | 每次同步的批次大小 |
| createMultipleCollections | boolean | true | 是否为每个B站收藏夹创建对应的本地收藏夹 |
| requestInterval | number | 2500 | 请求间隔时间（毫秒），用于避免触发风控 |
| maxFetchLimit | number | 1000 | 最大获取限制，避免过多请求 |
| maxConsecutiveExisting | number | 5 | 最大连续已存在视频数（跳转后） |

## 错误处理

模块定义了详细的错误类型，便于错误追踪和处理：

```typescript
enum SyncErrorType {
  VIDEO_NOT_FOUND = 'VIDEO_NOT_FOUND',
  VIDEO_DETAIL_ERROR = 'VIDEO_DETAIL_ERROR',
  TAG_ERROR = 'TAG_ERROR',
  COLLECTION_ERROR = 'COLLECTION_ERROR',
  CREATOR_ERROR = 'CREATOR_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN = 'UNKNOWN'
}

interface SyncError {
  type: SyncErrorType;
  bvid: string;
  message: string;
  timestamp: number;
}
```
