# AI生成代码规范

本文档用于约束 AI 在本项目中的代码生成与修改方式。目标不是限制开发速度，而是保证数据链路稳定、模块边界清晰、代码职责明确，并尽量减少重复实现与临时性方案扩散。

## 1. 数据访问总原则

所有业务数据的读取、写入、更新、查询、聚合，默认都应优先通过 [`src/database/implementations`](/D:/ProjectFloder/TS/bilibili_discovery/src/database/implementations) 中定义的方法完成。

禁止默认做法：
- UI、background、content、engine 直接拼装底层 IndexedDB 访问。
- UI 页面直接依赖 repository 或直接操作 store。
- 为了单页方便，在页面内部复制一套数据库读写逻辑。

推荐做法：
- 先查找 [`src/database/implementations`](/D:/ProjectFloder/TS/bilibili_discovery/src/database/implementations) 是否已经存在可复用的方法。
- 如果多个页面需要相同数据，优先在 implementations 中做统一聚合。
- 上层模块只消费“可直接使用”的实现层结果，而不是自行重复转换。

## 2. 数据获取优先级

当页面或功能需要某份数据时，必须按以下优先级处理：

1. 优先复用已有实现层方法。
2. 如果已有原子数据可以聚合得到目标结果，优先新增聚合方法，不要先新增表或新增底层接口。
3. 只有在现有数据结构和聚合方式都无法满足需求时，才允许新增数据库接口、实现或存储字段。

这意味着：
- 能通过 `watch_events + videos + creators + tags` 聚合得到的结果，不应先新增一份冗余缓存。
- 能通过已有 repository 组合出来的结果，不应先在 UI 写临时查询逻辑。
- 新增接口前，必须先判断是不是“聚合缺失”，而不是“数据不存在”。

## 3. 数据类型创建原则

已有的数据接口和类型无法满足需求时，才可以创建新的数据类型。

创建新类型前必须先检查：
- [`src/database/types`](/D:/ProjectFloder/TS/bilibili_discovery/src/database/types) 中是否已有长期数据模型可复用。
- [`src/database/interfaces`](/D:/ProjectFloder/TS/bilibili_discovery/src/database/interfaces) 中的能力边界是否已经覆盖。
- [`src/database/implementations`](/D:/ProjectFloder/TS/bilibili_discovery/src/database/implementations) 的返回结果是否只需要轻量转换，而不是新增类型。

禁止因为单次页面需求随意扩展长期数据库模型。

## 4. 数据分层规范

项目中的数据分为两类，必须明确区分：

### 4.1 数据库长期固定类型

位置：
- [`src/database/types`](/D:/ProjectFloder/TS/bilibili_discovery/src/database/types)

职责：
- 描述长期稳定、可持久化、跨模块共享的数据结构。
- 服务于数据库存储、仓库接口、实现层聚合和全局业务逻辑。

特点：
- 结构稳定。
- 字段命名要能长期维护。
- 不为某个单一页面的临时展示而设计。

### 4.2 UI界面临时渲染类型

常见位置：
- 各页面目录下的 `types`、局部 `interface`、渲染函数参数类型

职责：
- 为某个页面、某块面板、某个交互流程提供便利。
- 可以是聚合后结果、格式化后结果、视图模型。

特点：
- 不直接承担长期存储职责。
- 可以为了渲染方便存在。
- 不应反向污染数据库长期类型。

规范要求：
- 数据库长期类型负责稳定。
- UI 临时类型负责便利。
- 不能把“页面方便”直接塞进数据库长期模型里。

## 5. 写入与查询规范

关于数据的所有写入、获取、查询、更新、删除、统计，均优先通过数据库方法完成。

具体要求：
- 所有写入优先走 implementations。
- implementations 内部再决定是否调用 repository、是否需要聚合、是否需要缓存兼容。
- 上层模块不直接操作 `DBUtils`，除非该模块本身就在数据库层。
- 新增功能时，不要在 background、content、ui 中直接复制数据库读写代码。

推荐链路：
- `content/background/ui/engine -> database/implementations -> repository/interface -> IndexedDB`

