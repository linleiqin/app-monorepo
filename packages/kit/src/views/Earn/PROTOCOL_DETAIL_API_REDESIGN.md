# 协议详情接口重构设计

## 概述

本文档设计新的 `/earn/v2/stake-protocol/detail` 接口返回格式，将 UI 元素从服务端返回数据中分离，只返回纯数据，UI 渲染逻辑由前端控制。

## 设计原则

1. **数据与 UI 分离**：服务端只返回业务数据，不包含 UI 样式、文本、图标等
2. **前端控制 UI**：所有 UI 元素的渲染、样式、文本由前端决定
3. **向后兼容**：新接口设计考虑向后兼容，逐步迁移
4. **类型安全**：使用 TypeScript 类型定义，确保数据结构清晰

---

## 当前接口问题分析

### 当前接口返回的 UI 元素

当前 `IStakeEarnDetail` 接口包含大量 UI 相关字段：

1. **文本样式**：`IEarnText`（包含 `text`, `color`, `size`）
2. **图标**：`IEarnIcon`（包含 `icon`, `color`, `size`）
3. **按钮配置**：`IEarnActionIcon`（各种按钮类型和样式）
4. **工具提示**：`IEarnTooltip`（各种 tooltip 类型）
5. **标签**：`IStakeBadgeTag`（badge 类型和文本）
6. **对话框内容**：`IEarnRiskNoticeDialog`（风险提示对话框内容）

### 问题

- 服务端需要维护大量 UI 相关的配置
- 前端无法灵活控制 UI 样式和布局
- 多端适配困难（Web、Mobile、Desktop 可能需要不同的 UI）
- 国际化处理复杂（文本在服务端）
- 接口响应体积大（包含大量 UI 配置）

---

## 新接口设计

### 核心数据结构

```typescript
// 新的协议详情响应结构
export interface IProtocolDetailV3 {
  // 基础信息
  protocol: IProtocolBasicInfo;

  // 账户相关数据
  account: IAccountData;

  // 数值数据
  metrics: IProtocolMetrics;

  // 可操作项（纯数据，不包含 UI）
  capabilities: IProtocolCapabilities;

  // 配置信息
  config: IProtocolConfig;

  // 元数据
  metadata: IProtocolMetadata;
}
```

### 1. 基础信息（IProtocolBasicInfo）

```typescript
export interface IProtocolBasicInfo {
  // 协议标识
  provider: string; // 协议名称（小写，如 'lido'）
  networkId: string; // 网络 ID（如 'evm--1'）
  symbol: string; // 代币符号（如 'ETH'）
  vault?: string; // Vault 地址（Morpho、Momentum 需要）

  // 协议基本信息
  name: string; // 协议显示名称（如 'Lido'）
  logoURI: string; // 协议 Logo URL
  website?: string; // 协议官网

  // 代币信息
  token: {
    address: string; // 代币合约地址（原生代币为空字符串）
    symbol: string; // 代币符号
    name: string; // 代币名称
    decimals: number; // 小数位数
    logoURI: string; // 代币 Logo URL
    isNative: boolean; // 是否原生代币
    price: string; // 代币价格（USD）
  };

  // 授权信息（如果需要）
  approve?: {
    approveType: 'permit' | 'legacy'; // 授权类型
    approveTarget: string; // 授权目标地址
  };
}
```

**说明**：

- 移除了所有 `IEarnText`、`IEarnIcon` 等 UI 元素
- 只保留纯数据字段
- 前端根据 `provider`、`symbol` 等字段决定如何渲染 UI

---

### 2. 账户数据（IAccountData）

```typescript
export interface IAccountData {
  // 账户地址
  accountAddress: string;

  // 余额信息
  balance: string; // 账户余额（原始值，wei 或其他单位）
  balanceFormatted?: string; // 格式化后的余额（可选，前端也可以自己格式化）

  // 质押相关余额
  staked: {
    active: string; // 活跃质押余额
    overflow?: string; // 溢出余额（某些协议）
    pending?: string; // 待激活余额（某些协议）
  };

  // 可领取余额
  claimable: string; // 可领取奖励余额

  // 可提取余额
  withdrawable: {
    active: string; // 可提取余额
    overflow?: string; // 溢出可提取余额
    maxAmount?: string; // 最大提取金额（Morpho）
  };
}
```

