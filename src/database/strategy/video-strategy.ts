
/**
 * VideoStrategy - 视频数据查询策略
 * 决定"怎么查"，而不是"去查"
 */

import type { DataRequest, QueryPlan, StrategyContext, RequestType, IndexQueryType } from '../plan/query-plan.js';

/**
 * 视频策略类
 * 职责：
 * - 决定是否走索引
 * - 决定是否需要从数据库加载
 * - 决定加载多少数据
 * - 决定是否使用缓存
 */
export class VideoStrategy {
  /**
   * 创建查询计划
   * @param request 数据请求
   * @param context 策略上下文
   * @returns 查询计划
   */
  createPlan(request: DataRequest, context: StrategyContext): QueryPlan {
    switch (request.type) {
      case 'GET_VIDEOS_BY_TAG':
        return this.createGetVideosByTagPlan(request, context);

      case 'GET_VIDEOS_BY_CREATOR':
        return this.createGetVideosByCreatorPlan(request, context);

      case 'GET_VIDEOS_BY_COLLECTION':
        return this.createGetVideosByCollectionPlan(request, context);

      case 'GET_ALL_VIDEOS':
        return this.createGetAllVideosPlan(request, context);

      default:
        throw new Error(`Unknown request type: ${request.type}`);
    }
  }

  /**
   * 创建按标签查询视频的计划
   */
  private createGetVideosByTagPlan(request: DataRequest, context: StrategyContext): QueryPlan {
    const { tagId } = request.payload as { tagId: string };
    const hasIndex = context.index.hasTag(tagId);

    return {
      needLoadFromDB: !hasIndex,
      dbQuery: hasIndex ? undefined : { tagId },
      indexQuery: {
        type: 'TAG' as IndexQueryType,
        value: tagId
      },
      query: {
        sort: 'date',
        limit: 50
      }
    };
  }

  /**
   * 创建按创作者查询视频的计划
   */
  private createGetVideosByCreatorPlan(request: DataRequest, context: StrategyContext): QueryPlan {
    const { creatorId } = request.payload as { creatorId: string };
    const hasIndex = context.index.hasCreator(creatorId);

    return {
      needLoadFromDB: !hasIndex,
      dbQuery: hasIndex ? undefined : { creatorId },
      indexQuery: {
        type: 'CREATOR' as IndexQueryType,
        value: creatorId
      },
      query: {
        sort: 'date',
        limit: 50
      }
    };
  }

  /**
   * 创建按收藏夹查询视频的计划
   */
  private createGetVideosByCollectionPlan(request: DataRequest, context: StrategyContext): QueryPlan {
    const { collectionId, collectionType } = request.payload as { collectionId: string; collectionType?: 'user' | 'subscription' };
    const hasIndex = context.index.hasCollection(collectionId);

    return {
      needLoadFromDB: !hasIndex,
      dbQuery: hasIndex ? undefined : { collectionId, collectionType },
      indexQuery: {
        type: 'COLLECTION' as IndexQueryType,
        value: collectionId
      },
      query: {
        sort: 'date',
        limit: 50
      }
    };
  }

  /**
   * 创建获取所有视频的计划
   */
  private createGetAllVideosPlan(request: DataRequest, context: StrategyContext): QueryPlan {
    return {
      needLoadFromDB: !context.index.isInitialized(),
      dbQuery: undefined,
      indexQuery: {
        type: 'FULL' as IndexQueryType
      },
      query: {
        sort: 'date',
        limit: 50
      }
    };
  }
}