不推荐链路：
- `ui -> DBUtils`
- `background -> IndexedDB store`
- `page module -> repository.impl 直连`

## 6. 新功能设计与实现原则

所有新功能的设计与实现必须优先考虑解耦和抽象，确保代码具有可复用性和可扩展性。

### 6.1 解耦优先原则

**设计优先级：**
1. **通用能力抽象**：优先识别功能中的通用能力，将其抽象为独立模块
2. **接口隔离**：通过接口定义能力边界，降低模块间耦合
3. **依赖注入**：通过构造函数或参数传递依赖，而非硬编码
4. **特定需求封装**：将特定需求封装在独立的适配器或装饰器中

**示例说明：**

错误做法：
```typescript
// 直接在兴趣计算器中硬编码数据源
async calculateInterestScore(tagId: string) {
  const watchEvents = await this.watchEventRepo.getAllWatchEvents();
  // ...
}
```

正确做法：
```typescript
// 定义数据源接口
interface IEventDataSource {
  getWatchEvents(tagId: string, timeRange?: TimeRange): Promise<WatchEvent[]>;
  getInteractionEvents(tagId: string, timeRange?: TimeRange): Promise<InteractionEvent[]>;
}

// 兴趣计算器依赖抽象接口
class InterestCalculator {
  constructor(
    private dataSource: IEventDataSource,
    private config: InterestCalculatorConfig
  ) {}
  
  async calculateInterestScore(tagId: string): Promise<InterestScore> {
    const watchEvents = await this.dataSource.getWatchEvents(tagId);
    // ...
  }
}

// 实现具体数据源
class DatabaseEventDataSource implements IEventDataSource {
  constructor(
    private watchEventRepo: WatchEventRepository,
    private interactionEventRepo: InteractionEventRepository
  ) {}
  
  async getWatchEvents(tagId: string): Promise<WatchEvent[]> {
    return this.watchEventRepo.getWatchEventsByTag(tagId);
  }
}
```

### 6.2 抽象层次设计

**抽象层次：**
1. **核心算法层**：纯函数，无副作用，可独立测试
2. **业务逻辑层**：编排核心算法，处理业务规则
3. **数据访问层**：封装数据存储操作
4. **适配器层**：连接不同数据源或外部系统

**设计要求：**
- 每层只关注自己的职责，不越界
- 上层依赖下层抽象，而非具体实现
- 通过接口定义层间契约

### 6.3 可复用性设计

**识别可复用能力：**
1. **数据转换**：格式化、过滤、映射等通用操作
2. **计算逻辑**：数学计算、统计分析、趋势分析等
3. **业务规则**：验证、评分、排序等通用规则
4. **状态管理**：缓存、队列、批处理等通用模式

**实现方式：**
```typescript
// 通用工具模块
export class DataUtils {
  static calculateMovingAverage(values: number[], window: number): number[] {
    // 通用移动平均计算
  }
  
  static applyDecay(values: number[], rate: number, time: number): number[] {
    // 通用衰减计算
  }
}

// 特定需求调用通用工具
class InterestCalculator {
  calculateTrend(history: InterestHistory[]): TrendType {
    const scores = history.map(h => h.score);
    const smoothed = DataUtils.calculateMovingAverage(scores, 7);
    const changeRate = DataUtils.calculateChangeRate(smoothed);
    return this.determineTrend(changeRate);
  }
}
```

### 6.4 配置驱动设计

**配置优先原则：**
1. 将可变参数提取为配置对象
2. 提供默认配置，支持自定义覆盖
3. 配置应可序列化，便于持久化

**示例：**
```typescript
interface CalculatorConfig {
  windowSize: number;
  decayRate: number;
  weights: {
    shortTerm: number;
    longTerm: number;
  };
}

const DEFAULT_CONFIG: CalculatorConfig = {
  windowSize: 7,
  decayRate: 0.1,
  weights: { shortTerm: 0.6, longTerm: 0.4 }
};

class Calculator {
  constructor(private config: Partial<CalculatorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }
}
```

### 6.5 插件化扩展

**扩展点设计：**
1. 定义清晰的扩展接口
2. 提供默认实现
3. 支持运行时注册和替换