**说明**：

- 移除了 `subscriptionValue` 中的 `title`、`fiatValue` 等 UI 相关字段
- 只保留数值数据，前端负责格式化和显示

---

### 3. 协议指标（IProtocolMetrics）

```typescript
export interface IProtocolMetrics {
  // APR/APY 信息
  apy: {
    netApy: string; // 净 APR（扣除费用后）
    grossApy?: string; // 总 APR（扣除费用前）
    poolFee?: string; // 池子费率
    rewardUnit?: string; // 收益单位（如 '%', 'APY'）
  };

  // 池子信息
  pool: {
    totalStaked: string; // 总质押量
    totalStakedFiatValue?: string; // 总质押量（法币价值）
    remainingCap?: string; // 剩余容量
    liquidity?: string; // 流动性（Morpho）
  };

  // 限制信息
  limits: {
    minStakeAmount?: string; // 最小质押金额
    maxStakeAmount?: string; // 最大质押金额
    minUnstakeAmount?: string; // 最小提取金额
    maxUnstakeAmount?: string; // 最大提取金额
    minTransactionFee?: string; // 最小交易手续费
    minClaimableAmount?: string; // 最小可领取金额
  };

  // 时间信息
  time: {
    stakingTime?: number; // 质押时间（秒）
    unstakingTime?: number; // 提取时间（秒）
    unbondingTime?: number; // 解绑时间（秒）
    minStakeTerm?: number; // 最小质押期限（秒，Babylon）
    maxStakeTerm?: number; // 最大质押期限（秒，Babylon）
  };
}
```

**说明**：

- 移除了所有 `IEarnText`、`IEarnIcon`、`IEarnActionIcon` 等 UI 元素
- 只保留数值和配置数据
- 前端根据数据决定如何显示和格式化

---

### 4. 可操作项（IProtocolCapabilities）

```typescript
export interface IProtocolCapabilities {
  // 支持的操作类型
  supportedActions: {
    stake: boolean; // 是否支持质押
    unstake: boolean; // 是否支持提取
    claim: boolean; // 是否支持领取
    history?: boolean; // 是否支持查看历史
    portfolio?: boolean; // 是否支持查看投资组合
  };

  // 操作状态（基于业务逻辑判断）
  actionStates: {
    stake: {
      enabled: boolean; // 是否可用（基于余额、容量等）
      reason?: string; // 不可用的原因（可选，用于调试）
    };
    unstake: {
      enabled: boolean; // 是否可用（基于质押余额）
      reason?: string;
    };
    claim: {
      enabled: boolean; // 是否可用（基于可领取余额）
      reason?: string;
    };
  };

  // 特殊配置
  features: {
    requiresApproval?: boolean; // 是否需要授权
    requiresPermit?: boolean; // 是否需要 Permit 签名
    requiresVault?: boolean; // 是否需要 Vault
    supportsPartialClaim?: boolean; // 是否支持部分领取
    supportsPartialUnstake?: boolean; // 是否支持部分提取
    requiresOrderSelection?: boolean; // 是否需要选择订单（Babylon）
    requiresSignMessage?: boolean; // 是否需要签名消息（Lido unstake）
  };
}
```

**说明**：

- 移除了 `actions` 数组中的 `IEarnText`、`IEarnIcon`、`disabled` 等 UI 相关字段
- 只返回操作是否支持、是否可用等业务状态
- 前端根据 `supportedActions` 和 `actionStates` 决定显示哪些按钮

---

### 5. 配置信息（IProtocolConfig）

```typescript
export interface IProtocolConfig {
  // 协议类型
  type?: 'native' | 'liquid' | 'lending';

  // 特殊配置
  staking: {
    enabled: boolean; // 是否启用
    withdrawSignOnly?: boolean; // 是否只需要签名（Babylon）
    usePublicKey?: boolean; // 是否需要 publicKey（BTC）
    claimWithAmount?: boolean; // 是否支持按金额领取（Lido）
    unstakeWithSignMessage?: boolean; // 提取是否需要签名（Lido）
  };

  // 奖励信息
  rewards?: {
    tokens: Array<{
      address: string; // 奖励代币地址
      symbol: string; // 奖励代币符号
      name: string; // 奖励代币名称
      logoURI: string; // 奖励代币 Logo
      decimals: number; // 小数位数
      price: string; // 价格
      amount: string; // 奖励数量
    }>;
  };

  // 风险提示配置（只返回数据，不包含 UI）
  riskNotice?: {
    deposit?: {
      title: string; // 标题（纯文本，前端负责国际化）
      description: string; // 描述
      checkboxes: string[]; // 复选框文本列表
    };
    withdraw?: {
      title: string;
      description: string;
      checkboxes: string[];
    };
  };
}
```

