/**
 * CollectionItemRepository 实现
 * 职责：仅管理收藏项自身数据，不涉及收藏夹的任何操作
 * 设计原则：基于IndexedDB特性，只实现高效操作
 * - 支持基于主键和索引的增删改查
 */

import { CollectionItem } from '../types/collection.js';
import { DBUtils, STORE_NAMES } from '../indexeddb/index.js';

/**
 * CollectionItemRepository 实现类
 */
export class CollectionItemRepository {
  /**
   * 根据主键获取收藏项
   * @param itemId 收藏项ID
   */
  async getItem(itemId: string): Promise<CollectionItem | null> {
    return DBUtils.get<CollectionItem>(
      STORE_NAMES.COLLECTION_ITEMS,
      itemId
    );
  }

  /**
   * 获取指定视频的所有收藏项
   * 基于videoId索引查询
   * @param videoId 视频ID
   */
  async getItemsByVideo(videoId: string): Promise<CollectionItem[]> {
    return DBUtils.getByIndex<CollectionItem>(
      STORE_NAMES.COLLECTION_ITEMS,
      'videoId',
      videoId
    );
  }
  /**
   * 创建收藏项
   * @param item 收藏项数据（不包含itemId、collectionId、addedAt）
   * @param collectionId 收藏夹ID
   * @returns 创建的收藏项ID
   */
  async createItem(
    collectionId: string,
    item: Omit<CollectionItem, 'itemId' | 'collectionId' | 'addedAt'>
  ): Promise<string> {
    const itemId = `item_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const newItem: CollectionItem = {
      itemId,
      collectionId,
      addedAt: Date.now(),
      ...item
    };

    await DBUtils.add(STORE_NAMES.COLLECTION_ITEMS, newItem);
    return itemId;
  }

  /**
   * 批量创建收藏项
   * @param collectionId 收藏夹ID
   * @param items 收藏项数据列表
   * @returns 创建的收藏项ID列表
   */
  async createItems(
    collectionId: string,
    items: Omit<CollectionItem, 'itemId' | 'collectionId' | 'addedAt'>[]
  ): Promise<string[]> {
    const addedAt = Date.now();
    const itemIds: string[] = [];
    const itemsToAdd: CollectionItem[] = items.map(item => {
      const itemId = `item_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      itemIds.push(itemId);
      return {
        itemId,
        collectionId,
        addedAt,
        ...item
      };
    });

    await DBUtils.addBatch(STORE_NAMES.COLLECTION_ITEMS, itemsToAdd);
    return itemIds;
  }

  /**
   * 更新收藏项
   * @param itemId 收藏项ID
   * @param updates 要更新的字段
   */
  async updateItem(
    itemId: string,
    updates: Partial<Omit<CollectionItem, 'itemId' | 'collectionId' | 'addedAt'>>
  ): Promise<void> {
    const item = await this.getItem(itemId);
    if (!item) {
      throw new Error(`CollectionItem not found: ${itemId}`);
    }

    const updated: CollectionItem = {
      ...item,
      ...updates
    };

    await DBUtils.put(STORE_NAMES.COLLECTION_ITEMS, updated);
  }

  /**
   * 删除收藏项
   * @param itemId 收藏项ID
   */
  async deleteItem(itemId: string): Promise<void> {
    await DBUtils.delete(STORE_NAMES.COLLECTION_ITEMS, itemId);
  }

  /**
   * 批量删除收藏项
   * @param itemIds 收藏项ID列表
   */
  async deleteItems(itemIds: string[]): Promise<void> {
    if (itemIds.length === 0) return;
    await DBUtils.deleteBatch(STORE_NAMES.COLLECTION_ITEMS, itemIds);
  }



  /**
   * 获取收藏项的视频ID
   * @param itemId 收藏项ID
   */
  async getVideoId(itemId: string): Promise<string | null> {
    const item = await this.getItem(itemId);
    return item?.videoId || null;
  }

  /**
   * 获取收藏项的收藏夹ID
   * @param itemId 收藏项ID
   */
  async getCollectionId(itemId: string): Promise<string | null> {
    const item = await this.getItem(itemId);
    return item?.collectionId || null;
  }

  /**
   * 获取收藏项的添加时间
   * @param itemId 收藏项ID
   */
  async getAddedAt(itemId: string): Promise<number | null> {
    const item = await this.getItem(itemId);
    return item?.addedAt || null;
  }

  /**
   * 获取收藏项的备注
   * @param itemId 收藏项ID
   */
  async getNote(itemId: string): Promise<string | null> {
    const item = await this.getItem(itemId);
    return item?.note || null;
  }

  /**
   * 获取收藏项的排序权重
   * @param itemId 收藏项ID
   */
  async getOrder(itemId: string): Promise<number | null> {
    const item = await this.getItem(itemId);
    return item?.order || null;
  }

  /**
   * 更新收藏项的备注
   * @param itemId 收藏项ID
   * @param note 备注内容
   */
  async updateNote(itemId: string, note: string): Promise<void> {
    await this.updateItem(itemId, { note });
  }

  /**
   * 更新收藏项的排序权重
   * @param itemId 收藏项ID
   * @param order 排序权重
   */
  async updateOrder(itemId: string, order: number): Promise<void> {
    await this.updateItem(itemId, { order });
  }

  /**
   * 获取所有收藏项
   * 注意：此方法会获取全部数据，请谨慎使用
   */
  async getAllItems(): Promise<CollectionItem[]> {
    return DBUtils.getAll<CollectionItem>(STORE_NAMES.COLLECTION_ITEMS);
  }
}