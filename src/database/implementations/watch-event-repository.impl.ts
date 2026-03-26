/**
 * WatchEventRepositoryImpl 实现
 * 实现观看事件相关的数据库操作
 */

// 接口已移除，直接实现功能
import { WatchEvent } from '../types/behavior.js';
import { DBUtils, STORE_NAMES } from '../indexeddb/index.js';
import { generateId } from './id-generator.js';
import {ID} from '../types/base.js'
/**
 * WatchEventRepositoryImpl 实现类
 */
export class WatchEventRepositoryImpl {
  /**
   * 记录观看事件
   */
  async recordWatchEvent(event: Omit<WatchEvent, 'eventId'>): Promise<void> {
    const eventId = generateId();
    const watchEvent: WatchEvent = {
      eventId,
      ...event
    };
    await DBUtils.add(STORE_NAMES.WATCH_EVENTS, watchEvent);
  }

  /**
   * 批量记录观看事件
   */
  async recordWatchEvents(events: Omit<WatchEvent, 'eventId'>[]): Promise<void> {
    const watchEvents: WatchEvent[] = events.map(event => ({
      eventId: generateId(),
      ...event
    }));
    await DBUtils.addBatch(STORE_NAMES.WATCH_EVENTS, watchEvents);
  }

  /**
   * 获取观看事件
   */
  async getWatchEvent(eventId: ID): Promise<WatchEvent | null> {
    return DBUtils.get<WatchEvent>(STORE_NAMES.WATCH_EVENTS, eventId);
  }










}
