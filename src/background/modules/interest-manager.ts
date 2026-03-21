/**
 * InterestManager
 * 兴趣管理模块，负责协调兴趣计算、图构建和趋势分析
 */

import { InterestCalculator } from '../../database/implementations/interest-calculator.impl.js';
import { InterestGraphBuilder } from '../../database/implementations/interest-graph-builder.impl.js';
import { InterestTrendAnalyzer } from '../../database/implementations/interest-trend-analyzer.impl.js';
import { InterestScoreRepository } from '../../database/implementations/interest-score-repository.impl.js';
import { InterestHistoryRepository } from '../../database/implementations/interest-history-repository.impl.js';
import { InterestNodeRepository } from '../../database/implementations/interest-node-repository.impl.js';
import { TagRepository } from '../../database/implementations/tag-repository.impl.js';
import type { BackgroundOptions } from './common-types.js';

/**
 * 兴趣管理配置
 */
export interface InterestManagerConfig {
  /**
   * 是否启用自动计算
   */
  autoCalculate: boolean;

  /**
   * 是否启用图构建
   */
  autoBuildGraph: boolean;

  /**
   * 是否启用趋势分析
   */
  autoAnalyzeTrend: boolean;

  /**
   * 历史数据保留天数
   */
  historyRetentionDays: number;
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: InterestManagerConfig = {
  autoCalculate: true,
  autoBuildGraph: true,
  autoAnalyzeTrend: true,
  historyRetentionDays: 365
};

/**
 * InterestManager 类
 */
export class InterestManager {
  private config: InterestManagerConfig;
  private calculator: InterestCalculator;
  private graphBuilder: InterestGraphBuilder;
  private trendAnalyzer: InterestTrendAnalyzer;
  private scoreRepo: InterestScoreRepository;
  private historyRepo: InterestHistoryRepository;
  private nodeRepo: InterestNodeRepository;
  private tagRepo: TagRepository;

  constructor(
    config?: Partial<InterestManagerConfig>,
    calculator?: InterestCalculator,
    graphBuilder?: InterestGraphBuilder,
    trendAnalyzer?: InterestTrendAnalyzer
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.calculator = calculator || new InterestCalculator();
    this.graphBuilder = graphBuilder || new InterestGraphBuilder();
    this.trendAnalyzer = trendAnalyzer || new InterestTrendAnalyzer();
    this.scoreRepo = new InterestScoreRepository();
    this.historyRepo = new InterestHistoryRepository();
    this.nodeRepo = new InterestNodeRepository();
    this.tagRepo = new TagRepository();
  }

  /**
   * 处理观看事件，触发兴趣计算
   */
  async handleWatchEvent(tagIds: string[]): Promise<void> {
    if (!this.config.autoCalculate || tagIds.length === 0) {
      return;
    }

    try {
      // 增量更新受影响的标签
      await this.calculator.calculateInterestScores(tagIds);
      console.log('[InterestManager] Updated interest scores for tags:', tagIds);
    } catch (error) {
      console.error('[InterestManager] Error handling watch event:', error);
    }
  }

  /**
   * 处理互动事件，触发兴趣计算
   */
  async handleInteractionEvent(tagIds: string[]): Promise<void> {
    if (!this.config.autoCalculate || tagIds.length === 0) {
      return;
    }

    try {
      // 增量更新受影响的标签
      await this.calculator.calculateInterestScores(tagIds);
      console.log('[InterestManager] Updated interest scores for interaction tags:', tagIds);
    } catch (error) {
      console.error('[InterestManager] Error handling interaction event:', error);
    }
  }

  /**
   * 每日定时任务
   */
  async runDailyTask(): Promise<void> {
    console.log('[InterestManager] Running daily task');

    try {
      // 1. 更新所有兴趣分数
      if (this.config.autoCalculate) {
        await this.calculator.recalculateAllInterestScores();
        console.log('[InterestManager] Recalculated all interest scores');
      }

      // 2. 更新兴趣图权重
      if (this.config.autoBuildGraph) {
        await this.graphBuilder.updateNodeWeights();
        console.log('[InterestManager] Updated interest graph weights');
      }

      // 3. 分析所有趋势
      if (this.config.autoAnalyzeTrend) {
        await this.trendAnalyzer.analyzeAllTrends();
        console.log('[InterestManager] Analyzed all interest trends');
      }

      console.log('[InterestManager] Daily task completed');
    } catch (error) {
      console.error('[InterestManager] Error running daily task:', error);
    }
  }

  /**
   * 每周定时任务
   */
  async runWeeklyTask(): Promise<void> {
    console.log('[InterestManager] Running weekly task');

    try {
      // 重建兴趣图
      if (this.config.autoBuildGraph) {
        await this.graphBuilder.rebuildGraph();
        console.log('[InterestManager] Rebuilt interest graph');
      }

      console.log('[InterestManager] Weekly task completed');
    } catch (error) {
      console.error('[InterestManager] Error running weekly task:', error);
    }
  }

  /**
   * 每月定时任务
   */
  async runMonthlyTask(): Promise<void> {
    console.log('[InterestManager] Running monthly task');

    try {
      // 清理过期历史数据
      await this.cleanupHistory();
      console.log('[InterestManager] Cleaned up expired history data');

      console.log('[InterestManager] Monthly task completed');
    } catch (error) {
      console.error('[InterestManager] Error running monthly task:', error);
    }
  }

  /**
   * 清理过期历史数据
   */
  private async cleanupHistory(): Promise<void> {
    const now = Date.now();
    const retentionMs = this.config.historyRetentionDays * 24 * 60 * 60 * 1000;
    const cutoffTime = now - retentionMs;

    // 删除过期历史记录
    await this.historyRepo.deleteInterestHistoryByTimeRange({
      startTime: 0,
      endTime: cutoffTime
    });

    // 删除低权重节点（权重小于1的节点）
    const allNodes = await this.nodeRepo.getAllNodes();
    const lowWeightNodes = allNodes.filter(n => n.weight < 1);
    for (const node of lowWeightNodes) {
      await this.nodeRepo.deleteNode(node.nodeId);
    }

    console.log(`[InterestManager] Cleaned up ${lowWeightNodes.length} low weight nodes`);
  }

  /**
   * 获取兴趣统计信息
   */
  async getInterestStats() {
    const scoreStats = await this.scoreRepo.getInterestScoreStats();
    const graphStats = await this.graphBuilder.getGraphStats();
    const trendSummary = await this.trendAnalyzer.getTrendSummary();

    return {
      scores: scoreStats,
      graph: graphStats,
      trends: trendSummary
    };
  }

  /**
   * 初始化兴趣系统
   */
  async initialize(): Promise<void> {
    console.log('[InterestManager] Initializing interest system');

    try {
      // 检查是否需要初始化数据
      const allScores = await this.scoreRepo.getAllInterestScores();
      const allNodes = await this.nodeRepo.getAllNodes();

      // 如果没有数据，执行初始化
      if (allScores.length === 0 && allNodes.length === 0) {
        console.log('[InterestManager] No existing data, performing initial setup');

        // 构建兴趣图
        if (this.config.autoBuildGraph) {
          await this.graphBuilder.rebuildGraph();
        }
      }

      console.log('[InterestManager] Interest system initialized');
    } catch (error) {
      console.error('[InterestManager] Error initializing interest system:', error);
    }
  }
}

/**
 * 创建兴趣管理器实例
 */
export function createInterestManager(
  config?: Partial<InterestManagerConfig>
): InterestManager {
  return new InterestManager(config);
}
