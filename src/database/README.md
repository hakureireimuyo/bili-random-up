# Database 模块说明

## 概述

本模块负责管理 Bilibili Discovery 系统的所有数据存储和访问，基于 IndexedDB 实现。模块设计遵循以下原则：

1. **数据结构独立** - 每个数据结构单独一个文件
2. **接口规范分离** - 数据结构定义和接口实现分开存储
3. **职责明确** - 每个接口都有清晰的职责和能力边界
4. **可扩展性** - 支持未来功能扩展

## 目录结构

```
database/
├── types/              # 数据结构定义
│   ├── base.ts        # 基础类型定义
│   ├── creator.ts     # 创作者数据结构
│   ├── video.ts       # 视频数据结构
│   ├── behavior.ts    # 行为数据结构
│   ├── semantic.ts    # 语义数据结构
│   ├── note.ts        # 笔记数据结构
│   ├── collection.ts  # 收藏数据结构
│   ├── analytics.ts   # 分析数据结构
│   └── index.ts       # 类型统一导出
├── interfaces/         # 接口规范定义
│   ├── creator/       # 创作者接口
│   ├── video/         # 视频接口
│   ├── behavior/      # 行为接口
│   ├── semantic/      # 语义接口
│   ├── note/          # 笔记接口
│   ├── collection/    # 收藏接口
│   ├── analytics/     # 分析接口
│   └── index.ts       # 接口统一导出
├── implementations/    # 接口实现
│   ├── tag-repository.impl.ts
│   ├── category-repository.impl.ts
│   ├── creator-repository.impl.ts
│   ├── video-repository.impl.ts
│   ├── collection-repository.impl.ts
│   ├── collection-item-repository.impl.ts
│   ├── interest-score-repository.impl.ts
│   ├── watch-event-repository.impl.ts
│   ├── interaction-event-repository.impl.ts
│   ├── search-event-repository.impl.ts
│   ├── video-note-repository.impl.ts
│   ├── note-segment-repository.impl.ts
│   ├── knowledge-entry-repository.impl.ts
│   └── index.ts       # 实现统一导出
├── indexeddb/         # IndexedDB 基础设施
│   ├── config.ts       # 数据库配置
│   ├── db-manager.ts   # 数据库管理器
│   ├── db-utils.ts     # 数据库工具类
│   ├── USAGE.md       # 使用说明
│   └── index.ts       # 统一导出
└── README.md          # 本文件
```

## 数据层级

系统数据分为四个层级：

### 1. Content Layer（内容层）
- Creator（UP主/Channel）
- Video（视频基础信息）

### 2. Behavior Layer（行为数据层）
- WatchEvent（观看事件）
- InteractionEvent（互动行为）
- SearchEvent（搜索行为）

### 3. Semantic Layer（语义层）
- Tag（标签）
- TagAlias（标签映射）
- TagEmbedding（标签向量）
- Category（标签分区）

### 4. Notes Layer（笔记层）
- VideoNote（视频笔记）
- NoteSegment（笔记分段）
- NoteRelation（笔记关联）
- KnowledgeEntry（知识条目）

### 5. Collection Layer（收藏层）
- Collection（收藏夹）
- CollectionItem（收藏项）

### 6. Analytics Layer（分析层）
- InterestScore（兴趣分数）
- InterestNode（兴趣节点）
- InterestHistory（兴趣历史）
- CreatorRank（创作者排名）
- WatchTimeStats（观看时间统计）
- WatchTimeDistribution（观看时间分布）
- UserInterestProfile（用户兴趣画像）


## 设计原则

1. **单一职责** - 每个接口只负责一类数据的操作
2. **明确边界** - 每个方法都有清晰的能力边界
3. **可测试性** - 接口设计便于单元测试
4. **可扩展性** - 支持未来功能扩展
5. **类型安全** - 完整的 TypeScript 类型定义

## 注意事项

1. 所有时间戳使用毫秒级时间戳
2. 所有 ID 为字符串类型
3. 批量操作有数量限制（通常为1000条）
4. 涉及分页的操作使用 PaginationParams
5. 时间范围查询使用 TimeRange
6. 平台类型使用 Platform 类型

## 未来扩展

该数据结构设计支持以下未来功能：

- 多平台支持（B站/YouTube）
- AI 语义搜索
- 兴趣分析
- 标签合并
- 视频推荐
- 知识库管理
- LLM 对话
- 用户行为分析
- 兴趣星球可视化
