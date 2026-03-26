/**
 * 服务容器 - 管理 Repository 实例
 * 所有 Repository 实例通过此容器统一管理和注入
 */

import { CreatorRepository, TagRepository, CategoryRepositoryImpl } from "../../database/index.js";

/**
 * 服务容器接口
 */
export interface ServiceContainer {
  creatorRepo: CreatorRepository;
  tagRepo: TagRepository;
  categoryRepo: CategoryRepositoryImpl;
}

/**
 * 创建服务容器实例
 */
export function createServiceContainer(): ServiceContainer {
  return {
    creatorRepo: new CreatorRepository(),
    tagRepo: new TagRepository(),
    categoryRepo: new CategoryRepositoryImpl()
  };
}

/**
 * 全局服务容器实例
 */
let globalContainer: ServiceContainer | null = null;

/**
 * 获取全局服务容器
 */
export function getServiceContainer(): ServiceContainer {
  if (!globalContainer) {
    globalContainer = createServiceContainer();
  }
  return globalContainer;
}

/**
 * 设置全局服务容器
 */
export function setServiceContainer(container: ServiceContainer): void {
  globalContainer = container;
}
