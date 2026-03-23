/**
 * Bilibili API wrappers.
 * 
 * 这是统一的导出入口，所有API功能模块都从这里导出
 */

// 导出基础请求工具
export {
  apiRequest,
  delay,
  rateLimiter,
  __resetRateLimiter,
  type FetchFn,
  type ApiRequestOptions
} from "./request.js";

// 导出WBI签名相关
export {
  getWBIKeys,
  generateWBISign,
  type WBIKeys
} from "./wbi.js";

// 导出视频相关API
export {
  getVideoDetail,
  getVideoTagsDetail,
  getRelatedVideos,
  getUPVideosWithWBI
} from "./video.js";

// 导出收藏夹相关API
export {
  getFavoriteFolders,
  getCollectedFolders,
  getAllFavoriteVideos,
  getFavoriteVideos,
  getSeasonVideos
} from "./favorite.js";

// 导出用户和关注相关API
export {
  getFollowedUPs,
  getUPVideos,
  getUPInfo,
  getFollowStat
} from "./user.js";

// 导出搜索相关API
export {
  searchAll,
  searchVideos,
  type SearchOrder
} from "./search.js";

// 导出分区相关API
export {
  getRegionVideos,
  getRanking
} from "./region.js";

// 导出评论相关API
export {
  getComments
} from "./comment.js";

// 导出弹幕相关API
export {
  getDanmakuList,
  type Danmaku
} from "./danmaku.js";

// 导出所有类型定义
export type {
  BiliResponse,
  UpInfo,
  FollowingUp,
  FollowingListResponse,
  UpDetailInfo,
  UserStatInfo,
  VideoInfo,
  VideoTag,
  RelatedVideoInfo,
  FavoriteFolderInfo,
  FavoriteFolderListResponse,
  FavoriteVideoInfo,
  FavoriteContentResponse,
  SubscribedFavoriteFolderInfo,
  SubscribedFavoriteListResponse,
  SubscribedFavoriteVideoInfo,
  SubscribedFavoriteContentResponse
} from "./types.js";
