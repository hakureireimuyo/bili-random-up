/**
 * 测试工具页面脚本
 * 实现各种测试工具功能
 */

import { VideoRepositoryImpl } from '../../database/implementations/video-repository.impl.js';
import { CreatorRepositoryImpl } from '../../database/implementations/creator-repository.impl.js';
import { CollectionRepositoryImpl } from '../../database/implementations/collection-repository.impl.js';
import { TagRepositoryImpl } from '../../database/implementations/tag-repository.impl.js';
import { CollectionItemRepositoryImpl } from '../../database/implementations/collection-item-repository.impl.js';
import { Platform, TagSource } from '../../database/types/base.js';
import { generateId } from '../../database/implementations/id-generator.js';

// 随机数据生成器
class RandomDataGenerator {
  // 随机整数
  static randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  // 随机浮点数
  static randomFloat(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }

  // 随机布尔值
  static randomBoolean(): boolean {
    return Math.random() < 0.5;
  }

  // 从数组中随机选择一个元素
  static randomChoice<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  // 随机字符串
  static randomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // 随机日期
  static randomDate(start: Date, end: Date): number {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())).getTime();
  }

  // 随机中文字符串
  static randomChinese(length: number): string {
    const chars = '的一是在不了有和人这中大为上个国我以要他时来用们生到作地于出就分对成会可主发年动同工也能下过子说产种面而方后多定行学法所民得经十三之进着等部度家电力里如水化高自二理起小物现实加量都两体制机当使点从业本去把性好应开它合还因由其些然前外天政四日那社义事平形相全表间样与关各重新线内数正心反你明看原又么利比或但质气第向道命此变条只没结解问意建月公无系军很情者最立代想已通并提直题党程展五果料象员革位入常文总次品式活设及管特件长求老头基资边流路级少图山统接知较将组见计别她手角期根论运农指几九区强放决西被干做必战先回则任取据处队南给色光门即保治北造百规热领七海口东导器压志世金增争济阶油思术极交受联什认六共权收证改张群完确支感科维划选写画候状识病象数读独包今觉';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // 随机生成BV号
  static randomBV(): string {
    const chars = 'fZodR9XQDSUm21yCkr6zBqiveYah8bt4xsWpHnJE7jL5VG3guMTKNPAwcF';
    const result = ['B', 'V', '1', '', '', '4', '', '1', '', '7', ''];
    const positions = [2, 4, 6, 8, 10];
    positions.forEach(pos => {
      result[pos] = chars[Math.floor(Math.random() * chars.length)];
    });
    return result.join('');
  }

  // 随机生成标题
  static randomTitle(): string {
    const prefixes = ['如何', '为什么', '什么是', '关于', '深入理解', '快速入门', '全面解析', '实战指南'];
    const topics = ['编程', '人工智能', '数据分析', '前端开发', '后端开发', '机器学习', '深度学习', '云计算', '网络安全', '移动开发'];
    const suffixes = ['教程', '入门', '进阶', '实战', '技巧', '原理', '应用', '案例', '实践', '经验'];

    return `${this.randomChoice(prefixes)}${this.randomChoice(topics)}${this.randomChoice(suffixes)}`;
  }

  // 随机生成描述
  static randomDescription(): string {
    const sentences = [
      '本视频将详细介绍相关概念和实现方法。',
      '通过实际案例演示，帮助观众快速掌握核心要点。',
      '适合初学者入门，也适合有一定基础的开发者进阶学习。',
      '内容涵盖理论知识和实际应用，注重实战经验分享。',
      '结合最新技术趋势，提供实用的解决方案。'
    ];

    const count = this.randomInt(1, 3);
    let result = '';
    for (let i = 0; i < count; i++) {
      result += this.randomChoice(sentences);
      if (i < count - 1) result += ' ';
    }
    return result;
  }
}