**示例：**
```typescript
interface ICalculationStrategy {
  calculate(events: Event[]): number;
}

class InterestCalculator {
  private strategies: Map<string, ICalculationStrategy> = new Map();
  
  registerStrategy(name: string, strategy: ICalculationStrategy) {
    this.strategies.set(name, strategy);
  }
  
  calculate(tagId: string, strategyName: string): number {
    const strategy = this.strategies.get(strategyName);
    if (!strategy) throw new Error(`Strategy not found: ${strategyName}`);
    return strategy.calculate(events);
  }
}
```

### 6.6 实现检查清单

在实现新功能前，必须确认：
- [ ] 是否已识别出可复用的通用能力？
- [ ] 是否已定义清晰的接口抽象？
- [ ] 是否已将特定需求与通用逻辑分离？
- [ ] 是否已将可变参数提取为配置？
- [ ] 是否考虑了未来的扩展点？
- [ ] 是否避免了硬编码依赖？
- [ ] 是否便于单元测试？

## 7. 功能实现优先级

所有功能实现都要优先考虑现有代码是否已经能够完成目标，只有现有代码无法满足需求时，才编写新的内容。

执行顺序建议：
1. 查找当前目录和相关模块是否已有类似逻辑。
2. 判断是否可以复用现有函数、类型、聚合结果或组件。
3. 如果只差一点点能力，优先在原有实现上补齐。
4. 只有在原有设计明显不适合时，才新增模块或新接口。

禁止：
- 同样的逻辑在多个页面各写一遍。
- 因为“更快”就绕过现有实现层。
- 不检查现有代码就直接新建文件和新建体系。

## 8. 模块职责与文件拆分规范

所有模块尽可能按功能分类，不在单个代码文件中实现过多功能。

要求：
- 一个文件只负责一类核心职责。
- 页面入口、渲染、搜索、状态管理、数据聚合、样式辅助尽量拆开。
- background 中不同业务按模块拆分。
- database 中类型、接口、实现、测试、底层访问严格分层。

不推荐：
- 一个文件同时处理数据获取、业务逻辑、DOM 渲染、事件绑定、样式拼接。
- 一个模块同时承担“采集 + 聚合 + 渲染 + 持久化”全部职责。

推荐方向：
- 入口文件只负责初始化和串联。
- 数据逻辑放实现层。
- 页面渲染逻辑放 UI 子模块。
- 通用工具放工具模块。

## 9. README 约束

每个文件夹下存在的 `README.md` 都用于说明该目录的功能与职责范围，所有代码都必须遵守对应 README 的边界说明。

规范要求：
- 开发前先阅读目标目录下的 `README.md`。
- 新增代码时，必须符合当前目录的职责说明。
- 如果功能变化导致目录职责发生变化，必须同步更新该目录下的 `README.md`。
- 如果新增了新的子模块、子目录、长期职责，也要补充 README 说明。

这意味着：
- `README.md` 不是可选文档，而是目录级约束的一部分。
- 代码结构发生变化但 README 不更新，视为实现不完整。

## 10. 实际执行准则

AI 在编写代码时，应默认遵守以下顺序：

1. 先读目标目录 `README.md`。
2. 先查 `src/database/implementations` 是否已有现成方法。
3. 如果没有现成方法，先判断能否通过已有数据聚合得到。
4. 如果聚合仍然不够，再考虑新增实现层方法。
5. 如果实现层仍然缺底层能力，再新增 interface 或 repository 实现。
6. 如果长期模型确实不足，再新增数据库类型。
7. 如果目录职责被扩展，最后更新对应 `README.md`。

## 11. 目标

本规范最终服务于以下目标：
- 减少重复代码。
- 保持数据链路统一。
- 避免 UI 直接侵入数据库层。
- 避免为临时需求污染长期数据模型。
- 保持目录职责清晰。
- 保证后续维护时能快速判断“数据应该从哪里来、应该写到哪里去、应该在哪一层聚合”。

如无特殊说明，AI 生成的所有代码都应默认遵守本文档。

特殊规则:如果尝试修改替换的时候匹配文本失败,则将需要替换的内容和目标位置输出.让我手动进行替换.
