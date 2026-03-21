/**
 * InterestGraphBuilder 实现
 * 实现兴趣图构建逻辑
 */

import { InterestNode } from '../types/analytics.js';
import { Tag } from '../types/semantic.js';
import { Category } from '../types/semantic.js';
import { TagEmbedding } from '../types/semantic.js';
import { InterestNodeRepository } from './interest-node-repository.impl.js';
import { InterestScoreRepository } from './interest-score-repository.impl.js';
import { TagRepository } from './tag-repository.impl.js';
import { CategoryRepository } from './category-repository.impl.js';

/**
 * 兴趣图构建配置
 */
export interface InterestGraphBuilderConfig {
  /**
   * 标签相似度阈值
   * 用于判断两个标签是否足够相似以建立关联
   */
  similarityThreshold: number;

  /**
   * 节点权重计算方式
   */
  weightCalculation: 'sum' | 'avg' | 'max';

  /**
   * 是否自动创建节点
   */
  autoCreateNodes: boolean;

  /**
   * 节点颜色配置
   */
  colorPalette: string[];

  /**
   * 节点图标配置
   */
  iconMap: Record<string, string>;
}

/**
 * 默认配置
 */
const DEFAULT_CONFIG: InterestGraphBuilderConfig = {
  similarityThreshold: 0.7,
  weightCalculation: 'avg',
  autoCreateNodes: true,
  colorPalette: [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
    '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'
  ],
  iconMap: {
    '科技': '🔬',
    '编程': '💻',
    '数学': '📐',
    'AI': '🤖',
    '数据': '📊',
    '设计': '🎨',
    '音乐': '🎵',
    '游戏': '🎮'
  }
};

/**
 * InterestGraphBuilder 实现类
 */
export class InterestGraphBuilder {
  private config: InterestGraphBuilderConfig;
  private nodeRepo: InterestNodeRepository;
  private scoreRepo: InterestScoreRepository;
  private tagRepo: TagRepository;
  private categoryRepo: CategoryRepository;

  constructor(
    config?: Partial<InterestGraphBuilderConfig>,
    nodeRepo?: InterestNodeRepository,
    scoreRepo?: InterestScoreRepository,
    tagRepo?: TagRepository,
    categoryRepo?: CategoryRepository
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.nodeRepo = nodeRepo || new InterestNodeRepository();
    this.scoreRepo = scoreRepo || new InterestScoreRepository();
    this.tagRepo = tagRepo || new TagRepository();
    this.categoryRepo = categoryRepo || new CategoryRepository();
  }

  /**
   * 基于分类构建兴趣图
   */
  async buildFromCategories(): Promise<void> {
    const categories = await this.categoryRepo.getAllCategories();

    for (const category of categories) {
      await this.buildCategoryNode(category);
    }
  }

  /**
   * 构建分类节点
   */
  private async buildCategoryNode(category: Category): Promise<string> {
    // 检查节点是否已存在
    const existingNodes = await this.nodeRepo.getAllNodes();
    const existingNode = existingNodes.find(n => n.name === category.name);

    if (existingNode) {
      return existingNode.nodeId;
    }

    // 计算节点权重
    const weights = await this.calculateCategoryWeights(category.tagIds);
    const weight = this.aggregateWeights(weights);

    // 创建节点
    const nodeId = await this.nodeRepo.createNode({
      parentId: category.parentId,
      name: category.name,
      weight,
      tagIds: category.tagIds,
      color: category.color || this.assignColor(category.name),
      icon: this.assignIcon(category.name),
      createdAt: Date.now(),
      lastUpdate: Date.now()
    });

    return nodeId;
  }

  /**
   * 计算分类权重
   */
  private async calculateCategoryWeights(tagIds: string[]): Promise<number[]> {
    const scores = await this.scoreRepo.getInterestScores(tagIds);
    return scores.map(s => s.score);
  }

  /**
   * 聚合权重
   */
  private aggregateWeights(weights: number[]): number {
    if (weights.length === 0) return 0;

    switch (this.config.weightCalculation) {
      case 'sum':
        return weights.reduce((a, b) => a + b, 0);
      case 'avg':
        return weights.reduce((a, b) => a + b, 0) / weights.length;
      case 'max':
        return Math.max(...weights);
      default:
        return weights.reduce((a, b) => a + b, 0) / weights.length;
    }
  }

  /**
   * 基于标签相似度构建兴趣图
   */
  async buildFromSimilarity(): Promise<void> {
    const allTags = await this.tagRepo.getAllTags();
    const allScores = await this.scoreRepo.getAllInterestScores();

    // 为每个标签创建节点
    for (const tag of allTags) {
      const score = allScores.find(s => s.tagId === tag.tagId);
      if (!score || score.score < 10) continue; // 跳过低兴趣标签

      await this.createTagNode(tag, score.score);
    }

    // 基于相似度建立关联
    await this.buildSimilarityEdges(allTags);
  }