// 测试数据生成器
class TestDataGenerator {
  private videoRepository: VideoRepositoryImpl;
  private creatorRepository: CreatorRepositoryImpl;
  private collectionRepository: CollectionRepositoryImpl;
  private tagRepository: TagRepositoryImpl;
  private collectionItemRepository: CollectionItemRepositoryImpl;

  private existingCreators: any[] = [];
  private existingTags: any[] = [];
  private existingCollections: any[] = [];

  constructor() {
    this.videoRepository = new VideoRepositoryImpl();
    this.creatorRepository = new CreatorRepositoryImpl();
    this.collectionRepository = new CollectionRepositoryImpl();
    this.tagRepository = new TagRepositoryImpl();
    this.collectionItemRepository = new CollectionItemRepositoryImpl();
  }

  // 初始化现有数据
  private async initializeExistingData() {
    this.existingCreators = await this.creatorRepository.getAll();
    const tagsResult = await this.tagRepository.getAllTags();
    this.existingTags = tagsResult.items;
    this.existingCollections = await this.collectionRepository.getAllCollections();
  }

  // 为现有创作者添加标签
  async addTagsToExistingCreators(onProgress?: (current: number, total: number) => void): Promise<void> {
    console.log(`[TestDataGenerator] 开始为现有创作者添加标签`);

    // 初始化现有数据
    await this.initializeExistingData();

    if (this.existingTags.length === 0) {
      console.warn('[TestDataGenerator] 没有可用的标签，请先生成标签');
      throw new Error('没有可用的标签，请先生成标签');
    }

    const creators = this.existingCreators;
    const total = creators.length;

    for (let i = 0; i < total; i++) {
      const creator = creators[i];

      // 如果创作者已有标签，跳过
      if (creator.tagWeights && creator.tagWeights.length > 0) {
        console.log(`[TestDataGenerator] 创作者 ${creator.name} 已有标签，跳过`);
        continue;
      }

      // 为创作者添加随机标签（1-3个）
      const tagCount = RandomDataGenerator.randomInt(1, 3);
      for (let j = 0; j < tagCount && this.existingTags.length > 0; j++) {
        const tag = RandomDataGenerator.randomChoice(this.existingTags);
        try {
          await this.creatorRepository.addTag(creator.creatorId, tag);
        } catch (error) {
          console.error(`[TestDataGenerator] 为创作者 ${creator.creatorId} 添加标签失败:`, error);
        }
      }

      if (i % 10 === 0) {
        console.log(`[TestDataGenerator] 已处理 ${i + 1}/${total} 个创作者`);
      }

      if (onProgress) {
        onProgress(i + 1, total);
      }
    }

    // 刷新现有创作者列表
    console.log(`[TestDataGenerator] 为现有创作者添加标签完成`);
    this.existingCreators = await this.creatorRepository.getAll();
  }

  // 生成随机创作者
  async generateCreators(count: number, onProgress?: (current: number, total: number) => void): Promise<void> {
    console.log(`[TestDataGenerator] 开始生成 ${count} 个创作者`);
    const startDate = new Date('2020-01-01');
    const endDate = new Date();

    for (let i = 0; i < count; i++) {
      const creatorId = generateId();
      const creator = {
        creatorId,
        platform: RandomDataGenerator.randomChoice([Platform.BILIBILI, Platform.YOUTUBE]),
        name: RandomDataGenerator.randomChinese(RandomDataGenerator.randomInt(2, 8)),
        avatar: generateId(), // 简化处理，只生成ID
        avatarUrl: `https://example.com/avatar/${RandomDataGenerator.randomString(10)}.jpg`,
        isLogout: RandomDataGenerator.randomInt(0, 1),
        description: RandomDataGenerator.randomChinese(RandomDataGenerator.randomInt(10, 50)),
        createdAt: RandomDataGenerator.randomDate(startDate, endDate),
        followTime: RandomDataGenerator.randomDate(startDate, endDate),
        isFollowing: RandomDataGenerator.randomInt(0, 1),
        tagWeights: []
      };

      await this.creatorRepository.upsertCreator(creator);

      // 为创作者添加随机标签（1-3个）
      const tagCount = RandomDataGenerator.randomInt(1, 3);
      for (let j = 0; j < tagCount && this.existingTags.length > 0; j++) {
        const tag = RandomDataGenerator.randomChoice(this.existingTags);
        try {
          await this.creatorRepository.addTag(creatorId, tag);
        } catch (error) {
          console.error(`[TestDataGenerator] 为创作者 ${creatorId} 添加标签失败:`, error);
        }
      }

      if (i % 10 === 0) {
        console.log(`[TestDataGenerator] 已生成 ${i + 1}/${count} 个创作者`);
      }

      if (onProgress) {
        onProgress(i + 1, count);
      }
    }

    // 刷新现有创作者列表
    console.log(`[TestDataGenerator] 创作者生成完成，当前共有 ${this.existingCreators.length} 个创作者`);
    this.existingCreators = await this.creatorRepository.getAll();
  }

