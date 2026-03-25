/**
 * 视频搜索页面使用示例
 * 展示从前端页面的角度如何使用视频搜索功能
 */

import { VideoBookManager } from '../../database/query-server/video/video-book-manager.js';
import { VideoQueryService } from '../../database/query-server/video/video-query-service.js';
import type { VideoQueryCondition } from '../../database/query-server/video/video-index-types.js';
import type { Video } from '../../database/types/video.js';
import { DataCache } from '../../database/query-server/cache/data-cache.js';
import { IndexCache } from '../../database/query-server/cache/index-cache.js';

/**
 * 视频搜索页面组件
 * 演示如何在前端页面中使用视频Book作为数据容器
 */
class VideoSearchPage {
  private videoBookManager: VideoBookManager;
  private videoQueryService: VideoQueryService;
  private bookId: string;
  private queryCondition: VideoQueryCondition;
  private currentPage: number = 0;
  private pageSize: number = 20;
  private isLoading: boolean = false;

  constructor(
    pageId: string,
    queryCondition: VideoQueryCondition,
    videoBookManager: VideoBookManager,
    videoQueryService: VideoQueryService
  ) {
    this.bookId = `video-search-page-${pageId}`;
    this.queryCondition = queryCondition;
    this.videoBookManager = videoBookManager;
    this.videoQueryService = videoQueryService;
  }

