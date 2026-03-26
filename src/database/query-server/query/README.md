# 查询服务层架构说明

## 概述

查询服务层是Query-Server架构的第二层，负责执行查询逻辑，返回结果ID列表。

## 查询服务设计

查询层必须依赖Cache获取数据，这是必备的前提。为了保持代码实现的简洁性，查询层被拆分为纯函数和调度层两部分：

**纯函数（Engine）：**
- 负责执行具体的查询逻辑
- 不依赖任何状态
- 可独立测试
- 示例：
  ```typescript
  function filterByTitle(indexes, keyword): string[]
  function filterByTags(indexes, tagExpr): string[]
  ```

**调度层（Executor）：**
- 薄封装，负责协调查询流程
- 持有Cache引用
- 调用纯函数执行查询
- 示例：
  ```typescript
  class QueryExecutor {
    constructor(private cache: IndexCache) {}

    run(condition): string[] {
      const indexes = this.cache.getAll()
      let ids = indexes

      if (condition.keyword) {
        ids = filterByTitle(ids, condition.keyword)
      }

      if (condition.tags) {
        ids = filterByTags(ids, condition.tags)
      }

      return ids.map(i => i.id)
    }
  }
  ```

**设计优势：**
- 不引入新的抽象层级
- 复杂度几乎不变
- 可测试性提升
- 可替换性提升

## 查询服务规范

所有查询服务必须遵守以下规范：

**输入规范：**
```typescript
interface QueryInput<T> {
  indexes: T[];              // 索引数据列表
  condition: QueryCondition; // 查询条件
  cacheKey?: string;         // 可选的缓存键
}
```

**输出规范：**
```typescript
interface QueryOutput {
  matchedIds: string[];      // 匹配的ID列表
  stats?: QueryStats;        // 查询统计信息（可选）
}
```

## 查询服务类型

### 1. 基础查询服务

每个基础查询服务专注于单一查询维度：

**名称/标题查询服务：**
- Creator: 按创作者名称匹配
- Video: 按视频标题匹配
- 逻辑相同，处理对象不同

**核心算法：**
```typescript
// 交集（AND操作）- 双指针线性扫描
function intersect(a: number[], b: number[]): number[] {
  const result: number[] = [];
  let i = 0, j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      result.push(a[i]);
      i++;
      j++;
    } else if (a[i] < b[j]) {
      i++;
    } else {
      j++;
    }
  }
  return result;
}

// 并集（OR操作）- 类似merge排序
function union(a: number[], b: number[]): number[] {
  const result: number[] = [];
  let i = 0, j = 0;
  while (i < a.length || j < b.length) {
    if (j >= b.length || (i < a.length && a[i] < b[j])) {
      if (result.length === 0 || result[result.length - 1] !== a[i]) {
        result.push(a[i]);
      }
      i++;
    } else if (i >= a.length || (j < b.length && a[i] > b[j])) {
      if (result.length === 0 || result[result.length - 1] !== b[j]) {
        result.push(b[j]);
      }
      j++;
    } else {
      // a[i] === b[j]
      if (result.length === 0 || result[result.length - 1] !== a[i]) {
        result.push(a[i]);
      }
      i++;
      j++;
    }
  }
  return result;
}

// 差集（NOT操作）
function subtract(a: number[], b: number[]): number[] {
  const result: number[] = [];
  let i = 0, j = 0;
  while (i < a.length) {
    if (j >= b.length || a[i] < b[j]) {
      result.push(a[i]);
      i++;
    } else if (a[i] === b[j]) {
      i++;
      j++;
    } else {
      j++;
    }
  }
  return result;
}

// 插入到有序数组
function insertSorted(arr: number[], value: number): void {
  let left = 0, right = arr.length;
  while (left < right) {
    const mid = Math.floor((left + right) / 2);
    if (arr[mid] < value) {
      left = mid + 1;
    } else {
      right = mid;
    }
  }
  // 检查是否已存在
  if (left < arr.length && arr[left] === value) {
    return; // 已存在，不插入
  }
  arr.splice(left, 0, value);
}

// 从有序数组中移除
function removeFromArray(arr: number[], value: number): void {
  let left = 0, right = arr.length;
  while (left < right) {
    const mid = Math.floor((left + right) / 2);
    if (arr[mid] < value) {
      left = mid + 1;
    } else {
      right = mid;
    }
  }
  if (left < arr.length && arr[left] === value) {
    arr.splice(left, 1);
  }
}
```

**标签查询服务：**
- 支持AND、OR、NOT操作
- 可同时用于Creator和Video
- 使用TagFilterEngine实现
- 查询表达式结构：
  ```typescript
  type TagExpression =
    | { type: 'AND', tagId: string }
    | { type: 'OR_GROUP', tagIds: string[] }
    | { type: 'NOT', tagId: string }
  ```
- 查询执行流程：
  1. TagCache执行集合运算 → index[]
  2. index[]转换为id[]
  3. IndexCache进一步过滤（title/creator）
  4. 返回结果
- 查询优化策略：
  1. 按最小集合优先：sort(tags by length asc)，减少计算量
  2. 提前终止：if result.length === 0: break
  3. NOT最后执行：A ∩ B ∩ C → 再减 D
- 表达式规范：AND为主结构，OR_GROUP为子表达式，NOT最后执行
  - 示例：tag1 AND tag2 AND (tag3 OR tag4) AND NOT tag5

**边界与限制：**
- index一旦分配，不可重排，否则所有TagCache失效
- 删除策略：逻辑删除或从数组中移除
- TagCache不存储对象，只存index（number）
- 与IndexCache协同：TagCache=粗筛（集合运算），IndexCache=精筛（字段匹配）

**关注状态查询服务：**
- 过滤已关注/未关注的创作者
- 过滤已关注创作者的视频

### 2. 复合查询服务

通过组合多个基础查询服务实现复杂查询：

**示例：Creator复合查询**
```typescript
interface CreatorCompositeQuery {
  keyword?: string;              // 名称关键词
  tagExpressions?: TagExpression[]; // 标签表达式
  isFollowing?: 0 | 1;           // 关注状态
  platform: Platform;            // 平台
}
```

**组合规则：**
- 查询条件的输出可作为下一个查询条件的输入
- 减少组合查询的计算量
- 不强制所有查询服务都可组合
- **只有针对相同数据的查询服务可以组合**

**可组合示例：**
- Creator查询服务：name查询 + 关注状态查询 + 标签查询 = 可组合
- 这些查询服务都针对Creator数据，因此可以组合

**不可组合示例：**
- Video标题查询服务 ≠ Creator查询服务 = 不可组合
- 这些查询服务针对不同数据，因此不能组合

**组合方式：**
- 优先级：关注状态 > 标签过滤 > 名称/标题过滤
- 每个过滤条件由独立的基础查询服务处理
- 复合服务负责协调和组合

## 查询服务特性

**独立性：**
- 每个查询服务相互独立
- 可单独使用
- 可组合使用

**可组合性：**
- 遵守统一的输入输出规范
- 支持链式调用
- 支持并行执行
- 查询条件的输出可作为下一个查询条件的输入

**复用性：**
- 相同逻辑可在不同数据类型间复用
- 如标签过滤逻辑同时支持Creator和Video