  // 生成随机标签
  async generateTags(count: number, onProgress?: (current: number, total: number) => void): Promise<void> {
    console.log(`[TestDataGenerator] 开始生成 ${count} 个标签`);
    const tagNames = [
      '编程', '人工智能', '数据分析', '前端开发', '后端开发',
      '机器学习', '深度学习', '云计算', '网络安全', '移动开发',
      '数据库', '算法', '操作系统', '网络编程', '软件工程',
      '游戏开发', 'UI设计', '产品管理', '项目管理', '测试'
    ];

    // 获取已存在的标签名称
    const existingTagNames = new Set(this.existingTags.map(tag => tag.name));

    for (let i = 0; i < count; i++) {
      let name: string;
      let attempts = 0;
      const maxAttempts = 100;

      // 尝试生成唯一的标签名称
      do {
        name = RandomDataGenerator.randomChoice(tagNames);
        // 如果名称已存在，添加随机后缀
        if (existingTagNames.has(name)) {
          name = `${name}_${RandomDataGenerator.randomString(4)}`;
        }
        attempts++;
      } while (existingTagNames.has(name) && attempts < maxAttempts);

      const source = RandomDataGenerator.randomChoice([TagSource.USER, TagSource.SYSTEM]);
      await this.tagRepository.createTag(name, source);

      // 添加到已存在名称集合中
      existingTagNames.add(name);

      if (i % 10 === 0) {
        console.log(`[TestDataGenerator] 已生成 ${i + 1}/${count} 个标签`);
      }

      if (onProgress) {
        onProgress(i + 1, count);
      }
    }

    // 刷新现有标签列表
    const tagsResult = await this.tagRepository.getAllTags();
    this.existingTags = tagsResult.items;
    console.log(`[TestDataGenerator] 标签生成完成，当前共有 ${this.existingTags.length} 个标签`);
  }

  // 生成随机视频
  async generateVideos(count: number, onProgress?: (current: number, total: number) => void): Promise<void> {
    console.log(`[TestDataGenerator] 开始生成 ${count} 个视频`);
    const startDate = new Date('2020-01-01');
    const endDate = new Date();

    for (let i = 0; i < count; i++) {
      const creator = this.existingCreators.length > 0 
        ? RandomDataGenerator.randomChoice(this.existingCreators)
        : { creatorId: generateId(), platform: Platform.BILIBILI };

      // 随机选择1-3个标签
      const tagCount = RandomDataGenerator.randomInt(1, 3);
      const tags: number[] = [];
      for (let j = 0; j < tagCount && this.existingTags.length > 0; j++) {
        const tag = RandomDataGenerator.randomChoice(this.existingTags);
        if (!tags.includes(tag.tagId)) {
          tags.push(tag.tagId);
        }
      }

      const video = {
        bv: RandomDataGenerator.randomBV(),
        platform: creator.platform,
        creatorId: creator.creatorId,
        title: RandomDataGenerator.randomTitle(),
        description: RandomDataGenerator.randomDescription(),
        duration: RandomDataGenerator.randomInt(60, 3600),
        publishTime: RandomDataGenerator.randomDate(startDate, endDate),
        tags,
        coverUrl: `https://example.com/cover/${RandomDataGenerator.randomString(10)}.jpg`,
        isInvalid: RandomDataGenerator.randomBoolean()
      };

      await this.videoRepository.createVideo(video);

      if (i % 10 === 0) {
        console.log(`[TestDataGenerator] 已生成 ${i + 1}/${count} 个视频`);
      }

      if (onProgress) {
        onProgress(i + 1, count);
      }
    }
    console.log(`[TestDataGenerator] 视频生成完成`);
  }

