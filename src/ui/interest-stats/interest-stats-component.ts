/**
 * InterestStats Component
 * 兴趣统计核心组件
 */

import { InterestScoreRepository } from '../../database/implementations/interest-score-repository.impl.js';
import { InterestNodeRepository } from '../../database/implementations/interest-node-repository.impl.js';
import { InterestHistoryRepository } from '../../database/implementations/interest-history-repository.impl.js';
import { TagRepository } from '../../database/implementations/tag-repository.impl.js';
import type { InterestScore } from '../../database/types/analytics.js';
import type { InterestNode } from '../../database/types/analytics.js';
import type { InterestHistory } from '../../database/types/analytics.js';

/**
 * 兴趣统计配置
 */
export interface InterestStatsConfig {
  containerId: string;
  maxTopInterests?: number;
  maxGraphNodes?: number;
  chartDays?: number;
}

/**
 * 兴趣统计类
 */
export class InterestStats {
  private container: HTMLElement;
  private scoreRepo: InterestScoreRepository;
  private nodeRepo: InterestNodeRepository;
  private historyRepo: InterestHistoryRepository;
  private tagRepo: TagRepository;
  private config: Required<InterestStatsConfig>;

  constructor(config: InterestStatsConfig) {
    this.config = {
      maxTopInterests: 20,
      maxGraphNodes: 50,
      chartDays: 30,
      ...config
    };

    const container = document.getElementById(config.containerId);
    if (!container) {
      throw new Error(`Container not found: ${config.containerId}`);
    }
    this.container = container;

    this.scoreRepo = new InterestScoreRepository();
    this.nodeRepo = new InterestNodeRepository();
    this.historyRepo = new InterestHistoryRepository();
    this.tagRepo = new TagRepository();
  }

  /**
   * 渲染兴趣统计
   */
  async render(): Promise<void> {
    this.container.innerHTML = '';

    // 创建Top兴趣标签
    const topInterestsSection = await this.createTopInterestsSection();
    this.container.appendChild(topInterestsSection);

    // 创建兴趣趋势
    const trendSection = await this.createTrendSection();
    this.container.appendChild(trendSection);

    // 创建兴趣星球
    const graphSection = await this.createGraphSection();
    this.container.appendChild(graphSection);
  }

  /**
   * 创建Top兴趣标签区域
   */
  private async createTopInterestsSection(): Promise<HTMLElement> {
    const section = document.createElement('section');
    section.className = 'interest-section';

    const title = document.createElement('h2');
    title.textContent = 'Top 兴趣标签';
    section.appendChild(title);

    const topScores = await this.scoreRepo.getTopInterests(this.config.maxTopInterests);

    if (topScores.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.textContent = '暂无兴趣数据';
      section.appendChild(empty);
      return section;
    }

    const list = document.createElement('div');
    list.id = 'top-interests-container';
    list.className = 'interest-list';

    for (const score of topScores) {
      const tag = await this.tagRepo.getTag(score.tagId);
      const item = document.createElement('div');
      item.className = 'interest-item';
      item.innerHTML = `
        <div class="interest-info">
          <span class="interest-name">${tag?.name || score.tagId}</span>
          <span class="interest-score">${score.score.toFixed(1)}</span>
        </div>
        <div class="interest-bar">
          <div class="interest-bar-fill" style="width: ${Math.min(100, score.score)}%"></div>
        </div>
        <div class="interest-details">
          <span class="interest-trend ${this.getTrendClass(score.trend)}">
            ${this.getTrendIcon(score.trend)} ${this.getTrendText(score.trend)}
          </span>
          <span class="interest-scores">
            短期: ${score.shortTermScore.toFixed(1)} | 长期: ${score.longTermScore.toFixed(1)}
          </span>
        </div>
      `;
      list.appendChild(item);
    }

    section.appendChild(list);
    return section;
  }

