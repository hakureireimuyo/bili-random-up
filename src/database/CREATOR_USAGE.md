
# 创作者数据使用示例

本文档展示如何使用创作者数据的分页和搜索功能。

## 初始化

在使用创作者数据之前，需要先初始化CreatorRepository：

```typescript
import { creatorRepository } from './repository/index.js';

// 初始化创作者仓库
await creatorRepository.init();
```

## 分页获取所有创作者

```typescript
import { creatorRepository } from './repository/index.js';

// 获取第一页，每页20条数据
const result = await creatorRepository.query({
  page: 0,
  pageSize: 20
});

console.log('创作者列表:', result.data);
console.log('总数:', result.total);
console.log('当前页:', result.page);
console.log('是否有下一页:', result.hasNext);
console.log('是否有上一页:', result.hasPrev);
```

## 搜索创作者

```typescript
import { creatorRepository } from './repository/index.js';

// 搜索名称包含"游戏"的创作者
const result = await creatorRepository.query({
  keyword: '游戏',
  page: 0,
  pageSize: 20
});

console.log('搜索结果:', result.data);
console.log('匹配数量:', result.total);
```

## 分页浏览搜索结果

```typescript
import { creatorRepository } from './repository/index.js';

// 第一页
const page1 = await creatorRepository.query({
  keyword: '科技',
  page: 0,
  pageSize: 20
});

// 第二页
const page2 = await creatorRepository.query({
  keyword: '科技',
  page: 1,
  pageSize: 20
});

// 检查是否有更多页
if (page2.hasNext) {
  // 加载第三页
  const page3 = await creatorRepository.query({
    keyword: '科技',
    page: 2,
    pageSize: 20
  });
}
```

## 根据ID获取单个创作者

```typescript
import { creatorRepository } from './repository/index.js';

const creatorId = '123456';
const creator = creatorRepository.getCreator(creatorId);

if (creator) {
  console.log('创作者名称:', creator.name);
  console.log('创作者简介:', creator.description);
  console.log('是否关注:', creator.isFollowing === 1);
}
```

## 清空缓存

```typescript
import { creatorRepository } from './repository/index.js';

// 清空创作者缓存
creatorRepository.clearCache();
```

## 数据结构

### Creator（创作者）

```typescript
interface Creator {
  creatorId: string;           // 创作者唯一ID
  platform: Platform;          // 平台类型
  name: string;               // 创作者名称
  avatar: string;             // 头像图片数据
  avatarUrl: string;          // 头像URL
  isLogout: number;           // 是否已注销
  description: string;        // 创作者简介
  createdAt: number;          // 记录创建时间
  followTime: number;         // 关注/订阅时间
  isFollowing: number;         // 是否关注/订阅
  tagWeights: CreatorTagWeight[]; // 标签权重列表
  categories?: string[];       // 分类列表
  updatedAt?: number;          // 更新时间
}
```

### QueryResult（查询结果）

```typescript
interface QueryResult<T> {
  data: T[];           // 数据列表
  total: number;       // 总数
  page: number;        // 当前页
  pageSize: number;    // 每页大小
  hasNext: boolean;    // 是否有下一页
  hasPrev: boolean;    // 是否有上一页
}
```

## 性能优化说明

1. **索引缓存无上限**：CreatorIndexCache不设置大小限制，确保全量搜索不受影响
2. **统一查询逻辑**：搜索和全量获取使用相同的处理流程，通过keyword参数区分
3. **按需加载**：只加载当前页需要的完整数据，减少内存占用
4. **缓存机制**：使用LRU策略管理数据缓存，提升访问速度

## 注意事项

1. 首次使用时需要调用`init()`方法初始化
2. 搜索是模糊匹配，不区分大小写
3. 索引缓存在初始化时加载所有创作者索引，确保搜索性能
4. 数据缓存按需加载，避免一次性加载所有数据导致内存溢出
