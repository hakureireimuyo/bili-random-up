# Book架构重构说明

## 概述

本次重构将BookManager拆分为两个独立的部分，实现职责分离：

1. **BookManager**：只负责Book的CRUD操作，不包含查询逻辑
2. **QueryService**：负责查询逻辑，返回结果ID列表

## 核心概念

### Book（书）

Book是一个**数据容器**，只负责存储和管理特定查询条件下的结果数据：

- **职责**：
  - 存储查询结果ID列表
  - 管理分页数据
  - 跟踪访问时间
  - 与页面生命周期绑定

- **不负责**：
  - 不关心数据如何查询
  - 不关心查询逻辑

### QueryService（查询服务）

QueryService是**通用工具**，负责执行查询逻辑：

- **职责**：
  - 执行查询逻辑
  - 返回结果ID列表
  - 管理索引缓存
  - 可被多个Book复用

- **不负责**：
  - 不关心数据如何存储
  - 不关心页面状态

## 架构对比

### 重构前

```
┌─────────────────────────────────────────────────┐
│                  前端页面                        │
│         │                                       │
│         ▼                                       │
│  ┌───────────────────────────────────────────┐  │
│  │         BookManager                        │  │
│  │  - createBook()  [包含查询逻辑]            │  │
│  │  - getBook()                              │  │
│  │  - getPage()                              │  │
│  │  - updateQueryCondition()  [包含查询逻辑] │  │
│  │  - deleteBook()                           │  │
│  │  - cleanupExpiredBooks()  [自动清理]      │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

**问题**：
1. BookManager包含查询逻辑，职责不清晰
2. 自动清理Book，与页面生命周期冲突
3. Book的创建依赖查询逻辑，不够灵活

### 重构后

```
┌─────────────────────────────────────────────────┐
│                  前端页面                        │
│  ┌───────────────────────────────────────────┐  │
│  │  Book (数据容器)                           │  │
│  │  - bookId: 唯一标识                        │  │
│  │  - resultIds: 结果ID列表                  │  │
│  │  - pages: 分页数据缓存                     │  │
│  │  - state: 当前页状态                       │  │
│  │  - queryCondition: 查询条件                │  │
│  │  - createdAt: 创建时间                     │  │
│  │  - lastAccessTime: 最后访问时间            │  │
│  └───────────────────────────────────────────┘  │
│         │                                       │
│         │ 使用                                  │
│         ▼                                       │
│  ┌───────────────────────────────────────────┐  │
│  │  BookManager (Book管理器)                  │  │
│  │  - createBook()  [只创建容器]              │  │
│  │  - getBook()                              │  │
│  │  - getPage()                              │  │
│  │  - updateBookResult()  [只更新结果]        │  │
│  │  - deleteBook()                           │  │
│  │  - clearAllBooks()                         │  │
│  └───────────────────────────────────────────┘  │
│         │                                       │
│         │ 使用                                  │
│         ▼                                       │
│  ┌───────────────────────────────────────────┐  │
│  │  QueryService (查询服务)                   │  │
│  │  - queryResultIds()  [查询逻辑]          │  │
│  │  - loadIndexCache()                       │  │
│  │  - getIndexCache()                        │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

**优势**：
1. 职责清晰：BookManager管理Book，QueryService执行查询
2. 灵活性高：Book的创建不依赖查询逻辑
3. 生命周期可控：Book的生命周期由页面控制，不自动清理

## 使用流程

### 基本使用

```typescript
// 1. 创建服务实例
const bookManager = new BookManager(dataCache);
const queryService = new QueryService(indexCache);

// 2. 定义查询条件
const queryCondition: QueryCondition = {
  type: 'composite',
  keyword: '游戏',
  tagExpressions: [],
  isFollowing: false,
  platform: 'bilibili'
};

// 3. 使用QueryService查询结果ID
const resultIds = await queryService.queryResultIds(queryCondition);

// 4. 创建Book（数据容器）
const bookId = 'page-1-book';
const book = bookManager.createBook(
  bookId,
  queryCondition,
  resultIds,
  { pageSize: 20 }
);

// 5. 从Book获取数据
const page1 = await bookManager.getPage(bookId, 0);

// 6. 页面销毁时，删除Book
bookManager.deleteBook(bookId);
```

### 页面级别的Book管理