  /**
   * 创建兴趣趋势区域
   */
  private async createTrendSection(): Promise<HTMLElement> {
    const section = document.createElement('section');
    section.className = 'interest-section';

    const title = document.createElement('h2');
    title.textContent = '兴趣趋势';
    section.appendChild(title);

    const allScores = await this.scoreRepo.getAllInterestScores();

    if (allScores.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.textContent = '暂无趋势数据';
      section.appendChild(empty);
      return section;
    }

    const now = Date.now();
    const startTime = now - this.config.chartDays * 24 * 60 * 60 * 1000;

    const trendList = document.createElement('div');
    trendList.id = 'trend-container';
    trendList.className = 'trend-list';

    for (const score of allScores.slice(0, 10)) {
      const history = await this.historyRepo.getInterestHistory(score.tagId, {
        startTime,
        endTime: now
      });

      const tag = await this.tagRepo.getTag(score.tagId);
      const item = document.createElement('div');
      item.className = 'trend-item';
      item.innerHTML = `
        <div class="trend-header">
          <span class="trend-name">${tag?.name || score.tagId}</span>
          <span class="trend-score">${score.score.toFixed(1)}</span>
        </div>
        <div class="trend-chart">
          ${this.createTrendChart(history)}
        </div>
      `;
      trendList.appendChild(item);
    }

    section.appendChild(trendList);
    return section;
  }

  /**
   * 创建兴趣星球区域
   */
  private async createGraphSection(): Promise<HTMLElement> {
    const section = document.createElement('section');
    section.className = 'interest-section';

    const title = document.createElement('h2');
    title.textContent = '兴趣星球';
    section.appendChild(title);

    const allNodes = await this.nodeRepo.getAllNodes();

    if (allNodes.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.textContent = '暂无兴趣星球数据';
      section.appendChild(empty);
      return section;
    }

    const graph = document.createElement('div');
    graph.id = 'graph-container';
    graph.className = 'interest-graph';

    for (const node of allNodes.slice(0, this.config.maxGraphNodes)) {
      const nodeEl = document.createElement('div');
      nodeEl.className = 'graph-node';
      nodeEl.style.color = node.color || '#333';
      nodeEl.innerHTML = `
        <div class="node-icon">${node.icon || '📌'}</div>
        <div class="node-name">${node.name}</div>
        <div class="node-weight">${node.weight.toFixed(1)}</div>
      `;
      graph.appendChild(nodeEl);
    }

    section.appendChild(graph);
    return section;
  }

  /**
   * 创建趋势图表
   */
  private createTrendChart(history: InterestHistory[]): string {
    if (history.length === 0) {
      return '<span class="no-data">无数据</span>';
    }

    const scores = history.map(h => h.score);
    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);
    const range = maxScore - minScore || 1;

    const points = history.map((h, i) => {
      const x = (i / (history.length - 1)) * 100;
      const y = ((h.score - minScore) / range) * 100;
      return `${x},${100 - y}`;
    }).join(' ');

    return `
      <svg viewBox="0 0 100 100" class="trend-svg">
        <polyline points="${points}" fill="none" stroke="currentColor" stroke-width="2"/>
      </svg>
    `;
  }

  /**
   * 获取趋势样式类
   */
  private getTrendClass(trend?: number): string {
    if (trend === undefined) return 'trend-unknown';
    if (trend > 0) return 'trend-rising';
    if (trend < 0) return 'trend-declining';
    return 'trend-stable';
  }

  /**
   * 获取趋势图标
   */
  private getTrendIcon(trend?: number): string {
    if (trend === undefined) return '➖';
    if (trend > 0) return '📈';
    if (trend < 0) return '📉';
    return '➡️';
  }

  /**
   * 获取趋势文本
   */
  private getTrendText(trend?: number): string {
    if (trend === undefined) return '未知';
    if (trend > 0) return '上升';
    if (trend < 0) return '下降';
    return '平稳';
  }
}
