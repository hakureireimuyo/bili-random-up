/**
 * 视频书管理器
 * 继承自BaseBookManager，管理视频的Book，实现视频的分页查询功能
 */

import type {
  Book,
  BookPage,
  BookPageState,
  BookQueryOptions,
  BookQueryResult
} from './types.js';
import type { QueryCondition } from '../query/types.js';
import type { Video } from '../../types/video.js';
import type { VideoQueryCondition, VideoIndex } from '../cache/types.js';
import { DataCache } from '../cache/data-cache.js';
import { IndexCache } from '../cache/index-cache.js';
import { BaseBookManager, type IDataRepository, type IIndexConverter } from './base-book-manager.js';
import { Platform } from '../../types/base.js';
import { CacheManager } from '../cache/cache-manager.js';

/**
 * 视频索引转换器
 */
class VideoIndexConverter implements IIndexConverter<Video, VideoIndex> {
  toIndex(data: Video): VideoIndex {
    return {
      videoId: data.videoId,
      platform: data.platform,
      creatorId: data.creatorId,
      title: data.title,
      duration: data.duration,
      publishTime: data.publishTime,
      tags: data.tags,
      isInvalid: data.isInvalid
    };
  }

  getId(data: Video): string {
    return data.videoId;
  }
}

/**
 * 视频数据仓库接口
 * 定义视频仓库必须实现的方法
 */
export interface IVideoRepository {
  /**
   * 根据ID列表获取视频
   */
  getVideos(videoIds: string[], platform: Platform): Promise<Video[]>;
}

/**
 * 视频书管理器类
 * 继承自BaseBookManager，专门用于Video数据的书管理
 */
export class VideoBookManager extends BaseBookManager<Video, VideoIndex> {
  private cacheManager: CacheManager;

  constructor(
    videoRepository?: IVideoRepository
  ) {
    const cacheManager = CacheManager.getInstance();

    // 使用CacheManager获取缓存单例
    const dataCache = cacheManager.getDataCache<Video>();
    const indexCache = cacheManager.getVideoIndexCache();

    // 创建视频仓库适配器
    const repository = videoRepository || new DefaultVideoRepository();
    const repositoryAdapter = new VideoRepositoryAdapter(repository);

    super(
      dataCache,
      indexCache,
      repositoryAdapter,
      new VideoIndexConverter()
    );

    this.cacheManager = cacheManager;
  }

  /**
   * 创建视频查询书
   */
  async createVideoQueryBook(
    queryCondition: VideoQueryCondition,
    options: BookQueryOptions = {}
  ): Promise<Book<Video>> {
    return await this.createBook(
      { type: 'video', ...queryCondition } as QueryCondition,
      options,
      undefined // 查询逻辑由 VideoQueryService 负责
    );
  }

  /**
   * 从索引中提取ID
   */
  protected extractIdFromIndex(index: VideoIndex): string {
    return index.videoId;
  }

  /**
   * 生成书ID
   */
  protected generateBookId(condition: QueryCondition): string {
    const videoCond = condition as unknown as VideoQueryCondition;
    return JSON.stringify({
      platform: videoCond.platform,
      keyword: videoCond.keyword,
      creatorIds: videoCond.creatorIds,
      creatorName: videoCond.creatorName,
      tagExpressions: videoCond.tagExpressions,
      durationRange: videoCond.durationRange,
      publishTimeRange: videoCond.publishTimeRange,
      onlyFollowingCreators: videoCond.onlyFollowingCreators
    });
  }
}

/**
 * 视频仓库适配器
 * 将IVideoRepository适配为IDataRepository接口
 */
class VideoRepositoryAdapter implements IDataRepository<Video> {
  constructor(private repository: IVideoRepository) {}

  async getById(id: string): Promise<Video | null> {
    const videos = await this.repository.getVideos([id], Platform.BILIBILI);
    return videos[0] || null;
  }

  async getByIds(ids: string[]): Promise<Video[]> {
    return await this.repository.getVideos(ids, Platform.BILIBILI);
  }

  async getAll(): Promise<Video[]> {
    // 视频数据量可能很大，不建议获取所有数据
    // 这里返回空数组，实际使用中应该通过查询条件获取
    return [];
  }
}

/**
 * 默认视频仓库实现
 * 需要根据实际的数据源实现
 */
export class DefaultVideoRepository implements IVideoRepository {
  async getVideos(videoIds: string[], platform: Platform): Promise<Video[]> {
    // TODO: 实现从数据库获取视频的逻辑
    // 示例：
    // return await this.db.query(
    //   'SELECT * FROM videos WHERE video_id IN (?) AND platform = ?',
    //   [videoIds, platform]
    // );
    return [];
  }
}
