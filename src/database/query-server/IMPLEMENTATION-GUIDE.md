# 书页机制实现指南

本指南说明如何为新的数据类型实现书页查询机制。

## 核心组件

### 1. BaseCache<T>

通用的LRU缓存基类，提供：
- 自动过期清理
- LRU淘汰策略
- 访问统计
- 批量操作

### 2. BaseBookManager<T, I>

通用的书管理器基类，提供：
- 书的创建和管理
- 分页数据加载
- 共享缓存机制
- 预加载功能

### 3. IDataRepository<T>

数据仓库接口，需要实现：
```typescript
interface IDataRepository<T> {
  getById(id: string): Promise<T | null>;
  getByIds(ids: string[]): Promise<T[]>;
  getAll(): Promise<T[]>;
}
```

### 4. IIndexConverter<T, I>

索引转换器接口，需要实现：
```typescript
interface IIndexConverter<T, I> {
  toIndex(data: T): I;           // 将数据转换为索引
  getId(data: T): string;         // 获取数据的唯一标识
}
```

## 实现步骤

### 步骤1：定义数据类型

```typescript
// src/database/types/video.ts
export interface Video {
  videoId: string;
  title: string;
  // ... 其他字段
}
```

### 步骤2：定义索引类型

```typescript
// src/database/query-server/query/types.ts
export interface VideoIndex {
  videoId: string;
  title: string;
  tags: string[];
  // ... 其他索引字段
}
```

### 步骤3：实现数据仓库

```typescript
// src/database/query-server/book/video-book-manager.ts
class VideoRepositoryAdapter implements IDataRepository<Video> {
  constructor(private repository: VideoRepositoryImpl) {}

  async getById(id: string): Promise<Video | null> {
    return await this.repository.getVideo(id);
  }

  async getByIds(ids: string[]): Promise<Video[]> {
    return await this.repository.getVideos(ids);
  }

  async getAll(): Promise<Video[]> {
    return await this.repository.getAllVideos();
  }
}
```

### 步骤4：实现索引转换器

```typescript
class VideoIndexConverter implements IIndexConverter<Video, VideoIndex> {
  toIndex(data: Video): VideoIndex {
    return {
      videoId: data.videoId,
      title: data.title,
      tags: data.tags.map(t => t.tagId)
    };
  }

  getId(data: Video): string {
    return data.videoId;
  }
}
```

### 步骤5：实现书管理器

```typescript
export class VideoBookManager extends BaseBookManager<Video, VideoIndex> {
  private queryEngine: VideoQueryEngine;

  constructor(
    dataCache?: BaseCache<Video>,
    indexCache?: BaseCache<VideoIndex>,
    repository?: VideoRepositoryImpl
  ) {
    const repo = repository || new VideoRepositoryImpl();
    const dataCacheInstance = dataCache || new BaseCache<Video>({
      maxSize: 1000,
      maxAge: 3600000
    });
    const indexCacheInstance = indexCache || new BaseCache<VideoIndex>({
      maxSize: 20000,
      maxAge: 3600000
    });

    super(
      { maxSize: 1000, maxAge: 3600000 },
      { maxSize: 20000, maxAge: 3600000 },
      new VideoRepositoryAdapter(repo),
      new VideoIndexConverter()
    );

    this.queryEngine = new VideoQueryEngine();
  }

  /**
   * 创建标题查询书
   */
  async createTitleQueryBook(
    keyword: string,
    options: BookQueryOptions = {}
  ): Promise<Book<Video>> {
    const condition: QueryCondition = {
      type: 'title',
      keyword
    };

    return await this.createBook(condition, options, (cond, indexes) => {
      return this.queryEngine.queryByTitle(indexes, keyword);
    });
  }

  protected extractIdFromIndex(index: VideoIndex): string {
    return index.videoId;
  }

  protected generateBookId(condition: QueryCondition): string {
    return `video:title:${condition.keyword}`;
  }
}
```

### 步骤6：实现Repository层

```typescript
// src/database/repositories/video-repository.ts
export class VideoRepository {
  private bookManager: VideoBookManager;
  private repository: VideoRepositoryImpl;

  constructor() {
    this.repository = new VideoRepositoryImpl();
    this.bookManager = new VideoBookManager();
  }

  async createTitleQueryBook(
    keyword: string,
    options: BookQueryOptions = {}
  ): Promise<string> {
    const book = await this.bookManager.createTitleQueryBook(keyword, options);
    return book.bookId;
  }

  async getPage(
    bookId: string,
    page: number,
    options: BookQueryOptions = {}
  ): Promise<BookQueryResult<Video>> {
    return await this.bookManager.getPage(bookId, page, options);
  }

  // ... 其他方法
}
```

## 使用示例

```typescript
// 创建Repository实例
const videoRepo = new VideoRepository();

// 创建查询书
const bookId = await videoRepo.createTitleQueryBook('教程');

// 获取第一页数据
const page1 = await videoRepo.getPage(bookId, 0, {
  pageSize: 20,
  preloadNext: true
});

console.log(page1.items);  // 20个Video对象
console.log(page1.state); // 分页状态信息

// 获取第二页数据
const page2 = await videoRepo.getPage(bookId, 1);

// 获取缓存统计
const stats = videoRepo.getCacheStats();
console.log('缓存大小:', stats.dataCache.size);
console.log('平均访问次数:', stats.dataCache.avgAccessCount);
```

## 关键点

1. **复用基类**：所有数据类型都继承BaseBookManager和BaseCache
2. **共享缓存**：相同数据在不同查询间共享缓存
3. **LRU策略**：自动清理不常用的数据
4. **类型安全**：使用TypeScript泛型确保类型安全
5. **灵活扩展**：通过接口和适配器模式支持不同数据源

## 性能优化

1. **缓存大小配置**：
   - 数据缓存：根据数据大小调整（Video通常比Creator大）
   - 索引缓存：可以设置较大值（索引数据小）

2. **过期时间**：
   - 热点数据：设置较长的过期时间
   - 冷数据：设置较短的过期时间

3. **预加载**：
   - 根据用户行为调整预加载页数
   - 避免预加载过多导致内存浪费

4. **清理策略**：
   - 调整cleanupRatio（默认0.2）
   - 根据实际使用情况优化
