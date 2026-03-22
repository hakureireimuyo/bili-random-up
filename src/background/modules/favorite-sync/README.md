# 收藏同步模块 (favorite-sync)

## 职责

负责将 B 站收藏数据同步到本地数据库，当前模块主要承担以下工作：

- 拉取用户自己的收藏夹和订阅合集
- 为每个远端收藏夹创建或复用本地收藏夹
- 增量识别尚未入库的视频
- 拉取视频详情与标签，并补齐创作者、标签、视频数据
- 对失效视频写入兜底记录，避免同步中断
- 提供基于本地收藏夹的数据搜索能力

## 当前结构

- `types.ts`：模块领域类型、数据源接口、依赖接口
- `config.ts`：默认配置
- `data-converters.ts`：API 数据到数据库模型的转换
- `data-adapters.ts`：B 站 API 适配器与请求节流
- `favorite-sync-service.ts`：同步流程、增量抓取、批处理、搜索
- `index.ts`：模块入口与默认依赖装配

## 设计原则

1. 依赖注入：服务本身不直接 new 具体实现，便于替换数据源和仓储。
2. 单一职责：适配器只负责“节流 + 转发 + 轻量转换”，服务只负责业务流程。
3. 类型收敛：核心链路已用明确领域类型替换 `any`，减少隐式约定。
4. 渐进式增量同步：优先判断本地与远端数量差，再按分页抓取新增视频。
5. 容错优先：单个视频失败不会中断整次同步，失败项会记录到结果中。

## 同步流程

### 多收藏夹模式

当 `createMultipleCollections = true` 时：

1. 拉取用户自己的收藏夹列表。
2. 拉取用户订阅的合集列表。
3. 为每个远端收藏夹创建 `FolderContext`。
4. 统计本地已同步数量与本地视频 ID 集合。
5. 仅在远端数量大于本地数量时继续抓取。
6. 按分页拉取远端视频，并过滤本地已存在的视频。
7. 按批次补齐视频详情、标签、创作者，再写入收藏夹。

### 默认收藏夹模式

当 `createMultipleCollections = false` 时：

1. 创建或复用默认收藏夹。
2. 拉取所有收藏视频。
3. 按批次处理并入库。

## 分页抓取策略

`favorite-sync-service.ts` 当前实现的增量抓取策略：

- 先抓第一页，优先判断最新视频里是否有新增内容。
- 如果第一页全是本地已有视频，且本地已经有一定数据量，会跳转到更接近本地数量的位置继续拉取。
- 抓取过程中如果已经拿到足够的新增视频，会提前停止。
- 跳转后如果连续遇到大量已存在视频，也会提前停止，避免无意义请求。

这套策略的目标是降低中断后重启任务的请求量，同时尽量保留“最新收藏优先同步”的行为。

## 类型设计

模块内部新增并统一使用了以下领域类型：

- `FavoriteVideoEntry`：收藏列表中的轻量视频项
- `FavoriteTag`：视频标签
- `FavoriteFolder`：普通收藏夹
- `CollectedFavoriteFolder`：订阅合集
- `FavoriteVideoApiDetail`：视频详情响应
- `IFavoriteSyncDependencies`：服务依赖边界

仓储依赖没有直接暴露完整实现，而是通过 `*RepositoryLike` 接口约束模块真正需要的最小能力，降低耦合。

## 请求节流

`data-adapters.ts` 中抽出了 `RequestThrottler`，用于统一管理 API 调用间隔：

- `BiliApiVideoDataSource`：控制视频详情与标签请求频率
- `BiliApiFavoriteDataSource`：控制收藏夹、合集、分页列表请求频率

这样做可以把“防风控”从业务逻辑里移走，让同步服务只关心同步本身。

## 搜索能力

`searchFavoriteVideos` 当前支持：

- `collectionId`
- `keyword`
- `tagId`
- `creatorId`

搜索数据来自本地收藏夹与本地视频表，不直接请求远端 API。

## 配置说明

### `FavoriteSyncConfig`

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `defaultCollectionId` | `string` | `"bilibili_favorites"` | 默认收藏夹 ID |
| `defaultCollectionName` | `string` | `"B站收藏夹"` | 默认收藏夹名称 |
| `defaultCollectionDescription` | `string` | `"从B站同步的收藏视频"` | 默认收藏夹描述 |
| `batchSize` | `number` | `10` | 每批处理的视频数量 |
| `createMultipleCollections` | `boolean` | `true` | 是否按远端收藏夹拆分本地收藏夹 |
| `requestInterval` | `number` | `2500` | API 请求间隔，单位毫秒 |

## 使用示例

```ts
import {
  FavoriteSyncService,
  BiliApiFavoriteDataSource,
  BiliApiVideoDataSource
} from "./favorite-sync/index.js";
import {
  getAllFavoriteVideos,
  getCollectedFolders,
  getFavoriteFolders,
  getFavoriteVideos,
  getSeasonVideos,
  getVideoDetail,
  getVideoTagsDetail
} from "../../api/bili-api.js";
import { VideoRepository } from "../../database/implementations/video-repository.impl.js";
import { CollectionRepository } from "../../database/implementations/collection-repository.impl.js";
import { CollectionItemRepository } from "../../database/implementations/collection-item-repository.impl.js";
import { CreatorRepository } from "../../database/implementations/creator-repository.impl.js";
import { TagRepository } from "../../database/implementations/tag-repository.impl.js";

const videoDataSource = new BiliApiVideoDataSource(getVideoDetail, getVideoTagsDetail, 0);
const favoriteDataSource = new BiliApiFavoriteDataSource(
  getAllFavoriteVideos,
  getFavoriteFolders,
  getFavoriteVideos,
  getCollectedFolders,
  undefined,
  getSeasonVideos,
  2500
);

const service = new FavoriteSyncService({
  videoDataSource,
  favoriteDataSource,
  videoRepository: new VideoRepository(),
  collectionRepository: new CollectionRepository(),
  collectionItemRepository: new CollectionItemRepository(),
  creatorRepository: new CreatorRepository(),
  tagRepository: new TagRepository()
});

const result = await service.syncFavoriteVideos(userId);
console.log(result.syncedCount, result.failedVideos);
```

## 数据流

```text
bili-api.ts
  -> data-adapters.ts
  -> favorite-sync-service.ts
  -> data-converters.ts
  -> database/implementations
```