```typescript
class SearchPage {
  private bookManager: BookManager;
  private queryService: QueryService;
  private bookId: string;
  private queryCondition: QueryCondition;

  constructor(
    bookManager: BookManager,
    queryService: QueryService,
    queryCondition: QueryCondition,
    pageId: string
  ) {
    this.bookManager = bookManager;
    this.queryService = queryService;
    this.queryCondition = queryCondition;
    this.bookId = `page-${pageId}-book`;
  }

  /**
   * 页面初始化
   */
  async initialize() {
    // 1. 使用QueryService查询结果ID
    const resultIds = await this.queryService.queryResultIds(this.queryCondition);

    // 2. 创建Book（数据容器）
    this.bookManager.createBook(
      this.bookId,
      this.queryCondition,
      resultIds,
      { pageSize: 20 }
    );
  }

  /**
   * 加载页面数据
   */
  async loadPage(pageNumber: number) {
    return await this.bookManager.getPage(this.bookId, pageNumber);
  }

  /**
   * 更新查询条件
   */
  async updateQuery(newCondition: QueryCondition) {
    this.queryCondition = newCondition;

    // 1. 使用QueryService查询新的结果ID
    const newResultIds = await this.queryService.queryResultIds(newCondition);

    // 2. 更新Book的结果
    this.bookManager.updateBookResult(this.bookId, newResultIds);
  }

  /**
   * 页面销毁
   */
  destroy() {
    // 删除Book，释放资源
    this.bookManager.deleteBook(this.bookId);
  }
}
```

### 多个页面共享QueryService

```typescript
// 1. 创建共享的服务实例
const bookManager = new BookManager(dataCache);
const queryService = new QueryService(indexCache);

// 2. 创建多个页面，共享QueryService
const page1 = new SearchPage(bookManager, queryService, condition1, '1');
const page2 = new SearchPage(bookManager, queryService, condition2, '2');

// 3. 初始化页面
await page1.initialize();
await page2.initialize();

// 4. 加载数据
const page1Data = await page1.loadPage(0);
const page2Data = await page2.loadPage(0);

// 5. 页面销毁
page1.destroy();
page2.destroy();
```

## 关键点

### 1. Book是数据容器

- 只负责存储数据
- 不关心数据如何查询
- 与页面生命周期绑定

### 2. QueryService是通用工具

- 只负责查询逻辑
- 不关心数据如何存储
- 可以被多个Book复用

### 3. BookManager的角色

- 管理多个Book实例
- 提供Book的创建、获取、删除等操作
- 不应该自动清理Book（生命周期由页面控制）

### 4. 缓存的角色

- IndexCache：存储索引数据，全局共享
- DataCache：存储完整数据，全局共享
- 与Book的生命周期无关

## 迁移指南

### 旧代码

```typescript
// 旧方式：BookManager包含查询逻辑
const bookManager = new BookManager(indexCache, dataCache, repository);

// 创建Book时自动执行查询
const book = await bookManager.createBook(queryCondition);

// 更新查询条件时自动执行查询
await bookManager.updateQueryCondition(bookId, newCondition);
```

### 新代码

```typescript
// 新方式：分离BookManager和QueryService
const bookManager = new BookManager(dataCache, repository);
const queryService = new QueryService(indexCache);

// 1. 先查询
const resultIds = await queryService.queryResultIds(queryCondition);

// 2. 再创建Book
const book = bookManager.createBook(bookId, queryCondition, resultIds);

// 1. 先查询
const newResultIds = await queryService.queryResultIds(newCondition);

// 2. 再更新Book
bookManager.updateBookResult(bookId, newResultIds);
```

## 文件说明

### 新增文件

1. `query/query-service.ts`：查询服务类，负责查询逻辑
2. `book/book-new.ts`：新的BookManager类，只负责Book的CRUD操作
3. `examples/book-usage-example.ts`：使用示例

### 旧文件

- `book/book.ts`：旧的BookManager类，包含查询逻辑（待删除）

## 注意事项

1. **Book的生命周期**：完全由页面控制，页面销毁时必须手动删除Book
2. **QueryService是单例**：应该全局共享，不要为每个页面创建新的QueryService实例
3. **缓存是全局共享**：IndexCache和DataCache应该在应用启动时创建，全局共享
4. **BookId的管理**：建议使用页面ID作为BookId的一部分，便于管理
