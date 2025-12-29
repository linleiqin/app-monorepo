# Market 业务代码分析文档

> 本文档分析 Market（市场）功能的业务代码结构。

## 目录索引

### 第一部分：业务入口和路由

- [业务入口分析](#业务入口分析)
  - [Tab 路由入口](#1-tab-路由入口)
  - [主页面入口](#2-主页面入口)
  - [Tab 配置检查](#3-tab-配置检查)
- [路由配置](#路由配置)
  - [Tab 子路由](#1-tab-子路由)
  - [路由参数类型](#2-路由参数类型)
- [业务入口总结](#业务入口总结)

### 第二部分：核心组件和页面结构

- [核心组件和页面结构](#核心组件和页面结构)
  - [布局组件](#1-布局组件)
    - [桌面端布局](#桌面端布局)
    - [移动端布局](#移动端布局)
  - [核心业务组件](#2-核心业务组件)
    - [代币列表组件](#代币列表组件)
    - [代币详情组件](#代币详情组件)
    - [交易面板组件](#交易面板组件)
    - [K 线图组件](#k-线图组件)
  - [其他重要组件](#3-其他重要组件)
    - [自选列表](#自选列表)
    - [推荐列表](#推荐列表)
    - [筛选器组件](#筛选器组件)
  - [页面组件](#4-页面组件)

### 第三部分：服务层架构

- [服务层架构](#服务层架构)
  - [核心服务](#1-核心服务)
    - [ServiceMarket (市场服务 V1)](#servicemarket-市场服务-v1)
    - [ServiceMarketV2 (市场服务 V2)](#servicemarketv2-市场服务-v2)
    - [ServiceMarketWS (WebSocket 服务)](#servicemarketws-websocket-服务)
  - [服务注册](#2-服务注册)
  - [服务调用流程](#3-服务调用流程)

### 第四部分：状态管理和数据流

- [状态管理和数据流](#状态管理和数据流)
  - [状态管理架构](#1-状态管理架构)
    - [全局状态 (Global Atoms)](#全局状态-global-atoms)
    - [上下文状态 (Context Atoms)](#上下文状态-context-atoms)
  - [Provider 结构](#2-provider-结构)
  - [Actions (操作)](#3-actions-操作)
  - [数据流](#4-数据流)
    - [初始化流程](#初始化流程)
    - [代币列表加载流程](#代币列表加载流程)
    - [代币详情加载流程](#代币详情加载流程)
    - [自选列表管理流程](#自选列表管理流程)
  - [数据持久化](#5-数据持久化)

### 第五部分：代码路径清单

- [完整代码路径清单](#完整代码路径清单)
  - [@onekeyhq/shared](#1-onekeyhqshared)
  - [@onekeyhq/kit](#2-onekeyhqkit)
  - [@onekeyhq/kit-bg](#3-onekeyhqkit-bg)

### 第六部分：依赖分析

- [Market 功能专门引入的依赖](#market-功能专门引入的依赖)

---

## 业务入口分析

### 1. Tab 路由入口

**文件路径：** `packages/shared/src/routes/tab.ts`

```typescript
export enum ETabRoutes {
  Market = 'Market',
  // ... 其他路由
}
```

**路由注册：** `packages/kit/src/routes/Tab/router.ts`

```typescript
shouldShowMarketTab
  ? {
      name: ETabRoutes.Market,
      tabBarIcon: (focused?: boolean) =>
        focused ? 'ChartTrendingUp2Solid' : 'ChartTrendingUp2Outline',
      translationId: ETranslations.global_market,
      freezeOnBlur: Boolean(params?.freezeOnBlur),
      rewrite: '/market',
      exact: true,
      children: marketRouters,
      trackId: 'global-market',
      // Only apply custom tab press handler for non-mobile platforms
      ...(platformEnv.isDesktop ||
      platformEnv.isWeb ||
      platformEnv.isExtension
        ? { onPressWhenSelected: handleMarketTabPress }
        : {}),
    }
  : undefined,
```

**关键特性：**

- Tab 图标：`ChartTrendingUp2Solid` / `ChartTrendingUp2Outline`
- 翻译 ID：`global_market`
- 重写路径：`/market`
- 平台显示控制：在扩展弹窗和侧边栏模式下隐藏
- 桌面端/Web 端特殊处理：点击已选中的 Tab 时跳转到首页

### 2. 主页面入口

**文件路径：** `packages/kit/src/views/Market/MarketHome.tsx`

这是 Market 功能的主入口组件，包含以下关键逻辑：

```typescript
export default function MarketHome(props: any) {
  return <MarketHomeV2 {...props} />;
}
```

实际实现位于 `MarketHomeV2` 组件：

**文件路径：** `packages/kit/src/views/Market/MarketHomeV2/MarketHomeV2.tsx`

**关键逻辑：**

- **Provider 包装：**
  - `AccountSelectorProviderMirror` - 账户选择器
  - `MarketWatchListProviderMirrorV2` - 自选列表状态管理
- **布局选择：** 根据屏幕尺寸选择桌面或移动端布局
- **配置加载：** 使用 `useMarketBasicConfig` 加载市场基础配置
- **网络选择：** 使用 `useSelectedNetworkIdAtom` 管理选中的网络
- **数据分析：** 使用多个 Analytics hooks 追踪用户行为

### 3. Tab 配置检查

**文件路径：** `packages/kit/src/routes/Tab/router.ts`

```typescript
const shouldShowMarketTab = !(
  platformEnv.isExtensionUiPopup || platformEnv.isExtensionUiSidePanel
);
```

**功能：**

- 检查平台环境
- 在扩展弹窗和侧边栏模式下隐藏 Market Tab
- 其他平台正常显示

**Tab 点击处理：**

```typescript
const handleMarketTabPress = useMemo(() => {
  return () => {
    const navigation = rootNavigationRef.current;
    if (navigation) {
      // Always navigate to Market home when this handler is called
      navigation.dispatch(
        CommonActions.navigate({
          name: ETabRoutes.Market,
          params: {
            screen: ETabMarketRoutes.TabMarket,
          },
          pop: true,
        }),
      );
    }
  };
}, []);
```

**功能：**

- 仅在桌面端/Web 端/扩展端生效
- 点击已选中的 Tab 时跳转到 Market 首页

---

## 路由配置

### 1. Tab 子路由

**文件路径：** `packages/kit/src/routes/Tab/Marktet/router.ts`

```typescript
export const marketRouters: ITabSubNavigatorConfig<any, any>[] = [
  {
    rewrite: '/',
    name: ETabMarketRoutes.TabMarket,
    headerShown: !platformEnv.isNative,
    component: MarketHome, // 主页面
  },
  {
    name: ETabMarketRoutes.MarketDetail,
    component: MarketDetail, // 代币详情页（V1）
    rewrite: '/tokens/:token',
  },
  {
    name: ETabMarketRoutes.MarketDetailV2,
    component: MarketDetailV2, // 代币详情页（V2）
    headerShown: !platformEnv.isNative,
    rewrite: '/token/:network/:tokenAddress',
  },
];
```

**路由说明：**

- **TabMarket：** Market 首页，重写路径为 `/`
- **MarketDetail：** 代币详情页 V1，路径为 `/tokens/:token`（使用 coingeckoId）
- **MarketDetailV2：** 代币详情页 V2，路径为 `/token/:network/:tokenAddress`（使用网络和代币地址）

### 2. 路由参数类型

**文件路径：** `packages/shared/src/routes/tabMarket.ts`

```typescript
export enum ETabMarketRoutes {
  TabMarket = 'TabMarket',
  MarketDetail = 'MarketDetail',
  MarketDetailV2 = 'MarketDetailV2',
}

export type ITabMarketParamList = {
  [ETabMarketRoutes.TabMarket]: { from?: EEnterWay } | undefined;
  [ETabMarketRoutes.MarketDetail]: {
    token: string; // coingeckoId
  };
  [ETabMarketRoutes.MarketDetailV2]: {
    tokenAddress: string;
    network: string; // 网络短码，如 'bsc'
    isNative?: boolean;
    from?: EEnterWay;
    disableTrade?: boolean;
  };
};
```

**参数说明：**

- **TabMarket：** 可选参数 `from` 用于追踪进入方式
- **MarketDetail：** 使用 `token` (coingeckoId) 作为参数
- **MarketDetailV2：** 使用 `tokenAddress` 和 `network` 作为参数，支持原生代币标识

---

## 业务入口总结

### 入口流程

1. **用户点击 Tab** → `ETabRoutes.Market`
2. **路由检查** → `shouldShowMarketTab` 判断是否显示
3. **加载主页面** → `packages/kit/src/views/Market/MarketHome.tsx`
4. **初始化 Provider** → 账户选择器和自选列表状态管理
5. **加载配置** → `useMarketBasicConfig` 获取市场基础配置
6. **渲染布局** → 根据平台选择桌面/移动端布局

### 关键文件

- **路由定义：** `packages/shared/src/routes/tab.ts` (第 17 行)
- **路由配置：** `packages/kit/src/routes/Tab/router.ts` (第 141-158 行)
- **子路由配置：** `packages/kit/src/routes/Tab/Marktet/router.ts`
- **主入口组件：** `packages/kit/src/views/Market/MarketHome.tsx`
- **实际实现：** `packages/kit/src/views/Market/MarketHomeV2/MarketHomeV2.tsx`
- **路由参数类型：** `packages/shared/src/routes/tabMarket.ts`

---

## 核心组件和页面结构

### 1. 布局组件

#### Market 首页布局

**桌面端布局**

**文件路径：** `packages/kit/src/views/Market/MarketHomeV2/layouts/DesktopLayout.tsx`

**结构：**

```
DesktopLayout
├── Tabs.TabBar (Tab 切换栏)
└── Carousel (轮播容器)
    ├── MarketWatchlistTokenList (自选列表)
    └── YStack
        ├── MarketFilterBar (筛选栏)
        └── MarketNormalTokenList (代币列表)
```

**关键特性：**

- Tab 切换：支持"全部"和"自选"两个 Tab
- 轮播容器：使用 Carousel 组件实现 Tab 切换
- 筛选栏：网络选择、时间范围选择、流动性筛选
- 响应式高度：`calc(100vh - 96px)`

**移动端布局**

**文件路径：** `packages/kit/src/views/Market/MarketHomeV2/layouts/MobileLayout.tsx`

**结构：**

```
MobileLayout
├── Tabs.TabBar (Tab 切换栏)
└── Carousel (轮播容器)
    ├── MarketWatchlistTokenList (自选列表)
    └── YStack
        ├── MarketFilterBarSmall (筛选栏)
        └── MarketNormalTokenList (代币列表)
```

**关键特性：**

- 移动端优化：使用 `MarketFilterBarSmall` 组件
- 安全区域适配：使用 `useSafeAreaInsets` 计算高度
- 响应式高度：`Dimensions.get('window').height - top - bottom - 188`

#### 代币详情页布局

**桌面端布局**

**文件路径：** `packages/kit/src/views/Market/MarketDetailV2/layouts/DesktopLayout.tsx`

**结构：**

```
DesktopLayout
├── YStack (左侧列)
│   ├── TokenDetailHeader (代币详情头部)
│   ├── MarketTradingView (K 线图)
│   └── DesktopInformationTabs (信息标签页)
└── Stack (右侧列，320px)
    ├── SwapPanel (交易面板)
    ├── TokenActivityOverview (活动概览)
    └── TokenSupplementaryInfo (补充信息)
```

**关键特性：**

- 左右分栏布局：左侧主要内容，右侧固定宽度交易面板
- K 线图：使用 `MarketTradingView` 组件
- 信息标签页：仅在非原生代币时显示
- 交易面板：固定宽度 320px

**移动端布局**

**文件路径：** `packages/kit/src/views/Market/MarketDetailV2/layouts/MobileLayout.tsx`

**结构：**

```
MobileLayout
├── Tabs.TabBar (Tab 切换栏)
└── ScrollView (水平滚动容器)
    ├── YStack (图表 Tab)
    │   ├── InformationPanel (信息面板)
    │   ├── MarketTradingView (K 线图)
    │   └── MobileInformationTabs (移动端信息标签页)
    └── YStack (概览 Tab)
        ├── TokenOverview (代币概览)
        └── TokenActivityOverview (活动概览)
└── SwapPanel (交易面板，底部固定)
```

**关键特性：**

- Tab 切换：图表和概览两个 Tab
- 水平滚动：使用 `ScrollView` 实现 Tab 切换
- 交易面板：底部固定显示
- 原生代币特殊处理：原生代币时交易面板不显示

### 2. 核心业务组件

#### 代币列表组件

**文件路径：** `packages/kit/src/views/Market/MarketHomeV2/components/MarketTokenList/MarketTokenListBase.tsx`

**子组件：**

- `MarketNormalTokenList` - 普通代币列表
- `MarketWatchlistTokenList` - 自选代币列表

**功能：**

- 代币列表展示
- 排序功能（价格、市值、流动性、24h 成交量）
- 分页加载
- 网络切换
- 点击跳转到详情页

**列定义：**

**桌面端列：**

- `#` - 序号/收藏按钮
- `名称` - 代币名称和图标
- `价格` - 当前价格
- `24h 涨跌` - 24 小时涨跌幅
- `24h 成交量` - 24 小时成交量
- `市值` - 市值
- `流动性` - 流动性
- `操作` - 交易按钮

**移动端列：**

- `名称` - 代币名称和图标
- `价格` - 当前价格和 24h 涨跌
- `24h 成交量` - 24 小时成交量
- `市值` - 市值

**相关文件：**

```
MarketTokenList/
├── MarketTokenListBase.tsx (基础列表组件)
├── MarketNormalTokenList.tsx (普通列表)
├── MarketWatchlistTokenList.tsx (自选列表)
├── MarketTokenData.ts (数据类型定义)
├── hooks/
│   ├── useMarketTokenList.ts (列表数据 Hook)
│   ├── useMarketWatchlistTokenList.ts (自选列表 Hook)
│   ├── useMarketTokenColumns/ (列定义 Hooks)
│   │   ├── useMarketTokenColumns.tsx (主 Hook)
│   │   ├── useColumnsDesktop.tsx (桌面端列)
│   │   └── useColumnsMobile.tsx (移动端列)
│   └── useToMarketDetailPage.ts (跳转详情页 Hook)
└── components/
    └── TokenIdentityItem/ (代币身份组件)
```

#### 代币详情组件

**文件路径：** `packages/kit/src/views/Market/MarketDetailV2/MarketDetailV2.tsx`

**子组件：**

- `TokenDetailHeader` - 代币详情头部
- `MarketTradingView` - K 线图
- `SwapPanel` - 交易面板
- `TokenOverview` - 代币概览
- `TokenActivityOverview` - 活动概览
- `TokenSupplementaryInfo` - 补充信息
- `InformationTabs` - 信息标签页

**功能：**

- 代币基本信息展示
- K 线图展示
- 交易功能
- 持仓信息
- 交易历史
- 持有人信息

**相关文件：**

```
MarketDetailV2/
├── MarketDetailV2.tsx (主组件)
├── components/
│   ├── TokenDetailHeader/ (详情头部)
│   ├── MarketTradingView/ (K 线图)
│   ├── SwapPanel/ (交易面板)
│   ├── TokenOverview/ (代币概览)
│   ├── TokenActivityOverview/ (活动概览)
│   ├── TokenSupplementaryInfo/ (补充信息)
│   └── InformationTabs/ (信息标签页)
│       ├── components/
│       │   ├── TransactionsHistory/ (交易历史)
│       │   ├── Portfolio/ (持仓)
│       │   └── Holders/ (持有人)
│       └── layout/
│           ├── DesktopInformationTabs.tsx
│           └── MobileInformationTabs.tsx
└── hooks/
    ├── useTokenDetail.ts (代币详情 Hook)
    ├── useAutoRefreshTokenDetail.ts (自动刷新)
    └── useMarketHolders.ts (持有人数据)
```

#### 交易面板组件

**文件路径：** `packages/kit/src/views/Market/MarketDetailV2/components/SwapPanel/SwapPanel.tsx`

**功能：**

- 代币交换功能
- 价格显示
- 滑点设置
- 交易确认

**平台适配：**

- **原生平台：** 显示交易按钮，点击跳转到 Swap Tab
- **桌面端/Web 端：** 大屏幕显示完整面板，小屏幕显示弹窗

**相关文件：**

```
SwapPanel/
├── SwapPanel.tsx (主组件)
├── SwapPanelWrap.tsx (包装组件)
├── SwapPanelContent.tsx (内容组件)
├── components/
│   ├── TokenInputSection/ (代币输入区域)
│   ├── ActionButton.tsx (操作按钮)
│   ├── ApproveButton/ (授权按钮)
│   └── RateDisplay.tsx (汇率显示)
└── hooks/
    ├── useSpeedSwapInit.tsx (快速交换初始化)
    ├── useSpeedSwapActions.tsx (快速交换操作)
    └── useSwapAnalytics.ts (交换分析)
```

#### K 线图组件

**文件路径：** `packages/kit/src/views/Market/MarketDetailV2/components/MarketTradingView/MarketTradingView.tsx`

**功能：**

- K 线图展示
- 支持 WebSocket 和轮询两种数据源
- 实时价格更新

**实现：**

- 使用 `TradingViewV2` 组件
- 支持 WebSocket 实时数据
- 支持轮询数据

**相关文件：**

```
MarketTradingView/
├── MarketTradingView.tsx (主组件)
└── index.ts

其他相关：
├── components/Chart/ (图表组件)
│   ├── ChartView.tsx
│   ├── ChartViewAdapter.tsx
│   └── chartUtils.ts
└── components/TokenPriceChart.tsx (价格图表)
```

### 3. 其他重要组件

#### 自选列表

**文件路径：** `packages/kit/src/views/Market/MarketHomeV2/components/MarketTokenList/MarketWatchlistTokenList.tsx`

**功能：**

- 显示用户自选的代币
- 支持添加/删除自选
- 实时价格更新

**实现：**

- 使用 `useMarketWatchlistTokenList` Hook
- 从 `marketWatchListV2Atom` 获取数据
- 支持批量查询代币信息

#### 推荐列表

**文件路径：** `packages/kit/src/views/Market/MarketHomeV2/components/MarketRecommendList/MarketRecommendList.tsx`

**功能：**

- 显示推荐代币
- 支持批量添加到自选
- 空状态展示

**特性：**

- 网格布局：2 列显示
- 选择模式：支持多选
- 批量添加：一键添加多个代币到自选

#### 筛选器组件

**文件路径：** `packages/kit/src/views/Market/MarketHomeV2/components/MarketFilterBar/MarketFilterBar.tsx`

**功能：**

- 网络选择
- 时间范围选择
- 流动性筛选

**子组件：**

- `MarketTokenListNetworkSelector` - 网络选择器
- `TimeRangeSelector` - 时间范围选择器
- `LiquidityFilterControl` - 流动性筛选器

**相关文件：**

```
MarketFilterBar/
├── MarketFilterBar.tsx (桌面端筛选栏)
└── MarketFilterBarSmall.tsx (移动端筛选栏)

MarketTokenListNetworkSelector/
├── MarketTokenListNetworkSelector.tsx (主组件)
├── MarketNetworkFilter.tsx (网络筛选)
└── MarketNetworkFilterMobile.tsx (移动端筛选)

TimeRangeSelector/
└── TimeRangeSelector.tsx (时间范围选择器)

LiquidityFilterControl/
├── LiquidityFilterControl.tsx (主组件)
└── LiquidityFilterContent.tsx (筛选内容)
```

### 4. 页面组件

#### Market 首页

**文件路径：** `packages/kit/src/views/Market/MarketHome.tsx`

**功能：**

- 入口组件
- Provider 包装
- 布局选择

**实际实现：** `MarketHomeV2`

#### 代币详情页

**文件路径：** `packages/kit/src/views/Market/MarketDetail.tsx`

**功能：**

- 路由分发：根据参数选择 V1 或 V2 版本
- V1：使用 coingeckoId
- V2：使用网络和代币地址

**实际实现：**

- `MarketDetailV1` - V1 版本（旧版）
- `MarketDetailV2` - V2 版本（新版）

---

## 服务层架构

### 1. 核心服务

#### ServiceMarket (市场服务 V1)

**文件路径：** `packages/kit-bg/src/services/ServiceMarket.ts`

**职责：**

- 市场分类数据获取
- 代币搜索（V1）
- 代币详情获取（基于 coingeckoId）
- 代币图表数据
- 自选列表管理（V1，已废弃）

**主要方法：**

```typescript
// 分类和搜索
async fetchCategories(filters) - 获取市场分类列表
async fetchSearchTrending() - 获取搜索趋势
async fetchCategory(category, coingeckoIds, sparkline) - 获取分类代币列表
async searchToken(query) - 搜索代币（V1）
async searchV2Token(query) - 搜索代币（V2）

// 代币详情
async fetchMarketTokenDetail(coingeckoId, explorerPlatforms) - 获取代币详情
async fetchTokenChart(coingeckoId, days) - 获取代币图表数据
async fetchPools(detailPlatforms) - 获取代币池信息

// 自选列表（已废弃）
async addMarketWatchList() - 添加自选（已废弃）
async removeMarketWatchList() - 删除自选（已废弃）
async getMarketWatchList() - 获取自选列表（已废弃）
```

**关键特性：**

- 使用 `memoizee` 进行缓存
- 分类数据缓存 15 分钟
- 搜索趋势缓存 5 分钟
- 自选列表功能已废弃，建议使用 V2

#### ServiceMarketV2 (市场服务 V2)

**文件路径：** `packages/kit-bg/src/services/ServiceMarketV2.ts`

**职责：**

- 市场基础配置获取
- 代币列表获取（支持分页、排序、筛选）
- 代币详情获取（基于网络和代币地址）
- K 线数据获取
- 交易历史获取
- 持有人信息获取
- 账户持仓信息获取
- 代币安全信息获取
- 自选列表管理（V2）

**主要方法：**

```typescript
// 配置和网络
async fetchMarketBasicConfig() - 获取市场基础配置（缓存 1 小时）
async fetchMarketChains() - 获取支持的链列表（缓存 1 小时）

// 代币列表和详情
async fetchMarketTokenList({ networkId, sortBy, sortType, page, limit, minLiquidity, maxLiquidity }) - 获取代币列表
async fetchMarketTokenDetailByTokenAddress(tokenAddress, networkId) - 获取代币详情
async fetchMarketTokenListBatch({ tokenAddressList }) - 批量获取代币信息

// K 线和交易数据
async fetchMarketTokenKline({ tokenAddress, networkId, interval, timeFrom, timeTo }) - 获取 K 线数据
async fetchMarketTokenTransactions({ tokenAddress, networkId, cursor, limit }) - 获取代币交易历史
async fetchMarketAccountTokenTransactions({ accountAddress, tokenAddress, networkId, cursor, timeFrom, timeTo }) - 获取账户代币交易历史

// 持有人和持仓
async fetchMarketTokenHolders({ tokenAddress, networkId }) - 获取代币持有人列表
async fetchMarketAccountPortfolio({ accountAddress, networkId, tokenAddress }) - 获取账户持仓信息

// 安全信息
async fetchMarketTokenSecurity({ contractAddress, chainId }) - 获取代币安全信息（缓存 5 分钟）

// 自选列表（V2）
async addMarketWatchListV2({ watchList, callerName }) - 添加自选
async removeMarketWatchListV2({ items, callerName }) - 删除自选
async getMarketWatchListV2() - 获取自选列表
async getMarketWatchListItemV2({ chainId, contractAddress }) - 获取单个自选项
async clearAllMarketWatchListV2() - 清空自选列表
```

**关键特性：**

- 使用 `memoizee` 进行缓存
- 基础配置和链列表缓存 1 小时
- 代币安全信息缓存 5 分钟
- 支持云同步（通过 `servicePrimeCloudSync`）
- 支持排序索引管理

#### ServiceMarketWS (WebSocket 服务)

**文件路径：** `packages/kit-bg/src/services/ServiceMarketWS/ServiceMarektWs.ts`

**职责：**

- WebSocket 连接管理
- 实时数据订阅
- 订阅状态管理
- 数据计数和自动取消订阅

**订阅类型：**

```typescript
enum EChannel {
  tokenTxs = 'tokenTxs', // 代币交易
  ohlcv = 'ohlcv', // K 线数据
}
```

**主要方法：**

```typescript
// 连接管理
async connect() - 建立 WebSocket 连接
async disconnect() - 断开连接

// 订阅管理
async subscribeTokenTxs({ networkId, tokenAddress, currency }) - 订阅代币交易
async subscribeOHLCV({ networkId, tokenAddress, chartType, currency }) - 订阅 K 线数据
async unsubscribeTokenTxs({ networkId, tokenAddress, currency }) - 取消订阅代币交易
async unsubscribeOHLCV({ networkId, tokenAddress, chartType, currency }) - 取消订阅 K 线数据

// 数据管理
async clearDataCount({ address, type }) - 清除数据计数
```

**关键特性：**

- 使用共享的 WebSocket 连接（从 `PushProviderWebSocket` 获取）
- 订阅追踪器（`MarketSubscriptionTracker`）管理订阅状态
- 自动取消订阅：当数据积累超过阈值时自动取消订阅
- 事件总线：通过 `appEventBus` 发送数据更新事件
- 支持 OKX 数据格式转换

**订阅追踪器：**

**文件路径：** `packages/kit-bg/src/services/ServiceMarketWS/MarketSubscriptionTracker.ts`

**功能：**

- 追踪订阅状态
- 数据计数
- 自动取消订阅判断

### 2. 服务注册

**文件路径：** `packages/kit-bg/src/apis/IBackgroundApi.ts`

```typescript
export interface IBackgroundApi {
  // ... 其他服务
  serviceMarket: ServiceMarket;
  serviceMarketV2: ServiceMarketV2;
  serviceMarketWS: ServiceMarketWS;
  // ...
}
```

**文件路径：** `packages/kit-bg/src/apis/BackgroundApi.ts`

```typescript
get serviceMarket() {
  const ServiceMarket = require('../services/ServiceMarket') as typeof import('../services/ServiceMarket');
  const value = new ServiceMarket.default({ backgroundApi: this });
  Object.defineProperty(this, 'serviceMarket', { value });
  return value;
}

get serviceMarketV2() {
  const ServiceMarketV2 = require('../services/ServiceMarketV2') as typeof import('../services/ServiceMarketV2');
  const value = new ServiceMarketV2.default({ backgroundApi: this });
  Object.defineProperty(this, 'serviceMarketV2', { value });
  return value;
}

get serviceMarketWS() {
  const ServiceMarketWS = require('../services/ServiceMarketWS');
  const value = new ServiceMarketWS.default({ backgroundApi: this });
  Object.defineProperty(this, 'serviceMarketWS', { value });
  return value;
}
```

**文件路径：** `packages/kit-bg/src/apis/BackgroundApiProxy.ts`

服务通过 Proxy 模式暴露给前端使用：

```typescript
serviceMarket = this._createProxyService('serviceMarket') as ServiceMarket;
serviceMarketV2 = this._createProxyService(
  'serviceMarketV2',
) as ServiceMarketV2;
serviceMarketWS = this._createProxyService(
  'serviceMarketWS',
) as ServiceMarketWS;
```

### 3. 服务调用流程

#### 代币列表加载流程

```
前端组件
  ↓
useMarketTokenList Hook
  ↓
backgroundApiProxy.serviceMarketV2.fetchMarketTokenList()
  ↓
ServiceMarketV2.fetchMarketTokenList()
  ↓
HTTP GET /utility/v2/market/token/list
  ↓
返回代币列表数据
  ↓
更新 Atom 状态
  ↓
组件自动更新
```

#### 代币详情加载流程

```
前端组件
  ↓
useTokenDetail Hook
  ↓
backgroundApiProxy.serviceMarketV2.fetchMarketTokenDetailByTokenAddress()
  ↓
ServiceMarketV2.fetchMarketTokenDetailByTokenAddress()
  ↓
HTTP GET /utility/v2/market/token/detail
  ↓
返回代币详情数据
  ↓
更新 Atom 状态
  ↓
组件自动更新
```

#### WebSocket 数据订阅流程

```
前端组件挂载
  ↓
ServiceMarketWS.connect()
  ↓
获取共享 WebSocket 连接
  ↓
注册市场数据监听器
  ↓
订阅所需数据类型（subscribeTokenTxs / subscribeOHLCV）
  ↓
发送订阅消息到服务器
  ↓
接收实时数据
  ↓
处理数据（格式转换）
  ↓
发送事件到 appEventBus
  ↓
前端组件监听事件
  ↓
更新 Atom 状态
  ↓
组件自动更新
```

#### 自选列表管理流程

```
用户操作（添加/删除）
  ↓
调用 Actions（addIntoWatchListV2 / removeFormWatchListV2）
  ↓
backgroundApiProxy.serviceMarketV2.addMarketWatchListV2() / removeMarketWatchListV2()
  ↓
ServiceMarketV2.addMarketWatchListV2() / removeMarketWatchListV2()
  ↓
构建云同步项（buildMarketWatchListV2SyncItems）
  ↓
保存到本地数据库（simpleDb.marketWatchListV2）
  ↓
更新云同步项（localDb.addAndUpdateSyncItems）
  ↓
刷新自选列表（refreshWatchList）
  ↓
更新 Atom 状态
  ↓
组件自动更新
```

---

## 状态管理和数据流

### 1. 状态管理架构

Market 功能使用 **Jotai** 进行状态管理，采用上下文状态（Context Atoms）架构：

#### 上下文状态 (Context Atoms)

**位置：** `packages/kit/src/states/jotai/contexts/marketV2/atoms.ts`

**用途：** 功能内临时状态，会话级数据

**主要 Atoms：**

```typescript
// 自选列表
basicMarketWatchListV2Atom - 基础自选列表数据
marketV2StorageReadyAtom - 存储就绪状态
marketWatchListV2Atom - 自选列表（包含 isMounted 状态）

// 代币详情
tokenDetailAtom - 代币详情数据
tokenDetailLoadingAtom - 代币详情加载状态
tokenDetailWebsocketAtom - WebSocket 配置
tokenAddressAtom - 代币地址
networkIdAtom - 网络 ID
isNativeAtom - 是否原生代币

// 筛选和显示
showWatchlistOnlyAtom - 是否仅显示自选
selectedNetworkIdAtom - 选中的网络 ID

// 交换分析
swapAnalyticsAtom - 交换分析状态
```

**Atom 初始化：**

```typescript
// 自选列表 Atom 在挂载时自动初始化
marketWatchListV2Atom().onMount = (setAtom) => {
  setAtom(INIT);
  // 自动从服务获取数据
  void backgroundApiProxy.serviceMarketV2
    .getMarketWatchListV2()
    .then((data) => {
      set(basicMarketWatchListV2Atom(), data);
      set(marketV2StorageReadyAtom(), true);
    });
};
```

### 2. Provider 结构

#### MarketWatchListProviderV2

**文件路径：** `packages/kit/src/views/Market/MarketWatchListProviderV2.tsx`

```typescript
MarketWatchListProviderV2
  └── ProviderJotaiContextMarketV2 (Jotai Context Provider)
```

**功能：**

- 初始化 Jotai Context Store
- 提供状态管理上下文
- 使用 `EJotaiContextStoreNames.marketWatchListV2` 作为 Store 名称

#### MarketWatchListProviderMirrorV2

**文件路径：** `packages/kit/src/views/Market/MarketWatchListProviderMirrorV2.tsx`

**功能：**

- 镜像 Provider，用于组件树中嵌套使用
- 共享同一个 Context Store

### 3. Actions (操作)

**文件路径：** `packages/kit/src/states/jotai/contexts/marketV2/actions.ts`

**主要 Actions：**

```typescript
class ContextJotaiActionsMarketV2 {
  // 代币详情操作
  setTokenDetail() - 设置代币详情
  setTokenDetailLoading() - 设置加载状态
  setTokenAddress() - 设置代币地址
  setNetworkId() - 设置网络 ID
  setIsNative() - 设置是否原生代币
  setTokenDetailWebsocket() - 设置 WebSocket 配置
  fetchTokenDetail() - 获取代币详情
  clearTokenDetail() - 清除代币详情

  // 自选列表操作
  flushWatchListV2Atom() - 刷新自选列表 Atom
  refreshWatchListV2() - 刷新自选列表
  isInWatchListV2() - 检查是否在自选列表中
  addIntoWatchListV2() - 添加到自选列表
  removeFromWatchListV2() - 从自选列表移除
  sortWatchListV2Items() - 排序自选列表项
  saveWatchListV2() - 保存自选列表
  clearAllWatchListV2() - 清空自选列表

  // 显示控制
  setShowWatchlistOnly() - 设置是否仅显示自选
  toggleShowWatchlistOnly() - 切换显示模式
}
```

**Hook 使用：**

```typescript
// 自选列表操作
const actions = useWatchListV2Actions();
await actions.current.addIntoWatchListV2({ ... });
await actions.current.removeFromWatchListV2(chainId, contractAddress);

// 代币详情操作
const tokenActions = useTokenDetailActions();
await tokenActions.current.fetchTokenDetail(tokenAddress, networkId);

// 显示控制
const showActions = useShowWatchlistOnlyActions();
showActions.current.toggleShowWatchlistOnly();
```

### 4. 数据流

#### 初始化流程

```
应用启动
  ↓
MarketWatchListProviderV2 初始化
  ↓
创建 Jotai Context Store
  ↓
marketWatchListV2Atom.onMount 触发
  ↓
ServiceMarketV2.getMarketWatchListV2()
  ↓
更新 basicMarketWatchListV2Atom
  ↓
设置 marketV2StorageReadyAtom = true
  ↓
组件可以使用自选列表数据
```

#### 代币列表加载流程

```
用户选择网络
  ↓
更新 selectedNetworkIdAtom
  ↓
useMarketTokenList Hook 触发
  ↓
ServiceMarketV2.fetchMarketTokenList()
  ↓
返回代币列表数据
  ↓
更新本地状态（useState）
  ↓
组件重新渲染
```

#### 代币详情加载流程

```
用户点击代币
  ↓
跳转到详情页
  ↓
MarketDetailV2 组件挂载
  ↓
useTokenDetail Hook 触发
  ↓
设置 tokenAddressAtom 和 networkIdAtom
  ↓
fetchTokenDetail Action 调用
  ↓
ServiceMarketV2.fetchMarketTokenDetailByTokenAddress()
  ↓
更新 tokenDetailAtom
  ↓
组件显示代币详情
  ↓
useAutoRefreshTokenDetail Hook 启动定时刷新
  ↓
每 5 秒刷新一次代币详情
```

#### 自选列表管理流程

```
用户点击收藏按钮
  ↓
调用 addIntoWatchListV2 Action
  ↓
立即更新本地状态（乐观更新）
  ↓
ServiceMarketV2.addMarketWatchListV2()
  ↓
保存到本地数据库
  ↓
构建云同步项
  ↓
更新云同步
  ↓
refreshWatchListV2() 刷新列表
  ↓
组件自动更新
```

#### WebSocket 数据流

```
代币详情页加载
  ↓
检查 websocketConfig
  ↓
如果支持 WebSocket，调用 ServiceMarketWS.connect()
  ↓
订阅 K 线数据（subscribeOHLCV）
  ↓
订阅交易数据（subscribeTokenTxs）
  ↓
接收实时数据
  ↓
处理数据格式转换
  ↓
发送事件到 appEventBus（MarketWSDataUpdate）
  ↓
组件监听事件
  ↓
更新 tokenDetailWebsocketAtom
  ↓
组件显示实时数据
```

### 5. 数据持久化

**持久化位置：**

- **自选列表：** `simpleDb.marketWatchListV2`
- **云同步：** 通过 `servicePrimeCloudSync` 同步到云端

**持久化流程：**

```
用户操作（添加/删除自选）
  ↓
ServiceMarketV2.addMarketWatchListV2() / removeMarketWatchListV2()
  ↓
构建云同步项（buildMarketWatchListV2SyncItems）
  ↓
保存到本地数据库（simpleDb.marketWatchListV2）
  ↓
更新云同步项（localDb.addAndUpdateSyncItems）
  ↓
同步到云端
```

**数据格式：**

```typescript
interface IMarketWatchListItemV2 {
  chainId: string;
  contractAddress: string;
  isNative?: boolean;
  sortIndex?: number;
}
```

---

## 完整代码路径清单

> 按 monorepo workspace 结构组织

### 1. @onekeyhq/shared

#### 类型定义

- `packages/shared/src/types/market.ts` - Market V1 类型定义
- `packages/shared/src/types/marketV2.ts` - Market V2 类型定义

#### 路由定义

- `packages/shared/src/routes/tab.ts` - Tab 路由枚举（第 17 行：Market）
- `packages/shared/src/routes/tabMarket.ts` - Market Tab 路由定义和参数类型

### 2. @onekeyhq/kit

#### 工具函数

- `packages/kit/src/views/Market/marketUtils.ts` - Market 工具函数
- `packages/kit/src/views/Market/MarketHomeV2/utils.ts` - 首页工具函数
- `packages/kit/src/views/Market/MarketDetailV2/utils/statValue.ts` - 统计值工具
- `packages/kit/src/views/Market/router/index.tsx` - Market 路由工具

#### 状态管理

##### 上下文状态（V2）

- `packages/kit/src/states/jotai/contexts/marketV2/atoms.ts` - Market V2 状态定义
- `packages/kit/src/states/jotai/contexts/marketV2/actions.ts` - Market V2 操作
- `packages/kit/src/states/jotai/contexts/marketV2/index.ts` - 导出

##### 旧版状态（V1，已废弃）

- `packages/kit/src/states/jotai/contexts/market/atoms.ts` - Market V1 状态定义
- `packages/kit/src/states/jotai/contexts/market/actions.ts` - Market V1 操作

#### Provider

- `packages/kit/src/views/Market/MarketWatchListProviderV2.tsx` - Market 自选列表 Provider
- `packages/kit/src/views/Market/MarketWatchListProviderMirrorV2.tsx` - Provider 镜像

#### Hooks

- `packages/kit/src/views/Market/hooks/index.ts` - Hooks 导出
- `packages/kit/src/views/Market/hooks/useMarketBasicConfig/index.ts` - 市场基础配置 Hook
- `packages/kit/src/views/Market/hooks/useMarketBasicConfig/utils.ts` - 配置工具函数
- `packages/kit/src/views/Market/hooks/useMarketNetworks.ts` - 市场网络 Hook
- `packages/kit/src/views/Market/hooks/useMarketEnterAnalytics.ts` - 市场进入分析 Hook
- `packages/kit/src/views/Market/MarketHomeV2/hooks/useTabAnalytics.ts` - Tab 分析 Hook
- `packages/kit/src/views/Market/MarketHomeV2/hooks/useNetworkAnalytics.ts` - 网络分析 Hook
- `packages/kit/src/views/Market/MarketHomeV2/hooks/useNetworkFilterScroll.ts` - 网络筛选滚动 Hook
- `packages/kit/src/views/Market/MarketDetailV2/hooks/useTokenDetail.ts` - 代币详情 Hook
- `packages/kit/src/views/Market/MarketDetailV2/hooks/useAutoRefreshTokenDetail.ts` - 自动刷新代币详情 Hook
- `packages/kit/src/views/Market/MarketDetailV2/hooks/useMarketHolders.ts` - 持有人数据 Hook
- `packages/kit/src/views/Market/MarketDetailV2/hooks/useMarketDetailBackNavigation.ts` - 返回导航 Hook

#### 路由配置

- `packages/kit/src/routes/Tab/router.ts` - Tab 路由配置（第 141-158 行）
- `packages/kit/src/routes/Tab/Marktet/router.ts` - Market 子路由配置

#### 通用组件工具

- `packages/kit/src/views/Market/components/watchListHooks.ts` - 自选列表 Hooks（V1，已废弃）
- `packages/kit/src/views/Market/components/watchListHooksV2.ts` - 自选列表 Hooks（V2）
- `packages/kit/src/views/Market/components/MarketStarV2.tsx` - 收藏按钮组件
- `packages/kit/src/views/Market/components/PriceChangePercentage.tsx` - 价格变化百分比组件
- `packages/kit/src/views/Market/components/MarketTradeButton.tsx` - 交易按钮组件
- `packages/kit/src/views/Market/components/Chart/ChartView.tsx` - 图表视图
- `packages/kit/src/views/Market/components/Chart/ChartViewAdapter.tsx` - 图表适配器
- `packages/kit/src/views/Market/components/Chart/chartUtils.ts` - 图表工具函数
- `packages/kit/src/views/Market/components/TokenPriceChart.tsx` - 价格图表

#### 布局组件

- `packages/kit/src/views/Market/MarketHomeV2/layouts/DesktopLayout.tsx` - 首页桌面端布局
- `packages/kit/src/views/Market/MarketHomeV2/layouts/MobileLayout.tsx` - 首页移动端布局
- `packages/kit/src/views/Market/MarketDetailV2/layouts/DesktopLayout.tsx` - 详情页桌面端布局
- `packages/kit/src/views/Market/MarketDetailV2/layouts/MobileLayout.tsx` - 详情页移动端布局

#### 核心业务组件

##### 代币列表组件

- `packages/kit/src/views/Market/MarketHomeV2/components/MarketTokenList/MarketTokenListBase.tsx` - 基础列表组件
- `packages/kit/src/views/Market/MarketHomeV2/components/MarketTokenList/MarketNormalTokenList.tsx` - 普通列表
- `packages/kit/src/views/Market/MarketHomeV2/components/MarketTokenList/MarketWatchlistTokenList.tsx` - 自选列表
- `packages/kit/src/views/Market/MarketHomeV2/components/MarketTokenList/MarketTokenData.ts` - 数据类型定义
- `packages/kit/src/views/Market/MarketHomeV2/components/MarketTokenList/hooks/useMarketTokenList.ts` - 列表数据 Hook
- `packages/kit/src/views/Market/MarketHomeV2/components/MarketTokenList/hooks/useMarketWatchlistTokenList.ts` - 自选列表 Hook
- `packages/kit/src/views/Market/MarketHomeV2/components/MarketTokenList/hooks/useMarketTokenColumns/useMarketTokenColumns.tsx` - 列定义主 Hook
- `packages/kit/src/views/Market/MarketHomeV2/components/MarketTokenList/hooks/useMarketTokenColumns/useColumnsDesktop.tsx` - 桌面端列定义
- `packages/kit/src/views/Market/MarketHomeV2/components/MarketTokenList/hooks/useMarketTokenColumns/useColumnsMobile.tsx` - 移动端列定义
- `packages/kit/src/views/Market/MarketHomeV2/components/MarketTokenList/hooks/useToMarketDetailPage.ts` - 跳转详情页 Hook
- `packages/kit/src/views/Market/MarketHomeV2/components/MarketTokenList/components/TokenIdentityItem/TokenIdentityItem.tsx` - 代币身份组件

##### 代币详情组件

- `packages/kit/src/views/Market/MarketDetailV2/components/TokenDetailHeader/TokenDetailHeader.tsx` - 详情头部
- `packages/kit/src/views/Market/MarketDetailV2/components/TokenDetailHeader/TokenDetailHeaderLeft.tsx` - 头部左侧
- `packages/kit/src/views/Market/MarketDetailV2/components/TokenDetailHeader/TokenDetailHeaderRight.tsx` - 头部右侧
- `packages/kit/src/views/Market/MarketDetailV2/components/TokenDetailHeader/ShareButton.tsx` - 分享按钮
- `packages/kit/src/views/Market/MarketDetailV2/components/TokenOverview/TokenOverview.tsx` - 代币概览
- `packages/kit/src/views/Market/MarketDetailV2/components/TokenActivityOverview/TokenActivityOverview.tsx` - 活动概览
- `packages/kit/src/views/Market/MarketDetailV2/components/TokenSupplementaryInfo/TokenSupplementaryInfo.tsx` - 补充信息

##### 交易面板组件

- `packages/kit/src/views/Market/MarketDetailV2/components/SwapPanel/SwapPanel.tsx` - 交易面板主组件
- `packages/kit/src/views/Market/MarketDetailV2/components/SwapPanel/SwapPanelWrap.tsx` - 包装组件
- `packages/kit/src/views/Market/MarketDetailV2/components/SwapPanel/SwapPanelContent.tsx` - 内容组件
- `packages/kit/src/views/Market/MarketDetailV2/components/SwapPanel/components/TokenInputSection/TokenSelectorPopover.tsx` - 代币选择器
- `packages/kit/src/views/Market/MarketDetailV2/components/SwapPanel/components/ActionButton.tsx` - 操作按钮
- `packages/kit/src/views/Market/MarketDetailV2/components/SwapPanel/components/ApproveButton/ApproveButton.tsx` - 授权按钮
- `packages/kit/src/views/Market/MarketDetailV2/components/SwapPanel/hooks/useSpeedSwapInit.tsx` - 快速交换初始化
- `packages/kit/src/views/Market/MarketDetailV2/components/SwapPanel/hooks/useSpeedSwapActions.tsx` - 快速交换操作

##### K 线图组件

- `packages/kit/src/views/Market/MarketDetailV2/components/MarketTradingView/MarketTradingView.tsx` - K 线图组件

##### 信息标签页组件

- `packages/kit/src/views/Market/MarketDetailV2/components/InformationTabs/layout/DesktopInformationTabs.tsx` - 桌面端信息标签页
- `packages/kit/src/views/Market/MarketDetailV2/components/InformationTabs/layout/MobileInformationTabs.tsx` - 移动端信息标签页
- `packages/kit/src/views/Market/MarketDetailV2/components/InformationTabs/components/TransactionsHistory/` - 交易历史组件
- `packages/kit/src/views/Market/MarketDetailV2/components/InformationTabs/components/Portfolio/` - 持仓组件
- `packages/kit/src/views/Market/MarketDetailV2/components/InformationTabs/components/Holders/` - 持有人组件

##### 筛选器组件

- `packages/kit/src/views/Market/MarketHomeV2/components/MarketFilterBar/MarketFilterBar.tsx` - 桌面端筛选栏
- `packages/kit/src/views/Market/MarketHomeV2/components/MarketFilterBarSmall/MarketFilterBarSmall.tsx` - 移动端筛选栏
- `packages/kit/src/views/Market/MarketHomeV2/components/MarketTokenListNetworkSelector/MarketTokenListNetworkSelector.tsx` - 网络选择器
- `packages/kit/src/views/Market/MarketHomeV2/components/MarketTokenListNetworkSelector/MarketNetworkFilter.tsx` - 网络筛选
- `packages/kit/src/views/Market/MarketHomeV2/components/TimeRangeSelector/TimeRangeSelector.tsx` - 时间范围选择器
- `packages/kit/src/views/Market/MarketHomeV2/components/LiquidityFilterControl/LiquidityFilterControl.tsx` - 流动性筛选器

##### 推荐列表组件

- `packages/kit/src/views/Market/MarketHomeV2/components/MarketRecommendList/MarketRecommendList.tsx` - 推荐列表
- `packages/kit/src/views/Market/MarketHomeV2/components/MarketRecommendList/RecommendItem.tsx` - 推荐项

#### 页面入口组件

- `packages/kit/src/views/Market/MarketHome.tsx` - Market 首页入口
- `packages/kit/src/views/Market/MarketHomeV2/MarketHomeV2.tsx` - Market 首页实际实现
- `packages/kit/src/views/Market/MarketDetail.tsx` - 代币详情页入口
- `packages/kit/src/views/Market/MarketDetailV2/MarketDetailV2.tsx` - 代币详情页 V2
- `packages/kit/src/views/Market/MarketDetailV1/MarketDetail.tsx` - 代币详情页 V1（旧版）

### 3. @onekeyhq/kit-bg

#### 服务注册

- `packages/kit-bg/src/apis/IBackgroundApi.ts` - 后台 API 接口定义（包含 Market 服务）
- `packages/kit-bg/src/apis/BackgroundApi.ts` - 后台 API 实现（服务 Market 服务）
- `packages/kit-bg/src/apis/BackgroundApiProxy.ts` - 后台 API 代理（暴露 Market 服务）

#### 数据库实体

- `packages/kit-bg/src/dbs/simple/entity/SimpleDbEntityMarketWatchList.ts` - 自选列表 V1 实体（已废弃）
- `packages/kit-bg/src/dbs/simple/entity/SimpleDbEntityMarketWatchListV2.ts` - 自选列表 V2 实体

#### 核心服务

- `packages/kit-bg/src/services/ServiceMarket.ts` - 市场服务 V1
- `packages/kit-bg/src/services/ServiceMarketV2.ts` - 市场服务 V2
- `packages/kit-bg/src/services/ServiceMarketWS/ServiceMarektWs.ts` - WebSocket 服务
- `packages/kit-bg/src/services/ServiceMarketWS/MarketSubscriptionTracker.ts` - 订阅追踪器
- `packages/kit-bg/src/services/ServiceMarketWS/const.ts` - WebSocket 常量
- `packages/kit-bg/src/services/ServiceMarketWS/types/` - WebSocket 类型定义

---

## 代码统计

### 文件数量统计

- **页面组件：** 3 个（MarketHome, MarketDetail, MarketDetailV2）
- **布局组件：** 4 个（首页桌面/移动端，详情页桌面/移动端）
- **核心业务组件：** 约 100+ 个
- **Hooks：** 15+ 个
- **服务：** 3 个核心服务（ServiceMarket, ServiceMarketV2, ServiceMarketWS）
- **状态管理：** 2 个主要文件（marketV2 atoms + actions）
- **路由配置：** 3 个文件
- **类型定义：** 2 个主要文件

### 代码组织特点

1. **版本管理：** V1 和 V2 版本并存，V2 为新版本
2. **模块化：** 按功能划分目录（MarketTokenList, SwapPanel, InformationTabs 等）
3. **平台适配：** 桌面端和移动端分离（DesktopLayout vs MobileLayout）
4. **状态分层：** 使用上下文状态管理，支持多实例
5. **服务分离：** V1、V2、WebSocket 服务独立
6. **类型安全：** 完整的 TypeScript 类型定义

---

## Market 功能专门引入的依赖

### 1. 核心依赖

#### lightweight-charts

**版本：** `^3.8.0`  
**位置：** `packages/kit/package.json` (第 12 行)

**用途：** K 线图库，用于显示代币价格图表

**使用位置：**

1. **LightweightChart 组件**

   - `packages/kit/src/components/LightweightChart/LightweightChart.tsx` - Web 端实现
   - `packages/kit/src/components/LightweightChart/LightweightChart.native.tsx` - 原生端实现（通过 WebView）

2. **Market 图表组件**

   - `packages/kit/src/views/Market/components/Chart/ChartView.tsx` - 图表视图
   - `packages/kit/src/views/Market/components/Chart/chartUtils.ts` - 图表工具函数

**功能：**

- 提供价格 K 线图展示
- 支持交互（悬停、缩放等）
- 跨平台支持（Web 和原生）

**注意：** Market 功能同时使用 `TradingView` 组件（WebView 方式）和 `lightweight-charts`，根据场景选择使用。

#### socket.io-client（WebSocket）

**版本：** 通过 `@types/socket.io-client` 类型定义  
**位置：** `packages/kit/package.json` (devDependencies，第 32 行)

**用途：** WebSocket 客户端，用于实时市场数据订阅

**使用位置：**

- `packages/kit-bg/src/services/ServiceMarketWS/ServiceMarektWs.ts` - WebSocket 服务
- 通过共享的 WebSocket 连接（从 `PushProviderWebSocket` 获取）

**功能：**

- 实时 K 线数据订阅
- 实时交易数据订阅
- 数据格式转换（OKX 格式）

### 2. 依赖说明

#### 专门为 Market 引入的依赖

- ✅ **lightweight-charts** - K 线图库，Market 功能的主要图表库
- ⚠️ **socket.io-client** - WebSocket 客户端，通过共享连接使用，不是 Market 专用

#### 其他依赖（非 Market 专用）

以下依赖虽然被 Market 功能使用，但它们是项目中的通用依赖，不是专门为 Market 引入的：

- `jotai` - 状态管理（项目通用）
- `react-intl` - 国际化（项目通用）
- `lodash` - 工具函数库（项目通用）
- `memoizee` - 缓存工具（项目通用）
- `TradingView` - TradingView 组件（内部组件，Market 和 Perp 都在使用）

### 3. 依赖使用统计

**直接使用 lightweight-charts 的文件：**

- `packages/kit/src/components/LightweightChart/LightweightChart.tsx`
- `packages/kit/src/components/LightweightChart/LightweightChart.native.tsx`
- `packages/kit/src/views/Market/components/Chart/ChartView.tsx`
- `packages/kit/src/views/Market/components/Chart/chartUtils.ts`

**使用 TradingView 组件的文件：**

- `packages/kit/src/views/Market/components/TokenPriceChart.tsx` - 使用 `TradingView`（V1）
- `packages/kit/src/views/Market/MarketDetailV2/components/MarketTradingView/MarketTradingView.tsx` - 使用 `TradingViewV2`

**使用 WebSocket 的文件：**

- `packages/kit-bg/src/services/ServiceMarketWS/ServiceMarektWs.ts` - WebSocket 服务
- `packages/kit/src/views/Market/MarketDetailV2/components/InformationTabs/components/TransactionsHistory/hooks/useTransactionsWebSocket.ts` - 交易历史 WebSocket Hook

### 4. 依赖版本

```json
{
  "dependencies": {
    "lightweight-charts": "^3.8.0"
  },
  "devDependencies": {
    "@types/socket.io-client": "^3.0.0"
  }
}
```

**版本说明：**

- **lightweight-charts：** 当前使用版本为 `^3.8.0`，这是一个稳定版本，提供了完整的 K 线图功能
- **socket.io-client：** 通过类型定义可以看出使用的是 v3 版本

### 5. 依赖影响范围

**影响范围：**

- ✅ **lightweight-charts：** 主要用于 Market 功能的图表展示，其他功能（如 Earn）也可能使用
- ✅ **WebSocket：** 仅影响 Market 功能的实时数据订阅
- ✅ 如果移除这些依赖，Market 功能的图表和实时数据功能将无法工作

**打包影响：**

- `lightweight-charts` 会被包含在支持 Market 功能的构建产物中
- WebSocket 功能通过共享连接实现，不会额外增加打包体积
- `TradingView` 组件使用 WebView 方式，不会增加打包体积

### 6. 图表库选择策略

Market 功能使用了两种图表库：

1. **lightweight-charts：** 用于简单的价格图表展示（如代币详情页的概览图表）
2. **TradingView：** 用于专业的 K 线图展示（通过 WebView 嵌入）

**选择原则：**

- 简单图表 → `lightweight-charts`
- 专业 K 线图 → `TradingView`（WebView）

---

_文档生成时间：2024 年_  
_阶段：第六阶段 - 依赖分析_  
_分析完成_