  // 生成随机收藏夹
  async generateCollections(count: number, onProgress?: (current: number, total: number) => void): Promise<void> {
    console.log(`[TestDataGenerator] 开始生成 ${count} 个收藏夹`);
    const startDate = new Date('2020-01-01');
    const endDate = new Date();
    const collectionNames = [
      '我的收藏', '学习资料', '技术分享', '娱乐视频', '音乐收藏',
      '游戏视频', '美食教程', '旅行记录', '健身教程', '编程学习'
    ];

    // 获取已存在的收藏夹名称
    const existingCollectionNames = new Set(this.existingCollections.map(col => col.name));

    for (let i = 0; i < count; i++) {
      let name: string;
      let attempts = 0;
      const maxAttempts = 100;

      // 尝试生成唯一的收藏夹名称
      do {
        name = RandomDataGenerator.randomChoice(collectionNames);
        // 如果名称已存在，添加随机后缀
        if (existingCollectionNames.has(name)) {
          name = `${name}_${RandomDataGenerator.randomString(4)}`;
        }
        attempts++;
      } while (existingCollectionNames.has(name) && attempts < maxAttempts);

      const collection = {
        platform: RandomDataGenerator.randomChoice([Platform.BILIBILI, Platform.YOUTUBE]),
        name: name,
        description: RandomDataGenerator.randomChinese(RandomDataGenerator.randomInt(10, 30)),
        createdAt: RandomDataGenerator.randomDate(startDate, endDate),
        lastUpdate: RandomDataGenerator.randomDate(startDate, endDate),
        isPublic: RandomDataGenerator.randomBoolean(),
        sortOrder: RandomDataGenerator.randomChoice(['default', 'time', 'duration'] as const),
        type: RandomDataGenerator.randomChoice(['user', 'subscription'] as const),
        videoCount: 0,
        lastAddedAt: 0
      };

      await this.collectionRepository.createCollection(collection);

      // 添加到已存在名称集合中
      existingCollectionNames.add(name);

      if (i % 10 === 0) {
        console.log(`[TestDataGenerator] 已生成 ${i + 1}/${count} 个收藏夹`);
      }

      if (onProgress) {
        onProgress(i + 1, count);
      }
    }

    // 刷新现有收藏夹列表
    console.log(`[TestDataGenerator] 收藏夹生成完成，当前共有 ${this.existingCollections.length} 个收藏夹`);
    this.existingCollections = await this.collectionRepository.getAllCollections();
  }

  // 生成全部测试数据
  async generateAll(count: number, onProgress?: (type: string, current: number, total: number) => void): Promise<void> {
    console.log('[TestDataGenerator] 开始生成全部测试数据');
    await this.initializeExistingData();

    // 生成创作者
    await this.generateCreators(count, (current, total) => {
      if (onProgress) onProgress('创作者', current, total);
    });

    // 生成标签
    await this.generateTags(count, (current, total) => {
      if (onProgress) onProgress('标签', current, total);
    });

    // 生成视频
    await this.generateVideos(count, (current, total) => {
      if (onProgress) onProgress('视频', current, total);
    });

    // 生成收藏夹
    await this.generateCollections(count, (current, total) => {
      if (onProgress) onProgress('收藏夹', current, total);
    });
    
    console.log('[TestDataGenerator] 全部测试数据生成完成');
  }
}

