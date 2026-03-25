
/**
 * QueryPlan - 查询计划定义
 * 定义查询计划的数据结构，连接 Repository、DataManager 和 Strategy 层
 */

import type { VideoQueryParams } from '../query/types.js';
import type { TagSource } from '../types/base.js';

/**
 * 查询请求类型
 */
export enum RequestType {
  // 视频相关请求
  GET_VIDEOS_BY_TAG = 'GET_VIDEOS_BY_TAG',
  GET_VIDEOS_BY_CREATOR = 'GET_VIDEOS_BY_CREATOR',
  GET_VIDEOS_BY_COLLECTION = 'GET_VIDEOS_BY_COLLECTION',
  GET_ALL_VIDEOS = 'GET_ALL_VIDEOS',

  // 标签相关请求
  GET_TAGS_BY_SOURCE = 'GET_TAGS_BY_SOURCE',
  GET_ALL_TAGS = 'GET_ALL_TAGS',
  CREATE_TAG = 'CREATE_TAG',
  DELETE_TAG = 'DELETE_TAG',

  // 创作者相关请求
  GET_CREATORS = 'GET_CREATORS'
}

/**
 * 数据请求基类
 */
export interface BaseDataRequest {
  type: RequestType;
  payload: Record<string, unknown>;
}

/**
 * 视频数据请求
 */
export interface VideoDataRequest extends BaseDataRequest {
  type: 
    | RequestType.GET_VIDEOS_BY_TAG
    | RequestType.GET_VIDEOS_BY_CREATOR
    | RequestType.GET_VIDEOS_BY_COLLECTION
    | RequestType.GET_ALL_VIDEOS;
  payload: {
    tagId?: string;
    creatorId?: string;
    collectionId?: string;
    collectionType?: 'user' | 'subscription';
    keyword?: string;
    tags?: string[];
  };
}

/**
 * 标签数据请求
 */
export interface TagDataRequest extends BaseDataRequest {
  type: 
    | RequestType.GET_TAGS_BY_SOURCE
    | RequestType.GET_ALL_TAGS
    | RequestType.CREATE_TAG
    | RequestType.DELETE_TAG;
  payload: {
    source?: TagSource;
    keyword?: string;
    name?: string;
    tagId?: string;
  };
}

/**
 * 创作者数据请求
 */
export interface CreatorDataRequest extends BaseDataRequest {
  type: RequestType.GET_CREATORS;
  payload: {
    keyword?: string;
    isFollowing?: boolean;
    page?: number;
    pageSize?: number;
    tagExpressions?: TagExpression[];
  };
}

/**
 * 数据请求类型联合
 */
export type DataRequest = VideoDataRequest | TagDataRequest | CreatorDataRequest;

/**
 * 索引查询类型
 */
export enum IndexQueryType {
  TAG = 'TAG',
  CREATOR = 'CREATOR',
  COLLECTION = 'COLLECTION',
  FULL = 'FULL'
}

/**
 * 索引查询
 */
export interface IndexQuery {
  type: IndexQueryType;
  value?: unknown;
}

/**
 * 数据库查询
 */
export interface DBQuery {
  tagId?: string;
  creatorId?: string;
  collectionId?: string;
  collectionType?: 'user' | 'subscription';
  source?: TagSource;
}

/**
 * 查询条件
 */
export interface QueryCondition {
  filter?: Record<string, unknown>;
  sort?: string;
  limit?: number;
}

/**
 * 查询计划
 */
export interface QueryPlan {
  /** 是否需要从数据库加载 */
  needLoadFromDB: boolean;
  /** 数据库查询条件 */
  dbQuery?: DBQuery;
  /** 索引查询条件 */
  indexQuery: IndexQuery;
  /** 查询条件 */
  query: QueryCondition;
}

/**
 * 策略上下文
 */
export interface StrategyContext {
  cache: Record<string, unknown>;
  index: {
    isInitialized(): boolean;
    hasTag(tagId: string): boolean;
    hasCreator(creatorId: string): boolean;
    hasCollection(collectionId: string): boolean;
  };
}
