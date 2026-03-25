
/**
 * Repository 模块
 * 对外接口层，只负责将 UI 请求转为数据请求描述
 */

// Repository 层（对外接口层）
export { TagRepository, tagRepository } from './tag-repository.js';
export { VideoRepository, videoRepository } from './video-repository.js';
export { CreatorRepository, creatorRepository } from './creator-repository.js';
export { CategoryRepository, categoryRepository } from './category-repository.js';

// Manager 层（核心调度层）
export { TagDataManager } from '../manager/tag-data-manager.js';
export { VideoDataManager } from '../manager/video-data-manager.js';
export { CreatorDataManager } from '../manager/creator-data-manager.js';

// Strategy 层（策略层）
export { TagStrategy } from '../strategy/tag-strategy.js';
export { VideoStrategy } from '../strategy/video-strategy.js';
export { CreatorStrategy } from '../strategy/creator-strategy.js';

// Plan 层（查询计划）
export * from '../plan/query-plan.js';
