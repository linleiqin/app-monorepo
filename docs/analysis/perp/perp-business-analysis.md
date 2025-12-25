# Perp 业务代码分析文档

> 本文档分析 Perp（永续合约）功能的业务代码结构，不包含 WebviewPerpTrade 相关代码。

## 目录索引

### 第一部分：业务入口和路由

- [业务入口分析](#业务入口分析)
  - [Tab 路由入口](#1-tab-路由入口)
  - [主页面入口](#2-主页面入口)
  - [功能守卫](#3-功能守卫)
  - [Tab 配置检查](#4-tab-配置检查)
- [路由配置](#路由配置)
  - [Tab 子路由](#1-tab-子路由)
  - [Modal 路由](#2-modal-路由)
  - [路由参数类型](#3-路由参数类型)
- [业务入口总结](#业务入口总结)

### 第二部分：核心组件和页面结构

- [核心组件和页面结构](#核心组件和页面结构)
  - [布局组件](#1-布局组件)
    - [桌面端布局](#桌面端布局)
    - [移动端布局](#移动端布局)
  - [核心业务组件](#2-核心业务组件)
    - [交易面板 (TradingPanel)](#交易面板-tradingpanel)
    - [订单信息面板 (OrderInfoPanel)](#订单信息面板-orderinfopanel)
    - [K 线图组件](#k-线图组件)
    - [订单簿组件](#订单簿组件)
    - [价格信息栏](#价格信息栏)
  - [其他重要组件](#3-其他重要组件)
    - [代币选择器](#代币选择器)
    - [持仓分享](#持仓分享)
    - [邀请奖励](#邀请奖励)
  - [页面组件](#4-页面组件)
  - [工具组件](#5-工具组件)

### 第三部分：服务层架构

- [服务层架构](#服务层架构)
  - [核心服务](#1-核心服务)
    - [ServiceHyperliquid (主服务)](#servicehyperliquid-主服务)
    - [ServiceHyperliquidExchange (交易服务)](#servicehyperliquidexchange-交易服务)
    - [ServiceHyperliquidWallet (钱包服务)](#servicehyperliquidwallet-钱包服务)
    - [ServiceHyperliquidSubscription (订阅服务)](#servicehyperliquidsubscription-订阅服务)
  - [辅助服务](#2-辅助服务)
  - [API 客户端](#3-api-客户端)
  - [服务注册](#4-服务注册)
  - [服务调用流程](#5-服务调用流程)

### 第四部分：状态管理和数据流

- [状态管理和数据流](#状态管理和数据流)
  - [状态管理架构](#1-状态管理架构)
    - [全局状态 (Global Atoms)](#全局状态-global-atoms)
    - [上下文状态 (Context Atoms)](#上下文状态-context-atoms)
  - [Provider 结构](#2-provider-结构)
  - [Actions (操作)](#3-actions-操作)
  - [数据流](#4-数据流)
    - [初始化流程](#初始化流程)
    - [账户选择流程](#账户选择流程)
    - [交易对选择流程](#交易对选择流程)
    - [下单流程](#下单流程)
    - [WebSocket 数据流](#websocket-数据流)
  - [状态更新机制](#5-状态更新机制)
  - [数据持久化](#6-数据持久化)
  - [状态同步](#7-状态同步)

### 第五部分：代码路径清单

- [完整代码路径清单](#完整代码路径清单)
  - [路由和入口](#1-路由和入口)
  - [布局组件](#2-布局组件)
  - [核心业务组件](#3-核心业务组件)
  - [Hooks](#4-hooks)
  - [Provider](#5-provider)
  - [状态管理](#6-状态管理)
  - [服务层](#7-服务层)
  - [工具函数](#8-工具函数)
  - [类型定义](#9-类型定义)
  - [日志](#10-日志)
  - [设置页面](#11-设置页面)
  - [错误处理](#12-错误处理)
  - [路由工具](#14-路由工具)
- [代码统计](#代码统计)

### 第六部分：依赖分析

- [Perp 功能专门引入的依赖](#perp-功能专门引入的依赖)
  - [核心 SDK 依赖](#1-核心-sdk-依赖)
  - [依赖说明](#2-依赖说明)
  - [依赖使用统计](#3-依赖使用统计)
  - [依赖版本](#4-依赖版本)
  - [依赖影响范围](#5-依赖影响范围)

---

## 业务入口分析

### 1. Tab 路由入口

**文件路径：** `packages/shared/src/routes/tab.ts`

```typescript
export enum ETabRoutes {
  Perp = 'Perp',
  // ... 其他路由
}
```

**路由注册：** `packages/kit/src/routes/Tab/router.ts`

```typescript
{
  name: ETabRoutes.Perp,
  tabBarIcon: (focused?: boolean) =>
    focused ? 'TradingViewCandlesSolid' : 'TradingViewCandlesOutline',
  translationId: ETranslations.global_perp,
  freezeOnBlur: Boolean(params?.freezeOnBlur),
  children: perpRouters,
  rewrite: perpTabShowWeb ? undefined : '/perps',
  exact: true,
  hiddenIcon: perpDisabled || perpTabShowWeb,
}
```

### 2. 主页面入口

**文件路径：** `packages/kit/src/views/Perp/pages/Perp.tsx`

这是 Perp 功能的主入口组件，包含以下关键逻辑：

- **功能守卫：** 使用 `usePerpFeatureGuard` 检查功能是否可用
- **布局选择：** 根据屏幕尺寸选择桌面或移动端布局
- **Provider 包装：**
  - `PerpsAccountSelectorProviderMirror` - 账户选择器
  - `PerpsProviderMirror` - Perp 业务状态管理

### 3. 功能守卫

**文件路径：** `packages/kit/src/hooks/usePerpFeatureGuard.ts`

```typescript
export function usePerpFeatureGuard() {
  useFocusEffect(() => {
    void backgroundApiProxy.serviceHyperliquid.updatePerpsConfigByServer();
  });

  const navigation = useAppNavigation();
  const { perpDisabled } = usePerpTabConfig();

  useEffect(() => {
    if (perpDisabled) {
      navigation.switchTab(ETabRoutes.Home);
    }
  }, [navigation, perpDisabled]);

  return !perpDisabled;
}
```

**功能：**

- 页面聚焦时更新服务器配置
- 检查 Perp 功能是否被禁用
- 如果禁用则自动跳转到首页

### 4. Tab 配置检查

**文件路径：** `packages/kit/src/hooks/usePerpTabConfig.ts`

```typescript
export function usePerpTabConfig() {
  const [{ perpConfigCommon }] = usePerpsCommonConfigPersistAtom();
  const [{ perpUserConfig }] = usePerpsUserConfigPersistAtom();

  // 检查是否禁用
  if (perpConfigCommon?.disablePerp) {
    return { perpDisabled: true };
  }

  // 扩展弹窗/侧边栏禁用
  if (platformEnv.isExtensionUiPopup || platformEnv.isExtensionUiSidePanel) {
    return { perpDisabled: true };
  }

  // 检查是否使用 WebView 模式
  if (
    perpConfigCommon?.usePerpWeb ||
    perpUserConfig.currentUserType === EPerpUserType.PERP_WEB
  ) {
    return {
      perpDisabled: false,
      perpTabShowWeb: true,
    };
  }

  return {
    perpDisabled: false,
  };
}
```

---

## 路由配置

### 1. Tab 子路由

**文件路径：** `packages/kit/src/views/Perp/router/index.ts`

```typescript
export const perpRouters: ITabSubNavigatorConfig<any, any>[] = [
  {
    rewrite: '/',
    name: ETabRoutes.Perp,
    component: PagePerp, // 主页面
  },
  {
    name: EModalPerpRoutes.MobilePerpMarket,
    component: MobilePerpMarketPage, // 移动端市场页面
  },
  {
    name: EModalPerpRoutes.MobileTokenSelector,
    component: MobileTokenSelectorPage, // 代币选择器
  },
  {
    name: EModalPerpRoutes.MobileSetTpsl,
    component: MobileSetTpslModal, // 设置止盈止损
  },
  {
    name: EModalPerpRoutes.MobileDepositWithdrawModal,
    component: MobileDepositWithdrawModal, // 存取款弹窗
  },
  {
    name: EModalPerpRoutes.PerpsInviteeRewardModal,
    component: PerpsInviteeRewardModal, // 邀请奖励弹窗
  },
];
```

### 2. Modal 路由

**文件路径：** `packages/shared/src/routes/perp.ts`

```typescript
export enum EModalPerpRoutes {
  PerpTradersHistoryList = 'PerpTradersHistoryList',
  MobilePerpMarket = 'MobilePerpMarket',
  MobileTokenSelector = 'MobileTokenSelector',
  MobileSetTpsl = 'MobileSetTpsl',
  MobileDepositWithdrawModal = 'MobileDepositWithdrawModal',
  PerpsInviteeRewardModal = 'PerpsInviteeRewardModal',
}
```

### 3. 路由参数类型

```typescript
export type IModalPerpParamList = {
  [EModalPerpRoutes.PerpTradersHistoryList]: undefined;
  [EModalPerpRoutes.MobilePerpMarket]: undefined;
  [EModalPerpRoutes.MobileTokenSelector]: undefined;
  [EModalPerpRoutes.MobileSetTpsl]: ISetTpslParams;
  [EModalPerpRoutes.MobileDepositWithdrawModal]: undefined;
  [EModalPerpRoutes.PerpsInviteeRewardModal]: undefined;
};
```

---

## 业务入口总结

### 入口流程

1. **用户点击 Tab** → `ETabRoutes.Perp`
2. **路由检查** → `usePerpTabConfig()` 判断是否显示
3. **功能守卫** → `usePerpFeatureGuard()` 验证功能可用性
4. **加载主页面** → `packages/kit/src/views/Perp/pages/Perp.tsx`
5. **初始化 Provider** → 账户选择器和业务状态管理
6. **渲染布局** → 根据平台选择桌面/移动端布局

### 关键文件

- **路由定义：** `packages/shared/src/routes/tab.ts` (第 23 行)
- **路由配置：** `packages/kit/src/routes/Tab/router.ts` (第 184-193 行)
- **子路由配置：** `packages/kit/src/views/Perp/router/index.ts`
- **主入口组件：** `packages/kit/src/views/Perp/pages/Perp.tsx`
- **功能守卫：** `packages/kit/src/hooks/usePerpFeatureGuard.ts`
- **Tab 配置：** `packages/kit/src/hooks/usePerpTabConfig.ts`

---

## 核心组件和页面结构

### 1. 布局组件

#### 桌面端布局

**文件路径：** `packages/kit/src/views/Perp/layouts/PerpDesktopLayout.tsx`

**结构：**

```
PerpDesktopLayout
├── PerpTips (提示信息)
├── PerpTickerBar (价格信息栏)
└── XStack (主内容区)
    ├── YStack (左侧 80%)
    │   ├── XStack (图表区域)
    │   │   ├── PerpCandles (K线图)
    │   │   └── PerpOrderBook (订单簿，可折叠)
    │   └── PerpOrderInfoPanel (持仓和订单信息)
    └── YStack (右侧 20%)
        ├── PerpTradingPanel (交易面板)
        └── PerpAccountPanel (账户面板)
```

**关键特性：**

- 响应式布局，支持超大屏幕（gtXl）
- 订单簿可折叠/展开
- 固定宽度交易面板（300px）

#### 移动端布局

**文件路径：** `packages/kit/src/views/Perp/layouts/PerpMobileLayout.tsx`

**结构：**

```
PerpMobileLayout
├── PerpTips
├── PerpTickerBar
├── XStack (交易区域)
│   ├── PerpOrderBook (35%)
│   └── PerpTradingPanel (65%)
├── TabBar (持仓/挂单切换)
└── YStack (内容区)
    ├── PerpPositionsList (持仓列表)
    └── PerpOpenOrdersList (挂单列表)
```

**关键特性：**

- 下拉刷新功能
- Tab 切换显示持仓/挂单
- 支持查看交易历史

### 2. 核心业务组件

#### 交易面板 (TradingPanel)

**文件路径：** `packages/kit/src/views/Perp/components/TradingPanel/PerpTradingPanel.tsx`

**子组件：**

- `PerpTradingForm` - 交易表单
- `PerpTradingButton` - 交易按钮
- `TradingButtonGroup` - 交易按钮组

**功能：**

- 买卖方向切换
- 订单类型选择（限价/市价）
- 杠杆调整
- 保证金模式选择
- 数量输入（手动/百分比）
- 止盈止损设置

**相关组件路径：**

```
TradingPanel/
├── PerpTradingPanel.tsx (主组件)
├── PerpTradingButton.tsx (交易按钮)
├── TradingButtonGroup.tsx (按钮组)
├── panels/
│   ├── PerpTradingForm.tsx (交易表单)
│   ├── PerpAccountPanel.tsx (账户面板)
│   └── PerpTradingSetup.tsx (交易设置)
├── inputs/
│   ├── TradingFormInput.tsx (表单输入)
│   ├── SizeInput.tsx (数量输入)
│   ├── PriceInput.tsx (价格输入)
│   ├── TpslInput.tsx (止盈止损输入)
│   └── TpSlFormInput.tsx (止盈止损表单)
├── selectors/
│   ├── TradeSideToggle.tsx (买卖切换)
│   ├── OrderTypeSelector.tsx (订单类型)
│   ├── SizeInputModeSelector.tsx (数量模式)
│   └── MarginModeSelector.tsx (保证金模式)
└── modals/
    ├── OrderConfirmModal.tsx (订单确认)
    ├── DepositWithdrawModal.tsx (存取款)
    ├── LeverageAdjustModal.tsx (杠杆调整)
    ├── MarginModeModal.tsx (保证金模式)
    └── EnableTradingModal.tsx (启用交易)
```

#### 订单信息面板 (OrderInfoPanel)

**文件路径：** `packages/kit/src/views/Perp/components/OrderInfoPanel/PerpOrderInfoPanel.tsx`

**功能：**

- 显示持仓列表
- 显示挂单列表
- 显示交易历史
- 显示账户信息

**子组件：**

```
OrderInfoPanel/
├── PerpOrderInfoPanel.tsx (主组件)
├── List/
│   ├── PerpPositionsList.tsx (持仓列表)
│   ├── PerpOpenOrdersList.tsx (挂单列表)
│   ├── PerpTradesHistoryList.tsx (交易历史)
│   ├── PerpAccountList.tsx (账户列表)
│   └── CommonTableListView.tsx (通用表格视图)
├── Components/
│   ├── PositionsRow.tsx (持仓行)
│   ├── OpenOrdersRow.tsx (挂单行)
│   ├── TradesHistoryRow.tsx (交易历史行)
│   └── AccountRow.tsx (账户行)
├── SetTpslModal.tsx (设置止盈止损)
├── ClosePositionModal.tsx (平仓)
├── CloseAllPositionsModal.tsx (全部平仓)
├── CancelAllOrdersModal.tsx (取消所有订单)
└── AdjustPositionMarginModal.tsx (调整保证金)
```

#### K 线图组件

**文件路径：** `packages/kit/src/views/Perp/components/PerpCandles.tsx`

**功能：**

- 显示价格 K 线图
- 技术指标
- 图表交互

#### 订单簿组件

**文件路径：** `packages/kit/src/views/Perp/components/PerpOrderBook.tsx`

**功能：**

- 显示买卖盘深度
- 价格聚合控制
- 实时更新

**相关组件：**

```
OrderBook/
├── index.tsx (主组件)
├── AggregationControls.tsx (聚合控制)
├── useAggregatedBook.tsx (聚合逻辑)
├── useTickOptions.ts (价格档位)
├── tickSizeUtils.ts (价格工具)
└── utils.ts (工具函数)
```

#### 价格信息栏

**文件路径：** `packages/kit/src/views/Perp/components/TickerBar/PerpTickerBar.tsx`

**子组件：**

- `PerpTickerBarDesktop.tsx` - 桌面端
- `PerpTickerBarMobile.tsx` - 移动端
- `MobilePerpMarketHeader.tsx` - 移动端市场头部

**功能：**

- 显示当前价格
- 24 小时涨跌幅
- 24 小时成交量
- 标记价格

### 3. 其他重要组件

#### 代币选择器

**文件路径：** `packages/kit/src/views/Perp/components/TokenSelector/PerpTokenSelector.tsx`

**功能：**

- 选择交易对
- 搜索代币
- 排序功能

**相关文件：**

- `MoblieTokenSelector.tsx` - 移动端选择器
- `PerpTokenSelectorRow.tsx` - 代币行组件
- `SortableHeaderCell.tsx` - 可排序表头

#### 持仓分享

**文件路径：** `packages/kit/src/views/Perp/components/PositionShare/`

**功能：**

- 生成持仓分享图片
- 分享链接
- 推荐奖励

**组件：**

```
PositionShare/
├── index.tsx
├── PositionShareModal.tsx (分享弹窗)
├── ShareView.tsx (分享视图)
├── ShareImageGenerator.tsx (图片生成)
├── ShareContentRenderer.tsx (内容渲染)
├── ControlPanel.tsx (控制面板)
├── useShareActions.ts (分享操作)
└── useReferralUrl.ts (推荐链接)
```

#### 邀请奖励

**文件路径：** `packages/kit/src/views/Perp/components/InviteeReward/`

**功能：**

- 显示邀请奖励
- 奖励历史
- 奖励统计

### 4. 页面组件

#### 主页面

**文件路径：** `packages/kit/src/views/Perp/pages/Perp.tsx`

**功能：**

- 入口组件
- Provider 包装
- 布局选择

#### 移动端市场页面

**文件路径：** `packages/kit/src/views/Perp/pages/MobilePerpMarket.tsx`

**功能：**

- 移动端市场数据展示
- 代币列表

#### 扩展页面

**文件路径：** `packages/kit/src/views/Perp/pages/ExtPerp.tsx`

**功能：**

- 扩展模式下的 Perp 页面

### 5. 工具组件

#### 全局效果

**文件路径：** `packages/kit/src/views/Perp/components/PerpsGlobalEffects.tsx`

**功能：**

- 全局数据订阅
- 定时刷新
- 事件监听

#### 内容底部

**文件路径：** `packages/kit/src/views/Perp/components/PerpContentFooter.tsx`

**功能：**

- 底部信息展示
- 风险提示

#### 设置按钮

**文件路径：** `packages/kit/src/views/Perp/components/PerpSettingsButton.tsx`

**功能：**

- 打开设置弹窗

#### 设置弹窗

**文件路径：** `packages/kit/src/views/Perp/components/PerpSettingsDialog.tsx`

**功能：**

- 交易设置
- 显示偏好

#### 提示组件

**文件路径：** `packages/kit/src/views/Perp/components/PerpTips.tsx`

**功能：**

- 显示重要提示信息

#### 交易守卫

**文件路径：** `packages/kit/src/views/Perp/components/TradingGuardWrapper.tsx`

**功能：**

- 交易前检查
- 权限验证

---

## 服务层架构

### 1. 核心服务

#### ServiceHyperliquid (主服务)

**文件路径：** `packages/kit-bg/src/services/ServiceHyperLiquid/ServiceHyperliquid.ts`

**职责：**

- Perp 功能配置管理
- 账户数据获取和管理
- 市场数据获取
- 服务器配置同步
- 缓存管理

**主要方法：**

- `updatePerpsConfigByServer()` - 从服务器更新配置
- `getPerpsUniverse()` - 获取交易对信息
- `getPerpsActiveAsset()` - 获取当前交易对数据
- `getPerpsAccount()` - 获取账户信息
- `getPerpsAccountStatus()` - 获取账户状态
- `getPerpsAccountSummary()` - 获取账户摘要
- `getPerpsActiveAssetCtx()` - 获取资产上下文
- `getPerpsActiveAssetData()` - 获取资产数据
- `getPerpsTradesHistory()` - 获取交易历史
- `getPerpsDepositNetworks()` - 获取充值网络
- `getPerpsDepositTokens()` - 获取充值代币

#### ServiceHyperliquidExchange (交易服务)

**文件路径：** `packages/kit-bg/src/services/ServiceHyperLiquid/ServiceHyperliquidExchange.ts`

**职责：**

- 订单下单
- 订单取消
- 杠杆调整
- 保证金管理
- Agent 代理管理
- Builder Fee 处理

**主要方法：**

```typescript
// 设置
async setup(params: { accountId: string }) - 初始化交易客户端
async isSetup() - 检查是否已设置

// Agent 管理
async approveAgent(params: IAgentApprovalRequest) - 批准 Agent
async removeAgent(params: { agentName }) - 移除 Agent
async extractAgentSignature() - 提取 Agent 签名

// Builder Fee
async approveBuilderFee(params: IBuilderFeeRequest) - 批准 Builder Fee

// 推荐码
async setReferrerCode(params: ISetReferrerRequest) - 设置推荐码

// 杠杆和保证金
async updateLeverage(params: ILeverageUpdateRequest) - 更新杠杆
async updateIsolatedMargin(params: IUpdateIsolatedMarginRequest) - 更新隔离保证金

// 订单操作
async placeOrder(params: IPlaceOrderParams) - 下单
async orderOpen(params: IOrderOpenParams) - 开仓
async ordersClose(params: IOrderCloseParams[]) - 平仓
async cancelOrder(cancels: ICancelOrderParams[]) - 取消订单
async setPositionTpsl(params: IPositionTpslOrderParams) - 设置止盈止损

// 提现
async withdraw(params: IWithdrawParams) - 提现
```

**关键特性：**

- 使用 ExchangeClient 与 Hyperliquid 交互
- 支持 Agent 代理交易
- Builder Fee 处理
- 滑点保护（默认 0.08%）
- 订单日志记录

#### ServiceHyperliquidWallet (钱包服务)

**文件路径：** `packages/kit-bg/src/services/ServiceHyperLiquid/ServiceHyperliquidWallet.ts`

**职责：**

- 钱包签名
- 类型化数据签名
- 支持代理钱包和 OneKey 钱包

**类：**

- `WalletHyperliquidProxy` - 代理钱包（使用私钥）
- `WalletHyperliquidOnekey` - OneKey 钱包（使用账户 ID）

**主要方法：**

- `signTypedData()` - 签名类型化数据
- `getAddress()` - 获取地址

#### ServiceHyperliquidSubscription (订阅服务)

**文件路径：** `packages/kit-bg/src/services/ServiceHyperLiquid/ServiceHyperliquidSubscription.ts`

**职责：**

- WebSocket 连接管理
- 实时数据订阅
- 订阅状态管理
- 网络状态监控

**订阅类型：**

```typescript
enum ESubscriptionType {
  WebData2 = 'webData2', // Web 数据
  ActiveAssetCtx = 'activeAssetCtx', // 资产上下文
  UserFills = 'userFills', // 用户成交
  L2Book = 'l2Book', // 订单簿
}
```

**主要方法：**

- `subscribe()` - 订阅数据
- `unsubscribe()` - 取消订阅
- `updateSubscriptions()` - 更新订阅
- `disconnect()` - 断开连接
- `reconnect()` - 重连

**订阅配置：**
**文件路径：** `packages/kit-bg/src/services/ServiceHyperLiquid/utils/SubscriptionConfig.ts`

**功能：**

- 计算所需订阅
- 订阅规格定义
- 订阅状态管理

### 2. 辅助服务

#### ServiceSwap (交换服务中的 Perp 相关)

**文件路径：** `packages/kit-bg/src/services/ServiceSwap.ts`

**Perp 相关方法：**

- `fetchPerpDepositOrderStatus()` - 获取充值订单状态
- `perpDepositOrderFetchLoop()` - 充值订单轮询

### 3. API 客户端

#### hyperLiquidApiClients

**文件路径：** `packages/kit-bg/src/services/ServiceHyperLiquid/hyperLiquidApiClients.ts`

**功能：**

- HTTP API 客户端管理
- 请求封装
- 错误处理

#### hyperLiquidCache

**文件路径：** `packages/kit-bg/src/services/ServiceHyperLiquid/hyperLiquidCache.ts`

**功能：**

- 数据缓存管理
- 缓存策略
- 缓存失效处理

### 4. 服务注册

**文件路径：** `packages/kit-bg/src/apis/IBackgroundApi.ts`

```typescript
export interface IBackgroundApi {
  // ... 其他服务
  serviceHyperliquid: ServiceHyperliquid;
  serviceHyperliquidExchange: ServiceHyperliquidExchange;
  serviceHyperliquidWallet: ServiceHyperliquidWallet;
  serviceHyperliquidSubscription: ServiceHyperliquidSubscription;
  // ...
}
```

**文件路径：** `packages/kit-bg/src/apis/BackgroundApiProxy.ts`

服务通过 Proxy 模式暴露给前端使用。

### 5. 服务调用流程

#### 下单流程示例：

```
前端组件
  ↓
backgroundApiProxy.serviceHyperliquidExchange.placeOrder()
  ↓
ServiceHyperliquidExchange.placeOrder()
  ↓
检查 Agent 和 Builder Fee
  ↓
构建订单请求
  ↓
签名（通过 ServiceHyperliquidWallet）
  ↓
调用 ExchangeClient
  ↓
返回订单结果
```

#### 数据订阅流程：

```
前端组件挂载
  ↓
ServiceHyperliquidSubscription.subscribe()
  ↓
建立 WebSocket 连接
  ↓
订阅所需数据类型
  ↓
接收实时数据
  ↓
更新 Atom 状态
  ↓
前端组件自动更新
```

---

## 状态管理和数据流

### 1. 状态管理架构

Perp 功能使用 **Jotai** 进行状态管理，采用两层架构：

#### 全局状态 (Global Atoms)

**位置：** `packages/kit-bg/src/states/jotai/atoms/perps.ts`

**用途：** 持久化状态，跨功能共享

**主要 Atoms：**

```typescript
// 账户相关
perpsActiveAccountAtom - 当前活跃账户
perpsActiveAccountSummaryAtom - 账户摘要
perpsActiveAccountStatusAtom - 账户状态（计算属性）
perpsActiveAccountStatusInfoAtom - 账户状态详情
perpsActiveAccountMmrAtom - 保证金率（计算属性）
perpsActiveAccountIsAgentReadyAtom - Agent 就绪状态
perpsAccountLoadingInfoAtom - 加载状态

// 资产相关
perpsActiveAssetAtom - 当前交易对
perpsActiveAssetCtxAtom - 资产上下文
perpsActiveAssetDataAtom - 资产数据

// 配置相关
perpsCommonConfigPersistAtom - 通用配置
perpsUserConfigPersistAtom - 用户配置
perpsCustomSettingsAtom - 自定义设置
perpsDepositNetworksAtom - 充值网络
perpsDepositTokensAtom - 充值代币

// 交易历史
perpsTradesHistoryDataAtom - 交易历史数据

// 其他
perpsLastUsedLeverageAtom - 最后使用的杠杆
```

#### 上下文状态 (Context Atoms)

**位置：** `packages/kit/src/states/jotai/contexts/hyperliquid/atoms.ts`

**用途：** 功能内临时状态，会话级数据

**主要 Atoms：**

```typescript
// 市场数据
perpsAllMidsAtom - 所有中间价
perpsAllAssetsFilteredAtom - 过滤后的资产列表
perpsAllAssetCtxsAtom - 所有资产上下文
l2BookAtom - L2 订单簿

// 交易表单
tradingFormAtom - 交易表单数据
tradingFormEnvAtom - 交易表单环境
tradingFormComputedAtom - 交易表单计算结果（计算属性）
tradingLoadingAtom - 交易加载状态

// 持仓和订单
perpsActivePositionAtom - 活跃持仓
perpsActiveOpenOrdersAtom - 活跃挂单
perpsLedgerUpdatesAtom - 账本更新

// 连接状态
connectionStateAtom - WebSocket 连接状态
subscriptionActiveAtom - 订阅激活状态
orderBookTickOptionsAtom - 订单簿价格档位选项
```

### 2. Provider 结构

#### PerpsProvider

**文件路径：** `packages/kit/src/views/Perp/PerpsProvider.tsx`

```typescript
PerpsRootProvider
  └── ProviderJotaiContextHyperliquid (Jotai Context Provider)
```

**功能：**

- 初始化 Jotai Context Store
- 提供状态管理上下文

#### PerpsProviderMirror

**文件路径：** `packages/kit/src/views/Perp/PerpsProviderMirror.tsx`

**功能：**

- 镜像 Provider，用于组件树中嵌套使用

### 3. Actions (操作)

**文件路径：** `packages/kit/src/states/jotai/contexts/hyperliquid/actions.ts`

**主要 Actions：**

```typescript
class ContextJotaiActionsHyperliquid {
  // 市场数据更新
  updateAllMids() - 更新所有中间价
  updateAllAssetCtxs() - 更新所有资产上下文
  updateAllAssetsFiltered() - 更新过滤后的资产列表

  // 订单簿
  updateL2Book() - 更新 L2 订单簿

  // 交易表单
  resetTradingForm() - 重置交易表单
  updateTradingForm() - 更新交易表单
  setTradingLoading() - 设置交易加载状态

  // 订单操作
  placeOrder() - 下单
  cancelOrder() - 取消订单
  setPositionTpsl() - 设置止盈止损

  // 持仓和订单更新
  updateActivePositions() - 更新活跃持仓
  updateActiveOpenOrders() - 更新活跃挂单
  updateLedgerUpdates() - 更新账本

  // 数据刷新
  refreshAllPerpsData() - 刷新所有数据
  refreshActiveAssetData() - 刷新当前资产数据

  // 订阅管理
  updateConnectionState() - 更新连接状态
  updateSubscriptionActive() - 更新订阅状态
}
```

### 4. 数据流

#### 初始化流程

```
应用启动
  ↓
PerpsRootProvider 初始化
  ↓
创建 Jotai Context Store
  ↓
ServiceHyperliquid.updatePerpsConfigByServer()
  ↓
更新 perpsCommonConfigPersistAtom
  ↓
检查功能是否可用
```

#### 账户选择流程

```
用户选择账户
  ↓
更新 perpsActiveAccountAtom
  ↓
ServiceHyperliquid.getPerpsAccount()
  ↓
更新账户相关 Atoms
  ↓
检查账户状态 (Agent, Builder Fee 等)
  ↓
更新 perpsActiveAccountStatusAtom
  ↓
如果未就绪，显示启用交易按钮
```

#### 交易对选择流程

```
用户选择交易对
  ↓
更新 perpsActiveAssetAtom
  ↓
ServiceHyperliquid.getPerpsActiveAsset()
  ↓
更新 perpsActiveAssetCtxAtom
  ↓
更新 perpsActiveAssetDataAtom
  ↓
订阅 WebSocket 数据
  ↓
实时更新价格和深度
```

#### 下单流程

```
用户填写交易表单
  ↓
更新 tradingFormAtom
  ↓
计算交易参数 (tradingFormComputedAtom)
  ↓
用户点击下单
  ↓
检查账户状态和余额
  ↓
显示确认弹窗
  ↓
调用 placeOrder Action
  ↓
ServiceHyperliquidExchange.placeOrder()
  ↓
签名和提交订单
  ↓
更新 tradingLoadingAtom
  ↓
刷新持仓和订单列表
```

#### WebSocket 数据流

```
ServiceHyperliquidSubscription 建立连接
  ↓
订阅所需数据类型
  ↓
接收实时数据
  ↓
更新对应的 Atoms
  ↓
组件自动重新渲染
```

**订阅类型：**

- `webData2` → `perpsAllAssetCtxsAtom`
- `activeAssetCtx` → `perpsActiveAssetCtxAtom`
- `userFills` → `perpsTradesHistoryDataAtom`
- `l2Book` → `l2BookAtom`

### 5. 状态更新机制

#### 计算属性 (Computed Atoms)

使用 `globalAtomComputedR` 和 `contextAtomComputed` 创建计算属性：

```typescript
// 示例：账户状态计算
perpsActiveAccountStatusAtom = globalAtomComputedR({
  read: (get) => {
    const status = get(perpsActiveAccountStatusInfoAtom.atom());
    const account = get(perpsActiveAccountAtom.atom());
    // 计算逻辑...
    return { canTrade, canCreateAddress, ... };
  },
});
```

#### Hook 使用

```typescript
// 全局状态
const [account] = usePerpsActiveAccountAtom();
const [asset] = usePerpsActiveAssetAtom();

// 上下文状态
const [formData] = useTradingFormAtom();
const [computed] = useTradingFormComputedAtom();

// Actions
const actions = useHyperliquidActions();
await actions.current.placeOrder({ ... });
```

### 6. 数据持久化

**持久化 Atoms：**

- `perpsCommonConfigPersistAtom` - 服务器配置
- `perpsUserConfigPersistAtom` - 用户配置
- `perpsCustomSettingsAtom` - 自定义设置
- `perpsLastUsedLeverageAtom` - 最后使用的杠杆

**存储位置：** LocalDB / Persistent Storage

### 7. 状态同步

#### 服务器配置同步

- 页面聚焦时自动同步
- `ServiceHyperliquid.updatePerpsConfigByServer()`

#### 实时数据同步

- WebSocket 订阅
- 定时刷新（部分数据）
- 用户操作触发刷新

---

## 完整代码路径清单

### 1. 路由和入口

#### 路由定义

- `packages/shared/src/routes/tab.ts` - Tab 路由枚举（第 23 行：Perp）
- `packages/shared/src/routes/perp.ts` - Perp Modal 路由定义
- `packages/kit/src/routes/Tab/router.ts` - Tab 路由配置（第 184-193 行）

#### 路由配置

- `packages/kit/src/views/Perp/router/index.ts` - Perp 子路由配置

#### 入口组件

- `packages/kit/src/views/Perp/pages/Perp.tsx` - 主入口页面
- `packages/kit/src/views/Perp/pages/MobilePerpMarket.tsx` - 移动端市场页面
- `packages/kit/src/views/Perp/pages/ExtPerp.tsx` - 扩展页面

#### 功能守卫和配置

- `packages/kit/src/hooks/usePerpFeatureGuard.ts` - 功能守卫
- `packages/kit/src/hooks/usePerpTabConfig.ts` - Tab 配置检查

### 2. 布局组件

- `packages/kit/src/views/Perp/layouts/PerpDesktopLayout.tsx` - 桌面端布局
- `packages/kit/src/views/Perp/layouts/PerpMobileLayout.tsx` - 移动端布局

### 3. 核心业务组件

#### 交易面板 (TradingPanel)

- `packages/kit/src/views/Perp/components/TradingPanel/PerpTradingPanel.tsx` - 主组件
- `packages/kit/src/views/Perp/components/TradingPanel/PerpTradingButton.tsx` - 交易按钮
- `packages/kit/src/views/Perp/components/TradingPanel/TradingButtonGroup.tsx` - 按钮组
- `packages/kit/src/views/Perp/components/TradingPanel/panels/PerpTradingForm.tsx` - 交易表单
- `packages/kit/src/views/Perp/components/TradingPanel/panels/PerpAccountPanel.tsx` - 账户面板
- `packages/kit/src/views/Perp/components/TradingPanel/panels/PerpTradingSetup.tsx` - 交易设置
- `packages/kit/src/views/Perp/components/TradingPanel/inputs/TradingFormInput.tsx` - 表单输入
- `packages/kit/src/views/Perp/components/TradingPanel/inputs/SizeInput.tsx` - 数量输入
- `packages/kit/src/views/Perp/components/TradingPanel/inputs/PriceInput.tsx` - 价格输入
- `packages/kit/src/views/Perp/components/TradingPanel/inputs/TpslInput.tsx` - 止盈止损输入
- `packages/kit/src/views/Perp/components/TradingPanel/inputs/TpSlFormInput.tsx` - 止盈止损表单
- `packages/kit/src/views/Perp/components/TradingPanel/selectors/TradeSideToggle.tsx` - 买卖切换
- `packages/kit/src/views/Perp/components/TradingPanel/selectors/OrderTypeSelector.tsx` - 订单类型
- `packages/kit/src/views/Perp/components/TradingPanel/selectors/SizeInputModeSelector.tsx` - 数量模式
- `packages/kit/src/views/Perp/components/TradingPanel/selectors/MarginModeSelector.tsx` - 保证金模式
- `packages/kit/src/views/Perp/components/TradingPanel/modals/OrderConfirmModal.tsx` - 订单确认
- `packages/kit/src/views/Perp/components/TradingPanel/modals/DepositWithdrawModal.tsx` - 存取款
- `packages/kit/src/views/Perp/components/TradingPanel/modals/LeverageAdjustModal.tsx` - 杠杆调整
- `packages/kit/src/views/Perp/components/TradingPanel/modals/MarginModeModal.tsx` - 保证金模式
- `packages/kit/src/views/Perp/components/TradingPanel/modals/EnableTradingModal.tsx` - 启用交易
- `packages/kit/src/views/Perp/components/TradingPanel/components/PerpsHeaderRight.tsx` - 头部右侧
- `packages/kit/src/views/Perp/components/TradingPanel/components/PerpsAccountNumberValue.tsx` - 账户数值
- `packages/kit/src/views/Perp/components/TradingPanel/components/LiquidationPriceDisplay.tsx` - 清算价格

#### 订单信息面板 (OrderInfoPanel)

- `packages/kit/src/views/Perp/components/OrderInfoPanel/PerpOrderInfoPanel.tsx` - 主组件
- `packages/kit/src/views/Perp/components/OrderInfoPanel/List/PerpPositionsList.tsx` - 持仓列表
- `packages/kit/src/views/Perp/components/OrderInfoPanel/List/PerpOpenOrdersList.tsx` - 挂单列表
- `packages/kit/src/views/Perp/components/OrderInfoPanel/List/PerpTradesHistoryList.tsx` - 交易历史
- `packages/kit/src/views/Perp/components/OrderInfoPanel/List/PerpAccountList.tsx` - 账户列表
- `packages/kit/src/views/Perp/components/OrderInfoPanel/List/CommonTableListView.tsx` - 通用表格
- `packages/kit/src/views/Perp/components/OrderInfoPanel/Components/PositionsRow.tsx` - 持仓行
- `packages/kit/src/views/Perp/components/OrderInfoPanel/Components/OpenOrdersRow.tsx` - 挂单行
- `packages/kit/src/views/Perp/components/OrderInfoPanel/Components/TradesHistoryRow.tsx` - 交易历史行
- `packages/kit/src/views/Perp/components/OrderInfoPanel/Components/AccountRow.tsx` - 账户行
- `packages/kit/src/views/Perp/components/OrderInfoPanel/SetTpslModal.tsx` - 设置止盈止损
- `packages/kit/src/views/Perp/components/OrderInfoPanel/ClosePositionModal.tsx` - 平仓
- `packages/kit/src/views/Perp/components/OrderInfoPanel/CloseAllPositionsModal.tsx` - 全部平仓
- `packages/kit/src/views/Perp/components/OrderInfoPanel/CancelAllOrdersModal.tsx` - 取消所有订单
- `packages/kit/src/views/Perp/components/OrderInfoPanel/AdjustPositionMarginModal.tsx` - 调整保证金
- `packages/kit/src/views/Perp/components/OrderInfoPanel/PerpTradersHistoryListModal.tsx` - 交易历史弹窗
- `packages/kit/src/views/Perp/components/OrderInfoPanel/utils.ts` - 工具函数

#### K 线图

- `packages/kit/src/views/Perp/components/PerpCandles.tsx` - K 线图组件

#### 订单簿

- `packages/kit/src/views/Perp/components/PerpOrderBook.tsx` - 订单簿组件
- `packages/kit/src/views/Perp/components/OrderBook/index.tsx` - 订单簿主组件
- `packages/kit/src/views/Perp/components/OrderBook/AggregationControls.tsx` - 聚合控制
- `packages/kit/src/views/Perp/components/OrderBook/useAggregatedBook.tsx` - 聚合逻辑
- `packages/kit/src/views/Perp/components/OrderBook/useTickOptions.ts` - 价格档位
- `packages/kit/src/views/Perp/components/OrderBook/tickSizeUtils.ts` - 价格工具
- `packages/kit/src/views/Perp/components/OrderBook/tickSizeUtils.test.ts` - 测试文件
- `packages/kit/src/views/Perp/components/OrderBook/utils.ts` - 工具函数
- `packages/kit/src/views/Perp/components/OrderBook/types.ts` - 类型定义
- `packages/kit/src/views/Perp/components/OrderBook/defaultAggregationBtn.tsx` - 默认聚合按钮
- `packages/kit/src/views/Perp/components/OrderBook/DefaultLoadingNode.tsx` - 加载节点

#### 价格信息栏

- `packages/kit/src/views/Perp/components/TickerBar/PerpTickerBar.tsx` - 主组件
- `packages/kit/src/views/Perp/components/TickerBar/PerpTickerBarDesktop.tsx` - 桌面端
- `packages/kit/src/views/Perp/components/TickerBar/PerpTickerBarMobile.tsx` - 移动端
- `packages/kit/src/views/Perp/components/TickerBar/MobilePerpMarketHeader.tsx` - 移动端市场头部

#### 代币选择器

- `packages/kit/src/views/Perp/components/TokenSelector/PerpTokenSelector.tsx` - 主组件
- `packages/kit/src/views/Perp/components/TokenSelector/MoblieTokenSelector.tsx` - 移动端选择器
- `packages/kit/src/views/Perp/components/TokenSelector/PerpTokenSelectorRow.tsx` - 代币行
- `packages/kit/src/views/Perp/components/TokenSelector/SortableHeaderCell.tsx` - 可排序表头

#### 持仓分享

- `packages/kit/src/views/Perp/components/PositionShare/index.tsx` - 主入口
- `packages/kit/src/views/Perp/components/PositionShare/PositionShareModal.tsx` - 分享弹窗
- `packages/kit/src/views/Perp/components/PositionShare/ShareView.tsx` - 分享视图
- `packages/kit/src/views/Perp/components/PositionShare/ShareView.native.tsx` - 原生分享视图
- `packages/kit/src/views/Perp/components/PositionShare/ShareImageGenerator.tsx` - 图片生成
- `packages/kit/src/views/Perp/components/PositionShare/ShareImageGenerator.native.tsx` - 原生图片生成
- `packages/kit/src/views/Perp/components/PositionShare/ShareContentRenderer.tsx` - 内容渲染
- `packages/kit/src/views/Perp/components/PositionShare/ControlPanel.tsx` - 控制面板
- `packages/kit/src/views/Perp/components/PositionShare/useShareActions.ts` - 分享操作
- `packages/kit/src/views/Perp/components/PositionShare/useReferralUrl.ts` - 推荐链接
- `packages/kit/src/views/Perp/components/PositionShare/types.ts` - 类型定义
- `packages/kit/src/views/Perp/components/PositionShare/constants.ts` - 常量

#### 邀请奖励

- `packages/kit/src/views/Perp/components/InviteeReward/index.tsx` - 主入口
- `packages/kit/src/views/Perp/components/InviteeReward/InviteeRewardModal.tsx` - 奖励弹窗
- `packages/kit/src/views/Perp/components/InviteeReward/InviteeRewardContent.tsx` - 奖励内容
- `packages/kit/src/views/Perp/components/InviteeReward/components/RewardHistoryList.tsx` - 奖励历史
- `packages/kit/src/views/Perp/components/InviteeReward/components/RewardSummaryCard.tsx` - 奖励摘要
- `packages/kit/src/views/Perp/components/InviteeReward/hooks/useShowInviteeRewardModal.ts` - 显示弹窗 Hook

#### 其他组件

- `packages/kit/src/views/Perp/components/PerpsGlobalEffects.tsx` - 全局效果
- `packages/kit/src/views/Perp/components/PerpContentFooter.tsx` - 内容底部
- `packages/kit/src/views/Perp/components/PerpSettingsButton.tsx` - 设置按钮
- `packages/kit/src/views/Perp/components/PerpSettingsDialog.tsx` - 设置弹窗
- `packages/kit/src/views/Perp/components/PerpTips.tsx` - 提示组件
- `packages/kit/src/views/Perp/components/TradingGuardWrapper.tsx` - 交易守卫
- `packages/kit/src/views/Perp/components/PullToRefresh.tsx` - 下拉刷新
- `packages/kit/src/views/Perp/components/PerpsSlider.tsx` - 滑块组件
- `packages/kit/src/views/Perp/components/HyperliquidTerms.tsx` - 条款组件

### 4. Hooks

- `packages/kit/src/views/Perp/hooks/index.ts` - Hooks 导出
- `packages/kit/src/views/Perp/hooks/useTradingPrice.ts` - 交易价格
- `packages/kit/src/views/Perp/hooks/useTradingCalculationsForSide.ts` - 交易计算
- `packages/kit/src/views/Perp/hooks/useShowPositionShare.ts` - 显示持仓分享
- `packages/kit/src/views/Perp/hooks/useShowDepositWithdrawModal.ts` - 显示存取款弹窗
- `packages/kit/src/views/Perp/hooks/usePerpsMidPrice.ts` - 中间价
- `packages/kit/src/views/Perp/hooks/usePerpsAssetCtx.ts` - 资产上下文
- `packages/kit/src/views/Perp/hooks/usePerpTokenSelector.ts` - 代币选择器
- `packages/kit/src/views/Perp/hooks/usePerpSession.ts` - Perp 会话
- `packages/kit/src/views/Perp/hooks/usePerpsLogo.tsx` - Logo
- `packages/kit/src/views/Perp/hooks/usePerpOrderInfoPanel.ts` - 订单信息面板
- `packages/kit/src/views/Perp/hooks/usePerpMarketData.ts` - 市场数据
- `packages/kit/src/views/Perp/hooks/usePerpDeposit.ts` - 充值
- `packages/kit/src/views/Perp/hooks/useOrderConfirm.ts` - 订单确认
- `packages/kit/src/views/Perp/hooks/useLiquidationPrice.ts` - 清算价格
- `packages/kit/src/views/Perp/hooks/useFundingCountdown.ts` - 资金费率倒计时

### 5. Provider

- `packages/kit/src/views/Perp/PerpsProvider.tsx` - Perp Provider
- `packages/kit/src/views/Perp/PerpsProviderMirror.tsx` - Provider 镜像
- `packages/kit/src/views/Perp/PerpsAccountSelectorProviderMirror.tsx` - 账户选择器 Provider

### 6. 状态管理

#### 全局状态 Atoms

- `packages/kit-bg/src/states/jotai/atoms/perps.ts` - Perp 全局状态定义

#### 上下文状态

- `packages/kit/src/states/jotai/contexts/hyperliquid/atoms.ts` - 上下文状态定义
- `packages/kit/src/states/jotai/contexts/hyperliquid/actions.ts` - 上下文操作
- `packages/kit/src/states/jotai/contexts/hyperliquid/index.ts` - 导出
- `packages/kit/src/states/jotai/contexts/hyperliquid/utils/config.ts` - 配置工具
- `packages/kit/src/states/jotai/contexts/hyperliquid/utils/toastFeedback.ts` - Toast 反馈
- `packages/kit/src/states/jotai/contexts/hyperliquid/utils/types.ts` - 类型定义
- `packages/kit/src/states/jotai/contexts/hyperliquid/utils/withToast.ts` - Toast 包装器
- `packages/kit/src/states/jotai/contexts/hyperliquid/utils/index.ts` - 工具导出

### 7. 服务层

#### 核心服务

- `packages/kit-bg/src/services/ServiceHyperLiquid/ServiceHyperliquid.ts` - 主服务
- `packages/kit-bg/src/services/ServiceHyperLiquid/ServiceHyperliquidExchange.ts` - 交易服务
- `packages/kit-bg/src/services/ServiceHyperLiquid/ServiceHyperliquidWallet.ts` - 钱包服务
- `packages/kit-bg/src/services/ServiceHyperLiquid/ServiceHyperliquidSubscription.ts` - 订阅服务

#### 辅助文件

- `packages/kit-bg/src/services/ServiceHyperLiquid/hyperLiquidApiClients.ts` - API 客户端
- `packages/kit-bg/src/services/ServiceHyperLiquid/hyperLiquidCache.ts` - 缓存管理
- `packages/kit-bg/src/services/ServiceHyperLiquid/utils/SubscriptionConfig.ts` - 订阅配置

#### 其他服务中的 Perp 相关

- `packages/kit-bg/src/services/ServiceSwap.ts` - 交换服务（包含 Perp 充值相关）

### 8. 工具函数

- `packages/kit/src/views/Perp/utils/index.ts` - 工具导出
- `packages/kit/src/views/Perp/utils/styleUtils.ts` - 样式工具

### 9. 类型定义

#### Shared 类型

- `packages/shared/src/types/hyperliquid/types.ts` - Hyperliquid 类型定义
- `packages/shared/src/types/hyperliquid/sdk.ts` - SDK 类型定义
- `packages/shared/src/types/hyperliquid/webview.ts` - WebView 类型定义
- `packages/shared/src/types/hyperliquid/perp.constants.ts` - 常量定义

#### 常量

- `packages/shared/src/consts/perp.ts` - Perp 相关常量

### 10. 日志

- `packages/shared/src/logger/scopes/perp/index.ts` - Perp 日志入口
- `packages/shared/src/logger/scopes/perp/type.ts` - 日志类型
- `packages/shared/src/logger/scopes/perp/scenes/hyperliquid.ts` - Hyperliquid 场景日志
- `packages/shared/src/logger/scopes/perp/scenes/deposit.ts` - 充值场景日志
- `packages/shared/src/logger/scopes/perp/scenes/common.ts` - 通用场景日志

### 11. 设置页面

- `packages/kit/src/views/Setting/pages/PerpUserConfig/index.tsx` - Perp 用户配置页面

### 12. 错误处理

- `packages/shared/src/utils/hyperLiquidErrorResolver.ts` - Hyperliquid 错误解析

### 13. 工具函数

- `packages/shared/src/utils/perpsUtils.ts` - Perp 工具函数

### 14. 路由工具

- `packages/shared/src/utils/routeUtils.ts` - 路由工具（包含 Perp 相关）

---

## 代码统计

### 文件数量统计

- **页面组件：** 3 个
- **布局组件：** 2 个
- **核心业务组件：** 约 80+ 个
- **Hooks：** 15+ 个
- **服务：** 4 个核心服务 + 辅助文件
- **状态管理：** 2 个主要文件（全局 + 上下文）
- **路由配置：** 3 个文件
- **类型定义：** 4+ 个文件
- **工具函数：** 多个文件

### 代码组织特点

1. **模块化：** 按功能划分目录（TradingPanel, OrderInfoPanel, OrderBook 等）
2. **平台适配：** 桌面端和移动端分离（DesktopLayout vs MobileLayout）
3. **状态分层：** 全局状态和上下文状态分离
4. **服务分离：** 交易、钱包、订阅服务独立
5. **类型安全：** 完整的 TypeScript 类型定义

---

---

## Perp 功能专门引入的依赖

### 1. 核心 SDK 依赖

#### @nktkas/hyperliquid

**版本：** `0.24.2`  
**位置：** `package.json` (第 69 行)

**用途：** Hyperliquid 交易所的官方 JavaScript SDK

**使用位置：**

1. **ServiceHyperliquidExchange.ts**

   ```typescript
   import { ExchangeClient, HttpTransport } from '@nktkas/hyperliquid';
   ```

   - `ExchangeClient` - 交易所客户端，用于下单、取消订单等交易操作
   - `HttpTransport` - HTTP 传输层

2. **ServiceHyperliquidSubscription.ts**

   ```typescript
   import { SubscriptionClient, WebSocketTransport } from '@nktkas/hyperliquid';
   ```

   - `SubscriptionClient` - 订阅客户端，用于 WebSocket 实时数据订阅
   - `WebSocketTransport` - WebSocket 传输层

3. **hyperLiquidApiClients.ts**

   ```typescript
   import { ... } from '@nktkas/hyperliquid';
   ```

   - API 客户端封装

4. **类型定义**
   - `packages/shared/types/hyperliquid/sdk.ts` - 从 SDK 导入类型定义
   - `packages/kit/src/views/Perp/components/OrderInfoPanel/List/PerpOpenOrdersList.tsx` - 使用 `FrontendOrder` 类型
   - `packages/kit/src/views/Perp/components/OrderInfoPanel/Components/OpenOrdersRow.tsx` - 使用 `FrontendOrder` 类型

**功能：**

- 提供与 Hyperliquid 交易所交互的 API
- WebSocket 实时数据订阅
- 订单管理（下单、取消、查询）
- 账户信息查询
- 市场数据获取

### 2. 依赖说明

#### 专门为 Perp 引入的依赖

- ✅ **@nktkas/hyperliquid** - 这是唯一专门为 Perp 功能引入的外部 npm 包

#### 其他依赖（非 Perp 专用）

以下依赖虽然被 Perp 功能使用，但它们是项目中的通用依赖，不是专门为 Perp 引入的：

- `bignumber.js` - 大数运算（项目通用）
- `ethersV6` - Ethereum 相关（项目通用）
- `jotai` - 状态管理（项目通用）
- `lightweight-charts` - K 线图库（Market、Earn 等功能也在使用）
  - Perp 的 K 线图实际使用的是 `TradingViewPerpsV2` 组件（WebView 方式），不使用 lightweight-charts

### 3. 依赖使用统计

**直接使用 @nktkas/hyperliquid 的文件：**

- `packages/kit-bg/src/services/ServiceHyperLiquid/ServiceHyperliquidExchange.ts`
- `packages/kit-bg/src/services/ServiceHyperLiquid/ServiceHyperliquidSubscription.ts`
- `packages/kit-bg/src/services/ServiceHyperLiquid/hyperLiquidApiClients.ts`
- `packages/shared/types/hyperliquid/sdk.ts` (类型导入)
- `packages/kit/src/views/Perp/components/OrderInfoPanel/List/PerpOpenOrdersList.tsx` (类型使用)
- `packages/kit/src/views/Perp/components/OrderInfoPanel/Components/OpenOrdersRow.tsx` (类型使用)

### 4. 依赖版本

```json
{
  "dependencies": {
    "@nktkas/hyperliquid": "0.24.2"
  }
}
```

**版本说明：** 当前使用版本为 `0.24.2`，这是一个相对较新的版本，提供了完整的 Hyperliquid API 支持。

### 5. 依赖影响范围

**影响范围：**

- ✅ 仅影响 Perp 相关功能
- ✅ 如果移除该依赖，Perp 功能将无法工作
- ✅ 不影响其他功能模块

**打包影响：**

- 该依赖会被包含在支持 Perp 功能的构建产物中
- 如果 Perp 功能被禁用，理论上可以通过代码分割优化，但当前实现中该依赖仍会被打包

---

_文档生成时间：2024 年_
_阶段：第五阶段 - 完整代码路径清单_
_分析完成_