**说明**：

- 移除了 `riskNoticeDialog` 中的 `IEarnText`、`IEarnIcon` 等 UI 元素
- 只返回文本内容（字符串），前端负责国际化和样式

---

### 6. 元数据（IProtocolMetadata）

```typescript
export interface IProtocolMetadata {
  // FAQ 数据（只返回问题和答案，不包含 UI）
  faqs?: Array<{
    question: string; // 问题（纯文本）
    answer: string; // 答案（纯文本）
  }>;

  // 管理者信息
  managers?: Array<{
    name: string; // 管理者名称
    description?: string; // 描述
    logoURI: string; // Logo URL
    website?: string; // 官网
  }>;

  // 时间线信息（只返回数据）
  timeline?: {
    currentStep: number; // 当前步骤
    steps: Array<{
      title: string; // 步骤标题
      description: string; // 步骤描述
      completed: boolean; // 是否完成
    }>;
  };

  // 保护信息（只返回数据）
  protection?: Array<{
    title: string; // 标题
    description: string; // 描述
    icon?: string; // 图标名称（前端映射）
  }>;

  // 风险信息（只返回数据）
  risk?: {
    level?: 'low' | 'medium' | 'high'; // 风险等级
    items?: Array<{
      title: string; // 风险项标题
      description: string; // 风险项描述
      link?: string; // 相关链接
    }>;
  };

  // 告警信息（只返回数据）
  alerts?: Array<{
    type: 'info' | 'warning' | 'error'; // 告警类型
    message: string; // 告警消息
    key?: string; // 告警唯一标识（用于 Spotlight）
    action?: {
      type: 'link'; // 操作类型
      url: string; // 链接地址
    };
  }>;

  // 倒计时告警
  countdown?: {
    startTime: number; // 开始时间（Unix 时间戳，秒）
    endTime: number; // 结束时间（Unix 时间戳，秒）
    message: string; // 倒计时消息
  };
}
```

**说明**：

- 移除了所有 `IEarnText`、`IEarnIcon`、`IEarnActionIcon`、`IEarnTooltip` 等 UI 元素
- 只返回纯文本和数值数据
- 前端根据 `type`、`level` 等字段决定如何渲染 UI

---

## 完整数据结构定义

### 完整类型定义

```typescript
// 新的协议详情响应结构（V3）
export interface IProtocolDetailV3 {
  // 基础信息
  protocol: IProtocolBasicInfo;

  // 账户相关数据
  account: IAccountData;

  // 数值数据
  metrics: IProtocolMetrics;

  // 可操作项（纯数据，不包含 UI）
  capabilities: IProtocolCapabilities;

  // 配置信息
  config: IProtocolConfig;

  // 元数据
  metadata: IProtocolMetadata;
}

// 所有子类型定义见上文
```

### 示例响应数据（Lido ETH）

