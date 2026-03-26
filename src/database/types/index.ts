/**
 * Database Types 统一导出
 * 导出所有数据类型定义
 */

export type {
  Platform,
  TagSource,
  VideoSource,
  InteractionType,
  NoteType,
  Timestamp,
  ID,
  PaginationParams,
  PaginationResult,
  TimeRange
} from './base.js';

// Creator 类型
export type {
  Creator,
  CreatorTagWeight
} from './creator.js';

// Video 类型
export type {
  Video,
  VideoStats,
  VideoHotness
} from './video.js';

// Image 类型
export type {
  Image
} from './image.js';

export { ImagePurpose } from './image.js';

// Behavior 类型
export type {
  WatchEvent
} from './behavior.js';

// Semantic 类型
export type {
  Tag,
  Category,
  TagStats
} from './semantic.js';


// Collection 类型
export type {
  Collection,
  CollectionItem
} from './collection.js';
