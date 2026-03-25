
/**
 * TagStrategy - 标签数据查询策略
 * 决定"怎么查"，而不是"去查"
 */

import type { DataRequest, QueryPlan, StrategyContext, IndexQueryType } from '../plan/query-plan.js';

/**
 * 标签策略类
 * 职责：
 * - 决定是否走索引
 * - 决定是否需要从数据库加载
 * - 决定加载多少数据
 * - 决定是否使用缓存
 */
export class TagStrategy {
  /**
   * 创建查询计划
   * @param request 数据请求
   * @param context 策略上下文
   * @returns 查询计划
   */
  createPlan(request: DataRequest, context: StrategyContext): QueryPlan {
    switch (request.type) {
      case 'GET_TAGS_BY_SOURCE':
        return this.createGetTagsBySourcePlan(request, context);

      case 'GET_ALL_TAGS':
        return this.createGetAllTagsPlan(request, context);

      case 'CREATE_TAG':
        return this.createCreateTagPlan(request, context);

      case 'DELETE_TAG':
        return this.createDeleteTagPlan(request, context);

      default:
        throw new Error(`Unknown request type: ${request.type}`);
    }
  }

  /**
   * 创建按来源查询标签的计划
   */
  private createGetTagsBySourcePlan(request: DataRequest, context: StrategyContext): QueryPlan {
    const { source } = request.payload;
    const hasIndex = context.index.hasSource(source);

    return {
      needLoadFromDB: !hasIndex,
      dbQuery: hasIndex ? undefined : { source },
      indexQuery: {
        type: 'FULL' as IndexQueryType,
        value: source
      },
      query: {
        limit: 50
      }
    };
  }

  /**
   * 创建获取所有标签的计划
   */
  private createGetAllTagsPlan(request: DataRequest, context: StrategyContext): QueryPlan {
    return {
      needLoadFromDB: !context.index.isInitialized(),
      dbQuery: undefined,
      indexQuery: {
        type: 'FULL' as IndexQueryType
      },
      query: {
        limit: 50
      }
    };
  }

  /**
   * 创建创建标签的计划
   */
  private createCreateTagPlan(request: DataRequest, context: StrategyContext): QueryPlan {
    return {
      needLoadFromDB: true,
      dbQuery: {
        name: request.payload.name,
        source: request.payload.source
      },
      indexQuery: {
        type: 'FULL' as IndexQueryType
      },
      query: {}
    };
  }

  /**
   * 创建删除标签的计划
   */
  private createDeleteTagPlan(request: DataRequest, context: StrategyContext): QueryPlan {
    return {
      needLoadFromDB: true,
      dbQuery: {
        tagId: request.payload.tagId
      },
      indexQuery: {
        type: 'FULL' as IndexQueryType
      },
      query: {}
    };
  }
}
