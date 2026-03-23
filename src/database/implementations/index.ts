/**
 * Database Implementations 统一导出
 * 导出所有数据库实现类
 */

// Semantic 实现
export { TagRepository } from './tag-repository.impl.js';
export { CategoryRepository } from './category-repository.impl.js';

// Creator 实现
export { CreatorRepository } from './creator-repository.impl.js';

// Video 实现
export { VideoRepository } from './video-repository.impl.js';


// Behavior 实现
export { WatchEventRepository } from './watch-event-repository.impl.js';

// Collection 实现
export { CollectionRepository } from './collection-repository.impl.js';
export { CollectionItemRepository } from './collection-item-repository.impl.js';

// Settings 实现
export { getValue, setValue, deleteValue } from './settings-repository.impl.js';
export type { AppSettings } from './settings-repository.impl.js';