  /**
   * 页面初始化
   * 在页面挂载时调用
   */
  async onMount(): Promise<void> {
    console.log('视频搜索页面挂载，初始化Book...');

    try {
      this.isLoading = true;

      // 1. 使用VideoQueryService查询结果ID
      const resultIds = await this.videoQueryService.queryVideoIds(this.queryCondition);
      console.log(`查询到 ${resultIds.length} 条视频结果`);

      // 2. 创建Book（数据容器）
      this.videoBookManager.createBook(
        this.bookId,
        this.queryCondition,
        resultIds,
        { pageSize: this.pageSize }
      );

      // 3. 加载第一页数据
      await this.loadPage(0);

    } catch (error) {
      console.error('页面初始化失败:', error);
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * 加载指定页的数据
   */
  async loadPage(pageNumber: number): Promise<Video[]> {
    if (this.isLoading) {
      return [];
    }

    try {
      this.isLoading = true;

      // 从Book获取页数据
      const result = await this.videoBookManager.getPage(
        this.bookId,
        pageNumber,
        {
          pageSize: this.pageSize,
          preloadNext: true,  // 预加载下一页
          preloadCount: 1
        }
      );

      this.currentPage = result.state.currentPage;
      console.log(`加载第 ${pageNumber + 1} 页，共 ${result.state.totalPages} 页`);

      return result.items;

    } catch (error) {
      console.error(`加载第 ${pageNumber + 1} 页失败:`, error);
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * 更新搜索条件
   */
  async updateSearchCondition(newCondition: VideoQueryCondition): Promise<void> {
    console.log('更新视频搜索条件...');

    try {
      this.isLoading = true;

      // 1. 使用VideoQueryService查询新的结果ID
      const newResultIds = await this.videoQueryService.queryVideoIds(newCondition);
      console.log(`新查询到 ${newResultIds.length} 条视频结果`);

      // 2. 更新Book的结果
      this.videoBookManager.updateBookResult(this.bookId, newResultIds);

      // 3. 更新查询条件
      this.queryCondition = newCondition;

      // 4. 重新加载第一页
      await this.loadPage(0);

    } catch (error) {
      console.error('更新搜索条件失败:', error);
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * 获取当前页数据
   */
  getCurrentPageData(): Video[] {
    const book = this.videoBookManager.getBook(this.bookId);
    if (!book) {
      return [];
    }

    const pageData = book.pages.get(this.currentPage);
    return pageData?.items || [];
  }

  /**
   * 获取分页信息
   */
  getPaginationInfo() {
    const book = this.videoBookManager.getBook(this.bookId);
    if (!book) {
      return {
        currentPage: 0,
        totalPages: 0,
        totalRecords: 0,
        pageSize: this.pageSize
      };
    }

    return {
      currentPage: book.state.currentPage,
      totalPages: book.state.totalPages,
      totalRecords: book.state.totalRecords,
      pageSize: book.state.pageSize
    };
  }

  /**
   * 页面卸载
   * 在页面卸载时调用，清理资源
   */
  onUnmount(): void {
    console.log('页面卸载，删除Book...');

    // 删除Book，释放资源
    this.videoBookManager.deleteBook(this.bookId);
  }
}

/**
 * 全局视频搜索服务
 * 管理VideoBookManager和VideoQueryService的单例
 */
class GlobalVideoSearchService {
  private static instance: GlobalVideoSearchService;
  private videoBookManager: VideoBookManager;
  private videoQueryService: VideoQueryService;

  private constructor() {
    // 创建服务实例，它们会自动使用CacheManager中的缓存单例
    this.videoBookManager = new VideoBookManager();
    this.videoQueryService = new VideoQueryService();

    console.log('全局视频搜索服务已初始化');
  }

  static getInstance(): GlobalVideoSearchService {
    if (!GlobalVideoSearchService.instance) {
      GlobalVideoSearchService.instance = new GlobalVideoSearchService();
    }
    return GlobalVideoSearchService.instance;
  }

  getVideoBookManager(): VideoBookManager {
    return this.videoBookManager;
  }

  getVideoQueryService(): VideoQueryService {
    return this.videoQueryService;
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats() {
    return this.videoBookManager.getCacheStats();
  }
}

/**
 * 使用示例
 */
async function videoSearchUsageExample() {
  // 1. 获取全局视频搜索服务
  const videoSearchService = GlobalVideoSearchService.getInstance();
  const videoBookManager = videoSearchService.getVideoBookManager();
  const videoQueryService = videoSearchService.getVideoQueryService();

  // 2. 创建视频搜索页面
  const videoSearchPage = new VideoSearchPage(
    'page-1',  // 页面ID
    {
      platform: 'bilibili',
      keyword: '游戏',  // 标题关键词
      creatorName: '老番茄',  // 创作者名称
      tagExpressions: [
        { tagId: 'game', operator: 'AND' }
      ],
      durationRange: {
        min: 60,   // 最少1分钟
        max: 1800  // 最多30分钟
      },
      onlyFollowingCreators: false
    },
    videoBookManager,
    videoQueryService
  );

  // 3. 页面挂载
  await videoSearchPage.onMount();

  // 4. 获取当前页数据
  const currentPageData = videoSearchPage.getCurrentPageData();
  console.log('当前页视频数据:', currentPageData);

  // 5. 获取分页信息
  const paginationInfo = videoSearchPage.getPaginationInfo();
  console.log('分页信息:', paginationInfo);

  // 6. 加载下一页
  const nextPageData = await videoSearchPage.loadPage(1);
  console.log('下一页视频数据:', nextPageData);

  // 7. 更新搜索条件
  await videoSearchPage.updateSearchCondition({
    platform: 'bilibili',
    keyword: '音乐',
    tagExpressions: [],
    durationRange: {
      min: 120,
      max: 600
    }
  });

  // 8. 页面卸载
  videoSearchPage.onUnmount();

  // 9. 查看缓存统计
  const cacheStats = videoSearchService.getCacheStats();
  console.log('缓存统计:', cacheStats);
}

/**
 * React组件示例
 */
import { useEffect, useState } from 'react';

function VideoSearchPageComponent({ pageId, initialCondition }: {
  pageId: string;
  initialCondition: VideoQueryCondition;
}) {
  const [page, setPage] = useState<VideoSearchPage | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [pagination, setPagination] = useState({
    currentPage: 0,
    totalPages: 0,
    totalRecords: 0,
    pageSize: 20
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // 页面挂载
    const videoSearchService = GlobalVideoSearchService.getInstance();
    const videoSearchPage = new VideoSearchPage(
      pageId,
      initialCondition,
      videoSearchService.getVideoBookManager(),
      videoSearchService.getVideoQueryService()
    );

    videoSearchPage.onMount()
      .then(() => {
        setPage(videoSearchPage);
        setVideos(videoSearchPage.getCurrentPageData());
        setPagination(videoSearchPage.getPaginationInfo());
      })
      .catch(console.error);

    // 页面卸载
    return () => {
      if (videoSearchPage) {
        videoSearchPage.onUnmount();
      }
    };
  }, [pageId, initialCondition]);

  const handlePageChange = async (newPage: number) => {
    if (!page || loading) return;

    setLoading(true);
    try {
      const data = await page.loadPage(newPage);
      setVideos(data);
      setPagination(page.getPaginationInfo());
    } catch (error) {
      console.error('加载页面失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (newCondition: VideoQueryCondition) => {
    if (!page || loading) return;

    setLoading(true);
    try {
      await page.updateSearchCondition(newCondition);
      setVideos(page.getCurrentPageData());
      setPagination(page.getPaginationInfo());
    } catch (error) {
      console.error('搜索失败:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* 搜索框 */}
      <input
        type="text"
        placeholder="搜索视频..."
        onChange={(e) => handleSearch({
          ...initialCondition,
          keyword: e.target.value
        })}
      />

      {/* 加载状态 */}
      {loading && <div>加载中...</div>}

      {/* 视频列表 */}
      <ul>
        {videos.map(video => (
          <li key={video.videoId}>
            <h3>{video.title}</h3>
            <p>时长: {Math.floor(video.duration / 60)}分{video.duration % 60}秒</p>
          </li>
        ))}
      </ul>

      {/* 分页控件 */}
      <div>
        <button
          onClick={() => handlePageChange(pagination.currentPage - 1)}
          disabled={pagination.currentPage === 0 || loading}
        >
          上一页
        </button>
        <span>
          第 {pagination.currentPage + 1} / {pagination.totalPages} 页
        </span>
        <button
          onClick={() => handlePageChange(pagination.currentPage + 1)}
          disabled={pagination.currentPage >= pagination.totalPages - 1 || loading}
        >
          下一页
        </button>
      </div>
    </div>
  );
}

export {
  VideoSearchPage,
  GlobalVideoSearchService,
  VideoSearchPageComponent,
  videoSearchUsageExample
};