```typescript
// GET /earn/v3/stake-protocol/detail
// 请求参数：{ accountAddress, networkId: 'evm--1', symbol: 'ETH', provider: 'lido' }

{
  protocol: {
    provider: 'lido',
    networkId: 'evm--1',
    symbol: 'ETH',
    name: 'Lido',
    logoURI: 'https://...',
    website: 'https://lido.fi',
    token: {
      address: '',
      symbol: 'ETH',
      name: 'Ethereum',
      decimals: 18,
      logoURI: 'https://...',
      isNative: true,
      price: '2500.50',
    },
    // Lido ETH 不需要授权
  },

  account: {
    accountAddress: '0x1234...',
    balance: '1000000000000000000', // 1 ETH in wei
    staked: {
      active: '500000000000000000', // 0.5 ETH
      overflow: '0',
    },
    claimable: '10000000000000000', // 0.01 ETH
    withdrawable: {
      active: '500000000000000000', // 0.5 ETH
    },
  },

  metrics: {
    apy: {
      netApy: '3.5',
      poolFee: '10',
      rewardUnit: '%',
    },
    pool: {
      totalStaked: '1000000000000000000000000',
      remainingCap: '0',
    },
    limits: {
      minStakeAmount: '0.001',
      minTransactionFee: '0.0001',
    },
    time: {
      unstakingTime: 86400, // 1 day
    },
  },

  capabilities: {
    supportedActions: {
      stake: true,
      unstake: true,
      claim: true,
      history: true,
    },
    actionStates: {
      stake: {
        enabled: true,
      },
      unstake: {
        enabled: true,
      },
      claim: {
        enabled: true,
      },
    },
    features: {
      requiresApproval: false,
      requiresPermit: false,
      requiresVault: false,
      supportsPartialClaim: true,
      supportsPartialUnstake: true,
      requiresSignMessage: true, // Lido unstake 需要签名
    },
  },

  config: {
    type: 'liquid',
    staking: {
      enabled: true,
      claimWithAmount: true,
      unstakeWithSignMessage: true,
    },
    rewards: {
      tokens: [
        {
          address: '0x...', // stETH
          symbol: 'stETH',
          name: 'Staked ETH',
          logoURI: 'https://...',
          decimals: 18,
          price: '2500.50',
          amount: '0.01',
        },
      ],
    },
  },

  metadata: {
    faqs: [
      {
        question: 'What is Lido?',
        answer: 'Lido is a liquid staking protocol...',
      },
    ],
    alerts: [
      {
        type: 'info',
        message: 'Staking rewards are distributed daily',
      },
    ],
  },
}
```

---

## 数据映射对比

### 旧接口 → 新接口字段映射

| 旧接口字段                        | 新接口字段                                                    | 说明              |
| --------------------------------- | ------------------------------------------------------------- | ----------------- |
| `protocol.provider`               | `protocol.provider`                                           | 直接映射          |
| `protocol.providerDetail.name`    | `protocol.name`                                               | 简化结构          |
| `protocol.providerDetail.logoURI` | `protocol.logoURI`                                            | 简化结构          |
| `subscriptionValue.token.info`    | `protocol.token`                                              | 简化结构          |
| `subscriptionValue.balance`       | `account.balance`                                             | 移到 account      |
| `nums.active`                     | `account.staked.active`                                       | 更清晰的命名      |
| `nums.overflow`                   | `account.staked.overflow`                                     | 更清晰的命名      |
| `nums.claimable`                  | `account.claimable`                                           | 移到 account      |
| `actions[]`                       | `capabilities.supportedActions` + `capabilities.actionStates` | 分离 UI 和状态    |
| `actions[].text`                  | **前端生成**                                                  | UI 元素，前端控制 |
| `actions[].disabled`              | `capabilities.actionStates[].enabled`                         | 反向逻辑          |
| `portfolios.items[]`              | `account.staked` + `account.claimable`                        | 数据驱动 UI       |
| `portfolios.items[].title`        | **前端生成**                                                  | UI 元素，前端控制 |
| `portfolios.items[].badge`        | **前端生成**                                                  | UI 元素，前端控制 |
| `faqs.items[].title`              | `metadata.faqs[].question`                                    | 简化结构          |
| `faqs.items[].description`        | `metadata.faqs[].answer`                                      | 简化结构          |
| `alertsV2[]`                      | `metadata.alerts[]`                                           | 简化结构          |
| `alertsV2[].alert`                | `metadata.alerts[].message`                                   | 简化命名          |
| `alertsV2[].badge`                | `metadata.alerts[].type`                                      | 类型映射          |
| `riskNoticeDialog`                | `config.riskNotice`                                           | 移到 config       |
| `apyDetail`                       | `metrics.apy`                                                 | 简化结构          |
| `profit`                          | `metrics.apy` + `account.staked`                              | 前端计算          |
| `provider`                        | `metrics.pool` + `protocol`                                   | 拆分数据          |
| `protection`                      | `metadata.protection`                                         | 移到 metadata     |
| `risk`                            | `metadata.risk`                                               | 移到 metadata     |
| `timeline`                        | `metadata.timeline`                                           | 移到 metadata     |
| `managers`                        | `metadata.managers`                                           | 移到 metadata     |
| `countDownAlert`                  | `metadata.countdown`                                          | 移到 metadata     |

