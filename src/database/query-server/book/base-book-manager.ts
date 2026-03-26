/**
 * 基础书管理器类
 * 实现书页机制的核心功能，可被所有数据类型复用
 *
 * 核心职责：
 * - 作为Book工厂，负责创建Book实例
 * - 管理Book实例的生命周期
 * - 提供Book的注册和删除功能
 */

import { Book } from './book.js';
import type { QueryCondition } from '../query/types.js';
import type { BookQueryOptions } from './types.js';
import { DataCache } from '../cache/data-cache.js';
import { IndexCache } from '../cache/index-cache.js';
import {generateId} from "../../implementations/id-generator.js"

/**
 * 数据仓库接口
 * 定义数据仓库必须实现的方法
 * 职责：从Cache或Database获取完整数据
 */
export interface IDataRepository<T> {
  /**
   * 根据ID获取单个数据
   * 优先从Cache获取，未命中则从Database获取
   * @param id - 全局唯一的ID
   */
  getById(id: number): Promise<T | null>;

  /**
   * 根据ID列表批量获取数据
   * 优先从Cache获取，未命中的从Database获取
   * @param ids - 全局唯一的ID列表
   */
  getByIds(ids: number[]): Promise<T[]>;

  /**
   * 获取所有数据
   */
  getAll(): Promise<T[]>;
}

/**
 * 索引转换器接口
 * 定义如何将数据转换为索引
 */
export interface IIndexConverter<T, I> {
  /**
   * 将数据转换为索引
   */
  toIndex(data: T): I;

  /**
   * 获取数据的唯一标识
   */
  getId(data: T): number;
}

/**
 * 查询服务接口
 * 定义查询服务必须实现的方法
 * 职责：根据查询条件返回索引ID列表
 */
export interface IQueryService<I> {
  /**
   * 根据查询条件获取索引ID列表
   */
  queryIds(condition: QueryCondition): Promise<number[]>;
}

/**
 * 基础书管理器类
 * 作为Book工厂，负责创建和管理Book实例的生命周期
 *
 * 设计原则：
 * - BookManager只负责创建和管理Book实例
 * - Book自己负责获取数据和管理分页
 * - Book生命周期与页面生命周期一致
 */
export class BaseBookManager<T, I> {
  protected books: Map<number, Book<T>> = new Map();
  protected dataCache: DataCache<T>;
  protected indexCache: IndexCache<I>;
  protected repository: IDataRepository<T>;
  protected indexConverter: IIndexConverter<T, I>;
  protected queryService: IQueryService<I>;

  constructor(
    dataCache: DataCache<T>,
    indexCache: IndexCache<I>,
    repository: IDataRepository<T>,
    indexConverter: IIndexConverter<T, I>,
    queryService: IQueryService<I>
  ) {
    this.dataCache = dataCache;
    this.indexCache = indexCache;
    this.repository = repository;
    this.indexConverter = indexConverter;
    this.queryService = queryService;
  }

  /**
   * 创建一本书
   * 通过QueryService获取索引ID列表
   */
  async createBook(
    queryCondition: QueryCondition,
    options: BookQueryOptions = {}
  ): Promise<Book<T>> {
    const pageSize = options.pageSize || 20;

    // 生成书ID
    const bookId =  generateId();

    // 通过QueryService获取结果ID列表
    const resultIds = await this.queryService.queryIds(queryCondition);

    // 创建Book实例
    const book = new Book<T>(
      bookId,
      resultIds,
      this.repository,
      this.queryService,
      pageSize
    );

    // 存储书
    this.books.set(bookId, book);

    return book;
  }

  /**
   * 获取书
   */
  getBook(bookId: number): Book<T> | undefined {
    return this.books.get(bookId);
  }

  /**
   * 删除书
   */
  deleteBook(bookId: number): boolean {
    return this.books.delete(bookId);
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats(): {
    dataCacheSize: number;
    indexCacheSize: number;
  } {
    return {
      dataCacheSize: this.dataCache.size(),
      indexCacheSize: this.indexCache.size()
    };
  }

  /**
   * 获取数据缓存实例
   */
  getDataCache(): DataCache<T> {
    return this.dataCache;
  }

  /**
   * 获取索引缓存实例
   */
  getIndexCache(): IndexCache<I> {
    return this.indexCache;
  }
}
