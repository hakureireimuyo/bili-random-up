# 书管理层架构说明

## 概述

书管理层是Query-Server架构的第三层，负责管理查询结果和分页数据。

## Book（书）

Book是查询结果与完整数据对象获取的容器，管理ID列表和分页数据：

**职责：**
- **只存储查询返回的索引数据**
- **不存储完整对象**
- 支持泛型，支持更多数据索引
- **通过Repository获取完整数据**
- **支持预加载功能**
- 与前端页面数据显示容器绑定生命周期

**设计决策：**
- **职责分离**：BookManager只负责创建和管理Book实例，Book自己负责获取数据和管理分页
- **数据获取流程**：
  1. Book持有resultIds和分页状态
  2. Book通过getPage方法获取分页数据
  3. Book内部通过Repository的getByIds方法获取完整数据
  4. Repository从Cache或Database获取数据
- **架构优势**：
  - BookManager作为工厂，职责单一
  - Book拥有自己的功能，符合面向对象设计原则
  - 数据获取逻辑集中在Repository层，便于维护
  - Repository可以基于数据库操作返回的结果来保证数据同步
  - Book的生命周期与页面生命周期一致，易于管理

**与查询服务的关系：**
- Book只与一个查询服务绑定
- 通过该查询服务调用来更新Book实例的索引内容
- 查询条件只给查询服务使用，Book不存储查询条件

**数据获取流程：**
1. Book持有索引数据
2. 需要数据时，通过Repository获取
3. Repository先从DataCache获取，未命中则从Database获取
4. Repository获取数据后更新DataCache
5. 返回完整数据给Book

**预加载功能：**
- Book不存储数据，但支持预加载
- 提前尝试获取更多数据
- 让数据先一步存储于DataCache中
- 翻页时通过命中缓存快速获取

**生命周期：**
- 与页面数据显示容器绑定
- 与页面生命周期一致
- **不需要额外字段管理生命周期**

**数据结构：**
```typescript
class Book<T> {
  bookId: string;                    // 书的唯一标识
  resultIds: string[];               // 结果ID列表（只存储索引）
  pages: Map<number, BookPage<T>>;   // 页数据缓存
  state: BookPageState;              // 当前分页状态

  protected repository: IDataRepository<T>;    // 数据仓库
  protected queryService: IQueryService<I>;   // 查询服务

  // 获取分页数据
  async getPage(page: number, options: BookQueryOptions): Promise<BookQueryResult<T>>;

  // 更新索引内容
  async updateIndex(newCondition: QueryCondition): Promise<void>;
}

interface BookPage<T> {
  page: number;                // 页码
  items: T[];                  // 数据列表（从Repository获取）
  loaded: boolean;             // 是否已加载
  loadTime?: number;           // 加载时间
}
```

## BookManager（书管理器）

**职责：**
- **作为Book工厂，负责创建Book实例**
- 管理Book实例的生命周期（与页面生命周期一致）
- 提供Book的注册和删除功能

**核心方法：**
```typescript
class BookManager {
  // 创建Book实例（工厂方法）
  async createBook<T>(
    queryCondition: QueryCondition,
    options: BookQueryOptions
  ): Promise<Book<T>>;

  // 获取Book实例
  getBook<T>(bookId: string): Book<T> | undefined;

  // 删除Book实例
  deleteBook(bookId: string): boolean;
}
```

**Book类的核心方法：**
```typescript
class Book<T> {
  // 获取分页数据
  async getPage(page: number, options: BookQueryOptions): Promise<BookQueryResult<T>>;

  // 更新索引内容
  async updateIndex(newCondition: QueryCondition): Promise<void>;
}
```