---

## 前端 UI 渲染逻辑

### 1. 按钮渲染

**旧方式**（服务端控制）：

```typescript
// 服务端返回
actions: [{
  type: 'deposit',
  text: { text: '认购', color: '$text', size: '$bodyMd' },
  disabled: false,
}]

// 前端直接使用
<EarnActionIcon actionIcon={action} />
```

**新方式**（前端控制）：

```typescript
// 服务端返回
capabilities: {
  supportedActions: { stake: true },
  actionStates: { stake: { enabled: true } },
}

// 前端根据数据渲染
{capabilities.supportedActions.stake && (
  <Button
    disabled={!capabilities.actionStates.stake.enabled}
    onPress={handleStake}
  >
    {intl.formatMessage({ id: ETranslations.earn_stake })} {/* 国际化 */}
  </Button>
)}
```

---

### 2. 文本渲染

**旧方式**（服务端控制）：

```typescript
// 服务端返回
subscriptionValue: {
  title: { text: '认购价值', color: '$text', size: '$headingLg' },
  fiatValue: '$1,250.00',
}

// 前端直接使用
<EarnText text={subscriptionValue.title} />
```

**新方式**（前端控制）：

```typescript
// 服务端返回
account: {
  balance: '1000000000000000000',
}

// 前端计算和渲染
const fiatValue = BigNumber(account.balance)
  .multipliedBy(protocol.token.price)
  .toFixed();

<SizableText size="$headingLg">
  {intl.formatMessage({ id: ETranslations.earn_subscription_value })}
</SizableText>
<NumberSizeableText formatter="balance">
  {fiatValue}
</NumberSizeableText>
```

---

### 3. 图标渲染

**旧方式**（服务端控制）：

```typescript
// 服务端返回
protection: {
  items: [{
    icon: { icon: 'ShieldCheckmarkOutline', color: '$iconSuccess', size: '$6' },
  }],
}

// 前端直接使用
<EarnIcon icon={item.icon} />
```

**新方式**（前端控制）：

```typescript
// 服务端返回
metadata: {
  protection: [{
    icon: 'shield', // 或直接返回图标名称
  }],
}

// 前端映射和渲染
const iconMap = {
  shield: 'ShieldCheckmarkOutline',
  // ...
};

<Icon
  name={iconMap[item.icon] || 'QuestionmarkCircleOutline'}
  color="$iconSuccess"
  size="$6"
/>
```

---

### 4. 告警渲染

**旧方式**（服务端控制）：

```typescript
// 服务端返回
alertsV2: [{
  alert: 'Staking rewards are distributed daily',
  badge: 'info',
  key: 'earn_staking_rewards',
}]

// 前端直接使用
<Alert type={alert.badge} message={alert.alert} />
```

**新方式**（前端控制）：

```typescript
// 服务端返回
metadata: {
  alerts: [{
    type: 'info',
    message: 'Staking rewards are distributed daily',
    key: 'earn_staking_rewards',
  }],
}

// 前端根据类型渲染
{metadata.alerts?.map(alert => (
  <Alert
    type={alert.type === 'info' ? 'info' : alert.type === 'warning' ? 'warning' : 'destructive'}
    title={intl.formatMessage({ id: ETranslations.earn_alert_title })}
    description={alert.message}
  />
))}
```

---

### 5. 投资组合渲染

**旧方式**（服务端控制）：

```typescript
// 服务端返回
portfolios: {
  items: [{
    title: { text: '活跃质押', color: '$text', size: '$bodyMd' },
    badge: { badgeType: 'success', text: { text: 'Active' } },
    token: { info: {...}, price: '2500' },
    fiatValue: '$1,250.00',
  }],
}

// 前端直接使用
<EarnPortfolioItem item={item} />
```

**新方式**（前端控制）：

```typescript
// 服务端返回
account: {
  staked: { active: '500000000000000000' },
}

// 前端计算和渲染
const activeStaked = account.staked.active;
const fiatValue = BigNumber(activeStaked)
  .multipliedBy(protocol.token.price)
  .toFixed();

<PortfolioItem
  title={intl.formatMessage({ id: ETranslations.earn_active_staking })}
  amount={activeStaked}
  tokenSymbol={protocol.token.symbol}
  fiatValue={fiatValue}
  badgeType="success"
  badgeText={intl.formatMessage({ id: ETranslations.earn_status_active })}
/>
```