  /**
   * 创建标签节点
   */
  private async createTagNode(tag: Tag, score: number): Promise<string> {
    // 检查节点是否已存在
    const existingNodes = await this.nodeRepo.getAllNodes();
    const existingNode = existingNodes.find(n => n.name === tag.name);

    if (existingNode) {
      return existingNode.nodeId;
    }

    // 创建节点
    return this.nodeRepo.createNode({
      name: tag.name,
      weight: score,
      tagIds: [tag.tagId],
      color: tag.color || this.assignColor(tag.name),
      icon: tag.icon || this.assignIcon(tag.name),
      createdAt: Date.now(),
      lastUpdate: Date.now()
    });
  }

  /**
   * 基于相似度建立关联
   */
  private async buildSimilarityEdges(tags: Tag[]): Promise<void> {
    const allNodes = await this.nodeRepo.getAllNodes();

    for (let i = 0; i < tags.length; i++) {
      for (let j = i + 1; j < tags.length; j++) {
        const similarity = await this.calculateSimilarity(tags[i], tags[j]);

        if (similarity >= this.config.similarityThreshold) {
          // 找到对应的节点
          const nodeI = allNodes.find(n => n.tagIds.includes(tags[i].tagId));
          const nodeJ = allNodes.find(n => n.tagIds.includes(tags[j].tagId));

          if (nodeI && nodeJ) {
            // 将相似标签的节点关联起来
            await this.linkSimilarNodes(nodeI, nodeJ);
          }
        }
      }
    }
  }

  /**
   * 计算标签相似度
   */
  private async calculateSimilarity(tag1: Tag, tag2: Tag): Promise<number> {
    // TODO: 实现基于TagEmbedding的相似度计算
    // 这里暂时使用简单的名称相似度
    const name1 = tag1.name.toLowerCase();
    const name2 = tag2.name.toLowerCase();

    // 计算编辑距离
    const distance = this.levenshteinDistance(name1, name2);
    const maxLength = Math.max(name1.length, name2.length);

    return 1 - distance / maxLength;
  }

  /**
   * 计算编辑距离
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const m = str1.length;
    const n = str2.length;
    const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) {
      dp[i][0] = i;
    }
    for (let j = 0; j <= n; j++) {
      dp[0][j] = j;
    }

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = Math.min(
            dp[i - 1][j] + 1,
            dp[i][j - 1] + 1,
            dp[i - 1][j - 1] + 1
          );
        }
      }
    }

    return dp[m][n];
  }

  /**
   * 关联相似节点
   */
  private async linkSimilarNodes(node1: InterestNode, node2: InterestNode): Promise<void> {
    // 将node2作为node1的子节点
    if (!node2.parentId) {
      await this.nodeRepo.moveNode(node2.nodeId, node1.nodeId);
    }
  }

  /**
   * 分配颜色
   */
  private assignColor(name: string): string {
    const index = name.length % this.config.colorPalette.length;
    return this.config.colorPalette[index];
  }

  /**
   * 分配图标
   */
  private assignIcon(name: string): string {
    return this.config.iconMap[name] || '📌';
  }

  /**
   * 更新节点权重
   */
  async updateNodeWeights(): Promise<void> {
    const allNodes = await this.nodeRepo.getAllNodes();
    const updates = new Map<string, Partial<InterestNode>>();

    for (const node of allNodes) {
      const weights = await this.calculateCategoryWeights(node.tagIds);
      const weight = this.aggregateWeights(weights);
      updates.set(node.nodeId, { weight });
    }

    if (updates.size > 0) {
      await this.nodeRepo.updateNodes(updates);
    }
  }

  /**
   * 清空并重建兴趣图
   */
  async rebuildGraph(): Promise<void> {
    // 清空现有节点
    await this.nodeRepo.clearAllInterestNodes();

    // 重新构建
    await this.buildFromCategories();
    await this.buildFromSimilarity();
  }

  /**
   * 获取兴趣图统计信息
   */
  async getGraphStats(): Promise<{
    totalNodes: number;
    maxDepth: number;
    avgWeight: number;
    topNodes: InterestNode[];
  }> {
    const allNodes = await this.nodeRepo.getAllNodes();
    const totalNodes = allNodes.length;

    // 计算最大深度
    let maxDepth = 0;
    for (const node of allNodes) {
      const path = await this.nodeRepo.getNodePath(node.nodeId);
      maxDepth = Math.max(maxDepth, path.length);
    }

    // 计算平均权重
    const avgWeight = allNodes.reduce((sum, n) => sum + n.weight, 0) / totalNodes;

    // 获取Top节点
    const topNodes = allNodes
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 10);

    return {
      totalNodes,
      maxDepth,
      avgWeight,
      topNodes
    };
  }
}
