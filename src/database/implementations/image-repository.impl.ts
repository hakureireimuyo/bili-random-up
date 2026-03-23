/**
 * ImageRepository（基于IndexedDB的图片仓库实现）
 * 实现图片数据和元数据的分离存储，支持按需加载图片数据
 */

import { Image, ImageMetadata, ImageData, ImagePurpose } from '../types/image.js';
import { PaginationParams, PaginationResult } from '../types/base.js';
import { DBUtils, STORE_NAMES } from '../indexeddb/index.js';
import { compressImage, shouldCompress } from '../../utls/image-utils.js';

function generateId(): string {
  return crypto.randomUUID();
}

export class ImageRepository {

  /**
   * 创建图像
   * @param image 图片对象，包含元数据和图片数据
   * @returns 返回完整的图片对象（包含元数据和图片数据）
   */
  async createImage(
    image: Omit<ImageMetadata, 'id' | 'createdAt' | 'lastAccessTime' | 'dataId'> & { data: Blob }
  ): Promise<Image> {
    const now = Date.now();
    const metadataId = generateId();
    const dataId = generateId();

    // 压缩图片
    let finalData: Blob;
    try {
      const dataUrl = await this.blobToDataUrl(image.data);
      if (await shouldCompress(dataUrl, image.purpose)) {
        finalData = await compressImage(dataUrl, image.purpose);
      } else {
        finalData = image.data;
      }
    } catch {
      finalData = image.data;
    }

    // 创建元数据和图片数据对象
    const metadata: ImageMetadata = {
      id: metadataId,
      purpose: image.purpose,
      createdAt: now,
      lastAccessTime: now,
      dataId
    };

    const data: ImageData = {
      id: dataId,
      data: finalData
    };

    // 使用事务确保数据一致性
    await DBUtils.transaction([
      { store: STORE_NAMES.IMAGES_METADATA, operation: 'add', value: metadata },
      { store: STORE_NAMES.IMAGES_DATA, operation: 'add', value: data }
    ]);

    return {
      metadata,
      data
    };
  }

  /**
   * 获取图片元数据（不加载图片数据）
   * @param id 图片ID
   * @returns 图片元数据
   */
  async getImageMetadata(id: string): Promise<ImageMetadata | null> {
    const metadata = await DBUtils.get<ImageMetadata>(
      STORE_NAMES.IMAGES_METADATA,
      id
    );

    if (!metadata) return null;

    return metadata;
  }

  /**
   * 获取图片数据（按需加载）
   * @param dataId 图片数据ID
   * @returns 图片数据
   */
  async getImageData(dataId: string): Promise<ImageData | null> {
    return DBUtils.get<ImageData>(
      STORE_NAMES.IMAGES_DATA,
      dataId
    );
  }

  /**
   * 获取完整图片（包含元数据和图片数据）
   * @param id 图片ID
   * @returns 完整图片对象
   */
  async getImage(id: string): Promise<Image | null> {
    const metadata = await this.getImageMetadata(id);
    if (!metadata) return null;

    const data = await this.getImageData(metadata.dataId);
    if (!data) return null;

    return {
      metadata,
      data
    };
  }

  /**
   * 批量获取图片元数据（不加载图片数据）
   * @param ids 图片ID数组
   * @returns 图片元数据数组
   */
  async getImagesMetadata(ids: string[]): Promise<ImageMetadata[]> {
    return DBUtils.getBatch<ImageMetadata>(
      STORE_NAMES.IMAGES_METADATA,
      ids
    );
  }

  /**
   * 批量获取图片数据（按需加载）
   * @param dataIds 图片数据ID数组
   * @returns 图片数据数组
   */
  async getImagesData(dataIds: string[]): Promise<ImageData[]> {
    return DBUtils.getBatch<ImageData>(
      STORE_NAMES.IMAGES_DATA,
      dataIds
    );
  }

  /**
   * 批量获取完整图片（包含元数据和图片数据）
   * @param ids 图片ID数组
   * @returns 完整图片对象数组
   */
  async getImages(ids: string[]): Promise<Image[]> {
    const metas = await this.getImagesMetadata(ids);
    if (metas.length === 0) return [];

    const dataIds = metas.map(m => m.dataId);
    const datas = await this.getImagesData(dataIds);
    const dataMap = new Map(datas.map(d => [d.id, d]));

    const now = Date.now();
    const needUpdate: ImageMetadata[] = [];
    const result: Image[] = [];

    for (const meta of metas) {
      const data = dataMap.get(meta.dataId);
      if (!data) continue;

        needUpdate.push({
          ...meta,
          lastAccessTime: now
        });

      result.push({
        metadata: meta,
        data
      });
    }

    if (needUpdate.length > 0) {
      await DBUtils.putBatch(STORE_NAMES.IMAGES_METADATA, needUpdate);
    }

    return result;
  }

  /**
   * 按用途查询图片元数据（不加载图片数据）
   * @param purpose 图片用途
   * @param pagination 分页参数
   * @returns 分页结果（只包含元数据）
   */
  async getImagesMetadataByPurpose(
    purpose: ImagePurpose,
    pagination: PaginationParams
  ): Promise<PaginationResult<ImageMetadata>> {
    const items: ImageMetadata[] = [];
    let total = 0;

    const offset = pagination.page * pagination.pageSize;
    let skipped = 0;

    // 使用游标遍历，只获取元数据
    await DBUtils.cursor<ImageMetadata>(
      STORE_NAMES.IMAGES_METADATA,
      (value) => {
        if (value.purpose !== purpose) return;

        total++;

        if (skipped < offset) {
          skipped++;
          return;
        }

        if (items.length < pagination.pageSize) {
          items.push(value);
        } else {
          return false;
        }
      },
      'lastAccessTime',
      undefined,
      'prev'
    );

    return {
      items,
      total,
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalPages: Math.ceil(total / pagination.pageSize)
    };
  }