---

## 迁移策略

### 阶段 1：双接口并存

1. **保留旧接口**：`/earn/v2/stake-protocol/detail`（继续使用）
2. **新增新接口**：`/earn/v3/stake-protocol/detail`（新设计）
3. **前端适配层**：创建适配器，同时支持两种格式

```typescript
// 适配器示例
function adaptProtocolDetail(
  data: IStakeEarnDetail | IProtocolDetailV3,
): IProtocolDetailV3 {
  if ('protocol' in data && 'account' in data) {
    // 已经是 V3 格式
    return data;
  }

  // 从 V2 格式转换为 V3 格式
  return {
    protocol: {
      provider: data.protocol?.provider || '',
      networkId: data.protocol?.networkId || '',
      symbol: data.protocol?.symbol || '',
      vault: data.protocol?.vault,
      name: data.protocol?.providerDetail?.name || '',
      logoURI: data.protocol?.providerDetail?.logoURI || '',
      token: {
        address: data.subscriptionValue?.token?.info?.address || '',
        symbol: data.subscriptionValue?.token?.info?.symbol || '',
        name: data.subscriptionValue?.token?.info?.name || '',
        decimals: data.subscriptionValue?.token?.info?.decimals || 18,
        logoURI: data.subscriptionValue?.token?.info?.logoURI || '',
        isNative: data.subscriptionValue?.token?.info?.isNative || false,
        price: data.subscriptionValue?.token?.price || '0',
      },
      approve: data.protocol?.approve,
    },
    account: {
      accountAddress: data.protocol?.earnAccount?.accountAddress || '',
      balance: data.subscriptionValue?.balance || '0',
      staked: {
        active: data.nums?.active || '0',
        overflow: data.nums?.overflow,
      },
      claimable: data.nums?.claimable || '0',
      withdrawable: {
        active: data.nums?.active || '0',
        overflow: data.nums?.overflow,
      },
    },
    // ... 其他字段映射
  };
}
```

---

### 阶段 2：逐步迁移

1. **新功能使用 V3**：所有新开发的协议和功能使用 V3 接口
2. **旧功能逐步迁移**：按协议逐个迁移到 V3
3. **前端统一使用适配层**：所有组件通过适配层访问数据

---

### 阶段 3：完全切换

1. **所有功能迁移完成**：所有协议都支持 V3 接口
2. **废弃 V2 接口**：标记 V2 接口为 deprecated，设置废弃时间
3. **移除适配层**：移除 V2 到 V3 的适配代码，直接使用 V3 格式

---

## 优势总结

1. **数据与 UI 分离**：服务端只关注业务数据，不关心 UI 实现
2. **前端灵活性**：前端可以自由控制 UI 样式、布局、国际化
3. **多端适配**：不同平台可以使用不同的 UI 实现，共享同一数据接口
4. **接口体积减小**：移除大量 UI 配置，响应体积显著减小
5. **维护成本降低**：服务端不需要维护 UI 相关配置
6. **类型安全**：清晰的数据结构，TypeScript 类型检查更严格
7. **国际化简化**：所有文本由前端负责国际化，服务端不需要维护多语言文本

---

## 注意事项

1. **国际化**：所有文本由前端负责国际化，服务端只返回原始文本或 key
2. **格式化**：数值格式化由前端负责（如余额、价格等）
3. **计算逻辑**：一些计算逻辑（如法币价值）可以在前端完成
4. **向后兼容**：迁移期间需要同时支持新旧接口
5. **错误处理**：服务端只返回业务错误，UI 错误提示由前端决定
6. **性能考虑**：前端需要处理更多计算，但可以通过缓存和优化减少影响

---

## 实施建议

1. **先实现适配层**：确保新旧接口可以共存
2. **逐步迁移协议**：从简单的协议开始（如 Lido ETH），逐步迁移复杂协议
3. **充分测试**：每个协议的迁移都要进行充分测试
4. **文档更新**：及时更新 API 文档和前端组件文档
5. **团队沟通**：确保前后端团队都了解新的接口设计

---
