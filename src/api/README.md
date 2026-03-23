# `src/api`

本目录负责封装与 Bilibili 相关的外部接口访问逻辑。

主要职责：
- 统一管理请求入口、参数拼装与鉴权头
- 提供面向业务的 API 方法，例如获取关注列表、UP 信息、视频列表、标签等
- 隔离外部接口细节，避免业务层直接拼接 URL

使用约定：
- 这里负责“怎么请求外部接口”
- 不负责业务决策、分类策略、数据库持久化
- 业务层应通过这里拿到原始将会自动整理过滤,只留下有用的数据

主要文件：
- `bili-api.ts`：B 站接口主封装
- `types.ts`：B 站 API 返回数据的 TypeScript 类型定义

## 类型定义说明

`types.ts` 中定义了所有 B 站 API 返回数据的 TypeScript 类型，包括：

### 基础类型
- `BiliResponse<T>`：所有 B 站 API 的通用响应格式

### 用户相关类型
- `UpInfo`：UP 主基础信息（mid、name、face）
- `FollowingUp`：关注的 UP 主信息（mid、uname、face）
- `FollowingListResponse`：关注列表响应
- `UpDetailInfo`：UP 主详细信息（mid、name、face、sign）
- `UserStatInfo`：用户统计信息（mid、following、follower）

### 视频相关类型
- `VideoInfo`：视频基础信息（bvid、title、pic、pubdate、duration、owner）
- `VideoTag`：视频标签（tag_id、tag_name）
- `RelatedVideoInfo`：推荐视频信息（继承 VideoInfo，包含统计数据）

### 收藏夹相关类型
- `FavoriteFolderInfo`：收藏夹基础信息（id、mid、title、media_count）
- `FavoriteFolderListResponse`：收藏夹列表响应
- `FavoriteVideoInfo`：收藏夹中的视频信息
- `FavoriteContentResponse`：收藏夹内容响应
- `SubscribedFavoriteFolderInfo`：订阅的收藏夹信息
- `SubscribedFavoriteListResponse`：订阅收藏夹列表响应
- `SubscribedFavoriteVideoInfo`：订阅收藏夹中的视频信息
- `SubscribedFavoriteContentResponse`：订阅收藏夹内容响应

所有类型定义均基于 B 站 API 实际返回的数据结构，确保类型安全。
