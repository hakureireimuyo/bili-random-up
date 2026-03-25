
/**
 * CreatorStrategy - 创作者数据查询策略
 * 决定"怎么查"，而不是"去查"
 */

import type { DataRequest, QueryPlan, StrategyContext, IndexQueryType } from '../plan/query-plan.js';

/**
 * 创作者策略类
 * 职责：
 * - 决定是否走索引
 * - 决定是否需要从数据库加载
 * - 决定加载多少数据
 * - 决定是否使用缓存
 */
export class CreatorStrategy {
  /**
   * 创建查询计划
   * @param request 数据请求
   * @param context 策略上下文
   * @returns 查询计划
   */
  createPlan(request: DataRequest, context: StrategyContext): QueryPlan {
    switch (request.type) {
      case 'GET_CREATORS':
        return this.createGetCreatorsPlan(request, context);

      default:
        throw new Error(`Unknown request type: ${request.type}`);
    }
  }

  /**
   * 创建获取创作者的计划
   * 统一处理搜索和全量获取
   * @param request 数据请求
   * @param context 策略上下文
   * @returns 查询计划
   */
  private createGetCreatorsPlan(request: DataRequest, context: StrategyContext): QueryPlan {
    const { keyword } = request.payload;

    return {
      needLoadFromDB: !context.index.isInitialized(),
      dbQuery: undefined,
      indexQuery: {
        type: 'FULL' as IndexQueryType,
        value: keyword
      },
      query: {
        sort: 'name',
        limit: 50
      }
    };
  }
}
