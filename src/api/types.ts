/**
 * Bilibili API 返回数据类型定义
 */

// ============ 基础响应结构 ============
export interface BiliResponse<T = any> {
  code: number;
  message: string;
  ttl: number;
  data: T;
}

// ============ 用户相关 ============
/**
 * UP主基础信息
 */
export interface UpInfo {
  mid: string;
  name: string;
  face: string;
}

/**
 * 关注的UP主信息
 */
export interface FollowingUp {
  mid: string;
  uname: string;
  face: string;
}

/**
 * 关注列表响应
 */
export interface FollowingListResponse {
  list: FollowingUp[];
}

/**
 * UP主详细信息
 */
export interface UpDetailInfo extends UpInfo {
  mid: string;
  name: string;
  face: string;
  sign: string;
}

/**
 * 用户统计信息
 */
export interface UserStatInfo {
  mid: string;
  following: number;
  follower: number;
}

// ============ 视频相关 ============
/**
 * 视频基础信息
 */
export interface VideoInfo {
  bvid: string;
  title: string;
  pic: string;
  pubdate: number;
  duration: number;
  owner: UpInfo;
}

/**
 * 视频标签
 */
export interface VideoTag {
  tag_id: string;
  tag_name: string;
}

/**
 * 推荐视频信息（包含统计数据）
 */
export interface RelatedVideoInfo extends VideoInfo {
  aid: string;
  stat: {
    view: number;
    danmaku: number;
    reply: number;
    favorite: number;
    coin: number;
    share: number;
    like: number;
  };
}

// ============ 收藏夹相关 ============
/**
 * 收藏夹基础信息
 */
export interface FavoriteFolderInfo {
  id: string;
  mid: string;
  title: string;
  media_count: number;
}

/**
 * 收藏夹列表响应
 */
export interface FavoriteFolderListResponse {
  count: number;
  list: FavoriteFolderInfo[];
}

/**
 * 收藏夹中的视频信息
 */
export interface FavoriteVideoInfo {
  id: string;
  title: string;
  cover: string;
  intro: string;
  duration: number;
  upper: {
    mid: string;
  };
  pubtime: number;
  bvid: string;
}

/**
 * 收藏夹内容响应
 */
export interface FavoriteContentResponse {
  info: {
    id: string;
    mid: string;
    title: string;
    media_count: number;
  };
  medias: FavoriteVideoInfo[];
}

/**
 * 订阅的收藏夹信息
 */
export interface SubscribedFavoriteFolderInfo {
  id: string;
  mid: string;
  title: string;
  cover: string;
  intro: string;
  media_count: number;
}

/**
 * 订阅收藏夹列表响应
 */
export interface SubscribedFavoriteListResponse {
  count: number;
  list: SubscribedFavoriteFolderInfo[];
}

/**
 * 订阅收藏夹中的视频信息
 */
export interface SubscribedFavoriteVideoInfo {
  id: string;
  title: string;
  cover: string;
  duration: number;
  pubtime: number;
  bvid: string;
  upper: {
    mid: string;
    name: string;
  };
  cnt_info: {
    collect: number;
    play: number;
    danmaku: number;
  };
}

/**
 * 订阅收藏夹内容响应
 */
export interface SubscribedFavoriteContentResponse {
  info: {
    id: string;
    title: string;
    cover: string;
    media_count: number;
    intro: string;
  };
  medias: SubscribedFavoriteVideoInfo[];
}
