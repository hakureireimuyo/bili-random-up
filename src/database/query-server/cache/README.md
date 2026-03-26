# 缓存层架构说明

## 概述

缓存层是Query-Server架构的第一层，负责管理索引和完整数据的内存缓存。

## 缓存类型

### 1. 索引缓存（IndexCache<T>）

存储轻量级索引数据，用于在内存中执行全量复杂条件查询：

**特性：**
- 存储用于查询的轻量级数据（如CreatorIndex、VideoIndex）
- 不包含过期时间，长期驻留内存
- **无容量限制**，不需要清理
- 支持批量操作
- 全局单例，相同数据类型唯一

**设计决策：**
- **全量驻留策略**：由于数据增长缓慢（一个用户可能十年也看不完十万条视频），且存储的是轻量级索引数据，因此采用全量驻留内存的策略

**初始化机制：**
- 只在需要时从数据库拉取数据
- 前端调用查询服务时，检查索引缓存是否存在数据
- 不存在则从数据库全量拉取并建立索引缓存
- 如果程序运行但未使用任何查询，索引缓存不会拉取数据

**更新机制：**
- 只由 `src\database\repositories` 的实例进行更新
- 不会同步到数据库
- 不需要与数据库完全同步
- 重启后从数据库重建

**示例数据结构：**
```typescript
// CreatorIndex - 创作者索引
interface CreatorIndex {
  creatorId: string;
  name: string;
  isFollowing: boolean;
}

// VideoIndex - 视频索引
interface VideoIndex {
  videoId: string;
  platform: Platform;
  creatorId: string;
  title: string;
  duration: number;
}
```

### 2. 数据缓存（DataCache<T>）

存储完整数据对象，有容量限制：

**特性：**
- 存储完整数据（如Creator、Video）
- 包含过期时间（默认1小时）
- 使用LRU策略管理容量
- 支持批量操作
- 全局单例，相同数据类型唯一

**容量管理：**
- 使用数量限制而非实际占用限制（数量计算更快，不需要十分准确）
- 不同数据类型的上限根据单条数据大小调整
- 数据占用内存大 → 上限少一些
- 数据占用内存小 → 上限多一些
- **最小支持50条数据**
- **最多支持1000条数据**

**更新机制：**
- 只由 `src\database\repositories` 的实例进行更新
- 不会同步到数据库
- 不需要与数据库完全同步
- 重启后从数据库重建

**示例数据结构：**
```typescript
// Creator - 完整创作者数据
interface Creator {
  creatorId: string;
  name: string;
  description?: string;
  avatar?: string;
  tagWeights: TagWeight[];
  isFollowing: 0 | 1;
  // ... 其他完整字段
}

// Video - 完整视频数据
interface Video {
  videoId: string;
  platform: Platform;
  creatorId: string;
  title: string;
  description?: string;
  cover?: string;
  duration: number;
  publishTime: number;
  tags: string[];
  isInvalid?: boolean;
  // ... 其他完整字段
}
```

### 3. 标签缓存（TagCache）

存储标签到索引数组(SortedArray)的映射，用于高效标签查询：

**核心设计理念：**
- 使用SortedArray替代Set，实现可预测的内存占用和高效的集合运算
- 标签映射存储的是索引而非完整ID，大幅减少内存消耗
- 支持增量更新，避免全量重建的开销
- 与IndexCache协同工作，先粗筛再精筛

**数据结构：**
```typescript
class TagCache {
  // 标签到索引数组的映射
  private tagMap: Map<string, number[]> // tagId → index[]（升序数组）

  // 全局索引映射（与IndexCache共享）
  private indexMap: Map<string, number> // id → index
  private reverseIndexMap: Map<number, string> // index → id
}

// 标签缓存条目
interface TagCacheEntry {
  tagId: string;            // 标签ID
  indices: number[];        // 索引数组（升序，无重复）
  lastUpdate: number;       // 最后更新时间
  totalCount: number;       // 总数据量
}
```

**内存特性：**
- 相比Set<string>，SortedArray<number>通常节省5~10倍内存
- 连续内存布局，极低开销
- 无重复，升序排列
- **不包含过期时间，长期驻留内存**
- **无容量限制，不需要清理**

**初始化机制：**
- 与IndexCache相同，只在需要时从数据库拉取数据
- 前端调用查询服务时，检查TagCache是否存在数据
- 不存在则从数据库全量拉取并建立TagCache
- 如果程序运行但未使用任何查询，TagCache不会拉取数据
- 初始化时建立全局索引映射（id ↔ index）

**更新机制：**
- 只由 `src\database\repositories` 的实例进行更新
- 不会同步到数据库
- 不需要与数据库完全同步
- 重启后从数据库重建
- 支持增量更新：
  - 新增视频：分配新索引，插入到相关标签的数组中
  - 删除视频：从相关标签的数组中移除索引
  - 修改标签：先移除旧标签的索引，再添加到新标签的数组中

## 缓存管理器（CacheManager）

**职责：**
- 仅提供不同数据类型的缓存单例
- 确保相同数据类型的缓存实例全局唯一
- 提供统一的缓存访问接口
- **不管理单例的生命周期**，仅作为单例提供方法的入口

**设计要点：**
- 使用单例模式
- 通过泛型确保类型安全
- 延迟初始化缓存实例
- 支持缓存统计和监控

**缓存类型来源：**
- 所有数据类型定义在 `src\database\types` 中
- 所有缓存实例基于这些类型创建
- 确保类型的一致性和可追溯性