  /**
   * 获取指定用途的图片数据（按需加载）
   * @param purpose 图片用途
   * @param pagination 分页参数
   * @returns 分页结果（包含元数据和图片数据）
   */
  async getImagesByPurpose(
    purpose: ImagePurpose,
    pagination: PaginationParams
  ): Promise<PaginationResult<Image>> {
    const metadataResult = await this.getImagesMetadataByPurpose(purpose, pagination);
    if (metadataResult.items.length === 0) {
      return {
        items: [],
        total: 0,
        page: pagination.page,
        pageSize: pagination.pageSize,
        totalPages: 0
      };
    }

    const metadataIds = metadataResult.items.map(m => m.id);
    const images = await this.getImages(metadataIds);

    return {
      items: images,
      total: metadataResult.total,
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalPages: metadataResult.totalPages
    };
  }

  /**
   * 更新图片数据（保留元数据）
   * @param id 图片ID
   * @param newData 新的图片数据
   */
  async updateImageData(id: string, newData: Blob): Promise<void> {
    const metadata = await this.getImageMetadata(id);
    if (!metadata) throw new Error('Image not found');

    let finalData: Blob;
    try {
      const dataUrl = await this.blobToDataUrl(newData);
      if (await shouldCompress(dataUrl, metadata.purpose)) {
        finalData = await compressImage(dataUrl, metadata.purpose);
      } else {
        finalData = newData;
      }
    } catch {
      finalData = newData;
    }

    // 只更新图片数据，保留元数据
    await DBUtils.put(STORE_NAMES.IMAGES_DATA, {
      id: metadata.dataId,
      data: finalData
    });

    await DBUtils.put(STORE_NAMES.IMAGES_METADATA, {
      ...metadata,
      lastAccessTime: Date.now()
    });
  }

  /**
   * 更新图片元数据
   * @param id 图片ID
   * @param newMetadata 新的元数据（不包含dataId）
   */
  async updateImageMetadata(id: string, newMetadata: Partial<Omit<ImageMetadata, 'id' | 'dataId'>>): Promise<void> {
    const metadata = await this.getImageMetadata(id);
    if (!metadata) throw new Error('Image not found');

    // 合并更新元数据
    const updatedMetadata = {
      ...metadata,
      ...newMetadata
    };

    await DBUtils.put(STORE_NAMES.IMAGES_METADATA, updatedMetadata);
  }

  /**
   * 删除图片（同时删除元数据和图片数据）
   * @param id 图片ID
   */
  async deleteImage(id: string): Promise<void> {
    const metadata = await this.getImageMetadata(id);
    if (!metadata) return;

    // 使用事务同时删除元数据和图片数据
    await DBUtils.transaction([
      { store: STORE_NAMES.IMAGES_METADATA, operation: 'delete', key: id },
      { store: STORE_NAMES.IMAGES_DATA, operation: 'delete', key: metadata.dataId }
    ]);
  }

  /**
   * 批量删除图片
   * @param ids 图片ID数组
   */
  async deleteImages(ids: string[]): Promise<void> {
    const metas = await this.getImagesMetadata(ids);
    if (metas.length === 0) return;

    const metadataIds = metas.map(m => m.id);
    const dataIds = metas.map(m => m.dataId);

    // 使用事务批量删除
    await DBUtils.transaction([
      { store: STORE_NAMES.IMAGES_METADATA, operation: 'deleteBatch', keys: metadataIds },
      { store: STORE_NAMES.IMAGES_DATA, operation: 'deleteBatch', keys: dataIds }
    ]);
  }

  /**
   * 清理过期图片（只扫描元数据）
   * @param expireTime 过期时间戳
   * @returns 清理的图片数量
   */
  async cleanupExpiredImages(expireTime: number): Promise<number> {
    const expiredMetaIds: string[] = [];
    const expiredDataIds: string[] = [];

    const range = IDBKeyRange.upperBound(expireTime);

    // 使用游标遍历元数据，找出过期项
    await DBUtils.cursor<ImageMetadata>(
      STORE_NAMES.IMAGES_METADATA,
      (value) => {
        expiredMetaIds.push(value.id);
        expiredDataIds.push(value.dataId);
      },
      'lastAccessTime',
      range
    );

    if (expiredMetaIds.length > 0) {
      // 使用事务批量删除
      await DBUtils.transaction([
        { store: STORE_NAMES.IMAGES_METADATA, operation: 'deleteBatch', keys: expiredMetaIds },
        { store: STORE_NAMES.IMAGES_DATA, operation: 'deleteBatch', keys: expiredDataIds }
      ]);
    }

    return expiredMetaIds.length;
  }

  /**
   * 获取指定用途的图片元数据ID列表
   * @param purpose 图片用途
   * @returns 图片ID数组
   */
  async getImageIdsByPurpose(purpose: ImagePurpose): Promise<string[]> {
    const ids: string[] = [];

    await DBUtils.cursor<ImageMetadata>(
      STORE_NAMES.IMAGES_METADATA,
      (value) => {
        if (value.purpose === purpose) {
          ids.push(value.id);
        }
      }
    );

    return ids;
  }

  /**
   * 辅助方法：Blob转DataURL
   * @param blob 二进制数据
   * @returns DataURL字符串
   */
  private async blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('blobToDataUrl failed'));
      reader.readAsDataURL(blob);
    });
  }
}
