# Market 模块网络接口分析文档

## 目录

- [概述](#概述)
- [一、ServiceMarket (V1) 接口](#一servicemarket-v1-接口)
  - [1.1 获取市场分类列表](#11-获取市场分类列表)
  - [1.2 获取搜索趋势](#12-获取搜索趋势)
  - [1.3 获取分类代币列表](#13-获取分类代币列表)
  - [1.4 获取代币详情](#14-获取代币详情)
  - [1.5 获取代币池信息](#15-获取代币池信息)
  - [1.6 获取代币图表数据](#16-获取代币图表数据)
  - [1.7 搜索代币 (V1)](#17-搜索代币-v1)
  - [1.8 搜索代币 (V2)](#18-搜索代币-v2)
- [二、ServiceMarketV2 接口](#二servicemarketv2-接口)
  - [2.1 获取市场基础配置](#21-获取市场基础配置)
  - [2.2 获取支持的链列表](#22-获取支持的链列表)
  - [2.3 获取代币列表](#23-获取代币列表)
  - [2.4 获取代币详情](#24-获取代币详情)
  - [2.5 批量获取代币信息](#25-批量获取代币信息)
  - [2.6 获取 K 线数据](#26-获取-k-线数据)
  - [2.7 获取代币交易历史](#27-获取代币交易历史)
  - [2.8 获取账户代币交易历史](#28-获取账户代币交易历史)
  - [2.9 获取代币持有人信息](#29-获取代币持有人信息)
  - [2.10 获取代币安全信息](#210-获取代币安全信息)
  - [2.11 获取账户持仓信息](#211-获取账户持仓信息)
- [三、ServiceMarketWS (WebSocket) 接口](#三servicemarketws-websocket-接口)
  - [3.1 WebSocket 连接](#31-websocket-连接)
  - [3.2 订阅代币交易数据](#32-订阅代币交易数据)
  - [3.3 订阅 K 线数据](#33-订阅-k-线数据)
  - [3.4 取消订阅代币交易数据](#34-取消订阅代币交易数据)
  - [3.5 取消订阅 K 线数据](#35-取消订阅-k-线数据)
  - [3.6 WebSocket 消息处理](#36-websocket-消息处理)
  - [3.7 WebSocket 断开连接](#37-websocket-断开连接)
  - [3.8 订阅管理](#38-订阅管理)
- [四、接口调用总结](#四接口调用总结)
  - [4.1 接口分类](#41-接口分类)
  - [4.2 数据流向](#42-数据流向)
  - [4.3 缓存策略](#43-缓存策略)
  - [4.4 错误处理](#44-错误处理)

---

## 概述

本文档详细分析 Market 模块涉及的所有网络接口，包括：

- ServiceMarket (V1) - 基于 CoinGecko ID 的接口
- ServiceMarketV2 - 基于网络和代币地址的接口
- ServiceMarketWS - WebSocket 实时数据接口

**服务端点：** `EServiceEndpointEnum.Utility`

**基础 URL：** 通过 `ServiceBase.getClient(EServiceEndpointEnum.Utility)` 获取

---

## 一、ServiceMarket (V1) 接口

### 1.1 获取市场分类列表

**接口路径：** `GET /utility/v1/market/category/list`

**方法名：** `fetchCategories(filters)`

**入参：**

- `filters` (string[], 可选): 过滤的分类 ID 列表，默认 `['onekey-search-trending']`
  - **参数来源：** 调用时传入，用于过滤不需要的分类

**返回值：** `IMarketCategory[]`

- **用途：**
  - 用于 MarketHomeV1 显示分类标签页
  - 每个分类包含 `categoryId`, `name`, `coingeckoIds` 等信息
  - 用于构建市场首页的 Tab 导航

**缓存策略：** 15 分钟（使用 `memoizee`）

**调用位置：**

- `packages/kit/src/views/Market/MarketHomeV1/MarketHome.tsx` - 首页加载分类

---

### 1.2 获取搜索趋势

**接口路径：** `GET /utility/v1/market/category/list` (内部调用 `fetchCategories`)

**方法名：** `fetchSearchTrending()`

**入参：** 无

**返回值：** `IMarketToken[]`

- **用途：**
  - 用于通用搜索页面的推荐列表
  - 显示热门搜索代币

**缓存策略：** 5 分钟（使用 `memoizee`）

**调用位置：**

- `packages/kit/src/views/UniversalSearch/pages/UniversalSearch.tsx` - 搜索页推荐列表

---

### 1.3 获取分类代币列表

**接口路径：** `GET /utility/v1/market/tokens`

**方法名：** `fetchCategory(category, coingeckoIds, sparkline)`

**入参：**

- `category` (string, 必需): 分类 ID，如 `'all'`, `'defi'` 等
  - **参数来源：** `IMarketCategory.categoryId`，从分类列表获取
- `coingeckoIds` (string[], 可选): CoinGecko ID 列表
  - **参数来源：** `IMarketCategory.coingeckoIds`，从分类配置获取
- `sparkline` (boolean, 可选): 是否返回价格走势图数据，默认 `false`
  - **参数来源：** 调用时传入，用于控制是否获取 K 线数据

**返回值：** `IMarketToken[]`

- **用途：**
  - 用于 MarketHomeList 显示代币列表
  - 包含价格、涨跌幅、市值等信息
  - 如果 `sparkline=true`，包含价格走势数据用于图表展示

**调用位置：**

- `packages/kit/src/views/Market/components/MarketHomeList.tsx` - V1 首页列表

---

### 1.4 获取代币详情

**接口路径：** `GET /utility/v1/market/detail`

**方法名：** `fetchMarketTokenDetail(coingeckoId, explorerPlatforms)`

**入参：**

- `coingeckoId` (string, 必需): CoinGecko ID，如 `'bitcoin'`, `'ethereum'`
  - **参数来源：**
    - 路由参数 `route.params.token` (MarketDetailV1)
    - 从代币列表项获取 `item.coingeckoId`
- `explorerPlatforms` (boolean, 可选): 是否返回浏览器平台信息，默认 `true`
  - **参数来源：** 调用时传入，用于控制是否获取浏览器链接

**返回值：** `IMarketTokenDetail`

- **用途：**
  - 用于 MarketDetailV1 显示代币详情页
  - 包含价格、市值、交易量、涨跌幅、图表数据等
  - 包含浏览器链接、社交媒体链接等

**调用位置：**

- `packages/kit/src/views/Market/MarketDetailV1/MarketDetail.tsx` - V1 详情页

---

### 1.5 获取代币池信息

**接口路径：** `GET /utility/v1/market/pools`

**方法名：** `fetchPools(detailPlatforms)`

**入参：**

- `detailPlatforms` (IMarketDetailPlatform, 必需): 代币的平台信息对象
  - **参数来源：** `IMarketTokenDetail.detailPlatforms`，从代币详情接口获取
  - 包含多个平台的合约地址和网络信息

**返回值：** `IMarketResponsePool[]`

- **用途：**
  - 用于 MarketDetailPools 显示代币的流动性池信息
  - 每个平台返回对应的池子数据

**调用位置：**

- `packages/kit/src/views/Market/components/MarketDetailPools.tsx` - 代币池信息展示

---

### 1.6 获取代币图表数据

**接口路径：** `GET /utility/v1/market/token/chart`

**方法名：** `fetchTokenChart(coingeckoId, days)`

**入参：**

- `coingeckoId` (string, 必需): CoinGecko ID
  - **参数来源：** 路由参数或代币详情数据
- `days` (string, 必需): 时间范围，如 `'1'`, `'7'`, `'30'`, `'365'`
  - **参数来源：** 用户选择的时间范围（1 天、7 天、30 天、1 年等）

**返回值：** `IMarketTokenChart`

- **用途：**
  - 用于 TokenPriceChart 显示价格走势图
  - 包含价格和交易量数据点

**调用位置：**

- `packages/kit/src/views/Market/components/TokenPriceChart.tsx` - 价格图表组件

---

### 1.7 搜索代币 (V1)

**接口路径：** `GET /utility/v1/market/search`

**方法名：** `searchToken(query)`

**入参：**

- `query` (string, 必需): 搜索关键词
  - **参数来源：** 用户在搜索框输入的文本

**返回值：** `IMarketToken[]`

- **用途：**
  - 用于通用搜索功能
  - 返回匹配的代币列表
  - 内部会调用 `fetchCategory` 获取完整代币信息

**调用位置：**

- `packages/kit/src/views/UniversalSearch/pages/UniversalSearch.tsx` - 搜索功能

---

### 1.8 搜索代币 (V2)

**接口路径：** `GET /utility/v2/market/search`

**方法名：** `searchV2Token(query)`

**入参：**

- `query` (string, 必需): 搜索关键词
  - **参数来源：** 用户在搜索框输入的文本

**返回值：** `IMarketSearchV2Token[]`

- **用途：**
  - V2 版本的搜索接口
  - 返回更详细的代币信息，包括网络和地址

**调用位置：**

- `packages/kit/src/views/UniversalSearch/pages/UniversalSearch.tsx` - V2 搜索功能

---

_第一阶段完成：ServiceMarket (V1) 接口分析_

---

## 二、ServiceMarketV2 接口

### 2.1 获取市场基础配置

**接口路径：** `GET /utility/v2/market/basic-config`

**方法名：** `fetchMarketBasicConfig()`

**入参：**

- `configVersion` (number, 查询参数): 配置版本，固定为 `2`
  - **参数来源：** 代码中硬编码

**返回值：** `IMarketBasicConfigResponse`

- **用途：**
  - 用于 MarketHomeV2 获取市场基础配置
  - 包含默认网络 ID、最小流动性阈值等配置
  - 用于初始化市场首页的默认状态

**缓存策略：** 1 小时（使用 `memoizee`）

**调用位置：**

- `packages/kit/src/views/Market/hooks/useMarketBasicConfig/index.ts` - 市场配置 Hook

---

### 2.2 获取支持的链列表

**接口路径：** `GET /utility/v2/market/chains`

**方法名：** `fetchMarketChains()`

**入参：** 无

**返回值：** `IMarketChainsResponse`

- **用途：**
  - 用于 MarketFilterBar 显示可选的网络列表
  - 包含网络 ID、名称、Logo、浏览器链接等信息
  - 用于网络选择器组件

**缓存策略：** 1 小时（使用 `memoizee`）

**调用位置：**

- `packages/kit/src/views/Market/MarketHomeV2/components/MarketFilterBar/MarketFilterBar.tsx` - 过滤器组件

---

### 2.3 获取代币列表

**接口路径：** `GET /utility/v2/market/token/list`

**方法名：** `fetchMarketTokenList({ networkId, sortBy, sortType, page, limit, minLiquidity, maxLiquidity })`

**入参：**

- `networkId` (string, 必需): 网络 ID，如 `'evm--1'`, `'sol--101'`
  - **参数来源：**
    - `selectedNetworkIdAtom` - 用户选择的网络
    - `useMarketBasicConfig().defaultNetworkId` - 默认网络
- `sortBy` (string, 可选): 排序字段，如 `'v24hUSD'`, `'priceChange24hPercent'`
  - **参数来源：**
    - `useMarketTokenList` Hook 的 `sortBy` 状态
    - 用户点击表头排序时更新
- `sortType` (string, 可选): 排序方向，`'asc'` 或 `'desc'`
  - **参数来源：**
    - `useMarketTokenList` Hook 的 `sortType` 状态
    - 用户点击表头排序时切换
- `page` (number, 可选): 页码，默认 `1`
  - **参数来源：**
    - `useMarketTokenList` Hook 的 `currentPage` 状态
    - 分页加载时递增
- `limit` (number, 可选): 每页数量，默认 `20`
  - **参数来源：**
    - `useMarketTokenList` Hook 的 `pageSize` 参数
    - 默认值 20
- `minLiquidity` (number, 可选): 最小流动性过滤
  - **参数来源：**
    - `useMarketBasicConfig().formattedMinLiquidity` - 市场配置中的最小流动性
    - `liquidityFilter` 状态 - 用户选择的流动性过滤条件
- `maxLiquidity` (number, 可选): 最大流动性过滤
  - **参数来源：** `liquidityFilter` 状态 - 用户选择的流动性过滤条件

**返回值：** `IMarketTokenListResponse`

- **用途：**
  - 用于 MarketNormalTokenList 显示代币列表
  - 包含代币基本信息、价格、涨跌幅、交易量、流动性等
  - 支持分页加载

**调用位置：**

- `packages/kit/src/views/Market/MarketHomeV2/components/MarketTokenList/hooks/useMarketTokenList.ts` - 代币列表 Hook

---

### 2.4 获取代币详情

**接口路径：** `GET /utility/v2/market/token/detail`

**方法名：** `fetchMarketTokenDetailByTokenAddress(tokenAddress, networkId)`

**入参：**

- `tokenAddress` (string, 必需): 代币合约地址
  - **参数来源：**
    - 路由参数 `route.params.tokenAddress` (MarketDetailV2)
    - 从代币列表项获取 `item.tokenAddress`
- `networkId` (string, 必需): 网络 ID
  - **参数来源：**
    - 路由参数 `route.params.network` 转换而来
    - `networkUtils.getNetworkIdFromShortCode({ shortCode: network })`

**返回值：** `IMarketTokenDetailResponse`

- **用途：**
  - 用于 MarketDetailV2 显示代币详情页
  - 包含价格、涨跌幅、交易量、流动性、持有人数等详细信息
  - 包含多时间维度的统计数据（1m, 5m, 30m, 1h, 2h, 4h, 8h, 24h）

**调用位置：**

- `packages/kit/src/views/Market/MarketDetailV2/hooks/useAutoRefreshTokenDetail.ts` - 自动刷新代币详情

---

### 2.5 批量获取代币信息

**接口路径：** `POST /utility/v2/market/token/list/batch`

**方法名：** `fetchMarketTokenListBatch({ tokenAddressList })`

**入参：**

- `tokenAddressList` (array, 必需): 代币地址列表
  - **参数结构：**
    ```typescript
    {
      contractAddress: string; // 代币合约地址
      chainId: string; // 链 ID
      isNative: boolean; // 是否原生代币
    }
    [];
    ```
  - **参数来源：**
    - `marketWatchListV2Atom` - 自选列表中的代币
    - 从自选列表项提取 `chainId`, `contractAddress`, `isNative`

**返回值：** `IMarketTokenBatchListResponse`

- **用途：**
  - 用于 MarketWatchlistTokenList 显示自选列表
  - 批量获取自选代币的最新价格和统计数据
  - 提高自选列表加载效率

**调用位置：**

- `packages/kit/src/views/Market/MarketHomeV2/components/MarketTokenList/hooks/useMarketWatchlistTokenList.ts` - 自选列表 Hook

---

### 2.6 获取 K 线数据

**接口路径：** `GET /utility/v2/market/token/kline`

**方法名：** `fetchMarketTokenKline({ tokenAddress, networkId, interval, timeFrom, timeTo })`

**入参：**

- `tokenAddress` (string, 必需): 代币合约地址
  - **参数来源：** 路由参数或代币详情数据
- `networkId` (string, 必需): 网络 ID
  - **参数来源：** 路由参数转换而来
- `interval` (string, 可选): K 线时间间隔，如 `'1m'`, `'5m'`, `'1h'`, `'1d'`
  - **参数来源：**
    - TradingView 组件的时间间隔选择
    - 用户选择的图表时间粒度
- `timeFrom` (number, 可选): 开始时间戳（毫秒）
  - **参数来源：** TradingView 组件的可见时间范围
- `timeTo` (number, 可选): 结束时间戳（毫秒）
  - **参数来源：** TradingView 组件的可见时间范围

**返回值：** `IMarketTokenKLineResponse`

- **用途：**
  - 用于 MarketTradingView 显示 K 线图表
  - 包含开盘价、最高价、最低价、收盘价、成交量等数据点

**调用位置：**

- `packages/kit/src/components/TradingView/TradingViewV2.tsx` - K 线图表组件

---

### 2.7 获取代币交易历史

**接口路径：** `GET /utility/v3/market/token/transactions`

**方法名：** `fetchMarketTokenTransactions({ tokenAddress, networkId, cursor, limit })`

**入参：**

- `tokenAddress` (string, 必需): 代币合约地址
  - **参数来源：** 路由参数或代币详情数据
- `networkId` (string, 必需): 网络 ID
  - **参数来源：** 路由参数转换而来
- `cursor` (string, 可选): 分页游标
  - **参数来源：** 上一次请求返回的 `cursor`，用于加载下一页
- `limit` (number, 可选): 每页数量
  - **参数来源：** 代码中设置，默认值

**返回值：** `IMarketTokenTransactionsResponse`

- **用途：**
  - 用于 TransactionsHistory 显示代币交易历史
  - 包含交易哈希、时间、金额、买卖方向等信息
  - 支持分页加载

**调用位置：**

- `packages/kit/src/views/Market/MarketDetailV2/components/InformationTabs/components/TransactionsHistory/TransactionsHistory.tsx` - 交易历史组件

---

### 2.8 获取账户代币交易历史

**接口路径：** `GET /utility/v2/market/account/token/transactions`

**方法名：** `fetchMarketAccountTokenTransactions({ accountAddress, tokenAddress, networkId, cursor, timeFrom, timeTo })`

**入参：**

- `accountAddress` (string, 必需): 账户地址
  - **参数来源：**
    - `useNetworkAccountAddress` Hook
    - 当前选中的账户地址
- `tokenAddress` (string, 必需): 代币合约地址
  - **参数来源：** 路由参数或代币详情数据
- `networkId` (string, 必需): 网络 ID
  - **参数来源：** 路由参数转换而来
- `cursor` (string, 可选): 分页游标
  - **参数来源：** 上一次请求返回的 `cursor`
- `timeFrom` (number, 可选): 开始时间戳
  - **参数来源：** 用户选择的时间范围
- `timeTo` (number, 可选): 结束时间戳
  - **参数来源：** 用户选择的时间范围

**返回值：** `IMarketAccountTokenTransactionsResponse`

- **用途：**
  - 用于显示当前账户在该代币上的交易历史
  - 过滤出与当前账户相关的交易记录

**调用位置：**

- `packages/kit/src/views/Market/MarketDetailV2/components/InformationTabs/components/TransactionsHistory/hooks/useTransactionItemData.ts` - 交易项数据处理

---

### 2.9 获取代币持有人信息

**接口路径：** `GET /utility/v2/market/token/top-holders`

**方法名：** `fetchMarketTokenHolders({ tokenAddress, networkId })`

**入参：**

- `tokenAddress` (string, 必需): 代币合约地址
  - **参数来源：** 路由参数或代币详情数据
- `networkId` (string, 必需): 网络 ID
  - **参数来源：** 路由参数转换而来

**返回值：** `IMarketTokenHoldersResponse`

- **用途：**
  - 用于 Holders 组件显示代币前 N 名持有人
  - 包含持有人地址、持有数量、占比等信息

**调用位置：**

- `packages/kit/src/views/Market/MarketDetailV2/components/InformationTabs/components/Holders/Holders.tsx` - 持有人组件

---

### 2.10 获取代币安全信息

**接口路径：** `POST /utility/v2/market/token/security/batch`

**方法名：** `fetchMarketTokenSecurity({ contractAddress, chainId })`

**入参：**

- `contractAddress` (string, 必需): 代币合约地址
  - **参数来源：** 代币详情数据
- `chainId` (string, 必需): 链 ID
  - **参数来源：** 代币详情数据中的 `networkId`

**返回值：** `IMarketTokenSecurityBatchResponse`

- **用途：**
  - 用于显示代币的安全评估信息
  - 包含风险提示、安全评分等

**缓存策略：** 5 分钟（使用 `memoizee`）

**调用位置：**

- 代币安全信息展示组件

---

### 2.11 获取账户持仓信息

**接口路径：** `GET /utility/v2/market/account/portfolio`

**方法名：** `fetchMarketAccountPortfolio({ accountAddress, networkId, tokenAddress })`

**入参：**

- `accountAddress` (string, 必需): 账户地址
  - **参数来源：**
    - `useNetworkAccountAddress` Hook
    - 当前选中的账户地址
- `networkId` (string, 必需): 网络 ID
  - **参数来源：** 路由参数转换而来
- `tokenAddress` (string, 必需): 代币合约地址
  - **参数来源：** 路由参数或代币详情数据

**返回值：** `IMarketAccountPortfolioResponse`

- **用途：**
  - 用于显示账户在该代币上的持仓信息
  - 包含持仓数量、价值、盈亏等

**调用位置：**

- 账户持仓信息展示组件

---

_第二阶段完成：ServiceMarketV2 接口分析_

---

## 三、ServiceMarketWS (WebSocket) 接口

### 3.1 WebSocket 连接

**连接方式：** 通过共享的 WebSocket 连接（`PushProviderWebSocket`）

**方法名：** `connect()`

**入参：** 无

**返回值：** `Promise<void>`

**用途：**

- 获取共享的 WebSocket 连接实例
- 注册市场数据监听器
- 建立与服务器的 WebSocket 连接

**调用位置：**

- `packages/kit/src/views/Market/MarketDetailV2/hooks/useAutoRefreshTokenDetail.ts` - 代币详情自动刷新

---

### 3.2 订阅代币交易数据

**WebSocket 事件：** `EAppSocketEventNames.market` (发送订阅消息)

**方法名：** `subscribeTokenTxs({ networkId, tokenAddress, currency })`

**入参：**

- `networkId` (string, 必需): 网络 ID
  - **参数来源：**
    - 路由参数转换而来
    - `useTokenDetail` Hook 中的 `networkId`
- `tokenAddress` (string, 必需): 代币合约地址
  - **参数来源：**
    - 路由参数 `route.params.tokenAddress`
    - `useTokenDetail` Hook 中的 `tokenAddress`
- `currency` (string, 可选): 货币单位，默认 `'usd'`
  - **参数来源：** 代码中设置，默认值

**订阅消息格式：**

```typescript
{
  operation: 'subscribe',
  args: [{
    channel: 'tokenTxs',
    networkId: string,
    tokenAddress: string,
    currencyCode: 'usd',
    dataSource: 'okx'
  }]
}
```

**返回值：** `Promise<void>`

**用途：**

- 订阅指定代币的实时交易数据
- 接收代币买卖交易推送
- 用于实时更新交易历史列表

**数据格式：** `IWsTxsData`

- 包含交易哈希、时间、买卖方向、金额等信息

**调用位置：**

- `packages/kit/src/views/Market/MarketDetailV2/hooks/useAutoRefreshTokenDetail.ts` - 代币详情自动刷新

---

### 3.3 订阅 K 线数据

**WebSocket 事件：** `EAppSocketEventNames.market` (发送订阅消息)

**方法名：** `subscribeOHLCV({ networkId, tokenAddress, chartType, currency })`

**入参：**

- `networkId` (string, 必需): 网络 ID
  - **参数来源：**
    - 路由参数转换而来
    - `useTokenDetail` Hook 中的 `networkId`
- `tokenAddress` (string, 必需): 代币合约地址
  - **参数来源：**
    - 路由参数 `route.params.tokenAddress`
    - `useTokenDetail` Hook 中的 `tokenAddress`
- `chartType` (string, 可选): 图表类型，默认 `'1m'`
  - **参数来源：**
    - TradingView 组件的时间间隔选择
    - 用户选择的图表时间粒度（如 `'1m'`, `'5m'`, `'1h'`, `'1d'`）
- `currency` (string, 可选): 货币单位，默认 `'usd'`
  - **参数来源：** 代码中设置，默认值

**订阅消息格式：**

```typescript
{
  operation: 'subscribe',
  args: [{
    channel: 'ohlcv',
    networkId: string,
    tokenAddress: string,
    chartType: string,
    currencyCode: 'usd',
    dataSource: 'okx'
  }]
}
```

**返回值：** `Promise<void>`

**用途：**

- 订阅指定代币的实时 K 线数据
- 接收价格更新（开盘价、最高价、最低价、收盘价、成交量）
- 用于实时更新 K 线图表

**数据格式：** `IWsPriceData`

- 包含价格数据点（OHLCV）

**调用位置：**

- `packages/kit/src/components/TradingView/TradingViewV2.tsx` - K 线图表组件

---

### 3.4 取消订阅代币交易数据

**WebSocket 事件：** `EAppSocketEventNames.market` (发送取消订阅消息)

**方法名：** `unsubscribeTokenTxs({ networkId, tokenAddress, currency })`

**入参：**

- `networkId` (string, 必需): 网络 ID
  - **参数来源：** 订阅时使用的 `networkId`
- `tokenAddress` (string, 必需): 代币合约地址
  - **参数来源：** 订阅时使用的 `tokenAddress`
- `currency` (string, 可选): 货币单位，默认 `'usd'`
  - **参数来源：** 订阅时使用的 `currency`

**取消订阅消息格式：**

```typescript
{
  operation: 'unsubscribe',
  args: [{
    channel: 'tokenTxs',
    networkId: string,
    tokenAddress: string,
    currencyCode: 'usd',
    dataSource: 'okx'
  }]
}
```

**返回值：** `Promise<void>`

**用途：**

- 取消指定代币的交易数据订阅
- 当没有其他订阅者时，才会真正取消 WebSocket 订阅
- 用于清理不需要的订阅，节省资源

**调用位置：**

- 组件卸载时自动调用
- `useAutoRefreshTokenDetail` Hook 的清理函数

---

### 3.5 取消订阅 K 线数据

**WebSocket 事件：** `EAppSocketEventNames.market` (发送取消订阅消息)

**方法名：** `unsubscribeOHLCV({ networkId, tokenAddress, chartType, currency })`

**入参：**

- `networkId` (string, 必需): 网络 ID
  - **参数来源：** 订阅时使用的 `networkId`
- `tokenAddress` (string, 必需): 代币合约地址
  - **参数来源：** 订阅时使用的 `tokenAddress`
- `chartType` (string, 可选): 图表类型，默认 `'1m'`
  - **参数来源：** 订阅时使用的 `chartType`
- `currency` (string, 可选): 货币单位，默认 `'usd'`
  - **参数来源：** 订阅时使用的 `currency`

**取消订阅消息格式：**

```typescript
{
  operation: 'unsubscribe',
  args: [{
    channel: 'ohlcv',
    networkId: string,
    tokenAddress: string,
    chartType: string,
    currencyCode: 'usd',
    dataSource: 'okx'
  }]
}
```

**返回值：** `Promise<void>`

**用途：**

- 取消指定代币的 K 线数据订阅
- 当没有其他订阅者时，才会真正取消 WebSocket 订阅
- 用于清理不需要的订阅，节省资源

**调用位置：**

- 组件卸载时自动调用
- TradingView 组件卸载时

---

### 3.6 WebSocket 消息处理

**WebSocket 事件：** `EAppSocketEventNames.market` (接收消息)

**方法名：** `handleMarketMessage(data)` (私有方法)

**入参：**

- `data` (unknown): WebSocket 接收到的原始数据
  - **参数来源：** WebSocket 服务器推送的消息

**消息格式：**

```typescript
{
  type: 'TXS_DATA' | 'PRICE_DATA',
  data: IOkxTxsData | IOkxPriceData
}
```

**处理流程：**

1. 验证消息格式
2. 根据消息类型转换数据格式（OKX 格式 → 标准格式）
3. 检查是否有对应的订阅
4. 更新订阅的数据计数
5. 检查是否需要自动取消订阅（防止数据积累）
6. 发送事件到 `appEventBus` (`EAppEventBusNames.MarketWSDataUpdate`)

**事件数据格式：**

```typescript
{
  channel: 'tokenTxs' | 'ohlcv',
  tokenAddress: string,
  messageType: 'TXS_DATA' | 'PRICE_DATA',
  data: IWsTxsData | IWsPriceData,
  originalData: unknown
}
```

**用途：**

- 统一处理 WebSocket 消息
- 格式转换（OKX 格式 → 标准格式）
- 订阅管理和自动清理
- 事件分发到前端组件

**监听位置：**

- `packages/kit/src/views/Market/MarketDetailV2/hooks/useAutoRefreshTokenDetail.ts` - 监听交易数据更新
- `packages/kit/src/components/TradingView/TradingViewV2.tsx` - 监听价格数据更新

---

### 3.7 WebSocket 断开连接

**方法名：** `disconnect()`

**入参：** 无

**返回值：** `Promise<void>`

**用途：**

- 移除市场数据监听器
- 清理所有订阅
- 断开 WebSocket 连接

**调用位置：**

- 应用退出时
- 服务清理时

---

### 3.8 订阅管理

**类：** `MarketSubscriptionTracker`

**功能：**

- 跟踪活跃的订阅
- 管理订阅计数（防止重复订阅）
- 数据计数（用于自动取消订阅）
- 检查订阅是否存在

**关键方法：**

- `addSubscription()` - 添加订阅
- `removeSubscription()` - 移除订阅
- `hasSubscription()` - 检查订阅是否存在
- `incrementDataCount()` - 增加数据计数
- `shouldUnsubscribeWithDefaultThreshold()` - 检查是否应该自动取消订阅

**用途：**

- 防止重复订阅
- 自动清理长时间无响应的订阅
- 管理订阅生命周期

---

_第三阶段完成：ServiceMarketWS (WebSocket) 接口分析_

---

## 四、接口调用总结

### 4.1 接口分类

**HTTP REST API：**

- ServiceMarket (V1): 8 个接口
- ServiceMarketV2: 11 个接口

**WebSocket API：**

- ServiceMarketWS: 6 个方法（连接、订阅、取消订阅、断开）

### 4.2 数据流向

**V1 数据流：**

```
MarketHomeV1 → fetchCategories → 分类列表
MarketHomeList → fetchCategory → 代币列表
MarketDetailV1 → fetchMarketTokenDetail → 代币详情
TokenPriceChart → fetchTokenChart → 图表数据
```

**V2 数据流：**

```
MarketHomeV2 → fetchMarketBasicConfig → 基础配置
MarketHomeV2 → fetchMarketChains → 链列表
MarketNormalTokenList → fetchMarketTokenList → 代币列表
MarketWatchlistTokenList → fetchMarketTokenListBatch → 自选列表
MarketDetailV2 → fetchMarketTokenDetailByTokenAddress → 代币详情
TradingView → fetchMarketTokenKline → K 线数据（轮询）
TradingView → subscribeOHLCV → K 线数据（WebSocket）
TransactionsHistory → fetchMarketTokenTransactions → 交易历史
TransactionsHistory → subscribeTokenTxs → 实时交易（WebSocket）
Holders → fetchMarketTokenHolders → 持有人信息
```

### 4.3 缓存策略

**短期缓存（5-15 分钟）：**

- `fetchCategories` - 15 分钟
- `fetchSearchTrending` - 5 分钟
- `fetchMarketTokenSecurity` - 5 分钟

**中期缓存（1 小时）：**

- `fetchMarketBasicConfig` - 1 小时
- `fetchMarketChains` - 1 小时

**实时数据（无缓存）：**

- 代币列表（60 秒轮询）
- 代币详情（5 秒轮询）
- WebSocket 数据（实时推送）

### 4.4 错误处理

**HTTP API：**

- 统一使用 `OneKeyServerApiError` 处理错误
- 部分接口有降级处理（如 `fetchMarketAccountTokenTransactions` 返回空列表）

**WebSocket：**

- 连接失败时抛出 `OneKeyLocalError`
- 消息格式错误时忽略
- 自动取消订阅机制防止数据积累

---

_文档完成：Market 模块网络接口分析_
