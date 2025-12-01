# Earn 模块业务逻辑文档

## 目录

- [概述](#概述)
- [模块架构](#模块架构)
- [核心业务流程](#核心业务流程)
- [主要功能模块](#主要功能模块)
- [状态管理](#状态管理)
- [交互流程](#交互流程)
- [数据流转](#数据流转)

## 概述

Earn 模块是 OneKey 钱包中的质押收益模块，允许用户将资产质押到各种 DeFi 协议中获得收益。该模块支持多种协议（Lido、Everstake、Babylon、Morpho、Falcon、Ethena、Momentum），覆盖 ETH、USDC、BTC 等多种资产。

### 主要功能

- **首页展示**：展示总质押价值、24 小时收益、推荐资产、可质押资产列表
- **协议详情**：查看具体协议的详细信息、APR、质押额度等
- **质押操作**：执行质押、提取、领取奖励等操作
- **投资详情**：查看用户的投资历史和持仓详情

## 模块架构

### 路由结构

```
Tab Routes
  └── Earn (ETabRoutes.Earn)
      └── EarnHome (ETabEarnRoutes.EarnHome)

Modal Routes
  └── StakingModal (EModalRoutes.StakingModal)
      ├── ProtocolDetails (EModalStakingRoutes.ProtocolDetails) - ❌ 已弃用，仅兼容保留
      ├── ProtocolDetailsV2 (EModalStakingRoutes.ProtocolDetailsV2) - ✅ 主要使用
      ├── ProtocolDetailsV2Share (EModalStakingRoutes.ProtocolDetailsV2Share) - ✅ 分享链接
      ├── Stake (EModalStakingRoutes.Stake)
      ├── Withdraw (EModalStakingRoutes.Withdraw)
      ├── Claim (EModalStakingRoutes.Claim)
      ├── InvestmentDetails (EModalStakingRoutes.InvestmentDetails)
      └── ...
```

### 目录结构

```
packages/kit/src/views/Earn/
├── EarnHome.tsx                    # 主页面组件
├── EarnProviderMirror.tsx          # Provider 包装器
├── EarnProvider.tsx                # Context Provider
├── EarnConfig.ts                   # 配置常量
├── earnUtils.ts                    # 工具函数
└── components/
    ├── AvailableAssetsTabViewList.tsx    # 可质押资产列表
    ├── showProtocolListDialog.tsx       # 协议选择对话框
    ├── FAQPanel.tsx                     # FAQ 面板
    ├── AprText.tsx                      # APR 文本组件
    └── RiskNoticeDialog.tsx             # 风险提示对话框

packages/kit/src/views/Staking/
├── pages/
│   ├── ProtocolDetails/           # 协议详情页（V1 - 遗留页面）
│   ├── ProtocolDetailsV2/         # 协议详情页（V2 - 主要使用）
│   ├── Stake/                      # 质押页面
│   ├── Withdraw/                   # 提取页面
│   ├── Claim/                      # 领取页面
│   ├── InvestmentDetails/          # 投资详情页
│   └── ...
├── components/
│   ├── UniversalStake/            # 通用质押组件
│   ├── UniversalWithdraw/         # 通用提取组件
│   ├── UniversalClaim/            # 通用领取组件
│   └── ...
└── hooks/
    └── useUniversalHooks.ts        # 通用操作钩子

packages/kit-bg/src/services/
└── ServiceStaking.ts               # 质押服务（API调用层）

packages/shared/types/
├── staking.ts                      # 质押相关类型定义
└── earn.ts                         # Earn 模块类型定义
```

## 核心业务流程

### 1. 首页加载流程

```
用户进入 Earn Tab
    ↓
EarnHome 组件加载
    ↓
并行加载：
  ├─ 账户概览数据 (fetchAccountOverview)
  ├─ Banner 数据 (fetchEarnHomePageData)
  ├─ FAQ 列表 (getFAQListForHome)
  └─ 推荐资产 (getAvailableAssets - Recommend)
    ↓
根据 Tab 选择加载对应资产列表
  ├─ All (全部)
  ├─ StableCoins (稳定币)
  └─ NativeTokens (原生代币)
```

**关键点：**

- 使用 `usePromiseResult` 处理异步数据加载
- 数据按类型分类存储到 Jotai Atom
- 支持下拉刷新和自动轮询（3 分钟间隔）
- Tab 切换时按需加载，避免不必要请求

### 2. 质押流程

```
用户点击资产卡片
    ↓
判断协议数量
    ├─ 单个协议 → 直接跳转协议详情
    └─ 多个协议 → 显示协议选择对话框
        ↓
进入协议详情页（默认使用 ProtocolDetailsV2）
    ↓
用户点击 Stake 按钮
    ↓
判断是否需要授权
    ├─ 需要授权 → 进入授权流程
    │   ├─ Permit 授权（permit2）
    │   └─ Legacy 授权（传统 approve）
    └─ 无需授权 → 直接进入质押页面
        ↓
进入 Stake 页面
    ├─ 金额输入验证 (checkAmount)
    ├─ 费用估算 (estimateFee)
    └─ 交易构建 (buildStakeTransaction)
        ↓
签名并广播交易
    ↓
添加本地订单记录
    ↓
轮询确认交易状态
```

**关键点：**

- 支持多种授权方式（Permit、Legacy）
- 金额检查包含风险提示和警告
- 支持硬件钱包和软件钱包
- 订单状态实时同步到服务器

### 3. 提取流程

```
用户在协议详情页点击 Unstake/Withdraw
    ↓
判断提取类型
    ├─ 普通提取 (buildUnstakeTransaction)
    └─ 推送提取 (unstakePush)
        ↓
进入 Withdraw 页面
    ├─ 金额输入验证
    ├─ 费用估算
    └─ 交易构建
        ↓
签名并广播交易
    ↓
更新订单状态
```

### 4. 领取奖励流程

```
用户点击 Claim 按钮
    ↓
判断领取类型
    ├─ 普通领取 (buildClaimTransaction)
    ├─ 订单领取 (ClaimOrder)
    └─ Babylon 特殊流程 (babylonClaimRecord)
        ↓
进入 Claim 页面或 ClaimOptions 页面
    ├─ 金额确认
    ├─ 费用估算
    └─ 交易构建
        ↓
签名并广播交易
```

## 主要功能模块

### 1. EarnHome 主页

**组件结构：**

```typescript
EarnHome
├── TabPageHeader          # 页面头部（账户选择器）
└── Page.Body
    ├── Overview           # 概览卡片
    │   ├── 总质押价值
    │   ├── 24小时收益
    │   └── 详情按钮（跳转 InvestmentDetails）
    ├── Banner             # 轮播横幅
    ├── Recommended        # 推荐资产卡片
    ├── AvailableAssetsTabViewList  # 资产列表（Tab切换）
    └── FAQPanel           # FAQ 面板（桌面端右侧）
```

**数据加载策略：**

- **概述数据**：使用 `fetchAccountOverview` 聚合所有网络的账户数据
- **推荐资产**：缓存 5 分钟，限流 2 秒
- **资产列表**：按 Tab 类型分别加载（All、StableCoins、NativeTokens）
- **轮询机制**：概览数据每 3 分钟自动刷新

**交互特性：**

- 移动端和桌面端布局适配
- 下拉刷新支持
- Tab 切换时按需加载数据
- Banner 点击支持深度链接跳转到协议详情

### 2. 协议详情页

**页面版本：**

系统中有两个协议详情页版本：

- **ProtocolDetailsV2**（✅ 主要使用）- 使用 V2 API，新的 UI 设计
- **ProtocolDetails**（❌ 已弃用，仅兼容保留）- 使用 V1 API，代码中无任何主动调用

**进入控制逻辑：**

所有新功能入口都使用 `ProtocolDetailsV2`，具体控制如下：

**1. 使用 ProtocolDetailsV2 的场景（✅ 主要使用）：**

- **Earn 首页点击资产卡片**
  - 代码：`packages/kit/src/views/Earn/EarnHome.tsx` → `toTokenProviderListPage`
  - 路由：`EModalStakingRoutes.ProtocolDetailsV2`
- **首页点击代币的 Earn 按钮**
  - 代码：`packages/kit/src/views/Home/components/WalletActions/WalletActionEarn.tsx`
  - 路由：`EModalStakingRoutes.ProtocolDetailsV2`
- **协议选择对话框选择协议**
  - 代码：`packages/kit/src/views/Earn/components/showProtocolListDialog.tsx`
  - 路由：`EModalStakingRoutes.ProtocolDetailsV2`
- **资产协议列表页面选择协议**
  - 代码：`packages/kit/src/views/Staking/pages/AssetProtocolList/index.tsx`
  - 路由：`EModalStakingRoutes.ProtocolDetailsV2`
- **投资详情页点击投资项**
  - 代码：`packages/kit/src/views/Staking/pages/InvestmentDetails/index.tsx`
  - 路由：`EModalStakingRoutes.ProtocolDetailsV2`
- **分享链接（新格式）**
  - 代码：`packages/kit/src/views/Earn/earnUtils.ts` → `pushDetailPageFromShareLink`
  - 路由：`EModalStakingRoutes.ProtocolDetailsV2Share`
  - URL 格式：`/defi/:network/:symbol/:provider`（如 `/defi/ethereum/eth/lido`）

**2. ProtocolDetails（❌ 已弃用，仅兼容保留）：**

- **状态：** 代码中无任何主动调用，仅保留用于兼容可能存在的旧格式 URL
- **旧格式 URL 深度链接**（仅理论支持，实际无代码生成此链接）
  - 路由：`EModalStakingRoutes.ProtocolDetails`
  - URL 格式：`/defi/staking/:symbol/:provider`（如 `/defi/staking/eth/lido`）
  - ⚠️ 注意：此页面存在路由类型定义错误（代码中使用了 `ProtocolDetailsV2` 类型）
  - API：使用 `getProtocolDetails`（V1 API，`isV2` 默认为 `false`）
  - **对应的 V1 API (`/earn/v1/stake-protocol/detail`，当 `isV2: false` 时) 也仅在访问此页面时调用**

**路由配置：**

```typescript
// packages/kit/src/views/Staking/router/index.tsx

{
  name: EModalStakingRoutes.ProtocolDetails,        // 遗留页面
  rewrite: '/defi/staking/:symbol/:provider',
}

{
  name: EModalStakingRoutes.ProtocolDetailsV2,      // 主要使用
  rewrite: '/defi/staking/v2/:symbol/:provider',
}

{
  name: EModalStakingRoutes.ProtocolDetailsV2Share, // 分享链接
  rewrite: '/defi/:network/:symbol/:provider',
}
```

**版本对比：**

| 特性         | ProtocolDetails                   | ProtocolDetailsV2                                                          |
| ------------ | --------------------------------- | -------------------------------------------------------------------------- |
| **API 版本** | V1 (`getProtocolDetails`)         | V2 (`getProtocolDetailsV2`)                                                |
| **UI 设计**  | 旧版本                            | 新版本（V2）                                                               |
| **路由名称** | `ProtocolDetails`                 | `ProtocolDetailsV2`                                                        |
| **URL 格式** | `/defi/staking/:symbol/:provider` | `/defi/staking/v2/:symbol/:provider` 或 `/defi/:network/:symbol/:provider` |
| **使用状态** | ❌ 已弃用，代码中无主动调用       | ✅ 主要使用                                                                |
| **推荐**     | ❌ 已弃用，不推荐使用             | ✅ 推荐使用                                                                |

**主要信息展示：**

- **协议信息**：Logo、名称、网站、总质押量
- **APR 信息**：年化收益率、池子费率
- **质押限制**：最小/最大质押额度、质押期限（Babylon）
- **用户持仓**：已质押数量、收益、可领取奖励
- **风险提示**：协议风险说明、告警信息

**操作入口：**

- **Stake**：质押入口
- **Unstake/Withdraw**：提取入口
- **Claim**：领取奖励入口
- **Share**：分享协议链接

**数据加载：**

**ProtocolDetailsV2（推荐）：**

```typescript
// 使用 V2 API
const detailInfo = await getProtocolDetailsV2({
  accountId,
  networkId,
  symbol,
  provider,
  vault,
});

const earnAccount = await getEarnAccount({
  accountId,
  networkId,
  indexedAccountId,
});
```

**ProtocolDetails（遗留）：**

```typescript
// 使用 V1 API（isV2 默认为 false）
const detailInfo = await getProtocolDetails({
  accountId,
  networkId,
  symbol,
  provider,
  vault,
  // isV2: false  // 默认值
});
```

### 3. 质押操作 (Stake)

**流程步骤：**

1. **金额输入**

   - 支持手动输入或最大金额
   - 实时验证余额、最小/最大限制
   - 调用 `checkAmount` 获取风险提示

2. **授权检查**（ERC20 代币）

   - 检查当前授权额度
   - 如不足，进入授权流程
   - 支持 Permit 和 Legacy 两种方式

3. **费用估算**

   - 调用 `estimateFee` 获取预估费用
   - 显示网络费用和协议费用

4. **交易构建**

   - 调用 `buildStakeTransaction` 构建交易
   - 返回交易数据和订单 ID

5. **签名广播**
   - 使用 UniversalStake 组件处理签名
   - 支持硬件钱包和软件钱包
   - 广播后添加本地订单记录

**特殊处理：**

- **BTC Babylon**：需要选择质押期限，构建 PSBT
- **Cosmos 链**：使用 Amino 签名格式
- **邀请码**：部分协议支持绑定邀请码

### 4. 提取操作 (Withdraw)

**流程步骤：**

1. **提取类型判断**

   - 普通提取：`buildUnstakeTransaction`
   - 推送提取（部分协议）：`unstakePush`

2. **金额输入**

   - 支持全部提取或部分提取
   - 验证可提取余额

3. **交易构建和广播**
   - 类似质押流程
   - 特殊处理：Lido 需要签名消息

### 5. 领取奖励 (Claim)

**领取类型：**

1. **普通领取**

   - 调用 `buildClaimTransaction`
   - 需要指定领取的代币地址

2. **订单领取**（部分协议）

   - 显示可领取订单列表
   - 用户选择订单进行领取

3. **Babylon 特殊流程**
   - 先调用 `babylonClaimRecord` 记录
   - 再构建领取交易

## 状态管理

### Jotai Atom 结构

```typescript
// atoms.ts
earnAtom = {
  availableAssetsByType: {
    [EAvailableAssetsTypeEnum.All]: IAvailableAsset[],
    [EAvailableAssetsTypeEnum.StableCoins]: IAvailableAsset[],
    [EAvailableAssetsTypeEnum.NativeTokens]: IAvailableAsset[],
    [EAvailableAssetsTypeEnum.Recommend]: IAvailableAsset[],
  },
  earnAccount: {
    [key]: IEarnAccountTokenResponse  // key = `${accountId}-${networkId}`
  },
  refreshTrigger: number,
  isMounted: boolean,
}

earnLoadingStatesAtom = {
  [key]: boolean  // key = `availableAssets-${type}` etc.
}

earnPermitCacheAtom = {
  [key]: IEarnPermitCache  // Permit 签名缓存
}
```

### Actions 方法

**数据管理：**

- `updateAvailableAssetsByType`: 更新指定类型的资产列表
- `updateEarnAccounts`: 更新账户数据
- `getEarnAccount`: 获取指定账户数据

**缓存管理：**

- `getPermitCache`: 获取 Permit 缓存
- `updatePermitCache`: 更新 Permit 缓存
- `removePermitCache`: 删除过期缓存

### earnAccount 数据设置位置

**数据结构：**

```typescript
earnAccount: Record<string, IEarnAccountTokenResponse>;
// key = buildEarnAccountsKey({ accountId, indexAccountId, networkId })
// value = IEarnAccountTokenResponse {
//   accounts: IEarnAccount[];           // 账户列表（从 fetchAllNetworkAssets 或本地缓存获取）
//   totalFiatValue?: string;            // 总质押价值（从 fetchAccountOverview 获取）
//   earnings24h?: string;               // 24小时收益（从 fetchAccountOverview 获取）
//   hasClaimableAssets?: boolean;       // 是否有可领取资产（从 fetchAccountOverview 获取）
//   isOverviewLoaded?: boolean;          // 概览数据是否已加载
// }
```

**数据初始化：**

1. **应用启动时**：
   ```typescript
   // packages/kit/src/states/jotai/contexts/earn/atoms.ts
   earnAtom().onMount = (setAtom) => {
     setAtom(INIT); // 触发初始化
   };
   ```
   - 从 `simpleDb.earn.getEarnData()` 加载本地缓存数据
   - 如果有缓存数据，则恢复 `earnAccount` 的初始值

**数据设置位置：**

1. **主要设置位置：EarnHome 的 Overview 组件**

   ```typescript
   // packages/kit/src/views/Earn/EarnHome.tsx (约第 670-685 行)
   const overviewData = await fetchAccountOverview({...});
   const earnAccountData = actions.current.getEarnAccount(totalFiatMapKey);
   actions.current.updateEarnAccounts({
     key: totalFiatMapKey,
     earnAccount: {
       accounts: earnAccountData?.accounts || [],  // 保留已有的 accounts
       ...overviewData,                            // 合并概览数据
       isOverviewLoaded: true,
     },
   });
   ```

   **调用时机：**

   - Earn 首页的 Overview 组件加载时
   - 每 3 分钟自动轮询更新（`pollingInterval`）
   - 网络重连时自动刷新（`revalidateOnReconnect`）

2. **数据同步机制：**

   ```typescript
   // packages/kit/src/states/jotai/contexts/earn/actions.ts
   updateEarnAccounts() {
     this.syncToDb.call(set, {      // 同步到数据库
       earnAccount: {
         ...earnData.earnAccount,
         [key]: earnAccount,
       },
     });
   }

   syncToDb() {
     void this.syncToJotai.call(set, data);              // 更新 Jotai atom
     void backgroundApiProxy.simpleDb.earn.setRawData(data);  // 保存到数据库
   }
   ```

   **数据流向：**

   ```
   fetchAccountOverview
     ↓
   updateEarnAccounts
     ↓
   syncToDb
     ├─→ syncToJotai (更新 Jotai atom，触发组件重新渲染)
     └─→ simpleDb.earn.setRawData (持久化到本地数据库)
   ```

3. **accounts 字段的来源和问题：**

   **当前问题：**

   - **主要来源**：通过 `fetchAllNetworkAssets` 获取（在 InvestmentDetails 页面）
   - **但注意**：`fetchAllNetworkAssets` 返回的数据**不会直接写入到 `earnAccount` 缓存中**
   - `EarnHome` 中的 `updateEarnAccounts` 只保留已存在的 `accounts`，如果缓存为空，更新后仍然是空数组

   **问题根源：**

   ```typescript
   // EarnHome.tsx (约第 676-685 行)
   const earnAccountData = actions.current.getEarnAccount(totalFiatMapKey);
   actions.current.updateEarnAccounts({
     key: totalFiatMapKey,
     earnAccount: {
       accounts: earnAccountData?.accounts || [], // ⚠️ 如果缓存为空，就是空数组
       ...overviewData,
       isOverviewLoaded: true,
     },
   });
   ```

   - 如果 `earnAccountData?.accounts` 为空，更新后仍然是空数组
   - `EarnHome` 只调用 `fetchAccountOverview`，不调用 `fetchAllNetworkAssets` 获取 accounts
   - `InvestmentDetails` 调用 `fetchAllNetworkAssets` 获取 accounts，但只用于临时查询，不写入缓存

   **解决方案：**

   需要在 `EarnHome` 中，如果 accounts 为空，也调用 `fetchAllNetworkAssets` 获取 accounts 并写入缓存：

   ```typescript
   // 建议的修复方案
   const earnAccountData = actions.current.getEarnAccount(totalFiatMapKey);
   let accounts = earnAccountData?.accounts || [];

   // 如果 accounts 为空，获取 accounts 数据
   if (accounts.length === 0) {
     const earnAccountOnNetwork = await fetchAllNetworkAssets({...});
     accounts = earnAccountOnNetwork.accounts;
   }

   actions.current.updateEarnAccounts({
     key: totalFiatMapKey,
     earnAccount: {
       accounts,  // 使用获取到的 accounts
       ...overviewData,
       isOverviewLoaded: true,
     },
   });
   ```

   **或者**在 `InvestmentDetails` 中获取 accounts 后，将其写入缓存：

   ```typescript
   // InvestmentDetails.tsx
   if (list.length === 0) {
     const earnAccountOnNetwork = await fetchAllNetworkAssets({...});
     list = earnAccountOnNetwork.accounts;

     // 写入缓存
     actions.current.updateEarnAccounts({
       key: totalFiatMapKey,
       earnAccount: {
         accounts: list,
         ...earnAccount?.[totalFiatMapKey],
       },
     });
   }
   ```

4. **数据读取位置：**

   ```typescript
   // packages/kit/src/views/Earn/EarnHome.tsx
   const [{ earnAccount }] = useEarnAtom();
   const totalFiatMapKey = actions.current.buildEarnAccountsKey({...});
   const totalValue = earnAccount?.[totalFiatMapKey]?.totalFiatValue || '0';
   ```

   ```typescript
   // packages/kit/src/views/Staking/pages/InvestmentDetails/index.tsx
   const [EarnData] = useEarnAtom();
   const earnAccount = EarnData.earnAccount;
   let list = earnAccount?.[totalFiatMapKey]?.accounts || [];
   ```

**数据持久化：**

- 数据会保存到 `simpleDb.earn`（本地数据库）
- 应用重启时会自动恢复
- 每次更新都会同步到数据库和 Jotai atom

**刷新控制：**

- `triggerRefresh`: 触发数据刷新（增加 refreshTrigger）
- `setLoadingState`: 设置加载状态
- `isDataIncomplete`: 检查数据是否不完整

## 交互流程

### 1. 资产选择流程

```
用户点击资产卡片
    ↓
获取账户信息 (getEarnAccount)
    ↓
判断协议数量
    ├─ 1个协议
    │   └─ 直接跳转协议详情页
    └─ 多个协议
        └─ 显示协议选择对话框
            ├─ 显示协议列表（按 APR 排序）
            ├─ 显示网络信息
            └─ 用户选择后跳转协议详情
```

### 2. Banner 跳转流程

```
用户点击 Banner
    ↓
解析 href 类型
    ├─ 内部链接 (/defi/staking/...)
    │   └─ 解析参数跳转协议详情
    ├─ 外部链接 (external)
    │   └─ 使用系统浏览器打开
    └─ 应用内链接
        └─ 使用应用内浏览器打开
```

### 3. 账户切换流程

```
用户切换账户
    ↓
清空当前数据
    ↓
重新加载概览数据
    ↓
触发资产列表刷新
    ↓
更新所有相关页面数据
```

## 数据流转

### 1. 首页数据流

```
ServiceStaking API
    ↓
usePromiseResult Hook
    ↓
Actions.updateAvailableAssetsByType
    ↓
Jotai Atom (earnAtom)
    ↓
组件订阅并渲染
```

### 2. 订单状态同步

```
交易广播
    ↓
添加本地订单 (addEarnOrder)
    ↓
尝试同步到服务器 (updateEarnOrderStatusToServer)
    ├─ 成功 → 记录日志
    └─ 失败 → 重试（最多3次）
        ↓
交易确认后
    ↓
更新本地订单状态 (updateEarnOrder)
    ↓
再次同步到服务器
```

### 3. 账户数据聚合

```
获取所有主网账户 (getEarnAvailableAccountsParams)
    ↓
并行请求各网络概览数据
    ↓
聚合结果
    ├─ totalFiatValue: 总质押价值
    ├─ earnings24h: 24小时收益
    └─ hasClaimableAssets: 是否有可领取资产
    ↓
存储到 Atom
```

## 特殊处理

### 1. BTC 网络处理

- **Taproot 地址要求**：仅支持 Taproot 地址（BIP86）
- **PSBT 格式**：Babylon 质押使用 PSBT 格式
- **公钥传递**：需要传递公钥到 API

### 2. 授权优化

- **Permit 缓存**：缓存 Permit 签名，避免重复签名
- **自动选择**：优先使用 Permit，降级到 Legacy
- **缓存过期**：检查签名过期时间

### 3. Ethena KYC

- **KYC 状态检查**：检查账户 KYC 状态
- **地址过滤**：仅已验证 KYC 的地址可质押 USDe
- **状态缓存**：缓存 KYC 地址列表

### 4. 数据刷新策略

- **按需加载**：Tab 切换时才加载对应数据
- **节流控制**：推荐资产请求限流 2 秒
- **缓存策略**：
  - 资产列表：5 分钟缓存
  - Banner：60 秒缓存
  - FAQ：1 分钟缓存

## 错误处理

### 常见错误场景

1. **网络错误**

   - 自动重试（最多 3 次）
   - 显示友好错误提示
   - 支持手动刷新

2. **账户不存在**

   - 提示用户选择账户
   - 自动弹出账户选择器

3. **协议不支持**

   - 显示不支持提示
   - 引导用户使用其他协议

4. **余额不足**
   - 实时验证余额
   - 显示余额不足提示
   - 提供充值入口

## 性能优化

1. **懒加载**：协议详情页使用 LazyLoad
2. **缓存策略**：API 响应缓存，减少请求
3. **按需加载**：Tab 数据按需加载
4. **节流防抖**：用户输入和 API 请求节流
5. **虚拟列表**：长列表使用虚拟滚动（如有）

## 国际化

所有文本使用 `useIntl` 和翻译 Key：

- `ETranslations.global_earn`
- `ETranslations.earn_total_staked_value`
- `ETranslations.earn_24h_earnings`
- 等

## 埋点统计

关键操作记录埋点：

- 页面访问
- 协议选择
- 质押/提取/领取操作
- 错误日志

使用 `defaultLogger.staking.*` 进行日志记录。