// 初始化页面
document.addEventListener('DOMContentLoaded', async () => {
  const testDataGenerator = new TestDataGenerator();

  // 获取UI元素
  const generateTestDataBtn = document.getElementById('generate-test-data-btn') as HTMLButtonElement;
  const testDataTypeSelect = document.getElementById('test-data-type') as HTMLSelectElement;
  const testDataCountInput = document.getElementById('test-data-count') as HTMLInputElement;
  const testDataStatus = document.getElementById('test-data-status') as HTMLSpanElement;
  const testDataPercent = document.getElementById('test-data-percent') as HTMLSpanElement;
  const testDataProcessedCount = document.getElementById('test-data-processed-count') as HTMLSpanElement;
  const testDataTotalCount = document.getElementById('test-data-total-count') as HTMLSpanElement;
  const testDataMessage = document.getElementById('test-data-message') as HTMLSpanElement;

  // 生成测试数据按钮点击事件
  generateTestDataBtn.addEventListener('click', async () => {
    const dataType = testDataTypeSelect.value;
    const count = parseInt(testDataCountInput.value, 10);

    // 禁用按钮
    generateTestDataBtn.disabled = true;
    testDataTypeSelect.disabled = true;
    testDataCountInput.disabled = true;

    // 更新UI状态
    testDataStatus.textContent = '生成中...';
    testDataPercent.textContent = '0%';
    testDataProcessedCount.textContent = '0';
    testDataTotalCount.textContent = count.toString();
    testDataMessage.textContent = '';

    try {
      const updateProgress = (current: number, total: number) => {
        const percent = Math.round((current / total) * 100);
        testDataPercent.textContent = `${percent}%`;
        testDataProcessedCount.textContent = current.toString();
      };

      switch (dataType) {
        case 'all':
          await testDataGenerator.generateAll(count, (type, current, total) => {
            testDataStatus.textContent = `正在生成${type}...`;
            updateProgress(current, total);
          });
          testDataStatus.textContent = '生成完成';
          break;
        case 'creators':
          await testDataGenerator.generateCreators(count, updateProgress);
          testDataStatus.textContent = '生成完成';
          break;
        case 'videos':
          await testDataGenerator.generateVideos(count, updateProgress);
          testDataStatus.textContent = '生成完成';
          break;
        case 'collections':
          await testDataGenerator.generateCollections(count, updateProgress);
          testDataStatus.textContent = '生成完成';
          break;
        case 'tags':
          await testDataGenerator.generateTags(count, updateProgress);
          testDataStatus.textContent = '生成完成';
          break;
        case 'add-tags-to-creators':
          // 获取创作者总数
          const creators = await testDataGenerator['existingCreators'];
          const totalCreators = creators.length || await (new CreatorRepositoryImpl()).getAll().then(c => c.length);
          testDataTotalCount.textContent = totalCreators.toString();

          await testDataGenerator.addTagsToExistingCreators((current, total) => {
            updateProgress(current, total);
          });
          testDataStatus.textContent = '添加完成';
          break;
      }

      if (dataType === 'add-tags-to-creators') {
        testDataMessage.textContent = `成功为创作者添加标签`;
      } else {
        testDataMessage.textContent = `成功生成 ${count} 条${dataType === 'all' ? '测试数据' : dataType}数据`;
      }
    } catch (error) {
      testDataStatus.textContent = '生成失败';
      testDataMessage.textContent = `错误: ${error instanceof Error ? error.message : String(error)}`;
    } finally {
      // 启用按钮
      generateTestDataBtn.disabled = false;
      testDataTypeSelect.disabled = false;
      testDataCountInput.disabled = false;
    }
  });
});