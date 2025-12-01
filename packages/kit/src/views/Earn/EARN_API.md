# Earn 模块 API 接口文档

## 目录

- [概述](#概述)
- [服务端点](#服务端点)
- [PublicKey 字段说明](#publickey-字段说明)
- [@morpho-org/bundler-sdk-ethers 使用说明](#morpho-orgbundler-sdk-ethers-使用说明)
- [Vault 字段说明](#vault-字段说明)
- [API 接口列表](#api-接口列表)
- [请求/响应格式](#请求响应格式)
- [错误处理](#错误处理)
- [数据缓存](#数据缓存)

## 概述

Earn 模块的所有 API 调用都通过 `ServiceStaking` 服务类进行，该服务位于 `packages/kit-bg/src/services/ServiceStaking.ts`。所有接口都使用 `EServiceEndpointEnum.Earn` 作为服务端点。

### 基础配置

- **服务端点**：`EServiceEndpointEnum.Earn`
- **HTTP 客户端**：使用 `backgroundApiProxy.serviceAppApiClient`
- **错误处理**：统一使用 `OneKeyServerApiError`

## 服务端点

### Endpoint 枚举

```typescript
enum EServiceEndpointEnum {
  Earn = 'earn', // 主要 Earn API
  Utility = 'utility', // 工具类 API（Banner）
}
```

### API 版本

- **V1 API**：`/earn/v1/*` - 大部分接口使用 V1
- **V2 API**：`/earn/v2/*` - 部分新功能已升级到 V2

### 版本控制机制

**1. 硬编码版本选择**

以下接口已固定使用 V2，无法切换：

- `/earn/v2/stake` - 构建质押交易（`buildStakeTransaction`）
- `/earn/v2/unstake` - 构建提取交易（`buildUnstakeTransaction`）
- `/earn/v2/claim` - 构建领取交易（`buildClaimTransaction`）
- `/earn/v2/stake-protocol/list` - 获取协议列表（`getProtocolList` 内部调用）

**2. 参数控制版本选择**

- **协议详情接口**：
  - `getProtocolDetails(params, isV2?: boolean)` - 通过 `isV2` 参数控制
  - `getProtocolDetailsV2(params)` - 强制使用 V2（内部传入 `isV2: true`）
  - 默认行为：`isV2` 为 `false` 或不传时使用 V1

**3. 版本使用情况**

| 接口路径                         | 版本 | 控制方式 | 状态                    |
| -------------------------------- | ---- | -------- | ----------------------- |
| `/earn/v2/stake`                 | V2   | 硬编码   | ✅ 已升级               |
| `/earn/v2/unstake`               | V2   | 硬编码   | ✅ 已升级               |
| `/earn/v2/claim`                 | V2   | 硬编码   | ✅ 已升级               |
| `/earn/v2/stake-protocol/list`   | V2   | 硬编码   | ✅ 已升级               |
| `/earn/v2/stake-protocol/detail` | V2   | 参数控制 | ✅ 推荐使用             |
| `/earn/v1/stake-protocol/detail` | V1   | 参数控制 | ❌ 已弃用（仅兼容保留） |
| 其他接口                         | V1   | 硬编码   | ✅ 当前版本             |

### 已废弃/不再使用的接口

**以下接口在当前代码中已不再调用：**

1. `/earn/v1/stake` - **已废弃**，已被 `/earn/v2/stake` 替代
2. `/earn/v1/unstake` - **已废弃**，已被 `/earn/v2/unstake` 替代
3. `/earn/v1/claim` - **已废弃**，已被 `/earn/v2/claim` 替代
4. `/earn/v1/stake-protocol/list` - **已废弃**，已被 `/earn/v2/stake-protocol/list` 替代

**⚠️ 重要说明：**

**实际上，`/earn/v1/stake-protocol/detail` 在代码层面已经不再被主动调用。**

- `getProtocolDetails` 方法只有在 `isV2: false` 时才会调用 V1 API
- 但代码中只有 `ProtocolDetails` 页面（遗留页面）会调用 `getProtocolDetails` 且不传 `isV2`（默认 `false`）
- **没有任何代码主动导航到 `ProtocolDetails` 页面**（所有入口都使用 `ProtocolDetailsV2`）
- 因此，V1 API 实际上只会在通过旧格式 URL 直接访问时触发（如 `/defi/staking/:symbol/:provider`）

**建议：**

- 代码层面可以认为 ProtocolDetails 页面和对应的 V1 API 调用（`isV2: false`）已经被弃用
- 保留它们仅是为了兼容可能存在的旧链接（用户收藏、外部分享等）
- **新功能必须使用 V2**（`getProtocolDetailsV2`）

### ProtocolDetails vs ProtocolDetailsV2 页面控制

**两个页面的区别：**

1. **ProtocolDetails**（⚠️ 已弃用，仅兼容保留）

   - 路由：`EModalStakingRoutes.ProtocolDetails`
   - URL：`/defi/staking/:symbol/:provider`
   - API：`getProtocolDetails`（V1，默认 `isV2: false`）
   - **状态：❌ 代码中无任何主动调用，仅保留用于兼容旧 URL**
   - **注意：页面代码存在路由类型定义错误（使用了 `ProtocolDetailsV2` 类型）**

2. **ProtocolDetailsV2**（✅ 主要使用）

   - 路由：`EModalStakingRoutes.ProtocolDetailsV2`
   - URL：`/defi/staking/v2/:symbol/:provider`
   - API：`getProtocolDetailsV2`（V2，强制 `isV2: true`）
   - **状态：✅ 所有新功能入口都使用此页面**

3. **ProtocolDetailsV2Share**（✅ 分享链接）
   - 路由：`EModalStakingRoutes.ProtocolDetailsV2Share`
   - URL：`/defi/:network/:symbol/:provider`（如 `/defi/ethereum/eth/lido`）
   - API：`getProtocolDetailsV2`（V2）
   - **状态：✅ 用于分享链接**

**进入控制：**

**所有代码中的跳转都使用 `ProtocolDetailsV2`**，包括：

- ✅ Earn 首页资产卡片点击 → `ProtocolDetailsV2`
- ✅ 首页 Earn 按钮 → `ProtocolDetailsV2`
- ✅ 协议选择对话框 → `ProtocolDetailsV2`
- ✅ 资产协议列表页面 → `ProtocolDetailsV2`
- ✅ 投资详情页 → `ProtocolDetailsV2`
- ✅ 深度链接处理（新格式） → `ProtocolDetailsV2` 或 `ProtocolDetailsV2Share`

**`ProtocolDetails` 页面：**

- ❌ 代码中无任何主动调用
- ⚠️ 仅保留用于兼容可能存在的旧格式 URL（`/defi/staking/:symbol/:provider`）
- ⚠️ 对应的 V1 API（`/earn/v1/stake-protocol/detail`，当 `isV2: false` 时）也仅在访问此页面时调用

## PublicKey 字段说明

### 什么是 PublicKey

**PublicKey（公钥）** 是账户的公共密钥，用于标识账户的身份。在 BTC 网络中，公钥通常是从账户的扩展公钥（xpub）派生出来的，用于生成地址和验证签名。

### 在 Earn 模块中的作用

在 Earn 模块中，`publicKey` 主要用于：

1. **账户身份识别**：用于识别和验证账户身份（所有支持的网络）
2. **BTC 网络协议识别**：特别用于 BTC 网络的账户识别和验证
3. **Babylon BTC 协议**：Babylon BTC 质押需要 `publicKey` 来构建交易和验证账户
4. **后端查询**：后端可以使用 `publicKey` 查询账户相关的质押信息和投资详情
5. **多网络支持**：在 `/earn/v1/investment/detail` 和 `/earn/v1/recommend` 接口中，所有网络都会传递 `publicKey`（如果账户有的话）

### 哪些网络和协议需要 PublicKey

**所有网络都传递 PublicKey（如果账户有）**：

在实际 API 调用中（如 `/earn/v1/investment/detail`），以下网络都会传递 `publicKey`：

- ✅ **EVM 网络**（如 Ethereum）：传递压缩公钥（66 字符，`03` 或 `02` 开头）
- ✅ **Cosmos 网络**（如 Cosmos Hub）：传递压缩公钥（66 字符，`03` 或 `02` 开头）
- ✅ **Aptos 网络**：传递公钥（64 字符十六进制，无前缀）
- ✅ **Solana 网络**：传递公钥（与地址相同，Base58 格式）
- ✅ **BTC 网络**：传递压缩公钥（66 字符，`03` 或 `02` 开头）
- ✅ **Sui 网络**：传递公钥（64 字符十六进制，无前缀）

**协议特定要求**：

- ✅ **Babylon BTC**：配置了 `usePublicKey: true`，在构建交易时**必须**传递 `publicKey`
- ✅ **其他协议**：在查询接口（如 `/earn/v1/investment/detail`）中，如果账户有 `pub` 字段，会传递 `publicKey`；但在构建交易时，只有配置了 `usePublicKey: true` 的协议才传递

**实际 API 调用示例**：

从实际的 `/earn/v1/investment/detail` 调用可以看到，所有网络都传递了 `publicKey`：

```json
{
  "list": [
    {
      "networkId": "evm--1",
      "accountAddress": "0x66b72da284E5f7B810bF8c3B06b9DEe6E2d57248",
      "publicKey": "03474529e422c732362713d45774df3b9ca5a57ff6bdf3548887f79867b566fdcf" // ⭐ EVM 压缩公钥
    },
    {
      "networkId": "cosmos--cosmoshub-4",
      "accountAddress": "cosmos15yfjug8hu9m4z5l37q57w04zppkl87au5xq0z7",
      "publicKey": "03b14c70b7f6c79ac8142d1b5c6c57e0488e07a7aac51134b5089dc9a8d76d44b8" // ⭐ Cosmos 压缩公钥
    },
    {
      "networkId": "aptos--1",
      "accountAddress": "0x13f354623885e83e9136b04002a17d435988b1e7918d2c58935fd40b0a69c1c8",
      "publicKey": "e6c6f2fd43187e32f0424b0afe9992aabc1515bc453048d67fafc681416ddf02" // ⭐ Aptos 公钥（64字符）
    },
    {
      "networkId": "sol--101",
      "accountAddress": "FTyZyTQSFmbCYEXhvxUS1wi7ytjjZiGwNxiQ5QFGUWK9",
      "publicKey": "FTyZyTQSFmbCYEXhvxUS1wi7ytjjZiGwNxiQ5QFGUWK9" // ⭐ Solana 公钥（与地址相同）
    },
    {
      "networkId": "btc--0",
      "accountAddress": "bc1p2v20r5ndp2ruq3uphrlauv0u4u3pegz58z6tjmh0stnldgkze5ss6xz669",
      "publicKey": "036ab0f60bb9531f29c11ac567ead6c0d8b38fe894a393acf639d8a01ea1cf2600" // ⭐ BTC 压缩公钥
    },
    {
      "networkId": "sui--mainnet",
      "accountAddress": "0x0a06d89e72163170d37ad7d6e85e6acb95acf8be8addd8e018afbdc2d071601a",
      "publicKey": "c5f0073424cbf62969b086680a39b81105b27b8a71fc7d3c83c98d92276e219f" // ⭐ Sui 公钥（64字符）
    }
  ]
}
```

### PublicKey 的获取方式

**从账户对象获取**：

```typescript
// 获取账户信息
const account = await vault.getAccount();

// 从 account.pub 获取 publicKey
const publicKey = account.pub;
```

**账户对象结构**：

```typescript
interface INetworkAccount {
  address: string; // 账户地址
  pub: string; // ⭐ 公钥（BTC 网络存在）
  pubKey?: string; // 可选的公钥字段
  xpub?: string; // 扩展公钥（BTC 网络）
  // ... 其他字段
}
```

### PublicKey 在 API 调用中的使用

#### 1. 构建质押交易（`/earn/v2/stake`）

```typescript
// packages/kit-bg/src/services/ServiceStaking.ts

async buildStakeTransaction(params: IStakeBaseParams) {
  const vault = await vaultFactory.getVault({ networkId, accountId });
  const account = await vault.getAccount();

  const stakingConfig = await this.getStakingConfigs({
    networkId,
    symbol,
    provider,
  });

  const paramsToSend = {
    accountAddress: account.address,
    // ⭐ 如果配置了 usePublicKey，传递 publicKey
    publicKey: stakingConfig.usePublicKey ? account.pub : undefined,
    networkId,
    symbol,
    provider,
    // ...
  };

  const resp = await client.post(`/earn/v2/stake`, paramsToSend);
  return resp.data.data;
}
```

**判断逻辑**：

- 如果 `stakingConfig.usePublicKey === true`，传递 `account.pub`
- 否则传递 `undefined`

#### 2. 获取协议详情（`/earn/v2/stake-protocol/detail`）

```typescript
// packages/kit-bg/src/services/ServiceStaking.ts

async getProtocolDetails(params: {
  accountId?: string;
  networkId: string;
  symbol: string;
  provider: string;
  // ...
}) {
  const account = await this.getEarnAccount({
    accountId: accountId ?? '',
    networkId,
    // ...
  });

  const requestParams = {
    accountAddress: account?.accountAddress,
    networkId,
    symbol,
    provider,
    // ⭐ 如果账户有 pub，传递 publicKey
    publicKey: account?.account?.pub,
    // ...
  };

  const resp = await client.get(`/earn/v2/stake-protocol/detail`, {
    params: requestParams,
  });
  return resp.data.data;
}
```

#### 3. 获取投资组合列表（`/earn/v1/portfolio/list`）

```typescript
// packages/kit-bg/src/services/ServiceStaking.ts

async getPortfolioList(params: IGetPortfolioParams) {
  const { networkId, accountId, ...rest } = params;
  const vault = await vaultFactory.getVault({ networkId, accountId });
  const acc = await vault.getAccount();

  const resp = await client.get(`/earn/v1/portfolio/list`, {
    params: {
      accountAddress: acc.address,
      networkId,
      // ⭐ 如果是 BTC 网络，传递 publicKey
      publicKey: networkUtils.isBTCNetwork(networkId) ? acc.pub : undefined,
      ...rest,
    },
  });
  return resp.data.data;
}
```

**判断逻辑**：

- 如果是 BTC 网络（`networkUtils.isBTCNetwork(networkId)`），传递 `acc.pub`
- 否则传递 `undefined`

#### 4. 获取可领取列表（`/earn/v1/claimable/list`）

```typescript
// packages/kit-bg/src/services/ServiceStaking.ts

async getClaimableList(params: {
  networkId: string;
  accountId: string;
  symbol: string;
  provider: string;
}) {
  const { networkId, accountId, symbol, ...rest } = params;
  const vault = await vaultFactory.getVault({ networkId, accountId });
  const acc = await vault.getAccount();

  const resp = await client.get(`/earn/v1/claimable/list`, {
    params: {
      networkId,
      accountAddress: acc.address,
      symbol,
      // ⭐ 如果是 BTC 网络，传递 publicKey
      publicKey: networkUtils.isBTCNetwork(networkId) ? acc.pub : undefined,
      ...rest,
    },
  });
  return resp.data.data;
}
```

#### 5. 获取推荐资产（`/earn/v1/recommend`）

```typescript
// packages/kit-bg/src/services/ServiceStaking.ts

async getAccountAsset(params: {
  networkId: string;
  accountAddress: string;
  publicKey?: string;  // ⭐ 可选的 publicKey（所有网络如果有 pub 都会传递）
}[]) {
  const client = await this.getRawDataClient(EServiceEndpointEnum.Earn);

  const tokensResponse = await client.post(`/earn/v1/recommend`, {
    accounts: params.map((item) => ({
      networkId: item.networkId,
      accountAddress: item.accountAddress,
      publicKey: item.publicKey,  // ⭐ 传递 publicKey（如果账户有 pub 字段）
    })),
  });

  return tokensResponse.data.data;
}
```

#### 6. 获取投资详情（`/earn/v1/investment/detail`）

```typescript
// packages/kit-bg/src/services/ServiceStaking.ts

async getEarnAvailableAccountsParams({
  accountId,
  networkId,
  indexedAccountId,
}: {
  accountId: string;
  networkId: string;
  indexedAccountId?: string;
}) {
  const accounts = await this.getEarnAvailableAccounts({
    accountId,
    networkId,
    indexedAccountId,
  });

  const accountParams: {
    networkId: string;
    accountAddress: string;
    publicKey?: string;  // ⭐ 可选的 publicKey
  }[] = [];

  earnMainnetNetworkIds.forEach((mainnetNetworkId) => {
    const account = accounts.find((i) => i.networkId === mainnetNetworkId);
    if (account?.apiAddress) {
      accountParams.push({
        accountAddress: account?.apiAddress,
        networkId: mainnetNetworkId,
        publicKey: account?.pub,  // ⭐ 如果账户有 pub，传递 publicKey
      });
    }
  });

  return accountParams;
}

async fetchInvestmentDetail(
  list: {
    accountAddress: string;
    networkId: string;
    publicKey?: string;  // ⭐ 所有网络如果有 pub 都会传递
  }[],
) {
  const client = await this.getClient(EServiceEndpointEnum.Earn);
  const response = await client.post<{
    data: IEarnInvestmentItem[];
  }>(`/earn/v1/investment/detail`, {
    list,  // ⭐ 包含所有网络的 publicKey（如果账户有）
  });
  return response.data.data;
}
```

**实际调用示例**：

从实际 API 调用可以看到，所有网络都传递了 `publicKey`：

```json
{
  "list": [
    {
      "networkId": "evm--1",
      "accountAddress": "0x66b72da284E5f7B810bF8c3B06b9DEe6E2d57248",
      "publicKey": "03474529e422c732362713d45774df3b9ca5a57ff6bdf3548887f79867b566fdcf"
    },
    {
      "networkId": "cosmos--cosmoshub-4",
      "accountAddress": "cosmos15yfjug8hu9m4z5l37q57w04zppkl87au5xq0z7",
      "publicKey": "03b14c70b7f6c79ac8142d1b5c6c57e0488e07a7aac51134b5089dc9a8d76d44b8"
    },
    {
      "networkId": "aptos--1",
      "accountAddress": "0x13f354623885e83e9136b04002a17d435988b1e7918d2c58935fd40b0a69c1c8",
      "publicKey": "e6c6f2fd43187e32f0424b0afe9992aabc1515bc453048d67fafc681416ddf02"
    },
    {
      "networkId": "sol--101",
      "accountAddress": "FTyZyTQSFmbCYEXhvxUS1wi7ytjjZiGwNxiQ5QFGUWK9",
      "publicKey": "FTyZyTQSFmbCYEXhvxUS1wi7ytjjZiGwNxiQ5QFGUWK9"
    },
    {
      "networkId": "btc--0",
      "accountAddress": "bc1p2v20r5ndp2ruq3uphrlauv0u4u3pegz58z6tjmh0stnldgkze5ss6xz669",
      "publicKey": "036ab0f60bb9531f29c11ac567ead6c0d8b38fe894a393acf639d8a01ea1cf2600"
    },
    {
      "networkId": "sui--mainnet",
      "accountAddress": "0x0a06d89e72163170d37ad7d6e85e6acb95acf8be8addd8e018afbdc2d071601a",
      "publicKey": "c5f0073424cbf62969b086680a39b81105b27b8a71fc7d3c83c98d92276e219f"
    }
  ]
}
```

**判断逻辑**：

- 在 `getEarnAvailableAccountsParams` 中，如果账户有 `pub` 字段，就会传递 `publicKey: account?.pub`
- 所有网络（EVM、Cosmos、Aptos、Solana、BTC、Sui）都会传递 `publicKey`（如果账户有）

### 配置控制（usePublicKey）

**配置位置**：`packages/kit-bg/src/vaults/impls/btc/settings.ts`

```typescript
stakingConfig: {
  [getNetworkIdsMap().btc]: {
    providers: {
      [EEarnProviderEnum.Babylon]: {
        supportedSymbols: ['BTC'],
        configs: {
          'BTC': {
            enabled: true,
            tokenAddress: EMPTY_NATIVE_TOKEN_ADDRESS,
            displayProfit: false,
            withdrawWithTx: true,
            claimWithTx: true,
            usePublicKey: true,  // ⭐ Babylon BTC 需要 publicKey
            withdrawSignOnly: true,
          },
        },
      },
    },
  },
}
```

**配置说明**：

- `usePublicKey: true`：表示该协议需要传递 `publicKey` 参数
- 在构建交易时，如果 `stakingConfig.usePublicKey === true`，会传递 `account.pub` 作为 `publicKey`

### PublicKey 的数据来源

**1. 从账户对象获取**：

```typescript
// 获取账户对象
const account = await vault.getAccount();

// 直接使用 account.pub
const publicKey = account.pub;
```

**2. 从 xpub 派生**（对于 Watching 账户）：

```typescript
// packages/kit-bg/src/vaults/impls/btc/KeyringWatching.ts

async prepareAccounts(params: IPrepareWatchingAccountsParams) {
  const accounts = await super.basePrepareUtxoWatchingAccounts(params);
  const networkInfo = await this.getCoreApiNetworkInfo();
  const network = getBtcForkNetwork(networkInfo.networkChainCode);

  for (const account of accounts) {
    if (!account.pub && account.xpub) {
      // ⭐ 从 xpub 派生 publicKey
      const pub = getPublicKeyFromXpub({
        xpub: account.xpub,
        network,
        relPath: '0/0',  // 使用第一个路径
      });
      account.pub = pub;
    }
  }
  return accounts;
}
```

### PublicKey 的格式

不同网络的 `publicKey` 格式不同：

#### 1. EVM 网络（Ethereum、BSC、Polygon 等）

- **格式**：压缩公钥（Compressed Public Key）
- **长度**：66 个字符（不包含 `0x` 前缀）
- **前缀**：`02` 或 `03`（表示 y 坐标的奇偶性）
- **示例**：`"03474529e422c732362713d45774df3b9ca5a57ff6bdf3548887f79867b566fdcf"`
- **说明**：这是 secp256k1 曲线的压缩公钥格式

#### 2. Cosmos 网络（Cosmos Hub、Osmosis 等）

- **格式**：压缩公钥（Compressed Public Key）
- **长度**：66 个字符（不包含 `0x` 前缀）
- **前缀**：`02` 或 `03`
- **示例**：`"03b14c70b7f6c79ac8142d1b5c6c57e0488e07a7aac51134b5089dc9a8d76d44b8"`
- **说明**：与 EVM 网络格式相同，都是 secp256k1 压缩公钥

#### 3. BTC 网络

- **格式**：压缩公钥（Compressed Public Key）
- **长度**：66 个字符（不包含 `0x` 前缀）
- **前缀**：`02` 或 `03`（Taproot 地址使用 `03`）
- **示例**：`"036ab0f60bb9531f29c11ac567ead6c0d8b38fe894a393acf639d8a01ea1cf2600"`
- **说明**：secp256k1 压缩公钥，用于生成地址和验证签名

#### 4. Aptos 网络

- **格式**：未压缩公钥（Uncompressed Public Key）
- **长度**：64 个字符（不包含 `0x` 前缀）
- **前缀**：无
- **示例**：`"e6c6f2fd43187e32f0424b0afe9992aabc1515bc453048d67fafc681416ddf02"`
- **说明**：Ed25519 公钥的十六进制表示

#### 5. Solana 网络

- **格式**：Base58 编码的公钥
- **长度**：44 个字符（Base58 格式）
- **前缀**：无
- **示例**：`"FTyZyTQSFmbCYEXhvxUS1wi7ytjjZiGwNxiQ5QFGUWK9"`
- **说明**：Solana 的公钥与地址相同，都是 Base58 编码的 Ed25519 公钥

#### 6. Sui 网络

- **格式**：未压缩公钥（Uncompressed Public Key）
- **长度**：64 个字符（不包含 `0x` 前缀）
- **前缀**：无
- **示例**：`"c5f0073424cbf62969b086680a39b81105b27b8a71fc7d3c83c98d92276e219f"`
- **说明**：Ed25519 公钥的十六进制表示

**格式总结表**：

| 网络类型   | 格式        | 长度    | 前缀      | 曲线      | 示例               |
| ---------- | ----------- | ------- | --------- | --------- | ------------------ |
| **EVM**    | 压缩公钥    | 66 字符 | `02`/`03` | secp256k1 | `03474529e422c...` |
| **Cosmos** | 压缩公钥    | 66 字符 | `02`/`03` | secp256k1 | `03b14c70b7f6c...` |
| **BTC**    | 压缩公钥    | 66 字符 | `02`/`03` | secp256k1 | `036ab0f60bb9...`  |
| **Aptos**  | 未压缩公钥  | 64 字符 | 无        | Ed25519   | `e6c6f2fd4318...`  |
| **Solana** | Base58 编码 | 44 字符 | 无        | Ed25519   | `FTyZyTQSFmbC...`  |
| **Sui**    | 未压缩公钥  | 64 字符 | 无        | Ed25519   | `c5f0073424cb...`  |

**从 xpub 派生**（BTC 网络）：

- 使用 `getPublicKeyFromXpub` 函数从扩展公钥（xpub）派生
- 需要指定相对路径（通常是 `'0/0'`）
- 仅适用于 BTC 网络和 Watching 账户

### 使用场景总结

| 场景                         | 是否需要 PublicKey | 判断条件                               |
| ---------------------------- | ------------------ | -------------------------------------- |
| **获取投资详情（所有网络）** | ✅ 是（如果有）    | `account?.pub` 存在（所有网络）        |
| **获取推荐资产（所有网络）** | ✅ 是（如果有）    | `account?.pub` 存在（所有网络）        |
| **Babylon BTC 质押**         | ✅ 是（必须）      | `stakingConfig.usePublicKey === true`  |
| **Babylon BTC 提取**         | ✅ 是（必须）      | `stakingConfig.usePublicKey === true`  |
| **Babylon BTC 领取**         | ✅ 是（必须）      | `stakingConfig.usePublicKey === true`  |
| **获取协议详情（BTC）**      | ✅ 是（如果有）    | `account?.account?.pub` 存在           |
| **获取投资组合（BTC）**      | ✅ 是（如果有）    | `networkUtils.isBTCNetwork(networkId)` |
| **获取可领取列表（BTC）**    | ✅ 是（如果有）    | `networkUtils.isBTCNetwork(networkId)` |
| **EVM 网络构建交易**         | ❌ 否              | 不需要 `publicKey`（仅查询接口传递）   |
| **Cosmos 网络构建交易**      | ❌ 否              | 不需要 `publicKey`（仅查询接口传递）   |

### 注意事项

1. **所有网络都会传递 PublicKey（如果账户有）**：

   - 在 `/earn/v1/investment/detail` 和 `/earn/v1/recommend` 接口中，所有网络都会传递 `publicKey`（如果账户有 `pub` 字段）
   - 这包括 EVM、Cosmos、Aptos、Solana、BTC、Sui 等所有网络
   - 不同网络的 `publicKey` 格式不同（见上方的格式说明）

2. **BTC 网络特殊处理**：

   - BTC 网络在调用某些 API 时，会自动传递 `publicKey`
   - 即使协议配置中没有 `usePublicKey: true`，如果是 BTC 网络，也会传递
   - 在构建交易时，只有配置了 `usePublicKey: true` 的协议才必须传递

3. **协议特定要求**：

   - **Babylon BTC**：在构建交易时，`publicKey` 是**必须**的（`stakingConfig.usePublicKey === true`）
   - **其他协议**：在查询接口中，如果账户有 `pub` 字段，会传递 `publicKey`；但在构建交易时，只有配置了 `usePublicKey: true` 的协议才传递

4. **账户类型支持**：

   - **HD 账户**：有 `account.pub` 字段
   - **Watching 账户**：如果有 `xpub`，可以从 `xpub` 派生 `pub`（仅 BTC 网络）
   - **硬件钱包账户**：有 `account.pub` 字段

5. **PublicKey 的唯一性**：

   - 每个账户有唯一的 `publicKey`
   - `publicKey` 与账户地址是一一对应的
   - 不同网络的 `publicKey` 格式不同，但都代表同一个账户的身份

6. **格式差异**：

   - **EVM/Cosmos/BTC**：使用压缩公钥（66 字符，`02`/`03` 开头）
   - **Aptos/Sui**：使用未压缩公钥（64 字符十六进制）
   - **Solana**：使用 Base58 编码的公钥（与地址相同）

7. **安全性**：

   - `publicKey` 是公开信息，可以安全地传递给后端 API
   - 不需要担心泄露问题，因为它本身就是公开的
   - 不同网络使用不同的加密曲线（secp256k1 或 Ed25519）

8. **错误处理**：
   - 如果账户没有 `pub` 字段，传递 `undefined`
   - 后端会处理 `publicKey` 为 `undefined` 的情况
   - 某些网络（如 Solana）的 `publicKey` 可能与地址相同

### 代码位置

- **配置定义**：`packages/kit-bg/src/vaults/impls/btc/settings.ts` 第 145 行
- **使用示例**：`packages/kit-bg/src/services/ServiceStaking.ts` 第 271、326、393、528、777、803 行
- **账户获取**：`packages/kit-bg/src/vaults/base/VaultBase.ts` 第 1125-1218 行
- **从 xpub 派生**：`packages/core/src/chains/btc/sdkBtc/index.ts` 第 719-735 行

## @morpho-org/bundler-sdk-ethers 使用说明

### 什么是 Bundler SDK

`@morpho-org/bundler-sdk-ethers` 是 Morpho 提供的 SDK，用于将 Permit2 签名封装成符合 Morpho Bundler 合约格式的操作。它提供了 `BundlerAction` 类，用于创建标准的 Permit2 Bundler Action。

### 核心作用

**BundlerAction** 的主要作用是：

1. **封装 Permit2 签名**：将用户签名的 EIP-712 数据封装成 Bundler 合约可以理解的格式
2. **统一授权接口**：通过 Morpho Bundler Contract (`0x4095f064b8d3c3548a3bebfd0bbfd04750e30077`) 统一处理所有代币的授权
3. **支持不同代币格式**：为 USDC 和 DAI 提供不同的封装方法（`permit()` 和 `permitDai()`）

### 使用场景

**适用协议**：

- ✅ **Morpho**: 使用 Permit2 进行授权
- ✅ **Momentum**: 使用 Permit2 进行授权

**适用代币**：

- ✅ **USDC**: 使用 `BundlerAction.permit()`
- ✅ **DAI**: 使用 `BundlerAction.permitDai()`（需要 `expiry` 字段）

**不适用场景**：

- ❌ **Legacy 授权**：使用传统的 `approve` 交易，不需要 Bundler SDK
- ❌ **其他协议**：如 Ethena、Falcon、Lido 等，不使用 Permit2

### 完整工作流程

```
1. 检查授权额度
   ↓
2. 如果额度不足，启动 Permit2 授权流程：
   ↓
3. 调用 /earn/v1/permit-signature 获取 EIP-712 签名数据（需要 API）
   ↓
4. 用户在本地签名（navigationToMessageConfirmAsync，不需要 API）
   ↓
5. 使用 BundlerAction 封装签名结果（不需要 API）
   ↓
6. 缓存签名（24小时有效）
   ↓
7. 调用 /earn/v2/stake，传递 permitSignature（需要 API）
   ↓
8. 后端使用 Bundler Action 构建质押交易
```

### 代码实现

**1. 获取 Permit2 签名数据并签名**：

```typescript
// packages/kit/src/views/Staking/hooks/useEarnPermitApprove.ts

import { BundlerAction } from '@morpho-org/bundler-sdk-ethers';
import { MorphoBundlerContract } from '@onekeyhq/shared/src/consts/addresses';

export function useEarnPermitApprove() {
  const getPermitSignature = useCallback(
    async ({
      networkId,
      accountId,
      token,
      amountValue,
      providerName,
      vaultAddress,
    }) => {
      // 1. 获取 Permit2 签名数据（EIP-712 格式）
      const permit2Data =
        await backgroundApiProxy.serviceStaking.buildPermit2ApproveSignData({
          networkId,
          provider: providerName,
          symbol: token.symbol,
          accountAddress: account.address,
          vault: vaultAddress,
          amount: new BigNumber(amountValue).toFixed(),
        });

      // 2. 验证 spender 地址（必须是 Morpho Bundler Contract）
      if (
        permit2Data.message.spender.toLowerCase() !==
        MorphoBundlerContract.toLowerCase()
      ) {
        throw new Error(
          `Invalid spender address. Expected: ${MorphoBundlerContract}`,
        );
      }

      // 3. 用户在本地签名
      const signHash = await navigationToMessageConfirmAsync({
        accountId,
        networkId,
        unsignedMessage: {
          type: EMessageTypesEth.TYPED_DATA_V4,
          message: JSON.stringify(permit2Data),
          payload: [account.address, JSON.stringify(permit2Data)],
        },
        walletInternalSign: true,
      });

      // 4. 使用 BundlerAction 封装签名结果
      let permitBundlerAction;
      if (token.symbol === 'USDC') {
        permitBundlerAction = BundlerAction.permit(
          permit2Data.domain.verifyingContract, // 代币合约地址
          permit2Data.message.value, // 授权金额
          permit2Data.message.deadline, // 过期时间
          ethers.Signature.from(signHash), // 签名结果
          true, // singleUse
        );
      } else if (token.symbol === 'DAI') {
        if (!permit2Data.message.expiry) {
          throw new OneKeyLocalError('Expiry is required for DAI');
        }
        permitBundlerAction = BundlerAction.permitDai(
          permit2Data.message.nonce, // nonce
          permit2Data.message.expiry, // expiry（DAI 特有）
          true, // singleUse
          ethers.Signature.from(signHash), // 签名结果
          false, // 其他参数
        );
      } else {
        throw new OneKeyLocalError('Unsupported token');
      }

      return permitBundlerAction;
    },
    [navigationToMessageConfirmAsync],
  );

  return { getPermitSignature };
}
```

**2. 使用封装后的签名**：

```typescript
// packages/kit/src/views/Staking/components/UniversalStake/index.tsx

// 获取 Permit2 签名
const permitBundlerAction = await getPermitSignature({
  networkId,
  accountId,
  token: tokenInfo?.token,
  amountValue,
  providerName,
  vaultAddress: approveTarget.spenderAddress,
});

// 缓存签名（24小时有效）
updatePermitCache({
  accountId,
  networkId,
  tokenAddress: tokenInfo?.token?.address ?? '',
  amount: amountValue,
  signature: permitBundlerAction, // ⭐ 保存 BundlerAction 结果
  expiredAt: Date.now() + 24 * 60 * 60 * 1000,
});

// 调用质押交易，传递 permitSignature
await handleStake({
  amount: amountValue,
  symbol,
  provider,
  protocolVault,
  approveType: EApproveType.Permit,
  permitSignature: permitBundlerAction, // ⭐ 传递给后端
  // ...
});
```

**3. 后端使用 permitSignature**：

```typescript
// packages/kit-bg/src/services/ServiceStaking.ts

async buildStakeTransaction(params: IStakeBaseParams) {
  const paramsToSend = {
    accountAddress: account.address,
    networkId,
    symbol,
    provider,
    amount,
    approveType: EApproveType.Permit,
    permitSignature: params.permitSignature,  // ⭐ BundlerAction 封装的结果
    // ...
  };

  // 调用 /earn/v2/stake，后端会使用 permitSignature 构建交易
  const resp = await client.post(`/earn/v2/stake`, paramsToSend);
  return resp.data.data;
}
```

### BundlerAction 方法说明

#### 1. `BundlerAction.permit()` - USDC 标准 Permit

```typescript
BundlerAction.permit(
  token: string,        // 代币合约地址（permit2Data.domain.verifyingContract）
  amount: string,       // 授权金额（permit2Data.message.value）
  deadline: number,     // 过期时间戳（permit2Data.message.deadline）
  signature: Signature, // 签名结果（ethers.Signature.from(signHash)）
  singleUse: boolean,   // 是否单次使用（true）
): string
```

**用途**：

- 用于 USDC 等标准 ERC20 代币
- 使用标准的 Permit2 格式

#### 2. `BundlerAction.permitDai()` - DAI 特殊 Permit

```typescript
BundlerAction.permitDai(
  nonce: string,        // nonce（permit2Data.message.nonce）
  expiry: number,       // 过期时间戳（permit2Data.message.expiry，DAI 特有）
  singleUse: boolean,   // 是否单次使用（true）
  signature: Signature, // 签名结果（ethers.Signature.from(signHash)）
  other: boolean,       // 其他参数（false）
): string
```

**用途**：

- 专门用于 DAI 代币
- DAI 使用 `expiry` 而不是 `deadline`
- 需要从 `permit2Data.message.expiry` 获取过期时间

### Morpho Bundler Contract

**合约地址**：`0x4095f064b8d3c3548a3bebfd0bbfd04750e30077`

**作用**：

- 统一处理所有代币的 Permit2 授权
- 不需要每个代币合约都实现 Permit 功能
- 通过 Bundler 合约统一管理授权

**验证**：

- 在封装签名前，必须验证 `permit2Data.message.spender` 是否等于 `MorphoBundlerContract`
- 如果地址不匹配，会抛出错误

### 签名缓存机制

**缓存时间**：24 小时

**缓存内容**：

```typescript
{
  accountId: string;
  networkId: string;
  tokenAddress: string;
  amount: string;
  signature: string; // BundlerAction 封装的结果
  expiredAt: number; // 过期时间戳
}
```

**缓存策略**：

- 如果缓存中有有效签名且金额足够，直接使用缓存
- 如果缓存过期或金额不足，重新签名
- 缓存键：`${accountId}_${networkId}_${tokenAddress}_${amount}`

### 与 Legacy 授权的对比

| 特性             | Legacy 授权               | Permit2 授权（Bundler SDK）              |
| ---------------- | ------------------------- | ---------------------------------------- |
| **实现方式**     | 发送 `approve` 交易到链上 | 本地签名 + BundlerAction 封装            |
| **Gas 费用**     | 需要支付 Gas              | 授权过程无 Gas，但质押交易中包含授权逻辑 |
| **用户体验**     | 需要等待授权交易确认      | 即时签名，无需等待                       |
| **签名缓存**     | 不支持                    | 支持 24 小时缓存                         |
| **适用协议**     | Ethena、Falcon 等         | Morpho、Momentum                         |
| **Spender 地址** | 各协议合约地址            | 统一使用 MorphoBundlerContract           |
| **代码复杂度**   | 简单（直接发送交易）      | 复杂（需要 Bundler SDK）                 |

### 注意事项

1. **Spender 地址验证**：

   - 必须验证 `permit2Data.message.spender` 是否等于 `MorphoBundlerContract`
   - 这是安全措施，防止签名被用于其他合约

2. **代币支持**：

   - 目前仅支持 USDC 和 DAI
   - 其他代币会抛出 `Unsupported token` 错误

3. **DAI 特殊处理**：

   - DAI 需要 `expiry` 字段而不是 `deadline`
   - 必须使用 `BundlerAction.permitDai()` 而不是 `BundlerAction.permit()`

4. **签名格式**：

   - 使用 `ethers.Signature.from(signHash)` 将签名字符串转换为 Signature 对象
   - 代码中使用 `@ts-expect-error` 忽略类型检查

5. **缓存失效**：
   - 签名缓存 24 小时后失效
   - 如果授权金额不足，需要重新签名更大的金额

### 代码位置

- **BundlerAction 使用**：`packages/kit/src/views/Staking/hooks/useEarnPermitApprove.ts` 第 3、82-108 行
- **签名获取**：`packages/kit/src/views/Staking/components/UniversalStake/index.tsx` 第 816-832 行
- **Morpho Bundler Contract**：`packages/shared/src/consts/addresses.ts` 第 15-16 行
- **后端调用**：`packages/kit-bg/src/services/ServiceStaking.ts` 第 241-302 行

## Vault 字段说明

### 什么是 Vault

**Vault** 是协议（如 Morpho、Momentum）的智能合约地址，用于标识不同的资金池或策略。对于使用 Vault Provider 的协议，一个代币可能对应多个 vault，每个 vault 代表不同的投资策略或资金池。

### 哪些协议需要 Vault

使用 `useVaultProvider` 函数判断协议是否需要 vault 参数：

```typescript
// packages/shared/src/utils/earnUtils.ts
const useVaultProvider = ({ providerName }: { providerName: string }) => {
  return (
    isMorphoProvider({ providerName }) || isMomentumProvider({ providerName })
  );
};
```

**需要 Vault 的协议**：

- ✅ **Morpho**: 一个代币可能对应多个 vault（不同的资金池）
- ✅ **Momentum**: 一个代币可能对应多个 vault（不同的策略）

**不需要 Vault 的协议**：

- ❌ **Ethena**: 不需要 vault
- ❌ **Falcon**: 不需要 vault
- ❌ **Lido**: 不需要 vault
- ❌ **Babylon**: 不需要 vault
- ❌ **Everstake**: 不需要 vault

### Vault 在 API 响应中的位置

在 `/earn/v1/recommend` 接口的响应中，`vault` 字段位于 `protocols` 数组中：

```json
{
  "data": {
    "assets": [
      {
        "symbol": "USDC",
        "protocols": [
          {
            "networkId": "evm--1",
            "provider": "morpho",
            "vault": "0x974c8FBf4fd795F66B85B73ebC988A51F1A040a9"
          },
          {
            "networkId": "evm--1",
            "provider": "morpho",
            "vault": "0x51056b3F809f4cFE17E1A8715B82f5dbbCA5a5A1"
          }
        ]
      }
    ]
  }
}
```

**示例说明**：

- USDC 在 Morpho 协议下有两个不同的 vault
- 每个 vault 代表不同的资金池或策略
- 用户可以选择不同的 vault 进行质押

### Vault 的使用场景

#### 1. 协议列表选择

当用户在协议列表中选择协议时，如果 `useVaultProvider` 返回 `true`，会将 `vault` 参数传递给协议详情页：

```typescript
// packages/kit/src/views/Earn/components/showProtocolListDialog.tsx
await onProtocolSelect({
  networkId: protocol.network.networkId,
  accountId,
  symbol,
  provider: protocol.provider.name,
  vault: earnUtils.useVaultProvider({
    providerName: protocol.provider.name,
  })
    ? protocol.provider.vault // ⭐ 传递 vault 地址
    : undefined,
});
```

#### 2. 获取协议详情

在调用 `/earn/v2/stake-protocol/detail` 接口时，如果协议需要 vault，需要传递 `vault` 参数：

```typescript
// packages/kit-bg/src/services/ServiceStaking.ts
async getProtocolDetailsV2(params: {
  accountId?: string;
  indexedAccountId?: string;
  networkId: string;
  symbol: string;
  provider: string;
  vault?: string;  // ⭐ Vault Provider 协议需要
}) {
  // ...
  const requestParams = {
    accountAddress,
    networkId,
    symbol,
    provider: provider.toLowerCase(),
    vault: params.vault,  // ⭐ 传递给 API
    // ...
  };
  // ...
}
```

#### 3. 构建交易

在调用 `/earn/v2/stake`、`/earn/v2/unstake`、`/earn/v2/claim` 接口时，如果协议需要 vault，需要传递 `vault` 参数：

```typescript
// packages/kit-bg/src/services/ServiceStaking.ts
async buildStakeTransaction(params: IStakeBaseParams) {
  // ...
  const useVaultProvider = earnUtils.useVaultProvider({
    providerName: provider,
  });

  const paramsToSend: Record<string, any> = {
    accountAddress: account.address,
    networkId,
    symbol,
    provider,
    // ...
  };

  // ⭐ 如果使用 Vault Provider，添加 vault 参数
  if (useVaultProvider) {
    paramsToSend.vault = protocolVault;
  }

  // ...
}
```

### Vault 与 ApproveTarget 的关系

在协议详情中，`vault` 字段和 `approve.approveTarget` 字段可能不同：

- **`vault`**: 协议的智能合约地址，用于标识资金池
- **`approve.approveTarget`**: 授权目标地址，用于 ERC20 代币授权

在某些协议中，这两个地址可能相同，也可能不同。在代码中，优先使用 `approve.approveTarget`，如果没有则使用 `vault`：

```typescript
// packages/kit/src/views/Staking/pages/Stake/index.tsx
const protocolVault = earnUtils.useVaultProvider({
  providerName: providerName || '',
})
  ? protocolInfo?.approve?.approveTarget || protocolInfo?.vault || ''
  : '';
```

### 注意事项

1. **多个 Vault 的情况**：

   - 一个代币在同一个协议下可能有多个 vault
   - 用户需要从协议列表中选择具体的 vault
   - 不同的 vault 可能有不同的 APR、费用、策略等

2. **Vault 的必要性**：

   - 只有 Morpho 和 Momentum 协议需要 vault
   - 其他协议不需要传递 vault 参数
   - 如果协议不需要 vault，传递 `undefined` 或不传递

3. **Vault 的唯一性**：
   - 每个 vault 地址在协议中应该是唯一的
   - vault 地址用于区分不同的资金池或策略
   - 在选择协议时，必须选择正确的 vault

## API 接口列表

### 1. 账户相关接口

#### 1.1 获取账户概览

**接口：** `GET /earn/v1/overview`

**方法：** `fetchAccountOverview`

**参数：**

```typescript
{
  accountId: string;
  networkId: string;
  indexedAccountId?: string;
}
```

**内部处理：**

1. 调用 `getEarnAvailableAccountsParams` 获取所有主网账户参数
2. 并行请求各网络的概览数据
3. 聚合返回结果

**请求参数（单个账户）：**

```typescript
{
  accountAddress: string;
  networkId: string;
  publicKey?: string;  // BTC 网络需要
}
```

**响应结构：**

```typescript
IEarnAccountResponse = {
  totalFiatValue: string;        // 总质押价值（法币）
  earnings24h: string;           // 24小时收益（法币）
  canClaim: boolean;             // 是否有可领取资产
}
```

**聚合结果：**

```typescript
{
  totalFiatValue: string; // 所有网络总和
  earnings24h: string; // 所有网络总和
  hasClaimableAssets: boolean; // 任意网络有可领取资产
}
```

#### 1.2 获取推荐资产

**接口：** `POST /earn/v1/recommend`

**方法：** `getAccountAsset`

**调用时机：**

此接口通过以下调用链触发：

1. **主要调用路径：**

   ```
   InvestmentDetails 页面
     → fetchAllNetworkAssets (当本地缓存数据为空时)
       → getEarnAvailableAccountsParams (获取所有主网账户参数)
       → getAccountAsset (调用此接口)
         → /earn/v1/recommend API
   ```

2. **具体场景：**

   - 用户在 **投资详情页（InvestmentDetails）** 查看自己的质押投资
   - 当本地缓存数据（`earnAccount`）为空时，会触发 `fetchAllNetworkAssets`
   - `fetchAllNetworkAssets` 会获取用户在所有主网上的账户信息，然后调用 `/earn/v1/recommend` 获取个性化推荐资产

3. **调用条件：**
   ```typescript
   // packages/kit/src/views/Staking/pages/InvestmentDetails/index.tsx
   let list = earnAccount?.[totalFiatMapKey]?.accounts || [];
   if (list.length === 0) {
     // 只有当本地数据为空时才会调用
     const earnAccountOnNetwork = await fetchAllNetworkAssets({...});
     list = earnAccountOnNetwork.accounts;
   }
   ```

**用途：**

1. **获取账户列表用于后续查询**：

   - 接口返回的 `tokens` 数组包含用户在各网络上的质押资产信息
   - 代码会提取每个网络的账户信息（`networkId`, `accountAddress`, `publicKey`）
   - 这些账户信息会作为参数传递给 `/earn/v1/investment/detail` 接口，用于获取详细的投资详情

2. **数据流转过程**：

   ```
   /earn/v1/recommend 返回 tokens
     ↓
   提取 accounts 列表（包含 networkId, accountAddress, publicKey）
     ↓
   作为参数调用 /earn/v1/investment/detail
     ↓
   获取详细的投资详情（earnInvestmentItems）
   ```

3. **具体使用场景**：

   ```typescript
   // packages/kit/src/views/Staking/pages/InvestmentDetails/index.tsx
   const earnAccountOnNetwork = await fetchAllNetworkAssets({...});
   list = earnAccountOnNetwork.accounts;  // 获取 accounts 列表

   // 使用 accounts 列表调用投资详情接口
   const response = await fetchInvestmentDetail(
     list.map(({ networkId, accountAddress, publicKey }) => ({
       networkId,
       accountAddress,
       publicKey,
     }))
   );
   ```

4. **返回的 tokens 数据说明**：

   - `profit`: 收益金额（可能用于显示或过滤）
   - `balance`, `balanceParsed`: 质押余额（用于判断是否有质押资产）
   - `apr`, `aprWithoutFee`: 年化收益率（可能用于排序或展示）
   - `networkId`: 网络 ID（用于组织 accounts 列表）
   - **主要用途**：通过 `networkId` 将 tokens 分组到对应的 account 中，构建 accounts 列表

5. **过滤逻辑**：
   - 只返回有质押资产的网络（tokens 不为空）
   - 如果没有质押资产，`accounts` 列表为空，后续不会调用 `fetchInvestmentDetail`

**参数：**

```typescript
{
  accounts: Array<{
    accountAddress: string; // 用户账户地址
    networkId: string; // 网络 ID
    publicKey?: string; // BTC 网络需要公钥
  }>;
}
```

**响应结构：**

```typescript
IRecommendResponse = {
  code: string;
  message?: string;
  data: {
    tokens: IEarnAccountToken[];  // 推荐的质押资产列表
  };
}
```

**返回结构：**

```typescript
IEarnAccountTokenResponse = {
  accounts: Array<{
    networkId: string;
    accountAddress: string;
    publicKey?: string;
    tokens: IEarnAccountToken[];  // 该账户在该网络上的质押资产
  }>;
}
```

**重要说明：**

1. **接口作用**：

   - 此接口是**个性化推荐接口**，需要传入用户的账户地址
   - 接口会根据账户地址返回该账户在各网络上的质押资产列表
   - **主要目的是获取账户列表**，用于后续调用 `/earn/v1/investment/detail` 获取详细投资信息

2. **每次进入投资详情页都会调用**：

   - 当本地缓存数据（`earnAccount`）为空时，会调用此接口
   - 返回的数据用于构建 `accounts` 列表，作为查询详细投资信息的参数
   - 如果本地缓存已有数据，则不会调用此接口

3. **与 `/earn/v1/available-assets` 的区别**：

   - `/earn/v1/available-assets`：返回所有可用的质押资产（不依赖账户，用于展示可质押资产列表）
   - `/earn/v1/recommend`：返回针对特定账户的质押资产（需要账户地址，用于获取该账户的质押情况）

4. **返回数据的实际用途**：

   - `tokens` 中的 `networkId` 用于组织 accounts 列表
   - `balance`, `profit` 等信息可能用于判断是否有质押资产
   - **核心用途**：提取 `accounts` 列表（包含 `networkId`, `accountAddress`, `publicKey`），传递给 `/earn/v1/investment/detail`

5. **数据示例**：
   ```json
   {
     "tokens": [
       {
         "networkId": "evm--1",
         "symbol": "ETH",
         "profit": "2.625640928610778869485544",
         "balance": "25521007172663474"
         // ... 其他字段
       }
     ]
   }
   ```
   - 这些 tokens 会被组织成 accounts 列表，每个 account 包含该网络的账户信息和对应的 tokens

#### 1.3 获取 Earn 账户信息

**接口：** 本地方法（不调用 API）

**方法：** `getEarnAccount`

**参数：**

```typescript
{
  accountId: string;
  networkId: string;
  indexedAccountId?: string;
  btcOnlyTaproot?: boolean;  // BTC 网络仅返回 Taproot 地址
}
```

**返回结构：**

```typescript
{
  walletId: string;
  accountId: string;
  networkId: string;
  accountAddress: string;
  account: INetworkAccount;
}
```

### 2. 资产列表接口

#### 2.1 获取可质押资产列表

**接口：** `GET /earn/v1/available-assets`

**方法：** `getAvailableAssets`

**参数：**

```typescript
{
  type?: EAvailableAssetsTypeEnum;  // 'all' | 'stableCoins' | 'nativeTokens'
}
```

**响应结构：**

```typescript
IAvailableAssetsResponse = {
  code: string;
  message?: string;
  data: {
    assets: IAvailableAsset[];
  };
}
```

**资产结构：**

```typescript
IAvailableAsset = {
  name: string;
  symbol: string;
  logoURI: string;
  apr: string;                    // 包含费率后的 APR
  aprWithoutFee: string;          // 不包含费率的 APR
  tags: string[];
  rewardUnit: string;             // 收益单位（如 '%', 'APY'）
  protocols: IEarnAvailableAssetProtocol[];
  badges?: IEarnAvailableAssetBadge[];
  aprInfo?: IEarnAvailableAssetAprInfo;
  bgColor?: string;              // 卡片背景色
}
```

**缓存策略：**

- 缓存时间：5 分钟
- 缓存 Key：基于 `type` 参数

#### 2.2 获取协议列表

**接口：** `POST /earn/v2/stake-protocol/list`

**方法：** `getProtocolList`

**参数：**

```typescript
{
  symbol: string;
  accountId?: string;
  indexedAccountId?: string;
  filterNetworkId?: string;      // 可选网络过滤
}
```

**内部处理：**

1. 获取 symbol 支持的所有网络
2. 为每个网络获取账户信息
3. 调用 `_getProtocolList` 获取协议列表
4. 应用网络过滤（如有）
5. 检查协议启用状态

**请求体：**

```typescript
{
  symbol: string;
  items: Array<{
    networkId: string;
    accountAddress?: string;
    publicKey?: string;
  }>;
}
```

**响应结构：**

```typescript
{
  data: {
    protocols: IStakeProtocolListItem[];
  };
}
```

**协议项结构：**

```typescript
IStakeProtocolListItem = {
  network: {
    networkId: string;
    name: string;
    logoURI: string;
  };
  provider: {
    name: string;                // 协议名称
    logoURI: string;
    aprWithoutFee: string;
    poolFee: string;
    totalStaked: string;
    vault?: string;               // 协议 vault 地址
    // ... 其他协议信息
  };
}
```

**缓存策略：**

- 缓存时间：5 秒
- 仅缓存有账户地址的请求

### 3. 协议详情接口

#### 3.1 获取协议详情（V2）

**接口：** `GET /earn/v2/stake-protocol/detail`

**方法：** `getProtocolDetailsV2`

**参数：**

```typescript
{
  accountId?: string;
  indexedAccountId?: string;
  networkId: string;
  symbol: string;
  provider: string;              // 协议名称（小写）
  vault?: string;                // 协议 vault 地址
}
```

**请求参数：**

```typescript
{
  accountAddress?: string;
  networkId: string;
  symbol: string;
  provider: string;              // 自动转为小写
  publicKey?: string;            // BTC 网络需要
  vault?: string;
  kycAccountAddress?: string;    // Ethena USDe 需要
}
```

**响应结构：**

```typescript
IStakeEarnDetail = {
  // 核心字段
  actions?: IEarnDetailActions[];          // 操作按钮（认购、赎回、历史记录等）
  subscriptionValue?: ISubscriptionValue;   // 认购价值
  managers?: {                             // 管理者信息
    items: Array<{
      title: IEarnText;
      description: IEarnText;
      logoURI: string;
    }>;
  };

  // 收益和协议信息
  profit?: IEarnProfit;                    // 利润信息
  provider?: {                             // 渠道商信息
    title: IEarnText;
    items: IEarnGridItem[];
  };
  apyDetail?: {                           // APR/APY 详情
    type: 'default';
    title: IEarnText;
    description: IEarnText;
    button: IEarnActionIcon;
  };
  protocol?: IProtocolInfo;                // 协议基本信息

  // 其他信息
  portfolios?: {                           // 投资组合
    title: IEarnText;
    items: IPortfolioItem[];
    button?: IEarnPortfolioActionIcon;
  };
  rewards?: IRewards;                      // 奖励信息
  risk?: IEarnRisk;                       // 风险信息
  protection?: IProtection;                // 保护信息
  timeline?: ITimeline;                    // 时间线信息
  faqs?: {                                // 常见问题
    title: IEarnText;
    items: IEarnFAQItem[];
  };
  alertsV2?: IEarnAlert[];                 // 告警信息（V2）
  countDownAlert?: ICountDownAlert;        // 倒计时告警
  tags?: IStakeBadgeTag[];                // 标签
  nums?: {                                // 数值信息
    overflow?: string;
    minUnstakeAmount?: string;
    maxUnstakeAmount?: string;
    minTransactionFee?: string;           // 最小交易手续费（实际使用）
    claimable?: string;
    remainingCap?: string;
  };
  statement?: IStatement;                  // 声明信息
  riskNoticeDialog?: Record<string, IEarnRiskNoticeDialog>;
}
```

**⚠️ 未使用或未定义的字段：**

根据接口返回的数据和代码使用情况对比，以下字段在接口返回中存在，但**未在类型定义中声明或未在代码中使用**：

1. **`intro`** - ❌ 未定义且未使用

   - 在 JSON 响应中存在，包含协议介绍信息
   - 类型定义 `IStakeEarnDetail` 中没有此字段
   - 代码中未使用此字段
   - **结构**：
     ```json
     {
       "title": { "text": "Intro" },
       "items": [
         {
           "title": { "text": "收益代币" },
           "items": [{ "title": { "text": "ETH" }, "logoURI": "..." }]
         }
         // ... 其他介绍项
       ]
     }
     ```

2. **`performance`** - ❌ 未定义且未使用

   - 在 JSON 响应中存在，包含性能指标（最近一天、一周、一月）
   - 类型定义 `IStakeEarnDetail` 中没有此字段
   - 代码中未使用此字段
   - **结构**：
     ```json
     {
       "title": { "text": "Performance" },
       "items": [
         {
           "title": { "text": "最近一天" },
           "description": { "text": "2.84%" }
         },
         {
           "title": { "text": "最近一周" },
           "description": { "text": "2.84%" }
         },
         { "title": { "text": "最近一月" }, "description": { "text": "2.85%" } }
       ]
     }
     ```

3. **`alerts`** - ⚠️ 可能已废弃
   - 在 JSON 响应中存在（但为空数组）
   - 类型定义中使用的是 `alertsV2`
   - 代码中只使用 `alertsV2`，不使用 `alerts`
   - **结论**：可能是旧版本字段，已被 `alertsV2` 替代

**实际使用的字段：**

- ✅ `actions` - 用于构建操作按钮（认购、赎回、历史记录）
- ✅ `managers` - 显示管理者信息
- ✅ `subscriptionValue` - 显示认购价值和余额
- ✅ `portfolios` - 显示投资组合
- ✅ `profit` - 显示利润信息
- ✅ `provider` - 显示渠道商信息
- ✅ `apyDetail` - 显示 APR/APY 详情和弹出框
- ✅ `protocol` - 协议基本信息
- ✅ `alertsV2` - 显示告警信息
- ✅ `faqs` - 显示常见问题
- ✅ `nums.minTransactionFee` - 用于显示最小交易手续费
- ✅ `nums.overflow` - 用于检查溢出
- ✅ `nums.minUnstakeAmount` / `nums.maxUnstakeAmount` - 用于提取限制
- ✅ `nums.remainingCap` - 用于显示剩余容量
- ✅ `nums.claimable` - 用于显示可领取数量
- ✅ `protection` - 显示保护信息
- ✅ `timeline` - 显示时间线
- ✅ `rewards` - 显示奖励信息
- ✅ `risk` - 显示风险信息
- ✅ `tags` - 显示标签
- ✅ `countDownAlert` - 显示倒计时告警

**特殊处理：**

- **Ethena USDe**：需要传递 KYC 验证的账户地址
- **BTC 网络**：需要传递 `publicKey`

#### 3.2 获取协议详情（V1 - 兼容）

**接口：** `GET /earn/v1/stake-protocol/detail`

**方法：** `getProtocolDetails`

**说明：** V1 版本，新功能优先使用 V2

### 4. 交易构建接口

#### 4.1 构建质押交易

**接口：** `POST /earn/v2/stake`

**方法：** `buildStakeTransaction`

**调用时机：**

1. **主要调用路径**：

   ```
   协议详情页 (ProtocolDetailsV2)
     → 点击"认购"按钮 (onStake)
       → useHandleStake → 导航到 Stake 页面
         → 用户输入金额并确认 (onConfirm)
           → useUniversalStake → buildStakeTransaction
             → /earn/v2/stake API
   ```

2. **具体触发时机**：

   - 用户在 **Stake 页面**（质押页面）输入金额并点击确认按钮
   - 在 `UniversalStake` 组件中，`onConfirm` 回调被触发
   - 调用 `useUniversalStake` hook 中的 `handleStake` 方法
   - 最终调用 `buildStakeTransaction` 方法

3. **前置条件**：
   - 用户已选择账户和协议
   - 用户已输入质押金额
   - 如果需要授权（ERC20），已完成授权流程
   - 如果需要 Permit 签名，已完成签名

**授权和签名相关的 API 调用：**

**需要调用 API 的部分：**

1. **查询授权额度** (`fetchTokenAllowance`):

   - **API**: `GET /earn/v1/on-chain/allowance`
   - **方法**: `fetchTokenAllowance`
   - **用途**: 查询链上当前账户对某个 spender 的授权额度
   - **调用时机**:
     - 进入 Stake 页面前（ProtocolDetails → useHandleStake）
     - Stake 页面中实时跟踪授权额度变化（useTrackTokenAllowance）
     - 点击授权按钮前刷新额度
   - **代码位置**: `packages/kit-bg/src/services/ServiceStaking.ts` 第 113-135 行

   ```typescript
   public async fetchTokenAllowance(params: {
     networkId: string;
     accountId: string;
     tokenAddress: string;
     spenderAddress: string;
     blockNumber?: number;
   }) {
     const client = await this.getClient(EServiceEndpointEnum.Earn);
     const accountAddress = await this.getAccountAddressForApi({ networkId, accountId });

     const resp = await client.get<{
       data: IAllowanceOverview;
     }>(`/earn/v1/on-chain/allowance`, {
       params: { accountAddress, networkId, ...rest },
     });

     return resp.data.data;  // 返回 { allowanceParsed: string, ... }
   }
   ```

2. **获取 Permit2 签名数据** (`buildPermit2ApproveSignData`):

   - **API**: `POST /earn/v1/permit-signature`
   - **方法**: `buildPermit2ApproveSignData`
   - **用途**: 获取 Permit2 签名所需的 EIP-712 结构化数据
   - **调用时机**: 使用 Permit2 授权时，获取签名数据用于本地签名
   - **代码位置**: `packages/kit-bg/src/services/ServiceStaking.ts` 第 416-442 行

   **哪些协议需要调用：**

   - **Morpho**: 使用 Permit2 授权
   - **Momentum**: 使用 Permit2 授权
   - **其他使用 `approveType: 'permit'` 的协议**

   **判断条件**: 当协议的 `approveType` 为 `EApproveType.Permit` 时，会调用此接口

   **支持的代币**:

   - **USDC**: 使用标准的 Permit2 签名
   - **DAI**: 使用特殊的 DAI Permit 签名（需要 `expiry` 字段）

   ```typescript
   async buildPermit2ApproveSignData(params: {
     networkId: string;
     provider: string;
     symbol: string;
     accountAddress: string;
     vault: string;
     amount: string;
   }) {
     const client = await this.getClient(EServiceEndpointEnum.Earn);
     const resp = await client.post<{
       data: IEarnPermit2ApproveSignData;  // EIP-712 结构化数据
     }>(`/earn/v1/permit-signature`, params);
     return resp.data.data;
   }
   ```

   - **后续处理**:
     - 使用返回的 EIP-712 数据进行本地签名（`navigationToMessageConfirmAsync`）
     - 签名后的结果通过 `BundlerAction` 封装为 Permit Bundler Action
     - **注意**: 实际的签名过程是本地完成的，不需要 API

3. **获取注册签名消息数据** (`buildRegisterSignMessageData`):

   - **API**: `POST /earn/v1/permit-signature`（与 Permit2 使用同一个接口，但参数不同）
   - **方法**: `buildRegisterSignMessageData`
   - **用途**: 获取某些协议所需的注册签名消息（不是授权签名）
   - **调用时机**: 协议要求注册时（如 Falcon USDf 首次质押前需要注册）
   - **代码位置**: `packages/kit-bg/src/services/ServiceStaking.ts` 第 445-463 行

   **哪些协议需要调用：**

   - **Falcon USDf**: 首次质押前需要注册签名
   - **其他要求注册的协议**

   **与 Permit2 的区别**:

   - 参数不同：`buildRegisterSignMessageData` 不需要 `vault` 和 `amount` 参数
   - 用途不同：注册签名用于账户注册，Permit2 用于授权
   - 签名方式不同：注册签名使用 `PERSONAL_SIGN`，Permit2 使用 `TYPED_DATA_V4`

4. **验证签名** (`verifyRegisterSignMessage`):

   - **API**: `POST /earn/v1/verify-sig`
   - **方法**: `verifyRegisterSignMessage`
   - **用途**: 验证注册签名是否正确
   - **调用时机**: 完成注册签名后，需要验证签名有效性
   - **代码位置**: `packages/kit-bg/src/services/ServiceStaking.ts` 第 466-479 行

   **哪些协议需要调用：**

   - **Ethena**: 激活账户时需要验证签名
   - **Falcon USDf**: 注册后需要验证签名
   - **其他要求验证注册签名的协议**

**交易发送接口：**

1. **Legacy 授权交易（Legacy Approve）**:

   - **需要 API**: 虽然授权交易的构建是在本地完成的，但最终发送到链上需要通过后端 API
   - **最终发送接口**: `POST /wallet/v1/account/send-transaction`
   - **完整流程**:
     ```
     用户点击授权按钮
       ↓
     navigationToTxConfirm({ approvesInfo: [...] })
       ↓
     prepareSendConfirmUnsignedTx({ approveInfo })
       ↓
     buildUnsignedTx({ approveInfo })
       ↓
     Vault.buildEncodedTx({ approveInfo })
       ↓
     Vault._buildEncodeTxFromApprove() 构建授权交易数据（本地）
       - EVM: 构建标准的 ERC20 approve 交易（调用 approve(address,uint256)）
       - Tron: 通过 tronweb RPC 构建授权交易
       ↓
     用户签名（signTransaction）
       ↓
     signAndSendTransaction()
       ↓
     broadcastTransaction()
       ↓
     POST /wallet/v1/account/send-transaction （发送到链上）
     ```
   - **代码位置**:
     - 触发: `packages/kit/src/views/Staking/components/UniversalStake/index.tsx` 第 860-882 行
     - 构建交易: `packages/kit-bg/src/vaults/impls/evm/Vault.ts` 第 598-627 行（EVM）
     - 发送接口: `packages/kit-bg/src/services/ServiceSend.ts` 第 153-226 行
   - **参数**: 通过 `approvesInfo` 传递授权信息：
     ```typescript
     {
       owner: account.address,           // 授权者地址
       spender: approveTarget.spenderAddress,  // 被授权者地址（协议合约）
       amount: amountValue,               // 授权金额
       tokenInfo: approveTarget.token,    // 代币信息
     }
     ```
   - **发送接口详情** (`/wallet/v1/account/send-transaction`):
     ```typescript
     POST /wallet/v1/account/send-transaction
     {
       networkId: string,
       accountAddress: string,
       tx: signedTx.rawTx,        // 签名后的原始交易数据
       signature?: string,        // 签名（某些链需要）
       rawTxType?: string,        // 原始交易类型
       disableBroadcast?: boolean, // 是否禁用广播（自定义 RPC 时）
       disableAntiMev?: boolean,  // 是否禁用反 MEV
       hasEnergyRented?: boolean, // Tron 能量租赁
     }
     ```
   - **适用协议**: 所有使用 `approveType === EApproveType.Legacy` 的协议
   - **特点**:
     - 授权交易的**构建**在本地完成（通过 Vault）
     - 授权交易的**发送**通过后端 API `/wallet/v1/account/send-transaction`
     - 后端 API 负责将交易广播到区块链网络
     - 如果配置了自定义 RPC，可能直接通过 RPC 发送（`disableBroadcast: true`）

2. **质押交易本身（Stake Transaction）**:

   - **需要 API**: 无论是否使用 Permit2，质押交易都会调用 `/earn/v2/stake` 接口
   - **区别**:
     - **Permit2 协议**（Morpho、Momentum）: 在调用 `/earn/v2/stake` 时传递 `permitSignature` 参数
     - **Legacy 协议**: 在调用 `/earn/v2/stake` 时不传递 `permitSignature`，而是先完成授权交易
   - **流程对比**:

     **Legacy 协议流程**:

     ```
     1. 检查授权额度（需要API: /earn/v1/on-chain/allowance）
     2. 如果额度不足：
        - 发送 Legacy 授权交易（不需要API，直接链上）
        - 等待授权交易确认
        - 再次检查授权额度
     3. 调用 /earn/v2/stake 获取质押交易数据（需要API）
     4. 构建并发送质押交易
     ```

     **Permit2 协议流程**:

     ```
     1. 检查授权额度（需要API: /earn/v1/on-chain/allowance）
     2. 如果额度不足：
        - 获取 Permit2 签名数据（需要API: /earn/v1/permit-signature）
        - 本地签名（不需要API）
        - 缓存签名（24小时有效）
     3. 调用 /earn/v2/stake 获取质押交易数据（需要API，传递 permitSignature）
     4. 构建并发送质押交易
     ```

3. **Permit 签名过程**:
   - **不需要 API**: 签名本身是本地完成的
   - **流程**:
     - 调用 `buildPermit2ApproveSignData` 获取签名数据（需要 API）
     - 使用 `navigationToMessageConfirmAsync` 进行本地签名（不需要 API）
     - 使用 `BundlerAction` 封装签名结果（不需要 API）
   - **代码位置**: `packages/kit/src/views/Staking/hooks/useEarnPermitApprove.ts` 第 71-108 行

**Permit 和 Permit2 的区别：**

1. **Legacy Permit（传统 Permit，EIP-2612）**:

   - **标准**: EIP-2612（ERC20 Permit）
   - **特点**:
     - 每个代币合约需要实现自己的 Permit 函数
     - 不同代币的 Permit 格式可能不同
     - 需要代币合约原生支持
   - **使用场景**: 某些代币的原生 Permit 功能
   - **在代码中的体现**: 代码中未直接使用，主要使用 Permit2

2. **Permit2（Uniswap Permit2 标准）**:

   - **标准**: Uniswap 的 Permit2 标准
   - **特点**:
     - 统一的授权接口，通过 `MorphoBundlerContract` (`0x4095f064b8d3c3548a3bebfd0bbfd04750e30077`) 统一处理
     - 支持所有符合标准的代币（USDC、DAI 等）
     - 使用 `BundlerAction` 封装签名
     - 签名缓存 24 小时有效
   - **使用场景**:
     - **Morpho**: 使用 Permit2 进行授权
     - **Momentum**: 使用 Permit2 进行授权
     - 其他通过 Morpho Bundler 处理的协议
   - **代码特征**:
     - `approveType === EApproveType.Permit`
     - `spenderAddress === MorphoBundlerContract`
     - 使用 `buildPermit2ApproveSignData` 获取签名数据
     - 使用 `BundlerAction.permit()` 或 `BundlerAction.permitDai()` 封装

3. **区别总结表**:

| 特性             | Legacy Permit (EIP-2612) | Permit2                    |
| ---------------- | ------------------------ | -------------------------- |
| **标准**         | EIP-2612                 | Uniswap Permit2            |
| **实现位置**     | 代币合约内部             | 统一合约（Morpho Bundler） |
| **代币支持**     | 需要代币原生支持         | 通过统一合约支持           |
| **签名格式**     | 代币合约定义             | 统一格式（EIP-712）        |
| **使用场景**     | 代币原生 Permit          | Morpho、Momentum 等协议    |
| **代码中使用**   | ❌ 未直接使用            | ✅ 使用                    |
| **Spender 地址** | 各协议合约地址           | MorphoBundlerContract      |

**总结**：

- ✅ **需要 API**: 授权额度查询、Permit2 签名数据获取、注册签名数据获取、签名验证
- ✅ **需要 API（交易发送）**:
  - **所有交易最终发送接口**: `POST /wallet/v1/account/send-transaction`
  - 包括：Legacy 授权交易、质押交易、提取交易、领取交易等所有链上交易
  - 后端 API 负责将签名后的交易广播到区块链网络
- ❌ **不需要 API**:
  - 授权交易构建（本地通过 Vault）
  - Permit 签名过程（本地签名）
  - 注册签名过程（本地签名）

**`/earn/v1/permit-signature` 接口的两种用途：**

1. **Permit2 授权签名** (`buildPermit2ApproveSignData`):

   - 需要参数: `networkId`, `provider`, `symbol`, `accountAddress`, `vault`, `amount`
   - 用于: Morpho、Momentum 等协议的授权
   - 返回: EIP-712 结构化数据

2. **注册签名消息** (`buildRegisterSignMessageData`):
   - 需要参数: `networkId`, `provider`, `symbol`, `accountAddress`（不需要 `vault` 和 `amount`）
   - 用于: Falcon USDf 等协议的账户注册
   - 返回: 注册签名消息文本

**判断代码位置：**

1. **是否需要授权的判断**：

   - 文件：`packages/kit/src/views/Staking/components/UniversalStake/index.tsx`
   - 代码位置：第 189-225 行（`shouldApprove` 计算逻辑）

   ```typescript
   const shouldApprove = useMemo(() => {
     if (!useApprove) {
       return false;  // 没有 approveType，不需要授权
     }

     if (!isFocus) {
       return true;
     }

     const amountValueBN = BigNumber(amountValue);
     const allowanceBN = new BigNumber(allowance);

     // Permit2 授权：检查缓存
     if (usePermit2Approve) {
       const permitCache = getPermitCache({
         accountId: approveTarget.accountId,
         networkId: approveTarget.networkId,
         tokenAddress: approveTarget.token?.address || '',
         amount: amountValue,
       });
       if (permitCache) {
         permitSignatureRef.current = permitCache.signature;
         return false;  // 有缓存签名，不需要重新授权
       }
     }

     // 判断授权额度是否小于输入金额
     return !amountValueBN.isNaN() && allowanceBN.lt(amountValue);
   }, [useApprove, isFocus, amountValue, allowance, usePermit2Approve, ...]);
   ```

2. **Permit 签名的判断和处理**：

   - 文件：`packages/kit/src/views/Staking/components/UniversalStake/index.tsx`
   - 判断是否使用 Permit2：第 172 行
     ```typescript
     const usePermit2Approve = approveType === EApproveType.Permit;
     ```
   - Permit 签名获取：第 798-849 行（`onApprove` 函数中）

     ```typescript
     if (usePermit2Approve) {
       const handlePermit2Approve = async () => {
         // 1. 先检查缓存
         const permitCache = getPermitCache({ ... });
         if (permitCache) {
           permitSignatureRef.current = permitCache.signature;
           void onSubmit();  // 有缓存，直接提交
           return;
         }

         // 2. 如果没有缓存，获取 Permit 签名
         const permitBundlerAction = await getPermitSignature({
           networkId,
           accountId,
           token,
           amountValue,
           providerName,
           vaultAddress: approveTarget.spenderAddress,
         });
         permitSignatureRef.current = permitBundlerAction;

         // 3. 更新缓存（24小时有效期）
         updatePermitCache({
           accountId,
           networkId,
           tokenAddress,
           amount: amountValue,
           signature: permitBundlerAction,
           expiredAt: Date.now() + 24 * 60 * 60 * 1000,
         });
       };
     }
     ```

   - 提交时检查 Permit 签名：第 626-662 行（`onSubmit` 函数）

     ```typescript
     const onSubmit = useCallback(async () => {
       const permitSignatureParams = usePermit2Approve
         ? {
             approveType,
             permitSignature: permitSignatureRef.current,  // 使用缓存的签名
           }
         : undefined;

       // 如果使用 Permit2 且不需要授权（有缓存签名），直接提交
       if (!usePermit2Approve || (usePermit2Approve && !shouldApprove)) {
         await checkEstimateGasAlert(handleConfirm);
         return;
       }
     }, [usePermit2Approve, shouldApprove, ...]);
     ```

3. **进入 Stake 页面前的授权检查**：

   - 文件：`packages/kit/src/views/Staking/pages/ProtocolDetails/useHandleActions.ts`
   - 代码位置：第 110-134 行（`useHandleStake` 函数）

   ```typescript
   if (protocolInfo?.approve?.approveTarget) {
     setStakeLoading?.(true);
     try {
       // 先检查当前授权额度
       const { allowanceParsed } =
         await backgroundApiProxy.serviceStaking.fetchTokenAllowance({
           accountId,
           networkId,
           spenderAddress:
             protocolInfo.approve?.approveType === EApproveType.Permit
               ? MorphoBundlerContract
               : protocolInfo.approve.approveTarget,
           tokenAddress: tokenInfo?.token.address || '',
         });
       // 将授权额度传递给 Stake 页面
       appNavigation.push(EModalStakingRoutes.Stake, {
         accountId,
         networkId,
         protocolInfo,
         tokenInfo,
         currentAllowance: allowanceParsed, // ⭐ 传递当前授权额度
       });
     } finally {
       setStakeLoading?.(false);
     }
     return;
   }
   ```

4. **UI 层面的判断显示**：
   - 文件：`packages/kit/src/views/Staking/components/UniversalStake/index.tsx`
   - 代码位置：第 1408 行（确认按钮）
     ```typescript
     <Page.FooterActions
       confirmButtonProps={{
         onPress: shouldApprove ? onApprove : onSubmit, // ⭐ 根据 shouldApprove 决定点击后的行为
         loading: loadingAllowance || approving || checkAmountLoading,
         disabled: isDisable,
       }}
     />
     ```
   - 第 1397-1399 行（进度显示）
     ```typescript
     <StakeProgress
       currentStep={
         isDisable || shouldApprove
           ? EStakeProgressStep.approve // 需要授权时显示授权步骤
           : EStakeProgressStep.deposit // 不需要授权时显示质押步骤
       }
     />
     ```

**入口：**

1. **协议详情页（ProtocolDetailsV2）**：

   - 点击协议详情页的"认购"按钮（`actions` 中 `type: "deposit"` 的按钮）
   - 代码：`packages/kit/src/views/Staking/pages/ProtocolDetailsV2/index.tsx` → `onStake`

2. **其他入口**（理论上可能）：
   - 从协议列表页面选择协议后进入 Stake 流程

**参数来源：**

```typescript
IStakeBaseParams = {
  accountId: string;              // 从路由参数获取（ProtocolDetailsV2 → Stake）
  networkId: string;               // 从路由参数获取
  amount: string;                  // ⭐ 用户输入（Stake 页面）
  symbol: string;                  // 从协议详情获取（tokenInfo.token.symbol）
  provider: string;                // 从协议详情获取（protocolInfo.provider）
  term?: number;                   // Babylon 质押期限（特定协议需要，当前代码中设为 undefined）
  feeRate?: number;               // BTC 网络费率（从 estimateFeeUTXO 获取，Babylon 使用）
  protocolVault?: string;         // 从协议详情获取（protocolInfo.vault 或 protocolInfo.approve.approveTarget）
  approveType?: EApproveType;    // 从协议详情获取（protocolInfo.approve.approveType）
  permitSignature?: string;       // ⭐ Permit 签名流程获取（如果使用 Permit2 授权）
  signature?: string;             // Lido 特殊用途
  deadline?: number;             // Lido 特殊用途
  inviteCode?: string;           // 邀请码（用户输入，当前未使用）
  bindedAccountAddress?: string; // ⭐ 自动获取（推荐码绑定账户地址）
  bindedNetworkId?: string;       // ⭐ 自动获取（推荐码绑定账户网络）
}
```

**参数构建过程：**

```typescript
// packages/kit-bg/src/services/ServiceStaking.ts (约第 241-301 行)
async buildStakeTransaction(params: IStakeBaseParams) {
  // 1. 获取账户信息
  const vault = await vaultFactory.getVault({ networkId, accountId });
  const account = await vault.getAccount();

  // 2. 获取质押配置
  const stakingConfig = await this.getStakingConfigs({ networkId, symbol, provider });

  // 3. 构建请求参数
  const paramsToSend = {
    accountAddress: account.address,              // 从账户获取
    publicKey: stakingConfig.usePublicKey ? account.pub : undefined,  // 根据配置决定
    networkId,
    symbol,
    provider,
    amount,
    term,
    feeRate,
    firmwareDeviceType: await this.getFirmwareDeviceTypeParam({ accountId }),  // 硬件钱包类型
    approveType,
    permitSignature: approveType === EApproveType.Permit ? permitSignature : undefined,
  };

  // 4. 如果使用 Vault Provider，添加 vault 参数
  if (useVaultProvider) {
    paramsToSend.vault = protocolVault;
  }

  // 5. 检查并添加推荐码绑定信息
  const walletReferralCode = await this.checkAndUpdateReferralCode({ accountId });
  if (walletReferralCode) {
    paramsToSend.bindedAccountAddress = walletReferralCode.address;
    paramsToSend.bindedNetworkId = walletReferralCode.networkId;
  }

  // 6. 调用 API
  const resp = await client.post(`/earn/v2/stake`, paramsToSend);
  return resp.data.data;
}
```

**数据用途：**

1. **返回交易数据**：

   - `tx`: 根据网络和协议类型返回不同的交易结构
     - BTC: `psbtHex`（PSBT 格式）
     - ETH: 标准交易结构（`from`, `to`, `value`, `gasLimit`, `data`）
     - Cosmos: Amino 格式交易
     - Sui: 交易字符串
   - `orderId`: 订单 ID，用于跟踪订单状态

2. **后续处理流程**：

   ```
   buildStakeTransaction 返回 IStakeTxResponse
     ↓
   buildEarnTx (将交易数据编码为统一格式)
     ↓
   navigationToTxConfirm (导航到交易确认页)
     ↓
   用户确认签名
     ↓
   发送交易
     ↓
   保存订单信息（如果支持）
   ```

3. **订单跟踪**：
   - 对于 Babylon 协议，会将交易信息保存到本地跟踪列表
   - `orderId` 用于后续查询订单状态

**完整调用链：**

```
用户操作流程：
1. 协议详情页点击"认购"按钮
   ↓
2. useHandleStake 检查钱包备份状态
   ↓
3. 如果需要授权，检查授权额度
   ↓
4. 导航到 Stake 页面
   ↓
5. 用户在 Stake 页面输入金额
   ↓
6. 如果需要授权，完成授权流程
   ↓
7. 用户点击确认按钮
   ↓
8. onConfirm 触发
   ↓
9. useUniversalStake.handleStake 调用
   ↓
10. buildStakeTransaction 调用
    ↓
11. /earn/v2/stake API 调用
    ↓
12. 返回交易数据和订单ID
    ↓
13. buildEarnTx 编码交易
    ↓
14. navigationToTxConfirm 显示确认页
    ↓
15. 用户签名并发送交易
```

**请求体：**

```typescript
{
  accountAddress: string;
  publicKey?: string;            // BTC 网络或配置要求时
  networkId: string;
  symbol: string;
  provider: string;
  amount: string;
  term?: number;
  feeRate?: number;
  vault?: string;                // useVaultProvider 时
  firmwareDeviceType?: string;   // 硬件钱包类型
  approveType?: string;
  permitSignature?: string;
  inviteCode?: string;
  bindedAccountAddress?: string;
  bindedNetworkId?: string;
}
```

**响应结构（完整）：**

```typescript
IStakeTxResponse = {
  tx: IStakeTx;                  // 交易数据（根据网络类型不同而不同）
  orderId: string;               // 订单ID（用于跟踪订单状态）
}
```

**交易类型详解（IStakeTx 联合类型）：**

`IStakeTx` 是一个联合类型，根据不同的网络和协议，API 可能返回以下任一类型：

**1. BTC Babylon 质押**

```typescript
IStakeTxBtcBabylon = {
  psbtHex: string;              // PSBT（Partially Signed Bitcoin Transaction）十六进制字符串
}
```

**使用场景：** BTC 网络使用 Babylon 协议质押时

---

**2. ETH 标准交易（Everstake、Morpho、Ethena 等）**

```typescript
IStakeTxEthEvertStake = {
  from: string;                 // 发送方地址
  to: string;                   // 接收方地址（协议合约地址）
  value: string;                // 转账金额（wei，十六进制或十进制字符串）
  gasLimit: string;             // Gas 限制
  data: string;                 // 交易数据（合约调用数据，hex 格式）
}
```

**使用场景：**

- ETH 网络大部分协议（Everstake、Morpho、Ethena、Falcon、Momentum 等）
- 需要合约交互的质押操作

---

**3. ETH Lido 交易**

```typescript
IStakeTxEthLido = {
  to: string;                   // Lido 协议合约地址
  value: string;                // 质押金额（wei）
  data: string;                 // 合约调用数据（hex）
}
```

**使用场景：** ETH 网络使用 Lido 协议（Lido 不需要 `from` 和 `gasLimit`，由钱包自动填充）

---

**4. Cosmos 链 Amino 签名格式**

```typescript
IStakeTxCosmosAmino = {
  readonly chain_id: string;           // 链ID（如 'cosmoshub-4', 'osmosis-1'）
  readonly account_number: string;     // 账户序号（从链上查询）
  readonly sequence: string;           // 交易序号（防止重放攻击）
  fee: {
    amount: {
      denom: string;                   // 代币单位（如 'uatom', 'uosmo'）
      amount: string;                  // 费用金额
    }[];
    gas: string;                       // Gas 限制
  };
  readonly msgs: {                     // 交易消息数组
    type: string;                      // 消息类型（如 'cosmos-sdk/MsgDelegate', 'cosmos-sdk/MsgUndelegate'）
    value: any;                        // 消息内容（根据类型不同而不同）
  }[];
  readonly memo: string;               // 备注信息
}
```

**使用场景：** Cosmos 生态链（Cosmos Hub、Osmosis、ATOM 等）质押操作

**示例消息类型：**

- `cosmos-sdk/MsgDelegate` - 委托质押
- `cosmos-sdk/MsgUndelegate` - 取消委托
- `cosmos-sdk/MsgBeginRedelegate` - 重新委托

---

**5. Sui 链交易**

```typescript
IStakeTxSui = string; // Sui 交易数据（字符串格式，具体格式由 Sui SDK 定义）
```

**使用场景：** Sui 网络质押操作

---

### 版本说明

**接口版本：** V2（已废弃 V1 版本 `/earn/v1/stake`）

**升级原因：**

- V2 支持更多网络类型（BTC、Cosmos、Sui 等）
- 统一的交易构建接口
- 更好的错误处理
- 支持 Permit 授权等新特性
- 支持邀请码、绑定账户等新功能

#### 4.2 构建提取交易

**接口：** `POST /earn/v2/unstake`

**方法：** `buildUnstakeTransaction`

**调用时机：**

1. **主要调用路径**：

   ```
   协议详情页 (ProtocolDetailsV2)
     → 点击"提取"按钮 (onWithdraw)
       → useHandleWithdraw → 导航到 Withdraw 页面
         → 用户输入金额并确认 (onConfirm)
           → useUniversalWithdraw → buildUnstakeTransaction
             → /earn/v2/unstake API
   ```

2. **具体触发时机**：

   - 用户在 **Withdraw 页面**（提取页面）输入金额并点击确认按钮
   - 在 `UniversalWithdraw` 组件中，`onConfirm` 回调被触发
   - 调用 `useUniversalWithdraw` hook 中的 `handleWithdraw` 方法
   - 最终调用 `buildUnstakeTransaction` 方法

3. **前置条件**：
   - 用户已选择账户和协议
   - 用户有可提取的质押资产（`activeBalance > 0` 或 `overflowBalance > 0`）
   - 用户已输入提取金额
   - 对于 Lido 协议，需要先完成签名（`unstakeWithSignMessage`）
   - 对于 Babylon 等协议，可能需要先选择订单（`WithdrawOptions` 页面）

**可提取余额判断逻辑（数据源）：**

1. **ProtocolDetailsV2（V2 页面）**：

   - **数据源**：`/earn/v2/stake-protocol/detail` API 响应（`IStakeEarnDetail`）
   - **`activeBalance` 数据源**：

     ```typescript
     // 从 detailInfo.actions 中找到 type === 'withdraw' 的 action
     const withdrawAction = detailInfo?.actions?.find(
       (i) => i.type === 'withdraw',
     ) as IEarnWithdrawActionIcon;

     // activeBalance 来自 withdrawAction.data.balance
     activeBalance = withdrawAction?.data?.balance;
     ```

     - **类型定义**：`IEarnWithdrawActionIcon.data.balance`（`string` 类型）
     - **代码位置**：`packages/kit/src/views/Staking/pages/ProtocolDetailsV2/index.tsx` 第 655-663 行

   - **`overflowBalance` 数据源**：

     ```typescript
     // 直接来自 detailInfo.nums.overflow
     overflowBalance = detailInfo.nums?.overflow;
     ```

     - **类型定义**：`IStakeEarnDetail.nums.overflow`（`string` 类型）
     - **代码位置**：`packages/kit/src/views/Staking/pages/ProtocolDetailsV2/index.tsx` 第 671 行

   - **按钮禁用判断**：
     ```typescript
     // 在 withdrawActionProps 中，按钮禁用条件包括：
     buttonProps: {
       disabled: !earnAccount?.accountAddress || item?.disabled,
       // item?.disabled 由后端 API 根据余额情况返回
     }
     ```
     - **代码位置**：`packages/kit/src/views/Staking/pages/ProtocolDetailsV2/index.tsx` 第 907-920 行
     - **注意**：V2 页面主要依赖后端返回的 `item?.disabled` 字段来判断是否禁用，而不是前端直接判断余额

2. **ProtocolDetails（V1 页面，已废弃）**：

   - **数据源**：`/earn/v1/stake-protocol/detail` API 响应（`IStakeProtocolDetails`）
   - **判断逻辑**：
     ```typescript
     // 直接判断 result.active 和 result.overflow
     disabled =
       !earnAccount?.accountAddress ||
       !(Number(result?.active) > 0 || Number(result?.overflow) > 0) ||
       disableUnstakeButton;
     ```
     - **代码位置**：`packages/kit/src/views/Staking/pages/ProtocolDetails/index.tsx` 第 279-285 行
     - **注意**：V1 页面使用前端直接判断，而 V2 页面主要依赖后端返回的 `disabled` 字段

3. **数据更新机制**：

   - **ProtocolDetailsV2**：使用 `usePromiseResult` 调用 `getProtocolDetailsV2`
   - **自动刷新**：`revalidateOnFocus: true`，页面聚焦时会自动刷新数据
   - **手动刷新**：用户可以通过下拉刷新或页面重新聚焦来更新数据
   - **代码位置**：`packages/kit/src/views/Staking/pages/ProtocolDetailsV2/index.tsx` 第 552-571 行

4. **API 响应结构**：

   ```typescript
   // /earn/v2/stake-protocol/detail 响应
   IStakeEarnDetail = {
     actions?: IEarnDetailActions[];  // 包含 withdraw action
     nums?: {
       overflow?: string;              // 溢出余额
       // ... 其他数值
     };
     // ... 其他字段
   }

   // withdraw action 结构
   IEarnWithdrawActionIcon = {
     type: EStakingActionType;
     disabled: boolean;               // 后端判断是否禁用
     text: IEarnText;
     data: {
       balance: string;                // activeBalance（可提取余额）
       token: IEarnToken;
     };
   }
   ```

5. **数据含义**：
   - **`activeBalance`**：当前可立即提取的质押资产余额（已激活的质押资产）
   - **`overflowBalance`**：溢出余额（某些协议可能存在的溢出资产，也可以提取）
   - **判断逻辑**：只要 `activeBalance > 0` 或 `overflowBalance > 0`，理论上就可以提取
   - **实际控制**：后端 API 返回的 `actions[].disabled` 字段会综合考虑余额、协议状态、时间限制等因素，决定是否真正允许提取

**入口：**

1. **协议详情页（ProtocolDetailsV2）**：

   - 点击协议详情页的"提取"按钮（`actions` 中 `type: "withdraw"` 的按钮）
   - 代码：`packages/kit/src/views/Staking/pages/ProtocolDetailsV2/index.tsx` → `onWithdraw`
   - 按钮显示条件：
     - 有账户地址（`earnAccount?.accountAddress`）
     - 有可提取余额（`active > 0` 或 `overflow > 0`）
     - 协议启用提取按钮（`protocol.buttonUnstake !== false`）

2. **提取选项页面（WithdrawOptions）**：
   - 对于需要选择订单的协议（如 Babylon），会先进入 `WithdrawOptions` 页面
   - 用户选择订单后，导航到 `Withdraw` 页面，传递 `identity`（订单 ID）和 `amount`

**参数来源：**

```typescript
IWithdrawBaseParams = {
  accountId: string;              // 从路由参数获取（ProtocolDetailsV2 → Withdraw）
  networkId: string;               // 从路由参数获取
  amount: string;                  // ⭐ 用户输入（Withdraw 页面）
  symbol: string;                  // 从协议详情获取（tokenInfo.token.symbol）
  provider: string;                // 从协议详情获取（protocolInfo.provider）
  identity?: string;               // ⭐ Solana pubkey 或订单ID（Babylon 等）
  signature?: string;              // ⭐ Lido 协议签名（从 buildLidoEthPermitMessageData 获取）
  deadline?: number;               // ⭐ Lido 协议截止时间（从 buildLidoEthPermitMessageData 获取）
  protocolVault?: string;          // 从协议详情获取（protocolInfo.vault 或 protocolInfo.approve.approveTarget）
  withdrawAll?: boolean;           // ⭐ 用户选择（Withdraw 页面，是否全部提取）
}
```

**参数构建过程：**

```typescript
// packages/kit-bg/src/services/ServiceStaking.ts (约第 305-334 行)
async buildUnstakeTransaction(params: IWithdrawBaseParams) {
  // 1. 获取账户信息
  const vault = await vaultFactory.getVault({ networkId, accountId });
  const account = await vault.getAccount();

  // 2. 获取质押配置
  const stakingConfig = await this.getStakingConfigs({ networkId, symbol: params.symbol, provider: params.provider });

  // 3. 判断是否使用 Vault Provider
  const useVaultProvider = earnUtils.useVaultProvider({ providerName: params.provider });

  // 4. 构建请求参数
  const requestParams = {
    accountAddress: account.address,              // 从账户获取
    networkId,
    publicKey: stakingConfig.usePublicKey ? account.pub : undefined,  // 根据配置决定（BTC 网络需要）
    symbol: params.symbol,
    provider: params.provider,
    amount: params.amount,
    firmwareDeviceType: await this.getFirmwareDeviceTypeParam({ accountId }),  // 硬件钱包类型
    vault: useVaultProvider ? protocolVault : '',  // Vault Provider 协议需要
    identity: params.identity,                     // Solana 或 Babylon 订单ID
    signature: params.signature,                   // Lido 签名
    deadline: params.deadline,                     // Lido 截止时间
    withdrawAll: params.withdrawAll,               // 是否全部提取
  };

  // 5. 调用 API
  const resp = await client.post(`/earn/v2/unstake`, requestParams);
  return resp.data.data;  // 返回 IStakeTxResponse
}
```

**数据用途：**

1. **返回交易数据**：

   - `tx`: 根据网络和协议类型返回不同的交易结构（与 `/earn/v2/stake` 相同）
     - BTC: `psbtHex`（PSBT 格式）
     - ETH: 标准交易结构（`from`, `to`, `value`, `gasLimit`, `data`）
     - Cosmos: Amino 格式交易
     - Sui: 交易字符串
   - `orderId`: 订单 ID，用于跟踪订单状态

2. **后续处理流程**：

   ```
   buildUnstakeTransaction 返回 IStakeTxResponse
     ↓
   buildEarnTx (将交易数据编码为统一格式)
     ↓
   navigationToTxConfirm (导航到交易确认页)
     ↓
   用户确认签名
     ↓
   发送交易（/wallet/v1/account/send-transaction）
     ↓
   保存订单信息（如果支持）
     ↓
   （特殊处理）Babylon 等协议可能需要调用 unstakePush 推送交易
   ```

3. **订单跟踪**：
   - 对于支持的协议，会将交易信息保存到本地跟踪列表
   - `orderId` 用于后续查询订单状态

**特殊处理：**

1. **Lido 协议（需要签名）**：

   ```
   1. 检查 stakingConfig.unstakeWithSignMessage
   2. 调用 buildLidoEthPermitMessageData 获取签名数据（需要API: /earn/v1/lido-eth/tx/permit_message）
   3. 本地签名（不需要API）
   4. 调用 /earn/v2/unstake 传递 signature 和 deadline
   ```

   - 代码位置：`packages/kit/src/views/Staking/hooks/useUniversalHooks.ts` 第 195-231 行

2. **Babylon 协议（需要订单 ID）**：

   ```
   1. 检查 stakingConfig.withdrawWithTx 或 withdrawType === WithdrawOrder
   2. 导航到 WithdrawOptions 页面
   3. 调用 getWithdrawList 获取可提取订单列表
   4. 用户选择订单后，传递 identity（订单ID）到 Withdraw 页面
   5. 调用 /earn/v2/unstake 传递 identity
   6. 交易签名后，可能需要调用 unstakePush 推送交易
   ```

   - 代码位置：`packages/kit/src/views/Staking/pages/ProtocolDetails/useHandleActions.ts` 第 50-62 行

3. **BTC 网络（需要 publicKey）**：
   - 如果 `stakingConfig.usePublicKey === true`，会传递 `publicKey` 参数

**完整调用链：**

```
用户操作流程：
1. 协议详情页点击"提取"按钮
   ↓
2. useHandleWithdraw 检查协议配置
   ↓
3. 如果需要选择订单（withdrawWithTx），导航到 WithdrawOptions 页面
   ↓
4. 否则直接导航到 Withdraw 页面
   ↓
5. 用户在 Withdraw 页面输入金额
   ↓
6. 如果是 Lido 协议，获取签名数据并签名
   ↓
7. 用户点击确认按钮
   ↓
8. onConfirm 触发
   ↓
9. useUniversalWithdraw.handleWithdraw 调用
   ↓
10. buildUnstakeTransaction 调用
    ↓
11. /earn/v2/unstake API 调用
    ↓
12. 返回交易数据和订单ID
    ↓
13. buildEarnTx 编码交易
    ↓
14. navigationToTxConfirm 显示确认页
    ↓
15. 用户签名并发送交易
    ↓
16. （特殊处理）Babylon 等协议可能需要调用 unstakePush 推送交易
```

**请求体：**

```typescript
{
  accountAddress: string;        // 账户地址
  networkId: string;              // 网络ID
  publicKey?: string;            // BTC 网络或配置要求时
  symbol: string;                // 代币符号
  provider: string;               // 协议名称
  amount: string;                // 提取金额
  vault?: string;                // useVaultProvider 时
  firmwareDeviceType?: string;   // 硬件钱包类型
  identity?: string;             // Solana pubkey 或订单ID
  signature?: string;             // Lido 签名
  deadline?: number;              // Lido 截止时间
  withdrawAll?: boolean;         // 是否全部提取
}
```

**响应结构（完整）：**

```typescript
IStakeTxResponse = {
  tx: IStakeTx;                  // 交易数据（根据网络类型不同而不同，与 stake 相同）
  orderId: string;               // 订单ID（用于跟踪订单状态）
}
```

**交易类型详解（IStakeTx 联合类型）：**

与 `/earn/v2/stake` 相同，返回的 `tx` 可能是以下任一类型：

1. **BTC Babylon 提取**：`IStakeTxBtcBabylon`（`psbtHex`）
2. **ETH 标准交易**：`IStakeTxEthEvertStake`（`from`, `to`, `value`, `gasLimit`, `data`）
3. **ETH Lido 交易**：`IStakeTxEthLido`（`to`, `value`, `data`）
4. **Cosmos 链 Amino 格式**：`IStakeTxCosmosAmino`
5. **Sui 交易**：`IStakeTxSui`（`tx` 字符串）

详细结构请参考 `/earn/v2/stake` 接口的响应结构说明。

#### 4.3 提取推送（特殊协议）

**接口：** `POST /earn/v1/unstake/push`

**方法：** `unstakePush`

**调用时机：**

1. **主要调用路径**：

   ```
   用户提取流程
     → buildUnstakeTransaction (/earn/v2/unstake)
       → 构建交易数据（BTC PSBT）
         → navigationToTxConfirm (signOnly: true)
           → 用户签名交易（仅签名，不发送）
             → 获取 finalizedPsbtHex
               → unstakePush (/earn/v1/unstake/push)
                 → 后端推送已签名的交易
   ```

2. **具体触发时机**：

   - 用户在 **Withdraw 页面**完成交易签名后
   - 只有当 `stakingConfig.withdrawSignOnly === true` 时才会调用
   - 在 `navigationToTxConfirm` 的 `onSuccess` 回调中触发
   - 需要满足条件：`psbtHex`（已签名的 PSBT）和 `identity`（订单 ID）都存在

3. **前置条件**：
   - 协议配置了 `withdrawSignOnly: true`（目前主要是 **BTC Babylon 协议**）
   - 已完成交易签名（`signOnly: true`）
   - 已获取 `finalizedPsbtHex`（已签名的 PSBT 十六进制字符串）
   - 有 `identity`（订单 ID，在调用 `/earn/v2/unstake` 时传入）

**适用协议：**

目前主要适用于 **Babylon BTC 质押协议**：

- **网络**：BTC
- **协议**：Babylon
- **配置**：`withdrawSignOnly: true`（在 `packages/kit-bg/src/vaults/impls/btc/settings.ts` 中配置）
- **原因**：BTC 网络使用 PSBT（Partially Signed Bitcoin Transaction）格式，需要先签名，然后由后端推送已签名的交易

**参数来源：**

```typescript
IUnstakePushParams = {
  accountId: string;              // 从路由参数获取
  networkId: string;               // 从路由参数获取
  symbol: string;                  // 从协议详情获取（tokenInfo.token.symbol）
  provider: string;                // 从协议详情获取（protocolInfo.provider）
  txId: string;                    // ⭐ identity（订单ID，从 /earn/v2/unstake 调用时传入）
  unstakeTxHex: string;            // ⭐ finalizedPsbtHex（已签名的 PSBT 十六进制）
}
```

**参数构建过程：**

```typescript
// packages/kit/src/views/Staking/hooks/useUniversalHooks.ts (约第 265-292 行)
await navigationToTxConfirm({
  encodedTx,
  stakingInfo,
  signOnly: stakingConfig?.withdrawSignOnly,  // 设置为 true，只签名不发送
  useFeeInTx,
  feeInfoEditable,
  onSuccess: async (data) => {
    if (!stakingConfig?.withdrawSignOnly) {
      // 普通流程：直接发送交易
      await handleStakeSuccess({ ... });
    } else {
      // 特殊流程：只签名，然后推送
      const psbtHex = data[0].signedTx.finalizedPsbtHex;  // 获取已签名的 PSBT
      if (psbtHex && identity) {
        await backgroundApiProxy.serviceStaking.unstakePush({
          txId: identity,           // 订单ID（identity）
          networkId,
          accountId,
          symbol,
          provider,
          unstakeTxHex: psbtHex,    // 已签名的 PSBT 十六进制
        });
        onSuccess?.(data);
      }
    }
  },
  onFail,
});
```

**请求体：**

```typescript
{
  accountAddress: string; // 账户地址（从账户获取）
  networkId: string; // 网络ID
  symbol: string; // 代币符号
  provider: string; // 协议名称
  txId: string; // 订单ID（identity）
  unstakeTxHex: string; // 已签名的 PSBT 十六进制字符串
}
```

**代码位置：**

- **接口实现**：`packages/kit-bg/src/services/ServiceStaking.ts` 第 336-350 行
- **调用位置**：`packages/kit/src/views/Staking/hooks/useUniversalHooks.ts` 第 282-289 行
- **配置位置**：`packages/kit-bg/src/vaults/impls/btc/settings.ts` 第 146 行（Babylon 协议配置）

**数据用途：**

1. **推送已签名的交易**：

   - 后端接收已签名的 PSBT 交易（`unstakeTxHex`）
   - 后端将交易推送到 BTC 网络
   - 使用订单 ID（`txId`）关联原始提取订单

2. **响应结构**：
   ```typescript
   IStakeTxResponse = {
     tx: IStakeTx;               // 交易数据（可能为空或包含确认信息）
     orderId: string;            // 订单ID（用于跟踪）
   }
   ```

**完整流程对比：**

**普通提取流程（大部分协议）**：

```
1. buildUnstakeTransaction → 获取交易数据
2. navigationToTxConfirm (signOnly: false) → 签名并发送交易
3. 交易直接发送到链上（/wallet/v1/account/send-transaction）
4. 完成
```

**Babylon BTC 提取流程（withdrawSignOnly: true）**：

```
1. buildUnstakeTransaction → 获取 PSBT 交易数据
2. navigationToTxConfirm (signOnly: true) → 仅签名，不发送
3. 获取 finalizedPsbtHex（已签名的 PSBT）
4. unstakePush → 推送已签名的 PSBT 到后端
5. 后端将 PSBT 推送到 BTC 网络
6. 完成
```

**为什么需要这个接口？**

1. **BTC PSBT 特性**：

   - BTC 网络使用 PSBT 格式进行交易签名
   - PSBT 需要先签名，然后才能广播到网络
   - 某些协议（如 Babylon）需要后端统一处理交易推送

2. **协议要求**：

   - Babylon 协议要求提取交易必须通过后端推送
   - 后端可能需要验证、监控或特殊处理交易
   - 确保交易按照协议要求正确执行

3. **订单跟踪**：
   - 使用 `txId`（订单 ID）关联原始提取订单
   - 后端可以跟踪订单状态和交易状态
   - 提供更好的用户体验和错误处理

**注意事项：**

1. **仅在 `withdrawSignOnly === true` 时调用**：

   - 需要检查 `stakingConfig.withdrawSignOnly`
   - 目前主要适用于 Babylon BTC 协议

2. **需要 `identity`（订单 ID）**：

   - 在调用 `/earn/v2/unstake` 时需要传入 `identity`
   - 这个 `identity` 会作为 `txId` 传递给 `unstakePush`

3. **需要 `finalizedPsbtHex`**：

   - 只有在签名成功后才能获取
   - 如果签名失败，不会调用此接口

4. **错误处理**：
   - 如果推送失败，需要用户手动处理
   - 建议在 UI 中显示错误信息，允许用户重试

#### 4.4 构建领取交易

**接口：** `POST /earn/v2/claim`

**方法：** `buildClaimTransaction`

**调用时机：**

1. **主要调用路径**：

   ```
   协议详情页 (ProtocolDetailsV2)
     → 点击"领取"按钮/可领取余额 (onClaim)
       → useHandleClaim → 检查协议配置
         → (可选) 导航到 Claim 或 ClaimOptions 页面
           → 用户确认金额 (onConfirm)
             → useUniversalClaim → buildClaimTransaction
               → /earn/v2/claim API
   ```

2. **具体触发时机**：

   - 用户在 **协议详情页**点击"领取"按钮或可领取余额项
   - 在 **PortfolioSection** 组件中点击 `claimable` 或 `rewards` 项
   - 在 **Claim 页面**输入金额并点击确认按钮
   - 在 `UniversalClaim` 组件中，`onConfirm` 回调被触发
   - 调用 `useUniversalClaim` hook 中的 `handleClaim` 方法
   - 最终调用 `buildClaimTransaction` 方法

3. **前置条件**：
   - 用户已选择账户和协议
   - 用户有可领取的奖励（`claimable > 0` 或 `rewards > 0`）
   - 用户已确认领取金额（或使用全部可领取金额）
   - 对于某些协议，可能需要先选择订单（`ClaimOptions` 页面）

**入口：**

1. **协议详情页（ProtocolDetailsV2）**：

   - 点击协议详情页的"领取"按钮（`actions` 中 `type: "claim"` 的按钮）
   - 代码：`packages/kit/src/views/Staking/pages/ProtocolDetailsV2/index.tsx` → `claimActionProps`
   - 按钮显示条件：
     - 有账户地址（`earnAccount?.accountAddress`）
     - 后端返回的 `item?.disabled` 为 `false`

2. **投资组合区域（PortfolioSection）**：

   - 点击"可领取"（Claimable）项：`onClaim?.({ amount: claimable })`
   - 点击"奖励"（Rewards）项：`onClaim?.({ amount: rewards, isReward: true })`
   - 代码：`packages/kit/src/views/Staking/components/ProtocolDetails/PortfolioSection.tsx` 第 561-605 行

3. **领取选项页面（ClaimOptions）**：

   - 对于需要选择订单的协议（如 Babylon），会先进入 `ClaimOptions` 页面
   - 用户选择订单后，导航到 `Claim` 页面

4. **领取页面（Claim）**：
   - 用户在 `Claim` 页面输入金额并确认
   - 代码：`packages/kit/src/views/Staking/pages/Claim/index.tsx` 第 48-88 行

**参数来源：**

```typescript
IStakeClaimBaseParams = {
  accountId: string;              // 从路由参数获取（ProtocolDetailsV2 → Claim）
  networkId: string;               // 从路由参数获取
  symbol: string;                  // 从协议详情获取（tokenInfo.token.symbol）
  vault: string;                   // ⭐ 从协议详情获取（protocolInfo.vault 或 protocolInfo.approve.approveTarget）
  provider: string;                // 从协议详情获取（protocolInfo.provider）
  amount?: string;                 // ⭐ 用户选择或输入（可领取余额或用户输入）
  identity?: string;               // ⭐ Solana pubkey 或订单ID（某些协议需要）
  claimTokenAddress?: string;      // ⭐ 奖励代币地址（多奖励代币协议需要）
}
```

**参数构建过程：**

```typescript
// packages/kit-bg/src/services/ServiceStaking.ts (约第 370-413 行)
async buildClaimTransaction(params: IStakeClaimBaseParams) {
  // 1. 获取账户信息
  const vault = await vaultFactory.getVault({ networkId, accountId });
  const account = await vault.getAccount();

  // 2. 获取质押配置
  const stakingConfig = await this.getStakingConfigs({ networkId, symbol: params.symbol, provider: params.provider });

  // 3. 构建请求参数
  const sendParams: Record<string, string | undefined> = {
    accountAddress: account.address,              // 从账户获取
    networkId,
    publicKey: stakingConfig.usePublicKey ? account.pub : undefined,  // 根据配置决定（BTC 网络需要）
    symbol: params.symbol,
    provider: params.provider,
    firmwareDeviceType: await this.getFirmwareDeviceTypeParam({ accountId }),  // 硬件钱包类型
    amount: params.amount,                        // 领取金额
    identity: params.identity,                     // Solana 或订单ID
    ...rest,                                      // 其他参数
  };

  // 4. 条件性添加参数
  if (params.claimTokenAddress) {
    sendParams.rewardTokenAddress = params.claimTokenAddress;  // 奖励代币地址
  }
  if (earnUtils.useVaultProvider({ providerName: params.provider }) && params.vault) {
    sendParams.vault = params.vault;  // Vault Provider 协议需要
  }

  // 5. 调用 API
  const resp = await client.post(`/earn/v2/claim`, sendParams);
  return resp.data.data;  // 返回 IStakeTxResponse
}
```

**特殊处理：**

1. **费用估算和 Gas 警告**：

   ```typescript
   // packages/kit/src/views/Staking/hooks/useUniversalHooks.ts (约第 385-412 行)
   if (Number(amount) > 0) {
     // 估算费用
     const estimateFeeResp =
       await backgroundApiProxy.serviceStaking.estimateFee({
         networkId,
         provider,
         symbol,
         action: 'claim',
         amount,
         protocolVault,
         identity,
         accountAddress,
       });

     // 检查领取代币价值是否小于 Gas 费用
     const tokenFiatValueBN = BigNumber(
       estimateFeeResp.token.price,
     ).multipliedBy(amount);
     if (tokenFiatValueBN.lt(estimateFeeResp.feeFiatValue)) {
       // 显示警告对话框，询问用户是否继续
       showClaimEstimateGasAlert({
         claimTokenFiatValue: tokenFiatValueBN.toFixed(),
         estFiatValue: estimateFeeResp.feeFiatValue,
         onConfirm: continueClaim,
       });
       return;
     }
   }
   ```

   - **目的**：防止用户领取的奖励价值小于 Gas 费用，导致得不偿失
   - **触发条件**：领取金额 > 0 时
   - **行为**：如果代币价值 < Gas 费用，显示警告对话框，用户确认后才继续

2. **协议配置检查**：

   - `claimWithTx`: 如果需要选择订单，导航到 `ClaimOptions` 页面
   - `claimWithAmount`: 某些协议需要传递金额（如 Everstake APT）
   - `usePublicKey`: BTC 网络需要传递 `publicKey`

3. **多奖励代币支持**：
   - 某些协议可能有多个奖励代币（如 Morpho）
   - 通过 `claimTokenAddress` 指定要领取的奖励代币地址
   - 从 `rewardAssets` 中选择对应的奖励代币

**数据用途：**

1. **返回交易数据**：

   - `tx`: 根据网络和协议类型返回不同的交易结构（与 `/earn/v2/stake` 相同）
     - BTC: `psbtHex`（PSBT 格式）
     - ETH: 标准交易结构（`from`, `to`, `value`, `gasLimit`, `data`）
     - Cosmos: Amino 格式交易
     - Sui: 交易字符串
   - `orderId`: 订单 ID，用于跟踪订单状态

2. **后续处理流程**：

   ```
   buildClaimTransaction 返回 IStakeTxResponse
     ↓
   buildEarnTx (将交易数据编码为统一格式)
     ↓
   navigationToTxConfirm (导航到交易确认页)
     ↓
   用户确认签名
     ↓
   发送交易（/wallet/v1/account/send-transaction）
     ↓
   保存订单信息（如果支持）
     ↓
   完成领取
   ```

3. **订单跟踪**：
   - 对于支持的协议，会将交易信息保存到本地跟踪列表
   - `orderId` 用于后续查询订单状态

**完整调用链：**

```
用户操作流程：
1. 协议详情页点击"领取"按钮或可领取余额
   ↓
2. useHandleClaim 检查协议配置
   ↓
3. 如果需要选择订单（claimWithTx），导航到 ClaimOptions 页面
   ↓
4. 如果是 Everstake APT 且 claimWithAmount，导航到 Claim 页面
   ↓
5. 否则直接调用 useUniversalClaim
   ↓
6. 检查费用（如果 amount > 0）
   ↓
7. 如果代币价值 < Gas 费用，显示警告对话框
   ↓
8. 用户确认后，调用 buildClaimTransaction
   ↓
9. /earn/v2/claim API 调用
   ↓
10. 返回交易数据和订单ID
    ↓
11. buildEarnTx 编码交易
    ↓
12. navigationToTxConfirm 显示确认页
    ↓
13. 用户签名并发送交易
    ↓
14. 完成领取
```

**请求体：**

```typescript
{
  accountAddress: string;        // 账户地址
  networkId: string;              // 网络ID
  publicKey?: string;            // BTC 网络或配置要求时
  symbol: string;                // 代币符号
  provider: string;               // 协议名称
  vault?: string;                // useVaultProvider 时
  rewardTokenAddress?: string;   // 奖励代币地址（多奖励代币协议）
  firmwareDeviceType?: string;   // 硬件钱包类型
  amount?: string;               // 领取金额（可选，某些协议需要）
  identity?: string;             // Solana pubkey 或订单ID
}
```

**响应结构（完整）：**

```typescript
IStakeTxResponse = {
  tx: IStakeTx;                  // 交易数据（根据网络类型不同而不同，与 stake 相同）
  orderId: string;               // 订单ID（用于跟踪订单状态）
}
```

**交易类型详解（IStakeTx 联合类型）：**

与 `/earn/v2/stake` 相同，返回的 `tx` 可能是以下任一类型：

1. **BTC 领取**：`IStakeTxBtcBabylon`（`psbtHex`）
2. **ETH 标准交易**：`IStakeTxEthEvertStake`（`from`, `to`, `value`, `gasLimit`, `data`）
3. **Cosmos 链 Amino 格式**：`IStakeTxCosmosAmino`
4. **Sui 交易**：`IStakeTxSui`（`tx` 字符串）

详细结构请参考 `/earn/v2/stake` 接口的响应结构说明。

**代码位置：**

- **接口实现**：`packages/kit-bg/src/services/ServiceStaking.ts` 第 370-413 行
- **调用位置**：`packages/kit/src/views/Staking/hooks/useUniversalHooks.ts` 第 339-348 行
- **入口处理**：`packages/kit/src/views/Staking/pages/ProtocolDetails/useHandleClaim.ts` 第 16-141 行
- **UI 组件**：`packages/kit/src/views/Staking/components/ProtocolDetails/PortfolioSection.tsx` 第 561-605 行

**注意事项：**

1. **费用估算**：

   - 在调用 `/earn/v2/claim` 之前，会先调用 `estimateFee` 估算费用
   - 如果领取的代币价值小于 Gas 费用，会显示警告对话框

2. **协议特殊处理**：

   - **Babylon**: 可能需要先选择订单（`ClaimOptions`）
   - **Everstake APT**: 需要传递 `amount` 参数
   - **Morpho**: 支持多奖励代币，需要指定 `claimTokenAddress`

3. **金额参数**：

   - `amount` 参数是可选的，某些协议不需要传递
   - 如果传递了 `amount`，会进行费用估算检查

4. **错误处理**：
   - 如果费用估算失败，可能仍会继续执行（取决于错误类型）
   - 建议在 UI 中显示错误信息，允许用户重试

#### 4.5 Babylon 领取记录

**接口：** `POST /earn/v1/claim/record`

**方法：** `babylonClaimRecord`

**调用时机：**

1. **主要调用路径**：

   ```
   领取选项页面 (ClaimOptions)
     → 用户选择订单并完成领取交易
       → onSuccess 回调
         → addBabylonTrackingItem (添加本地跟踪项)
           → babylonClaimRecord
             → /earn/v1/claim/record API
   ```

2. **具体触发时机**：

   - **领取选项页面（ClaimOptions）**：
     - 用户在 `ClaimOptions` 页面选择订单并完成领取交易后调用
     - 在 `onSuccess` 回调中调用，且仅当 `provider === 'babylon'` 时调用
     - 在调用 `babylonClaimRecord` 之前，会先调用 `addBabylonTrackingItem` 添加本地跟踪项
     - 使用 `void` 前缀，表示不等待结果（异步执行）
     - 代码：`packages/kit/src/views/Staking/pages/ClaimOptions/index.tsx` 第 95-103 行

3. **前置条件**：

   - 用户已完成领取交易（`onSuccess` 回调被触发）
   - 协议为 Babylon（`provider === 'babylon'`）
   - 有有效的 `identity`（订单 ID，从 `item.id` 获取）

**入口：**

1. **领取选项页面（ClaimOptions）**：

   - 用户完成领取交易后自动调用
   - 代码：`packages/kit/src/views/Staking/pages/ClaimOptions/index.tsx` 第 95-103 行
   - 触发条件：
     - 用户选择订单并完成领取交易
     - `onSuccess` 回调被触发
     - `provider === 'babylon'`
     - `identity` 存在（从 `item.id` 获取）

**参数来源：**

```typescript
{
  networkId: string; // 从路由参数获取
  provider: string; // 从路由参数获取（固定为 'babylon'）
  symbol: string; // 从路由参数获取（tokenInfo?.token.symbol）
  accountId: string; // 从路由参数获取
  identity: string; // ⭐ 从 item.id 获取（订单 ID）
}
```

**参数构建过程：**

```typescript
// packages/kit-bg/src/services/ServiceStaking.ts (约第 353-367 行)
async babylonClaimRecord(params: IClaimRecordParams) {
  const { networkId, accountId, ...rest } = params;
  const client = await this.getClient(EServiceEndpointEnum.Earn);

  // 1. 获取账户信息
  const vault = await vaultFactory.getVault({ networkId, accountId });
  const acc = await vault.getAccount();

  // 2. 调用 API
  const resp = await client.post<{
    data: IStakeTxResponse;
  }>(`/earn/v1/claim/record`, {
    accountAddress: acc.address,  // ⭐ 从账户获取
    publicKey: acc.pub,           // ⭐ 从账户获取（BTC 网络需要）
    networkId,
    ...rest,                      // provider, symbol, identity
  });

  return resp.data.data;  // 返回 IStakeTxResponse
}

// 领取选项页面调用（ClaimOptions）
const onPress = useCallback(async ({ item }) => {
  await handleClaim({
    identity: item.id,  // ⭐ 订单 ID
    amount: item.amount,
    symbol,
    provider,
    // ...
    onSuccess: async (txs) => {
      const tx = txs[0];
      if (tx) {
        // 1. 先添加本地跟踪项
        await backgroundApiProxy.serviceStaking.addBabylonTrackingItem({
          txId: item.id,       // ⭐ 使用订单 ID 作为 txId
          action: 'claim',
          createAt: Date.now(),
          accountId,
          networkId,
          amount: item.amount,
        });
      }
      appNavigation.pop();
      // ...
      // 2. 如果是 Babylon 协议，记录领取状态
      if (provider === 'babylon') {
        void backgroundApiProxy.serviceStaking.babylonClaimRecord({
          accountId,
          networkId,
          provider,
          symbol,
          identity: item.id,  // ⭐ 订单 ID
        });
      }
    },
  });
}, [handleClaim, symbol, provider, ...]);
```

**请求参数：**

```typescript
{
  accountAddress: string; // 账户地址（从账户获取）
  publicKey: string; // 公钥（从账户获取，BTC 网络需要）
  networkId: string; // 网络ID
  provider: string; // 协议名称（固定为 'babylon'）
  symbol: string; // 代币符号（如 "BTC"）
  identity: string; // ⭐ 订单 ID（从 item.id 获取）
}
```

**响应结构：**

```typescript
// 返回 IStakeTxResponse（但通常不使用返回值）
IStakeTxResponse = {
  tx: IStakeTx;      // 交易数据（可能为空或不使用）
  orderId: string;   // 订单ID（可能为空或不使用）
}
```

**数据用途：**

1. **记录领取状态**：

   - 将 Babylon 协议的领取状态同步到服务器
   - 服务器可以跟踪领取操作的完成状态
   - 支持领取状态的查询和统计

2. **本地跟踪项管理**：

   - 在调用 `babylonClaimRecord` 之前，会先调用 `addBabylonTrackingItem` 添加本地跟踪项
   - 本地跟踪项用于：
     - 跟踪领取操作的进度
     - 在 `BabylonTrackingAlert` 组件中显示待处理的领取操作
     - 自动清理已完成的领取操作（通过 `getPortfolioList` 检查状态）

3. **自动清理机制**：

   ```typescript
   // packages/kit/src/views/Staking/components/BabylonTrackingAlert/index.tsx (约第 62-69 行)
   claimItems.forEach((claimItem) => {
     const findClaim = portfolioItems.find(
       (o) => o.txId === claimItem.txId && o.status === 'claimed',
     );
     if (findClaim) {
       removed.push(claimItem.txId); // ⭐ 如果状态为 'claimed'，移除跟踪项
     }
   });
   ```

   - `BabylonTrackingAlert` 组件会定期检查本地跟踪项
   - 如果领取操作已完成（状态为 `'claimed'`），会自动移除跟踪项
   - 如果跟踪项超过 3 天，也会自动移除

**特殊处理：**

1. **异步执行**：

   - 使用 `void` 前缀调用，表示不等待结果
   - 避免阻塞用户界面
   - 即使 API 调用失败，也不影响用户体验

2. **协议检查**：

   - 只有当 `provider === 'babylon'` 时才调用
   - 其他协议不调用此接口

3. **本地跟踪项**：

   - 在调用 `babylonClaimRecord` 之前，会先调用 `addBabylonTrackingItem`
   - 本地跟踪项用于跟踪领取操作的进度
   - 支持自动清理已完成的领取操作

4. **订单 ID 使用**：

   - `identity` 参数使用 `item.id`（订单 ID）
   - 这个 `identity` 也是本地跟踪项的 `txId`
   - 用于在 `getPortfolioList` 中查找对应的投资组合项

5. **自动清理机制**：

   - `BabylonTrackingAlert` 组件会定期检查本地跟踪项
   - 如果领取操作已完成（状态为 `'claimed'`），会自动移除跟踪项
   - 如果跟踪项超过 3 天，也会自动移除
   - 代码：`packages/kit/src/views/Staking/components/BabylonTrackingAlert/index.tsx` 第 62-76 行

**完整调用链：**

```
用户操作流程：
1. 用户在 ClaimOptions 页面选择订单
   ↓
2. 点击"领取"按钮
   ↓
3. handleClaim 调用（传递 identity: item.id, amount: item.amount）
   ↓
4. buildClaimTransaction (/earn/v2/claim)
   ↓
5. 用户签名并发送交易
   ↓
6. onSuccess 回调被触发
   ↓
7. addBabylonTrackingItem (添加本地跟踪项)
   ↓
8. appNavigation.pop() (关闭页面)
   ↓
9. 如果 provider === 'babylon'，调用 babylonClaimRecord
   ↓
10. /earn/v1/claim/record API 调用（异步执行）
    ↓
11. （可选）BabylonTrackingAlert 定期检查并清理已完成的跟踪项
```

**代码位置：**

- **接口实现**：`packages/kit-bg/src/services/ServiceStaking.ts` 第 353-367 行
- **调用位置**：`packages/kit/src/views/Staking/pages/ClaimOptions/index.tsx` 第 95-103 行
- **本地跟踪项**：`packages/kit-bg/src/services/ServiceStaking.ts` 第 1396-1398 行
- **自动清理**：`packages/kit/src/views/Staking/components/BabylonTrackingAlert/index.tsx` 第 62-76 行

**注意事项：**

1. **协议支持**：

   - 仅用于 **Babylon BTC** 协议
   - 其他协议不调用此接口

2. **异步执行**：

   - 使用 `void` 前缀调用，不等待结果
   - 避免阻塞用户界面
   - 即使 API 调用失败，也不影响用户体验

3. **本地跟踪项**：

   - 在调用 `babylonClaimRecord` 之前，会先调用 `addBabylonTrackingItem`
   - 本地跟踪项用于跟踪领取操作的进度
   - 支持自动清理已完成的领取操作

4. **订单 ID 使用**：

   - `identity` 参数使用 `item.id`（订单 ID）
   - 这个 `identity` 也是本地跟踪项的 `txId`
   - 用于在 `getPortfolioList` 中查找对应的投资组合项

5. **自动清理机制**：

   - `BabylonTrackingAlert` 组件会定期检查本地跟踪项
   - 如果领取操作已完成（状态为 `'claimed'`），会自动移除跟踪项
   - 如果跟踪项超过 3 天，也会自动移除

6. **错误处理**：

   - 使用 `void` 前缀调用，不处理错误
   - 即使 API 调用失败，也不影响用户体验
   - 建议在服务器端记录错误日志

7. **响应处理**：

   - 接口返回 `IStakeTxResponse`，但通常不使用返回值
   - 主要用于记录领取状态，不需要返回交易数据

8. **账户信息**：

   - 需要获取账户地址和公钥（BTC 网络）
   - 通过 `vaultFactory.getVault` 和 `vault.getAccount` 获取

### 5. 费用估算接口

#### 5.1 估算交易费用

**接口：** `GET /earn/v1/estimate-fee`

**方法：** `estimateFee`

**调用时机：**

1. **主要调用路径**：

   ```
   质押页面 (UniversalStake)
     → 用户输入金额 (amountValue)
       → useEffect 监听 amountValue 和 shouldApprove 变化
         → debouncedFetchEstimateFeeResp (防抖 350ms)
           → estimateFee
             → /earn/v1/estimate-fee API

   提取页面 (Withdraw)
     → 页面加载时
       → usePromiseResult
         → estimateFee
           → /earn/v1/estimate-fee API

   领取页面 (Claim)
     → 页面加载时（amount='1'）
       → usePromiseResult
         → estimateFee
           → /earn/v1/estimate-fee API

   领取确认流程 (useUniversalClaim)
     → 用户确认领取前
       → 如果 amount > 0，调用 estimateFee
         → /earn/v1/estimate-fee API
         → 检查费用警告（如果代币价值 < Gas 费用）
   ```

2. **具体触发时机**：

   - **质押页面（UniversalStake）**：

     - 用户输入金额时自动调用（防抖 350ms）
     - 使用 `useEffect` 监听 `amountValue` 和 `shouldApprove` 变化
     - **条件**：
       - 金额不为空且大于 0
       - 如果使用 Permit2 授权，且 `shouldApprove` 为 true，不调用
       - 如果 `shouldApprove` 从 true 变为 false，且金额有效，会调用
     - 代码：`packages/kit/src/views/Staking/components/UniversalStake/index.tsx` 第 269-394 行

   - **提取页面（Withdraw）**：

     - 页面加载时调用一次
     - 使用 `usePromiseResult` 获取费用估算
     - 代码：`packages/kit/src/views/Staking/pages/Withdraw/index.tsx` 第 120-144 行

   - **领取页面（Claim）**：

     - 页面加载时调用一次（使用固定金额 `amount: '1'`）
     - 使用 `usePromiseResult` 获取费用估算
     - 代码：`packages/kit/src/views/Staking/pages/Claim/index.tsx` 第 92-108 行

   - **领取确认流程（useUniversalClaim）**：
     - 用户确认领取前调用
     - 如果 `amount > 0`，调用 `estimateFee` 检查费用
     - 如果代币价值 < Gas 费用，显示警告对话框
     - 代码：`packages/kit/src/views/Staking/hooks/useUniversalHooks.ts` 第 385-412 行

3. **前置条件**：

   - 用户已选择账户和协议
   - 对于质押页面：金额不为空且大于 0（或满足其他条件）
   - 对于提取/领取页面：页面加载时即可调用

**入口：**

1. **质押页面（UniversalStake）**：

   - 用户输入金额时自动调用
   - 代码：`packages/kit/src/views/Staking/components/UniversalStake/index.tsx` 第 269-394 行
   - 触发条件：
     - `amountValue` 变化
     - `shouldApprove` 从 true 变为 false
     - 防抖延迟 350ms

2. **提取页面（Withdraw）**：

   - 页面加载时自动调用
   - 代码：`packages/kit/src/views/Staking/pages/Withdraw/index.tsx` 第 120-144 行

3. **领取页面（Claim）**：

   - 页面加载时自动调用（`amount: '1'`）
   - 代码：`packages/kit/src/views/Staking/pages/Claim/index.tsx` 第 92-108 行

4. **领取确认流程（useUniversalClaim）**：

   - 用户确认领取前调用
   - 代码：`packages/kit/src/views/Staking/hooks/useUniversalHooks.ts` 第 385-412 行

**参数来源：**

```typescript
{
  networkId: string;              // 从组件 props 获取
  provider: string;               // 从组件 props 获取（providerName）
  symbol: string;                 // 从 tokenInfo.token.symbol 或 tokenSymbol 获取
  action: IEarnEstimateAction;    // ⭐ 操作类型：'stake' | 'unstake' | 'claim' | 'approve'
  amount: string;                 // ⭐ 金额（质押/提取时为实际金额，领取时为 '1' 或实际金额）
  txId?: string;                  // 提取时：Babylon 协议需要（identity）
  protocolVault?: string;         // 从 protocolInfo.vault 获取（useVaultProvider 时）
  identity?: string;              // 提取/领取时：订单 ID（可选）
  accountAddress?: string;        // 从账户获取（可选）
  approveType?: 'permit';         // Permit2 授权时：'permit'
  permitSignature?: string;       // Permit2 授权时：签名（可选）
}
```

**参数构建过程：**

```typescript
// packages/kit-bg/src/services/ServiceStaking.ts (约第 1365-1393 行)
async estimateFee(params: {
  networkId: string;
  provider: string;
  symbol: string;
  action: IEarnEstimateAction;
  amount: string;
  txId?: string;
  protocolVault?: string;
  identity?: string;
  accountAddress?: string;
  approveType?: 'permit';
  permitSignature?: string;
}) {
  const { symbol, protocolVault, ...rest } = params;
  const client = await this.getClient(EServiceEndpointEnum.Earn);

  // 1. 构建请求参数
  const sendParams: Record<string, string | undefined> = {
    symbol,
    ...rest,
  };

  // 2. 条件性添加 vault 参数
  if (earnUtils.useVaultProvider({ providerName: params.provider })) {
    sendParams.vault = protocolVault;
  }

  // 3. 调用 API
  const resp = await client.get<{
    data: IEarnEstimateFeeResp;
  }>(`/earn/v1/estimate-fee`, {
    params: sendParams,
  });

  return resp.data.data;  // 返回 IEarnEstimateFeeResp
}

// 质押页面调用（UniversalStake）
fetchEstimateFeeResp = useCallback(
  async (amount?: string) => {
    // 1. 条件检查
    if (shouldApprove && usePermit2Approve) {
      return undefined;  // Permit2 授权时不需要估算费用
    }
    if (!amount) {
      return undefined;
    }
    const amountNumber = BigNumber(amount);
    if (amountNumber.isZero() || amountNumber.isNaN()) {
      return undefined;
    }

    // 2. Permit2 参数处理
    const permitParams: {
      approveType?: 'permit';
      permitSignature?: string;
    } = {};
    if (usePermit2Approve && !shouldApprove) {
      permitParams.approveType = EApproveType.Permit;
      if (permitSignatureRef.current) {
        const amountBN = BigNumber(amount);
        const allowanceBN = BigNumber(allowance);
        if (amountBN.gt(allowanceBN)) {
          permitParams.permitSignature = permitSignatureRef.current;
        }
      }
    }

    // 3. 获取账户地址
    const account = await backgroundApiProxy.serviceAccount.getAccount({
      accountId,
      networkId,
    });

    // 4. 调用 estimateFee
    const resp = await backgroundApiProxy.serviceStaking.estimateFee({
      networkId,
      provider: providerName,
      symbol: tokenInfo?.token.symbol || '',
      action: shouldApprove ? 'approve' : 'stake',  // ⭐ 授权时使用 'approve'
      amount: amountNumber.toFixed(),
      protocolVault,
      accountAddress: account?.address,
      ...permitParams,
    });
    return resp;
  },
  [accountId, allowance, networkId, protocolVault, providerName, shouldApprove, ...],
);

// 提取页面调用（Withdraw）
const { result: estimateFeeResp } = usePromiseResult(async () => {
  const account = await backgroundApiProxy.serviceAccount.getAccount({
    accountId,
    networkId,
  });
  const resp = await backgroundApiProxy.serviceStaking.estimateFee({
    networkId,
    provider: providerName,
    symbol: tokenSymbol,
    action: 'unstake',
    amount: earnUtils.isMomentumProvider({ providerName }) ? balance : '1',  // ⭐ Momentum 使用余额，其他使用 '1'
    txId: providerName.toLowerCase() === EEarnProviderEnum.Babylon.toLowerCase()
      ? identity  // ⭐ Babylon 协议需要 txId
      : undefined,
    protocolVault: earnUtils.useVaultProvider({ providerName })
      ? vault
      : undefined,
    identity,
    accountAddress: account.address,
  });
  return resp;
}, [accountId, networkId, providerName, tokenSymbol, identity, vault, balance]);

// 领取页面调用（Claim）
const { result: estimateFeeResp } = usePromiseResult(async () => {
  const account = await backgroundApiProxy.serviceAccount.getAccount({
    accountId,
    networkId,
  });
  const resp = await backgroundApiProxy.serviceStaking.estimateFee({
    networkId,
    provider,
    symbol,
    action: 'claim',
    amount: '1',  // ⭐ 固定使用 '1'
    protocolVault: vault,
    accountAddress: account.address,
    identity,
  });
  return resp;
}, [accountId, networkId, provider, symbol, vault, identity]);

// 领取确认流程调用（useUniversalClaim）
const continueClaim = async () => {
  // ... 构建交易
};
if (Number(amount) > 0) {
  const account = await backgroundApiProxy.serviceAccount.getAccount({
    accountId,
    networkId,
  });
  const estimateFeeResp = await backgroundApiProxy.serviceStaking.estimateFee({
    networkId,
    provider,
    symbol,
    action: 'claim',
    amount,  // ⭐ 使用实际金额
    protocolVault,
    identity,
    accountAddress: account.address,
  });
  const tokenFiatValueBN = BigNumber(estimateFeeResp.token.price).multipliedBy(amount);
  if (tokenFiatValueBN.lt(estimateFeeResp.feeFiatValue)) {
    // ⭐ 如果代币价值 < Gas 费用，显示警告对话框
    showClaimEstimateGasAlert({
      claimTokenFiatValue: tokenFiatValueBN.toFixed(),
      estFiatValue: estimateFeeResp.feeFiatValue,
      onConfirm: continueClaim,
    });
    return;
  }
}
await continueClaim();
```

**请求参数：**

```typescript
{
  networkId: string;              // 网络ID
  provider: string;               // 协议名称（如 "Lido", "Morpho", "Babylon"）
  symbol: string;                 // 代币符号（如 "ETH", "BTC"）
  action: 'stake' | 'unstake' | 'claim' | 'approve'; // ⭐ 操作类型
  amount: string;                 // 金额（质押/提取时为实际金额，领取页面为 '1'）
  txId?: string;                  // 提取时：Babylon 协议需要（使用 identity）
  vault?: string;                 // 协议 Vault 地址（useVaultProvider 时）
  identity?: string;              // 提取/领取时：订单 ID（可选）
  accountAddress?: string;        // 账户地址（可选）
  approveType?: 'permit';         // Permit2 授权时：'permit'
  permitSignature?: string;       // Permit2 授权时：签名（可选）
}
```

**响应结构（完整）：**

```typescript
IEarnEstimateFeeResp = {
  coverFeeDays?: string;           // ⭐ 覆盖费用的天数（可选，用于显示警告）
  coverFeeSeconds?: string;        // ⭐ 覆盖费用的秒数（可选，用于计算天数）
  feeFiatValue: string;            // ⭐ 法币费用（用于显示）
  token: {                         // ⭐ 代币信息
    balance: string;                // 代币余额
    balanceParsed: string;         // 解析后的余额
    fiatValue: string;             // 代币法币价值
    price: string;                 // ⭐ 代币价格（用于计算代币价值）
    price24h: string;              // 24小时价格变化
    info: IToken;                  // 代币详细信息
  };
}
```

**数据用途：**

1. **显示费用估算**：

   - 在 `UniversalStake`、`UniversalWithdraw`、`UniversalClaim` 组件中显示
   - 使用 `EstimateNetworkFee` 组件显示费用
   - 显示内容：
     - **标签**：`"预估网络费用"`（`ETranslations.global_est_network_fee`）
     - **金额**：`feeFiatValue`（法币格式）
     - **可点击**：点击可查看详细费用警告（如果存在）

2. **费用警告检查**：

   ```typescript
   // packages/kit/src/views/Staking/components/UniversalStake/index.tsx (约第 334-371 行)
   // 质押时检查费用警告
   const checkEstimateGasAlert = useCallback(
     async (onNext: () => Promise<void> | undefined) => {
       if (usePermit2Approve) {
         return onNext(); // Permit2 授权不需要检查
       }

       setApproving(true);
       const response = await fetchEstimateFeeResp(amountValue);
       setApproving(false);

       if (!response) {
         return onNext();
       }

       // 计算覆盖费用的天数
       const daySpent = Number(response?.coverFeeSeconds || 0) / 3600 / 24;

       // 如果超过 5 天，显示警告对话框
       if (!daySpent || daySpent <= 5) {
         return onNext();
       }

       showEstimateGasAlert({
         daysConsumed: formatStakingDistanceToNowStrict(
           response.coverFeeSeconds,
         ),
         estFiatValue: response.feeFiatValue,
         onConfirm: async (dialogInstance: IDialogInstance) => {
           await dialogInstance.close();
           await onNext();
         },
       });
     },
     [
       usePermit2Approve,
       fetchEstimateFeeResp,
       amountValue,
       showEstimateGasAlert,
     ],
   );
   ```

3. **领取费用警告**：

   ```typescript
   // packages/kit/src/views/Staking/hooks/useUniversalHooks.ts (约第 385-412 行)
   // 领取时检查费用警告
   if (Number(amount) > 0) {
     const estimateFeeResp = await estimateFee({ ... });
     const tokenFiatValueBN = BigNumber(estimateFeeResp.token.price).multipliedBy(amount);

     // 如果代币价值 < Gas 费用，显示警告对话框
     if (tokenFiatValueBN.lt(estimateFeeResp.feeFiatValue)) {
       showClaimEstimateGasAlert({
         claimTokenFiatValue: tokenFiatValueBN.toFixed(),
         estFiatValue: estimateFeeResp.feeFiatValue,
         onConfirm: continueClaim,
       });
       return;
     }
   }
   ```

4. **计算覆盖费用天数**：

   ```typescript
   // packages/kit/src/views/Staking/components/UniversalStake/index.tsx (约第 621-624 行)
   const daysSpent = useMemo(() => {
     if (estimateFeeResp?.coverFeeSeconds) {
       return formatStakingDistanceToNowStrict(estimateFeeResp.coverFeeSeconds);
     }
     return undefined;
   }, [estimateFeeResp?.coverFeeSeconds]);
   ```

**UI 显示：**

在 `UniversalStake`、`UniversalWithdraw`、`UniversalClaim` 组件中：

```typescript
// packages/kit/src/views/Staking/components/EstimateNetworkFee/index.tsx (约第 225-245 行)
export const EstimateNetworkFee = ({ estimateFeeResp, onPress, isVisible }) =>
  estimateFeeResp && isVisible ? (
    <EstimateNetworkFeeListItem
      estFiatValue={estimateFeeResp.feeFiatValue}
      onPress={onPress} // 点击可查看详细费用警告
      labelTextProps={labelTextProps}
      valueTextProps={valueTextProps}
    />
  ) : null;

// EstimateNetworkFeeListItem 组件
function EstimateNetworkFeeListItem({ estFiatValue, onPress }) {
  return Number(estFiatValue) > 0 ? (
    <CalculationListItem onPress={onPress}>
      <CalculationListItem.Label size="$bodyMd">
        {intl.formatMessage({ id: ETranslations.global_est_network_fee })}
      </CalculationListItem.Label>
      <XStack alignItems="center">
        <NumberSizeableText
          size="$bodyMdMedium"
          formatter="value"
          formatterOptions={{ currency: fiatSymbol }}
        >
          {estFiatValue}
        </NumberSizeableText>
        {onPress ? <Icon name="ChevronRightSmallOutline" size="$5" /> : null}
      </XStack>
    </CalculationListItem>
  ) : null;
}
```

**费用警告对话框：**

1. **质押费用警告**（`showEstimateGasAlert`）：

   ```typescript
   // packages/kit/src/views/Staking/components/EstimateNetworkFee/index.tsx (约第 22-80 行)
   Dialog.show({
     title: intl.formatMessage({ id: ETranslations.earn_transaction_loss }),
     icon: 'InfoCircleOutline',
     description: daysConsumed
       ? intl.formatMessage(
           {
             id: ETranslations.earn_transaction_loss_when_stake,
           },
           {
             number: <SizableText>{daysConsumed}</SizableText>, // 覆盖费用的天数
           },
         )
       : undefined,
     renderContent: (
       <XStack>
         <SizableText>
           {intl.formatMessage({ id: ETranslations.global_est_network_fee })}:
         </SizableText>
         <NumberSizeableText
           formatter="value"
           formatterOptions={{ currency: fiatSymbol }}
         >
           {estFiatValue}
         </NumberSizeableText>
       </XStack>
     ),
     onConfirm, // 用户确认后继续
   });
   ```

2. **领取费用警告**（`showClaimEstimateGasAlert`）：

   ```typescript
   // packages/kit/src/views/Staking/components/EstimateNetworkFee/index.tsx (约第 82-163 行)
   Dialog.show({
     title: intl.formatMessage({ id: ETranslations.earn_transaction_loss }),
     icon: 'InfoCircleOutline',
     description: intl.formatMessage(
       {
         id: ETranslations.earn_transaction_loss_when_claim,
       },
       {
         number: <NumberSizeableText>{lossValue}</NumberSizeableText>, // 损失金额
       },
     ),
     renderContent: (
       <YStack>
         <XStack>
           <SizableText>
             {intl.formatMessage({ id: ETranslations.global_est_network_fee })}:
           </SizableText>
           <NumberSizeableText>{estFiatValue}</NumberSizeableText>
         </XStack>
         <XStack>
           <SizableText>
             {intl.formatMessage({ id: ETranslations.earn_reward_value })}:
           </SizableText>
           <NumberSizeableText>{claimTokenFiatValue}</NumberSizeableText>
         </XStack>
       </YStack>
     ),
     onConfirm, // 用户确认后继续
   });
   ```

**特殊处理：**

1. **防抖机制**：

   - 质押页面使用 `useDebouncedCallback` 防抖 350ms
   - 避免用户快速输入时频繁调用 API
   - 代码：`packages/kit/src/views/Staking/components/UniversalStake/index.tsx` 第 326-332 行

2. **条件调用**：

   - **质押页面**：

     - 如果使用 Permit2 授权，且 `shouldApprove` 为 true，不调用
     - 金额为空、为 0 或无效时，不调用
     - 如果 `shouldApprove` 从 true 变为 false，且金额有效，会调用

   - **提取页面**：

     - Momentum 协议使用 `balance` 作为金额
     - 其他协议使用 `'1'` 作为金额
     - Babylon 协议需要传递 `txId`（使用 `identity`）

   - **领取页面**：
     - 页面加载时使用固定金额 `'1'`
     - 领取确认时使用实际金额

3. **Permit2 参数处理**：

   - 如果使用 Permit2 授权，且不需要授权（`!shouldApprove`），传递 `approveType: 'permit'`
   - 如果存在 Permit2 签名，且金额大于当前授权额度，传递 `permitSignature`

4. **Vault 参数处理**：

   - 如果 `useVaultProvider` 为 true，传递 `vault` 参数
   - 否则不传递（或传递 `undefined`）

5. **费用警告阈值**：

   - **质押**：如果 `coverFeeSeconds` 超过 5 天（`daySpent > 5`），显示警告
   - **领取**：如果代币价值 < Gas 费用（`tokenFiatValueBN.lt(estimateFeeResp.feeFiatValue)`），显示警告

6. **金额处理**：

   - **提取页面**：
     - Momentum 协议：使用 `balance`（实际余额）
     - 其他协议：使用 `'1'`（固定值）
   - **领取页面**：
     - 页面加载时：使用 `'1'`（固定值）
     - 领取确认时：使用实际金额

**完整调用链：**

```
用户操作流程：

1. 质押页面：
   用户输入金额（amountValue）
     ↓
   useEffect 检测到 amountValue 或 shouldApprove 变化
     ↓
   调用 debouncedFetchEstimateFeeResp（防抖 350ms）
     ↓
   estimateFee({ action: shouldApprove ? 'approve' : 'stake', ... })
     ↓
   /earn/v1/estimate-fee API 调用
     ↓
   返回费用估算（IEarnEstimateFeeResp）
     ↓
   setEstimateFeeResp 更新状态
     ↓
   在 UI 中显示费用估算（EstimateNetworkFee）
     ↓
   （可选）用户确认时，检查费用警告（如果 coverFeeSeconds > 5 天）

2. 提取页面：
   页面加载时
     ↓
   usePromiseResult 调用 estimateFee({ action: 'unstake', ... })
     ↓
   /earn/v1/estimate-fee API 调用
     ↓
   返回费用估算
     ↓
   在 UI 中显示费用估算

3. 领取页面：
   页面加载时
     ↓
   usePromiseResult 调用 estimateFee({ action: 'claim', amount: '1', ... })
     ↓
   /earn/v1/estimate-fee API 调用
     ↓
   返回费用估算
     ↓
   在 UI 中显示费用估算
     ↓
   用户确认领取时
     ↓
   调用 estimateFee({ action: 'claim', amount: actualAmount, ... })
     ↓
   检查费用警告（如果代币价值 < Gas 费用）
     ↓
   显示警告对话框（如果需要）
```

**代码位置：**

- **接口实现**：`packages/kit-bg/src/services/ServiceStaking.ts` 第 1365-1393 行
- **调用位置**：
  - 质押页面：`packages/kit/src/views/Staking/components/UniversalStake/index.tsx` 第 269-394 行
  - 提取页面：`packages/kit/src/views/Staking/pages/Withdraw/index.tsx` 第 120-144 行
  - 领取页面：`packages/kit/src/views/Staking/pages/Claim/index.tsx` 第 92-108 行
  - 领取确认：`packages/kit/src/views/Staking/hooks/useUniversalHooks.ts` 第 385-412 行
- **UI 组件**：
  - EstimateNetworkFee：`packages/kit/src/views/Staking/components/EstimateNetworkFee/index.tsx` 第 225-245 行
  - EstimateNetworkFeeListItem：`packages/kit/src/views/Staking/components/EstimateNetworkFee/index.tsx` 第 165-213 行
  - 费用警告对话框：`packages/kit/src/views/Staking/components/EstimateNetworkFee/index.tsx` 第 22-163 行

**注意事项：**

1. **防抖延迟**：

   - 质押页面使用 350ms 防抖延迟
   - 避免用户快速输入时频繁调用 API
   - 提高性能和用户体验

2. **条件调用**：

   - **质押页面**：如果使用 Permit2 授权，且 `shouldApprove` 为 true，不调用
   - **提取页面**：Momentum 协议使用 `balance`，其他协议使用 `'1'`
   - **领取页面**：页面加载时使用 `'1'`，领取确认时使用实际金额

3. **操作类型**：

   - `'stake'`：质押操作
   - `'unstake'`：提取操作
   - `'claim'`：领取操作
   - `'approve'`：授权操作（质押时需要授权时）

4. **费用警告阈值**：

   - **质押**：如果 `coverFeeSeconds` 超过 5 天，显示警告
   - **领取**：如果代币价值 < Gas 费用，显示警告

5. **Vault 参数**：

   - 仅在使用 Vault Provider 时传递 `vault` 参数
   - 否则不传递（或传递 `undefined`）

6. **特殊协议处理**：

   - **Babylon**：提取时需要传递 `txId`（使用 `identity`）
   - **Momentum**：提取时使用 `balance` 作为金额
   - **Permit2**：需要传递 `approveType` 和 `permitSignature`（如果存在）

7. **数据为空时**：

   - 如果 `estimateFeeResp` 为 `undefined` 或 `isVisible` 为 false，不显示费用估算
   - 如果 `feeFiatValue` 为 0 或负数，不显示费用项

8. **费用计算**：

   - `coverFeeDays` 和 `coverFeeSeconds` 用于计算覆盖费用的天数
   - `feeFiatValue` 用于显示法币费用
   - `token.price` 用于计算代币价值（领取时）

### 6. 金额检查接口

#### 6.1 检查操作金额

**接口：** `GET /earn/v1/check-amount`

**方法：** `checkAmount`

**参数：**

```typescript
{
  accountId?: string;
  networkId: string;
  symbol?: string;
  provider: string;
  action: ECheckAmountActionType; // 'stake' | 'unstake' | 'claim'
  withdrawAll: boolean;
  amount?: string;
  protocolVault?: string;
}
```

**请求参数：**

```typescript
{
  networkId: string;
  accountAddress: string;
  symbol?: string;
  provider: string;
  action: string;
  amount: string;
  vault?: string;                // useVaultProvider 时
  withdrawAll: boolean;
}
```

**响应结构：**

```typescript
ICheckAmountResponse = {
  code: number;                  // 0 表示正常
  message: string;
  data?: {
    alerts?: ICheckAmountAlert[]; // 风险提示和警告
  };
}
```

**提示类型：**

```typescript
ICheckAmountAlert = {
  type: IAlertType;              // 'info' | 'warning' | 'error'
  text: {
    text: string;
  };
  button?: IEarnAlertButton;     // 可选操作按钮
}
```

### 7. 授权相关接口

#### 7.1 获取代币授权额度

**接口：** `GET /earn/v1/on-chain/allowance`

**方法：** `fetchTokenAllowance`

**参数：**

```typescript
{
  networkId: string;
  accountId: string;
  tokenAddress: string;
  spenderAddress: string;
  blockNumber?: number;
}
```

**请求参数：**

```typescript
{
  accountAddress: string;
  networkId: string;
  tokenAddress: string;
  spenderAddress: string;
  blockNumber?: number;
}
```

**响应结构：**

```typescript
IAllowanceOverview = {
  allowance: string;             // 原始授权额度
  allowanceParsed: string;      // 格式化后的额度
}
```

#### 7.2 构建 Permit2 授权签名数据

**接口：** `POST /earn/v1/permit-signature`

**方法：** `buildPermit2ApproveSignData`

**参数：**

```typescript
IBuildPermit2ApproveSignDataParams = {
  networkId: string;
  provider: string;
  symbol: string;
  accountAddress: string;
  vault: string;
  amount: string;
}
```

**响应结构：**

```typescript
IEarnPermit2ApproveSignData = {
  message: string;               // 签名消息
  deadline: number;              // 过期时间
}
```

#### 7.3 构建注册签名消息数据

**接口：** `POST /earn/v1/permit-signature`

**方法：** `buildRegisterSignMessageData`

**说明：** 与 Permit2 使用同一接口，但参数不同

**参数：**

```typescript
IBuildRegisterSignMessageParams = {
  networkId: string;
  provider: string;
  symbol: string;
  accountAddress: string;
  // ... 其他参数
}
```

#### 7.4 验证注册签名

**接口：** `POST /earn/v1/verify-sig`

**方法：** `verifyRegisterSignMessage`

**参数：**

```typescript
IVerifyRegisterSignMessageParams = {
  // 根据协议不同而不同
  // Ethena 不需要 signature 和 message
};
```

### 8. 历史记录接口

#### 8.1 获取质押历史

**接口：** `GET /earn/v1/stake-histories`

**方法：** `getStakeHistory`

**调用时机：**

1. **主要调用路径**：

   ```
   协议详情页 (ProtocolDetailsV2) / 投资详情页 (InvestmentDetails)
     → 点击"历史记录"按钮 (onHistory)
       → 导航到 HistoryList 页面
         → HistoryList 页面加载时
           → getStakeHistory
             → /earn/v1/stake-histories API
   ```

2. **具体触发时机**：

   - 用户在 **协议详情页**点击"历史记录"按钮（`actions` 中 `type: "history"` 的按钮）
   - 用户在 **投资详情页**点击"历史记录"按钮
   - 导航到 **HistoryList 页面**后，页面加载时自动调用
   - 使用 `usePromiseResult` 在页面加载时自动获取数据
   - 支持自动轮询刷新（`pollingInterval: 30 * 1000`，每 30 秒刷新一次）

3. **前置条件**：
   - 用户已选择账户和协议
   - 协议启用了历史记录功能（`earnHistoryEnable` 或 `actions` 中包含 `type: "history"`）

**入口：**

1. **协议详情页（ProtocolDetailsV2）**：

   - 点击协议详情页的"历史记录"按钮（`actions` 中 `type: "history"` 的按钮）
   - 代码：`packages/kit/src/views/Staking/pages/ProtocolDetailsV2/index.tsx` 第 837-866 行
   - 按钮显示条件：
     - 有账户 ID（`earnAccount?.accountId`）
     - 后端返回的 `historyAction?.disabled` 为 `false`

2. **投资详情页（InvestmentDetails）**：

   - 点击投资详情页的"历史记录"按钮
   - 代码：`packages/kit/src/views/Staking/pages/InvestmentDetails/index.tsx` 第 224-262 行

3. **历史记录页面（HistoryList）**：
   - 页面加载时自动调用 `getStakeHistory`
   - 代码：`packages/kit/src/views/Staking/pages/HistoryList/index.tsx` 第 316-420 行

**参数来源：**

```typescript
IStakeHistoryParams = {
  accountId: string;              // 从路由参数获取（ProtocolDetailsV2 → HistoryList）
  networkId: string;               // 从路由参数获取
  symbol: string;                  // 从路由参数获取（tokenInfo.token.symbol）
  provider: string;                // 从路由参数获取（protocolInfo.provider）
  protocolVault?: string;          // 从路由参数获取（protocolInfo.vault）
  type?: string;                   // ⭐ 用户选择的过滤类型（'all' | 'stake' | 'withdraw' | 'claim' | 'rebate'）
}
```

**参数构建过程：**

```typescript
// packages/kit-bg/src/services/ServiceStaking.ts (约第 482-513 行)
async getStakeHistory(params: IStakeHistoryParams) {
  // 1. 获取账户地址
  const accountAddress = await this.backgroundApi.serviceAccount.getAccountAddressForApi({
    networkId,
    accountId,
  });

  // 2. 判断是否使用 Vault Provider
  const useVaultProvider = params.provider && earnUtils.useVaultProvider({
    providerName: params.provider,
  });

  // 3. 构建请求参数
  const data: Record<string, string | undefined> & { type?: string } = {
    accountAddress,
    networkId,
    symbol: params.symbol,
    provider: params.provider,
    ...rest,
  };

  // 4. 条件性添加参数
  if (useVaultProvider && params.protocolVault) {
    data.vault = params.protocolVault;  // Vault Provider 协议需要
  }
  if (params.type) {
    data.type = params.type;  // 交易类型过滤
  }

  // 5. 调用 API
  const resp = await client.get('/earn/v1/stake-histories', {
    params: data,
  });
  return resp.data.data;  // 返回 IStakeHistoriesResponse
}
```

**请求参数：**

```typescript
{
  accountAddress: string;        // 账户地址（从账户获取）
  networkId: string;            // 网络ID
  symbol: string;               // 代币符号
  provider: string;             // 协议名称
  vault?: string;                // useVaultProvider 时（协议 vault）
  type?: string;                 // 交易类型过滤（'all' | 'stake' | 'withdraw' | 'claim' | 'rebate'）
  // 可能包含分页参数（nextKey 等）
}
```

**响应结构（完整）：**

```typescript
IStakeHistoriesResponse = {
  filter: Record<string, string>;  // 过滤选项（用于显示筛选器）
  list: IStakeHistory[];           // 历史记录列表
  tokenMap: Record<string, IToken>; // 代币映射（tokenAddress -> IToken）
  tokens: Array<{                   // 代币信息列表（包含价格）
    price?: string;
    price24h?: string;
    info?: IToken;
  }>;
  nextKey?: string;                 // 分页键（用于加载更多）
  network?: {                       // 网络信息（可选）
    networkId: string;
    name: string;
    logoURI: string;
  };
  networks: Array<{                 // 网络列表
    networkId: string;
    name: string;
    logoURI: string;
  }>;
}

IStakeHistory = {
  txHash: string;                  // ⭐ 交易哈希（用于跳转到交易详情）
  title: string;                   // ⭐ 交易标题（如 "质押 ETH", "领取奖励"）
  type?: string;                   // 交易类型（'stake' | 'withdraw' | 'claim' 等）
  amount?: string;                 // ⭐ 交易金额（用于显示）
  timestamp: number;               // ⭐ 时间戳（用于分组和排序）
  tokenAddress: string;            // 代币地址
  networkId: string;               // 网络ID
  token?: {                        // 代币信息（从 tokens 数组匹配）
    price?: string;
    price24h?: string;
    info?: IToken;
  };
  direction: 'receive' | 'send';  // ⭐ 交易方向（用于显示 +/- 符号）
}
```

**数据用途：**

1. **显示历史记录列表**：

   - 在 `HistoryList` 页面使用 `SectionList` 组件显示
   - 按日期分组（`groupBy` 按 `timestamp` 分组）
   - 按时间倒序排序（最新的在前）
   - 每个历史项显示：
     - 交易标题（`item.title`）
     - 交易金额（`item.amount`，带 +/- 符号）
     - 协议名称（`provider`）
     - 交易时间（从 `timestamp` 格式化）
     - 代币图标（从 `token` 或 `tokenMap` 获取）

2. **合并本地历史记录**：

   ```typescript
   // packages/kit/src/views/Staking/pages/HistoryList/index.tsx (约第 348-399 行)
   // 1. 获取远程历史记录（从 API）
   const historyResp = await getStakeHistory({ ... });

   // 2. 按日期分组
   const listMap = groupBy(historyResp.list, (item) =>
     formatDate(new Date(item.timestamp * 1000), { hideTimeForever: true }),
   );

   // 3. 转换为 Section 格式
   const sections = Object.entries(listMap)
     .map(([sectionTitle, data]) => ({
       title: sectionTitle,  // 日期标题（如 "2024-01-01"）
       data: data.map((i) => ({
         ...i,
         token: historyResp.tokens.find(...),  // 匹配代币信息
       })),
     }))
     .sort((a, b) => b.data[0].timestamp - a.data[0].timestamp);  // 倒序排序

   // 4. 获取本地待处理历史记录（如果存在 stakeTag）
   if (filterType !== 'rebate' && stakeTag) {
     const localItems = await fetchLocalStakingHistory({ accountId, networkId, stakeTag });
     // 转换为 IStakeHistory 格式
     const localNormalizedItems = localItems.map<IStakeHistory>((o) => ({
       txHash: o.decodedTx.txid,
       timestamp: o.decodedTx.createdAt ?? o.decodedTx.updatedAt ?? 0,
       title: labelFn(o.stakingInfo.label),
       direction: o.stakingInfo.send ? 'send' : 'receive',
       amount: action?.amount,
       networkId: o.stakingInfo?.receive?.token?.networkId ?? '',
       token: historyResp.tokens.find(...),
       tokenAddress: action?.token.address ?? '',
     }));

     // 根据过滤类型筛选
     const pendingItems = filterType === 'all'
       ? localNormalizedItems
       : localNormalizedItems.filter((item) => item.direction === direction);

     // 添加到最前面（"待处理" Section）
     if (pendingItems.length > 0) {
       sections.unshift({
         title: intl.formatMessage({ id: ETranslations.global_pending }),
         data: localNormalizedItems,
         isPending: true,  // 标记为待处理
       });
     }
   }
   ```

3. **过滤功能**：

   - 使用 `filter` 字段显示过滤选项（Select 组件）
   - 用户可以选择过滤类型：`'all'` | `'stake'` | `'withdraw'` | `'claim'` | `'rebate'`
   - 切换过滤类型时重新调用 API（`filterType` 作为依赖）

4. **跳转到交易详情**：
   - 点击历史项时，跳转到交易详情页
   - 使用 `txHash` 作为 `transactionHash` 参数
   - 代码：`packages/kit/src/views/Staking/pages/HistoryList/index.tsx` 第 103-111 行

**UI 显示：**

在 `HistoryList` 页面中：

- **顶部筛选器**：使用 `Select` 组件显示过滤选项（从 `filter` 字段获取）
- **SectionList**：
  - **Section Header**：显示日期（如 "2024-01-01"）或"待处理"
  - **待处理 Section**：使用特殊颜色（`$textCaution`）显示
  - **历史项**：
    - 左侧：代币图标（从 `token` 或 `tokenMap` 获取）
    - 中间：交易标题和协议名称
    - 右侧：交易金额（带 +/- 符号，`receive` 为绿色，`send` 为默认颜色）

**特殊处理：**

1. **本地历史记录合并**：

   - 如果存在 `stakeTag`，会获取本地存储的待处理交易
   - 将本地交易转换为 `IStakeHistory` 格式
   - 添加到列表最前面（"待处理" Section）
   - 仅在 `filterType !== 'rebate'` 时合并本地记录

2. **自动刷新**：

   - 使用 `pollingInterval: 30 * 1000` 每 30 秒自动刷新
   - 确保用户看到最新的历史记录状态

3. **代币信息匹配**：
   - 从 `tokens` 数组中匹配 `tokenAddress` 和 `networkId`
   - 将匹配的 `token` 信息添加到每个历史项中
   - 用于显示代币图标和价格

**完整调用链：**

```
用户操作流程：
1. 协议详情页/投资详情页点击"历史记录"按钮
   ↓
2. 导航到 HistoryList 页面
   ↓
3. HistoryList 页面加载时调用 getStakeHistory
   ↓
4. /earn/v1/stake-histories API 调用
   ↓
5. 返回历史记录列表
   ↓
6. 按日期分组并排序
   ↓
7. （可选）获取本地待处理历史记录并合并
   ↓
8. 显示在 SectionList 中
   ↓
9. （可选）用户切换过滤类型，重新调用 API
   ↓
10. 用户点击历史项，跳转到交易详情页
```

**代码位置：**

- **接口实现**：`packages/kit-bg/src/services/ServiceStaking.ts` 第 482-513 行
- **调用位置**：`packages/kit/src/views/Staking/pages/HistoryList/index.tsx` 第 316-420 行
- **入口处理**：
  - 协议详情页：`packages/kit/src/views/Staking/pages/ProtocolDetailsV2/index.tsx` 第 837-866 行
  - 投资详情页：`packages/kit/src/views/Staking/pages/InvestmentDetails/index.tsx` 第 224-262 行
- **UI 组件**：
  - HistoryList：`packages/kit/src/views/Staking/pages/HistoryList/index.tsx` 第 422-455 行
  - HistoryItem：`packages/kit/src/views/Staking/pages/HistoryList/index.tsx` 第 57-176 行
  - HistoryContent：`packages/kit/src/views/Staking/pages/HistoryList/index.tsx` 第 201-295 行

**注意事项：**

1. **过滤类型**：

   - `'all'`: 显示所有历史记录
   - `'stake'`: 仅显示质押记录（`direction === 'send'`）
   - `'withdraw'`: 仅显示提取记录（`direction === 'receive'`）
   - `'claim'`: 仅显示领取记录
   - `'rebate'`: 仅显示返佣记录（不合并本地记录）

2. **本地历史记录**：

   - 仅在 `filterType !== 'rebate'` 且存在 `stakeTag` 时合并
   - 本地记录显示在"待处理" Section 中
   - 用于显示尚未确认的待处理交易

3. **自动刷新**：

   - 每 30 秒自动刷新一次
   - 确保用户看到最新的交易状态

4. **分页支持**：
   - 响应中包含 `nextKey` 字段（如果存在）
   - 可用于实现"加载更多"功能（当前代码中未实现）

#### 8.2 获取投资详情

**接口：** `POST /earn/v1/investment/detail`

**方法：** `fetchInvestmentDetail`

**调用时机：**

- 在 **InvestmentDetails 页面**（投资详情页）中调用
- 使用 `/earn/v1/recommend` 返回的 `accounts` 列表作为参数
- 返回用户在所有协议上的投资详情

**参数：**

```typescript
list: Array<{
  accountAddress: string; // 账户地址
  networkId: string; // 网络 ID
  publicKey?: string; // BTC 网络需要公钥
}>;
```

**响应结构：**

```typescript
IEarnInvestmentItem[] = Array<{
  name: string;                    // 协议名称（如 "Morpho", "Everstake", "Lido"）
  logoURI: string;                // 协议图标 URL
  investment: IInvestment[];      // 该协议下的投资列表
}>

IInvestment = {
  vault?: string;                 // Vault 地址（某些协议需要）
  vaultName?: string;             // Vault 名称
  staked: string;                 // 质押数量
  active: string;                 // 活跃质押数量
  stakedFiatValue: string;        // 质押法币价值
  claimable: string;              // 可领取数量
  rewards: string;                // 奖励数量
  overflow: string;               // 溢出数量
  rewardNum?: IEarnRewardNum;     // 奖励详情
  tokenInfo: IInvestmentTokenInfo; // 代币信息
  networkInfo?: {                  // 网络信息
    logoURI: string;
  };
}

IInvestmentTokenInfo = {
  uniqueKey: string;              // 唯一标识
  address: string;               // 代币地址（原生币为空）
  decimals: number;               // 小数位数
  isNative: boolean;              // 是否原生币
  logoURI: string;                // 代币图标
  name: string;                   // 代币名称
  symbol: string;                 // 代币符号
  networkId: string;               // 网络 ID
  riskLevel: number;              // 风险等级
  coingeckoId: string;            // CoinGecko ID
}
```

**数据展示逻辑：**

1. **数据结构转换**（`sectionData`）：

   ```typescript
   // packages/kit/src/views/Staking/pages/InvestmentDetails/index.tsx (约第 264-273 行)
   const sectionData = useMemo(() => {
     return earnInvestmentItems
       .map((item) => ({
         title: item.name, // 协议名称作为 section 标题
         logoURI: item.logoURI, // 协议图标
         data: item.investment
           .map((i) => ({ ...i, providerName: item.name })) // 添加协议名称
           .filter((i) => !new BigNumber(i.staked).isZero()), // 过滤掉质押为 0 的项
       }))
       .filter((i) => i.data.length > 0); // 只保留有投资数据的协议
   }, [earnInvestmentItems]);
   ```

2. **UI 展示方式**：

   - 使用 `SectionList` 组件，按协议分组显示
   - **Section Header**（协议分组）：
     - 显示协议图标（`logoURI`）
     - 显示协议名称（`name`，首字母大写）
   - **Section Item**（投资项）：
     - **左侧**：代币图标（`tokenInfo.logoURI`），网络图标作为覆盖层（`networkInfo.logoURI`）
     - **中间**：
       - 质押数量：`staked` + `tokenInfo.symbol`（如 "4.0084 USDT"）
       - 法币价值：`stakedFiatValue`（如 "$4.0083"）
     - **右侧**：
       - 如果有可领取资产（`claimable > 0` 或 `rewards > 0` 或 `rewardNum` 有值），显示 "可领取" 徽章
       - 如果有溢出（`overflow > 0`），显示 "溢出" 徽章
     - **点击行为**：点击投资项跳转到协议详情页（`ProtocolDetailsV2`）

3. **数据过滤规则**：

   - 只显示 `staked > 0` 的投资项（过滤掉质押为 0 的项）
   - 只显示有投资项的协议（过滤掉 `investment` 数组全为 0 的协议）

4. **具体示例**：
   根据提供的 JSON 数据：

   - **Morpho 协议**：显示 2 个投资项（USDT 和 USDC，因为 DAI、WETH、cbBTC、USDC、WBTC 的 `staked` 都为 0）
   - **Everstake 协议**：显示 1 个投资项（SOL，因为 ETH、ATOM、POL 的 `staked` 都为 0）
   - **Lido 协议**：显示 1 个投资项（ETH，虽然数量极小但 `staked > 0`）
   - **Babylon、Falcon、Ethena 协议**：不显示（所有投资项的 `staked` 都为 0）

5. **数据流向**：
   ```
   /earn/v1/recommend
     ↓ (获取 accounts 列表)
   /earn/v1/investment/detail
     ↓ (返回 IEarnInvestmentItem[])
   数据处理 (过滤、分组)
     ↓
   SectionList 渲染
     ├─ Section Header (协议名称和图标)
     └─ Section Items (投资项列表)
   ```

### 9. 领取列表接口

#### 9.1 获取可领取列表

**接口：** `GET /earn/v1/claimable/list`

**方法：** `getClaimableList`

**调用时机：**

1. **主要调用路径**：

   ```
   协议详情页 (ProtocolDetailsV2)
     → 点击"领取"按钮 (onClaim)
       → useHandleClaim → 检查协议配置
         → 如果 claimWithTx === true，导航到 ClaimOptions 页面
           → ClaimOptions 页面加载时
             → getClaimableList
               → /earn/v1/claimable/list API
   ```

2. **具体触发时机**：

   - 用户在 **协议详情页**点击"领取"按钮
   - 协议配置了 `claimWithTx: true`（需要选择订单的协议）
   - 导航到 **ClaimOptions 页面**后，页面加载时自动调用
   - 使用 `usePromiseResult` 在页面加载时自动获取数据

3. **前置条件**：
   - 用户已选择账户和协议
   - 协议配置了 `claimWithTx: true`（如 Babylon 等协议）
   - 用户有可领取的奖励

**适用协议：**

主要适用于需要选择订单的协议：

- **Babylon BTC 协议**：需要选择具体的可领取订单
- **其他配置了 `claimWithTx: true` 的协议**

**入口：**

1. **协议详情页（ProtocolDetailsV2）**：

   - 点击协议详情页的"领取"按钮（`actions` 中 `type: "claim"` 的按钮）
   - 代码：`packages/kit/src/views/Staking/pages/ProtocolDetails/useHandleClaim.ts` 第 118-127 行
   - 检查条件：
     ```typescript
     if (stakingConfig.claimWithTx) {
       // 导航到 ClaimOptions 页面
       appNavigation.push(EModalStakingRoutes.ClaimOptions, { ... });
     }
     ```

2. **领取选项页面（ClaimOptions）**：
   - 页面加载时自动调用 `getClaimableList`
   - 代码：`packages/kit/src/views/Staking/pages/ClaimOptions/index.tsx` 第 41-51 行

**参数来源：**

```typescript
{
  networkId: string; // 从路由参数获取（ProtocolDetailsV2 → ClaimOptions）
  accountId: string; // 从路由参数获取
  symbol: string; // 从路由参数获取（tokenInfo.token.symbol）
  provider: string; // 从路由参数获取（protocolInfo.provider）
}
```

**参数构建过程：**

```typescript
// packages/kit-bg/src/services/ServiceStaking.ts (约第 760-782 行)
async getClaimableList(params: {
  networkId: string;
  accountId: string;
  symbol: string;
  provider: string;
}) {
  // 1. 获取账户信息
  const vault = await vaultFactory.getVault({ networkId, accountId });
  const acc = await vault.getAccount();

  // 2. 构建请求参数
  const requestParams = {
    networkId,
    accountAddress: acc.address,              // 从账户获取
    symbol: params.symbol,
    provider: params.provider,
    publicKey: networkUtils.isBTCNetwork(networkId) ? acc.pub : undefined,  // BTC 网络需要
  };

  // 3. 调用 API
  const resp = await client.get('/earn/v1/claimable/list', {
    params: requestParams,
  });
  return resp.data.data;  // 返回 IClaimableListResponse
}
```

**请求参数：**

```typescript
{
  networkId: string;              // 网络ID
  accountAddress: string;         // 账户地址（从账户获取）
  symbol: string;                 // 代币符号
  provider: string;               // 协议名称
  publicKey?: string;             // BTC 网络需要（公钥）
}
```

**响应结构（完整）：**

```typescript
IClaimableListResponse = {
  token: IToken;                  // 代币信息（用于显示）
  network?: {                     // 网络信息（可选）
    networkId: string;
    name: string;
    logoURI: string;
  };
  items: IClaimableListItem[];    // 可领取项列表
}

IClaimableListItem = {
  id: string;                     // ⭐ 订单ID（作为 identity 传递给领取接口）
  amount: string;                 // ⭐ 可领取金额（作为 amount 传递给领取接口）
  fiatValue?: string;             // 法币价值（可选，用于显示）
  isPending?: boolean;            // 是否待处理（可选）
  babylonExtra?: IBabylonPortfolioItem;  // Babylon 协议的额外信息（可选）
}

IBabylonPortfolioItem = {
  lockBlocks: number;            // 锁定区块数
  isOverflow: string;             // 是否溢出
}
```

**数据用途：**

1. **显示可领取订单列表**：

   - 在 `ClaimOptions` 页面使用 `OptionList` 组件显示
   - 每个订单项显示：金额、法币价值、状态等
   - 对于 BTC 网络，还会显示交易 ID（`item.id` 的缩短地址）

2. **用户选择订单后领取**：

   ```typescript
   // packages/kit/src/views/Staking/pages/ClaimOptions/index.tsx (约第 55-105 行)
   const onPress = useCallback(async ({ item }) => {
     await handleClaim({
       identity: item.id,        // 使用订单ID作为 identity
       amount: item.amount,      // 使用订单金额
       symbol,
       provider,
       vault: protocolInfo?.vault || '',
       stakingInfo: { ... },
       onSuccess: async (txs) => {
         // 对于 Babylon 协议，记录领取状态
         if (provider === 'babylon') {
           await backgroundApiProxy.serviceStaking.babylonClaimRecord({
             accountId,
             networkId,
             provider,
             symbol,
             identity: item.id,  // 使用订单ID
           });
         }
       },
     });
   }, [...]);
   ```

3. **后续处理流程**：
   ```
   getClaimableList 返回可领取订单列表
     ↓
   用户选择订单
     ↓
   useUniversalClaim 调用（传递 identity 和 amount）
     ↓
   buildClaimTransaction (/earn/v2/claim)
     ↓
   用户签名并发送交易
     ↓
   （Babylon 协议）babylonClaimRecord 记录领取状态
     ↓
   完成领取
   ```

**UI 显示：**

在 `ClaimOptions` 页面中：

- 使用 `OptionList` 组件显示订单列表
- 每个订单项显示：
  - 代币图标和名称（来自 `result.token`）
  - 可领取金额（`item.amount`）
  - 法币价值（`item.fiatValue`，如果存在）
  - 对于 BTC 网络，额外显示：
    - 状态：显示"可领取"
    - 交易 ID：显示 `item.id` 的缩短地址

**代码位置：**

- **接口实现**：`packages/kit-bg/src/services/ServiceStaking.ts` 第 760-782 行
- **调用位置**：`packages/kit/src/views/Staking/pages/ClaimOptions/index.tsx` 第 41-51 行
- **入口处理**：`packages/kit/src/views/Staking/pages/ProtocolDetails/useHandleClaim.ts` 第 118-127 行
- **UI 组件**：`packages/kit/src/views/Staking/pages/ClaimOptions/index.tsx` 第 138-174 行

**完整调用链：**

```
用户操作流程：
1. 协议详情页点击"领取"按钮
   ↓
2. useHandleClaim 检查协议配置
   ↓
3. 如果 claimWithTx === true，导航到 ClaimOptions 页面
   ↓
4. ClaimOptions 页面加载时调用 getClaimableList
   ↓
5. /earn/v1/claimable/list API 调用
   ↓
6. 返回可领取订单列表
   ↓
7. 用户选择订单
   ↓
8. 调用 useUniversalClaim（传递 identity 和 amount）
   ↓
9. buildClaimTransaction (/earn/v2/claim)
   ↓
10. 用户签名并发送交易
    ↓
11. （Babylon 协议）babylonClaimRecord 记录领取状态
    ↓
12. 完成领取
```

**注意事项：**

1. **仅在 `claimWithTx === true` 时使用**：

   - 需要检查 `stakingConfig.claimWithTx`
   - 目前主要适用于 Babylon BTC 协议

2. **订单 ID（identity）**：

   - `item.id` 会作为 `identity` 参数传递给 `buildClaimTransaction`
   - 对于 BTC 网络，`item.id` 可能是交易 ID

3. **Babylon 协议特殊处理**：

   - 领取成功后会调用 `babylonClaimRecord` 记录领取状态
   - 使用 `addBabylonTrackingItem` 添加跟踪项

4. **错误处理**：
   - 如果获取列表失败，页面会显示错误状态
   - 用户可以下拉刷新重试

#### 9.2 获取提取列表

**接口：** `GET /earn/v1/withdraw/list`

**方法：** `getWithdrawList`

**参数：** 同 `getClaimableList`

### 10. 其他接口

#### 10.1 获取交易确认信息

**接口：** `GET /earn/v1/transaction-confirmation`

**方法：** `getTransactionConfirmation`

**调用时机：**

1. **主要调用路径**：

   ```
   质押页面 (Stake) / 提取页面 (Withdraw)
     → 用户输入金额 (amountValue)
       → useEffect 监听 amountValue 变化
         → debouncedFetchTransactionConfirmation (防抖 350ms)
           → getTransactionConfirmation
             → /earn/v1/transaction-confirmation API
   ```

2. **具体触发时机**：

   - **质押页面（UniversalStake）**：

     - 用户输入质押金额时自动调用
     - 使用 `useEffect` 监听 `amountValue` 变化
     - 使用 `useDebouncedCallback` 防抖 350ms，避免频繁调用
     - 代码：`packages/kit/src/views/Staking/components/UniversalStake/index.tsx` 第 388 行

   - **提取页面（UniversalWithdraw）**：
     - 用户输入提取金额时自动调用
     - 使用 `useEffect` 监听 `amountValue` 变化
     - 使用 `useDebouncedCallback` 防抖 350ms
     - 代码：`packages/kit/src/views/Staking/components/UniversalWithdraw/index.tsx` 第 220-222 行

3. **前置条件**：

   - 用户已选择账户和协议
   - 用户在质押或提取页面输入金额
   - 金额不为空（即使是 '0' 也会调用）

**入口：**

1. **质押页面（UniversalStake）**：

   - 用户输入金额时自动调用
   - 代码：`packages/kit/src/views/Staking/components/UniversalStake/index.tsx` 第 230-263 行
   - 触发条件：
     - `amountValue` 变化
     - 防抖延迟 350ms

2. **提取页面（UniversalWithdraw）**：

   - 用户输入金额时自动调用
   - 代码：`packages/kit/src/views/Staking/components/UniversalWithdraw/index.tsx` 第 188-222 行
   - 触发条件：
     - `amountValue` 变化
     - 防抖延迟 350ms

**参数来源：**

```typescript
{
  networkId: string; // 从组件 props 获取
  provider: string; // 从组件 props 获取（providerName）
  symbol: string; // 从 tokenInfo.token.symbol 获取
  vault: string; // 从 protocolInfo.vault 或 protocolInfo.approve.approveTarget 获取（useVaultProvider 时）
  accountAddress: string; // 从 protocolInfo.earnAccount.accountAddress 获取（质押）或 props.accountAddress（提取）
  action: 'stake' | 'unstake' | 'claim'; // 固定值：'stake'（质押）或 'unstake'（提取）
  amount: string; // ⭐ 用户输入的金额（amountValue）
}
```

**参数构建过程：**

```typescript
// packages/kit-bg/src/services/ServiceStaking.ts (约第 618-636 行)
async getTransactionConfirmation(params: {
  networkId: string;
  provider: string;
  symbol: string;
  vault: string;
  accountAddress: string;
  action: 'stake' | 'unstake' | 'claim';
  amount: string;
}) {
  // 1. 验证并格式化金额
  const amountNumber = BigNumber(params.amount);
  params.amount = amountNumber.isNaN() ? '0' : amountNumber.toFixed();

  // 2. 调用 API
  const resp = await client.get<{
    data: IStakeTransactionConfirmation;
  }>(`/earn/v1/transaction-confirmation`, {
    params,
  });

  return resp.data.data;  // 返回 IStakeTransactionConfirmation
}

// 质押页面调用（UniversalStake）
fetchTransactionConfirmation = useCallback(
  async (amount: string) => {
    const resp = await backgroundApiProxy.serviceStaking.getTransactionConfirmation({
      networkId,
      provider: providerName,
      symbol: tokenInfo?.token.symbol || '',
      vault: useVaultProvider
        ? protocolInfo?.approve?.approveTarget || protocolInfo?.vault || ''
        : '',
      accountAddress: protocolInfo?.earnAccount?.accountAddress || '',
      action: ECheckAmountActionType.STAKING,  // 'stake'
      amount,
    });
    return resp;
  },
  [networkId, providerName, tokenInfo?.token.symbol, useVaultProvider, ...],
);

// 提取页面调用（UniversalWithdraw）
fetchTransactionConfirmation = useCallback(
  async (amount: string) => {
    const resp = await backgroundApiProxy.serviceStaking.getTransactionConfirmation({
      networkId: networkId || '',
      provider: providerName || '',
      symbol: tokenSymbol || '',
      vault: isMorphoProvider ? protocolVault || '' : '',  // 仅 Morpho 协议需要 vault
      accountAddress,
      action: ECheckAmountActionType.UNSTAKING,  // 'unstake'
      amount,
    });
    return resp;
  },
  [accountAddress, isMorphoProvider, protocolVault, networkId, ...],
);
```

**请求参数：**

```typescript
{
  networkId: string; // 网络ID
  provider: string; // 协议名称（如 "Lido", "Morpho", "Babylon"）
  symbol: string; // 代币符号（如 "ETH", "BTC"）
  vault: string; // 协议 Vault 地址（useVaultProvider 时，否则为空字符串）
  accountAddress: string; // 账户地址
  action: 'stake' | 'unstake' | 'claim'; // 操作类型
  amount: string; // 金额（已格式化为固定小数位）
}
```

**响应结构（完整）：**

```typescript
IStakeTransactionConfirmation = {
  title: IEarnText;               // ⭐ 标题文本（用于显示在交易确认区域顶部）
  tooltip?: IEarnTooltip;         // 提示信息（可选，点击问号图标显示）
  rewards: Array<{                // ⭐ 奖励列表（显示预期收益）
    title: IEarnText;             // 奖励项标题（如 "预期年化收益"）
    description: IEarnText;       // 奖励项描述（如金额或百分比）
    tooltip?: IEarnTooltip;       // 提示信息（可选）
  }>;
  receive: {                      // ⭐ 接收信息（显示交易后会收到什么）
    title: IEarnText;             // 接收项标题（如 "您将收到"）
    description: IEarnText;        // 接收项描述（如代币数量）
    tooltip: {                    // 提示信息（必填）
      type: 'text';
      data: {
        title: IEarnText;
      };
    };
  };
}

// 相关类型定义
IEarnText = {
  text: string;                   // 文本内容
  color?: string;                 // 文本颜色（可选）
  size?: FontSizeTokens;          // 文本大小（可选）
}

IEarnTooltip =
  | IEarnTextTooltip             // 文本提示
  | IEarnRebateTooltip;          // 返佣提示
  | ...;                          // 其他类型
```

**数据用途：**

1. **显示交易确认信息**：

   - 在 `UniversalStake` 和 `UniversalWithdraw` 组件中显示
   - 显示位置：金额输入框下方的交易确认区域（Accordion）
   - 显示内容：
     - **标题**：`transactionConfirmation.title`（带提示图标，如果存在 `tooltip`）
     - **奖励列表**：`transactionConfirmation.rewards`（显示预期收益）
     - **接收信息**：`transactionConfirmation.receive`（显示交易后会收到什么）

2. **实时更新**：

   - 用户输入金额时，实时调用接口获取最新的交易确认信息
   - 使用防抖机制（350ms），避免频繁调用
   - 确保用户看到的是基于当前输入金额的准确信息

3. **计算列表项**：

   ```typescript
   // packages/kit/src/views/Staking/components/UniversalStake/index.tsx (约第 910-931 行)
   // 在计算列表中添加 receive 信息
   if (transactionConfirmation?.receive) {
     items.push(
       <CalculationListItem>
         <CalculationListItem.Label
           size={transactionConfirmation.receive.title.size || '$bodyMd'}
           color={transactionConfirmation.receive.title.color}
           tooltip={
             transactionConfirmation.receive.tooltip.type === 'text'
               ? transactionConfirmation.receive.tooltip.data.title.text
               : undefined
           }
         >
           {transactionConfirmation.receive.title.text}
         </CalculationListItem.Label>
         <EarnText
           text={transactionConfirmation.receive.description}
           size="$bodyMdMedium"
         />
       </CalculationListItem>,
     );
   }
   ```

4. **显示奖励信息**：

   ```typescript
   // packages/kit/src/views/Staking/components/UniversalStake/index.tsx (约第 1137-1200 行)
   // 显示标题和奖励列表
   <YStack pt="$3.5" gap="$2">
     <XStack ai="center" gap="$1">
       <EarnText
         text={transactionConfirmation?.title}
         color="$textSubdued"
         size="$bodyMd"
       />
       {transactionConfirmation?.tooltip ? (
         <Popover
           title={transactionConfirmation?.title?.text}
           renderTrigger={<IconButton icon="InfoCircleOutline" />}
           renderContent={
             <EarnText
               text={
                 transactionConfirmation?.tooltip?.type === 'text'
                   ? transactionConfirmation.tooltip.data
                   : undefined
               }
             />
           }
         />
       ) : null}
     </XStack>
     {transactionConfirmation?.rewards.map((reward) => (
       <XStack key={reward.title.text}>
         <EarnText text={reward.title} />
         <EarnText text={reward.description} />
         {reward.tooltip ? <Popover>{/* 显示奖励提示信息 */}</Popover> : null}
       </XStack>
     ))}
   </YStack>
   ```

**UI 显示：**

在 `UniversalStake` 和 `UniversalWithdraw` 组件中：

1. **计算列表（CalculationList）**：

   - 在 Accordion 中显示
   - 包含 `receive` 信息（显示交易后会收到什么）
   - 显示在费用估算之前

2. **交易确认区域**：

   - 显示在 Accordion 底部（如果已展开）
   - 包含：
     - **标题**：`transactionConfirmation.title`（带提示图标）
     - **奖励列表**：`transactionConfirmation.rewards`（显示预期收益）
     - 每个奖励项可以有点击提示图标

**特殊处理：**

1. **防抖机制**：

   - 使用 `useDebouncedCallback` 防抖 350ms
   - 避免用户快速输入时频繁调用 API
   - 代码：`packages/kit/src/views/Staking/components/UniversalStake/index.tsx` 第 257-263 行

2. **金额格式化**：

   - 在服务端将金额格式化为固定小数位
   - 如果金额无效（NaN），设置为 '0'
   - 代码：`packages/kit-bg/src/services/ServiceStaking.ts` 第 628-629 行

3. **条件调用**：

   - 质押页面：无论金额是否为空都会调用（即使是 '0'）
   - 提取页面：无论金额是否为空都会调用（即使是 '0'）
   - 确保用户始终看到最新的交易确认信息

4. **Vault 参数处理**：

   - **质押页面**：如果 `useVaultProvider` 为 true，使用 `protocolInfo.approve.approveTarget` 或 `protocolInfo.vault`
   - **提取页面**：仅 Morpho 协议需要 `vault` 参数（`isMorphoProvider`）

5. **实时更新**：

   - 使用 `useEffect` 监听 `amountValue` 变化
   - 每次金额变化时，自动调用防抖函数获取最新信息

**完整调用链：**

```
用户操作流程：
1. 进入质押/提取页面
   ↓
2. 用户输入金额（amountValue）
   ↓
3. useEffect 检测到 amountValue 变化
   ↓
4. 调用 debouncedFetchTransactionConfirmation（防抖 350ms）
   ↓
5. getTransactionConfirmation
   ↓
6. /earn/v1/transaction-confirmation API 调用
   ↓
7. 返回交易确认信息（IStakeTransactionConfirmation）
   ↓
8. setTransactionConfirmation 更新状态
   ↓
9. 在 UI 中显示交易确认信息（标题、奖励列表、接收信息）
   ↓
10. （可选）用户点击提示图标，查看详细信息
```

**代码位置：**

- **接口实现**：`packages/kit-bg/src/services/ServiceStaking.ts` 第 618-636 行
- **调用位置**：
  - 质押页面：`packages/kit/src/views/Staking/components/UniversalStake/index.tsx` 第 230-263 行
  - 提取页面：`packages/kit/src/views/Staking/components/UniversalWithdraw/index.tsx` 第 188-222 行
- **UI 显示**：
  - UniversalStake：`packages/kit/src/views/Staking/components/UniversalStake/index.tsx` 第 910-931 行（receive），第 1137-1200 行（标题和奖励）
  - UniversalWithdraw：`packages/kit/src/views/Staking/components/UniversalWithdraw/index.tsx` 第 321-341 行（receive），第 450-520 行（标题和奖励）

**注意事项：**

1. **防抖延迟**：

   - 使用 350ms 防抖延迟
   - 避免用户快速输入时频繁调用 API
   - 提高性能和用户体验

2. **金额格式化**：

   - 服务端会将金额格式化为固定小数位
   - 如果金额无效（NaN），会自动设置为 '0'
   - 确保传递给 API 的金额格式正确

3. **Vault 参数**：

   - **质押页面**：仅在使用 Vault Provider 时传递 `vault` 参数
   - **提取页面**：仅 Morpho 协议需要 `vault` 参数
   - 其他协议传递空字符串

4. **实时更新**：

   - 每次金额变化时，都会自动调用接口获取最新信息
   - 确保用户看到的是基于当前输入金额的准确信息

5. **数据为空时**：

   - 如果 `transactionConfirmation` 为 `undefined`，不显示交易确认区域
   - 确保只有有数据时才显示

6. **工具提示**：

   - 支持在标题、奖励项、接收项中显示工具提示
   - 点击问号图标可以查看详细信息
   - 使用 `Popover` 组件显示提示内容

7. **操作类型**：

   - 支持三种操作类型：`'stake'`（质押）、`'unstake'`（提取）、`'claim'`（领取）
   - 目前代码中主要使用 `'stake'` 和 `'unstake'`
   - `'claim'` 可能用于未来功能

#### 10.2 获取 FAQ 列表

**接口：** `GET /earn/v1/faq/list`

**方法：** `getFAQListForHome` / `getFAQList`

**调用时机：**

1. **主要调用路径**：

   ```
   Earn 首页 (EarnHome)
     → 页面加载时
       → getFAQListForHome()
         → /earn/v1/faq/list API（无参数）

   协议详情页 (ProtocolDetailsV1)
     → 页面加载时
       → getFAQList({ provider, symbol })
         → /earn/v1/faq/list API（带参数）

   协议详情页 (ProtocolDetailsV2)
     → 从 /earn/v2/stake-protocol/detail 返回的 faqs 字段
       → 不需要单独调用此接口
   ```

2. **具体触发时机**：

   - **Earn 首页**：

     - 页面加载时自动调用 `getFAQListForHome()`
     - 使用 `usePromiseResult` 在页面加载时自动获取数据
     - 支持自动刷新（`revalidateOnFocus: true`，当标签页获得焦点时刷新）
     - 代码：`packages/kit/src/views/Earn/EarnHome.tsx` 第 728-744 行

   - **协议详情页 V1（ProtocolDetails）**：

     - 页面加载时自动调用 `getFAQList({ provider, symbol })`
     - 使用 `usePromiseResult` 在页面加载时自动获取数据
     - 代码：`packages/kit/src/views/Staking/components/ProtocolDetails/FaqSection.tsx` 第 173-185 行

   - **协议详情页 V2（ProtocolDetailsV2）**：
     - 不需要单独调用此接口
     - FAQ 数据从 `/earn/v2/stake-protocol/detail` 接口返回的 `faqs` 字段获取
     - 代码：`packages/kit/src/views/Staking/pages/ProtocolDetailsV2/index.tsx` 第 1192 行

3. **前置条件**：

   - **Earn 首页**：无需前置条件
   - **协议详情页 V1**：需要 `details` 数据存在（包含 `token.info.symbol` 和 `provider.name`）

**入口：**

1. **Earn 首页（EarnHome）**：

   - 页面加载时自动调用 `getFAQListForHome()`
   - 代码：`packages/kit/src/views/Earn/EarnHome.tsx` 第 728-744 行
   - 显示位置：
     - **桌面端**：右侧面板（`FAQPanel`）
     - **移动端**：在 `AvailableAssetsTabViewList` 组件底部显示

2. **协议详情页 V1（ProtocolDetails）**：

   - 页面加载时自动调用 `getFAQList({ provider, symbol })`
   - 代码：`packages/kit/src/views/Staking/components/ProtocolDetails/FaqSection.tsx` 第 173-185 行
   - 显示位置：协议详情页的 FAQ 区域

3. **协议详情页 V2（ProtocolDetailsV2）**：

   - 不需要单独调用此接口
   - FAQ 数据从协议详情接口返回的 `faqs` 字段获取
   - 代码：`packages/kit/src/views/Staking/pages/ProtocolDetailsV2/FAQSection.tsx`

**参数来源：**

```typescript
// getFAQListForHome() - 无参数
// 调用时不需要传递任何参数

// getFAQList() - 需要参数
{
  provider: string; // 从 details.provider.name 获取
  symbol: string; // 从 details.token.info.symbol 获取
}
```

**参数构建过程：**

```typescript
// packages/kit-bg/src/services/ServiceStaking.ts (约第 1315-1347 行)

// 1. getFAQListForHome - 无参数版本（带缓存）
_getFAQListForHome = memoizee(
  async () => {
    const client = await this.getClient(EServiceEndpointEnum.Earn);
    const resp = await client.get<{
      data: {
        list: IEarnFAQList;
      };
    }>(`/earn/v1/faq/list`);  // 无参数
    return resp.data.data.list;
  },
  {
    promise: true,
    maxAge: timerUtils.getTimeDurationMs({ minute: 1 }),  // 1 分钟缓存
  },
);

@backgroundMethod()
async getFAQListForHome() {
  return this._getFAQListForHome();
}

// 2. getFAQList - 带参数版本
@backgroundMethod()
async getFAQList(params: { provider: string; symbol: string }) {
  const client = await this.getClient(EServiceEndpointEnum.Earn);
  const resp = await client.get<{
    data: {
      list: IEarnFAQList;
    };
  }>(`/earn/v1/faq/list`, {
    params,  // 传递 provider 和 symbol
  });
  return resp.data.data.list;
}
```

**请求参数：**

```typescript
// getFAQListForHome() - 无参数
// GET /earn/v1/faq/list

// getFAQList() - 带参数
{
  provider?: string;  // 协议名称（可选）
  symbol?: string;     // 代币符号（可选）
}
```

**响应结构（完整）：**

```typescript
{
  data: {
    list: IEarnFAQList;  // FAQ 列表
  }
}

IEarnFAQList = IEarnFAQListItem[];

IEarnFAQListItem = {
  question: string;  // ⭐ 问题文本
  answer: string;    // ⭐ 答案文本
}

// 注意：在协议详情页 V2 中，FAQ 的结构不同
// 从 /earn/v2/stake-protocol/detail 返回的 faqs 字段：
{
  faqs?: {
    title: IEarnText;              // FAQ 标题
    items: IEarnFAQItem[];          // FAQ 项列表
  }
}

IEarnFAQItem = {
  title: IEarnText;        // 问题（IEarnText 格式）
  description: IEarnText;  // 答案（IEarnText 格式，支持富文本）
}
```

**数据用途：**

1. **Earn 首页显示**：

   - 在 `FAQPanel` 组件中显示
   - 代码：`packages/kit/src/views/Earn/components/FAQPanel.tsx`
   - 显示内容：
     - **标题**：`"常见问题"`（`ETranslations.global_faqs`）
     - **FAQ 列表**：使用 `Accordion` 组件显示，每个 FAQ 项可展开/折叠
     - **问题**：`question` 字段
     - **答案**：`answer` 字段（支持多行文本）

2. **协议详情页 V1 显示**：

   - 在 `FaqSection` 组件中显示
   - 代码：`packages/kit/src/views/Staking/components/ProtocolDetails/FaqSection.tsx`
   - 显示内容：
     - **标题**：`"常见问题"`（`ETranslations.global_faqs`）
     - **FAQ 列表**：使用 `Accordion` 组件显示
     - **问题**：`question` 字段
     - **答案**：`answer` 字段

3. **协议详情页 V2 显示**：

   - 在 `FAQSection` 组件中显示
   - 代码：`packages/kit/src/views/Staking/pages/ProtocolDetailsV2/FAQSection.tsx`
   - 显示内容：
     - **标题**：从 `faqs.title` 获取（`IEarnText` 格式）
     - **FAQ 列表**：使用 `Accordion` 组件显示
     - **问题**：`title.text` 字段（`IEarnText` 格式）
     - **答案**：`description` 字段（`IEarnText` 格式，支持富文本和操作）
     - **特殊功能**：支持在答案中执行操作（如跳转到交易页面）

**UI 显示：**

在 `FAQPanel` 组件中：

```typescript
// packages/kit/src/views/Earn/components/FAQPanel.tsx (约第 28-116 行)
export function FAQPanel({ faqList, isLoading = false }) {
  if (isLoading) {
    return <FAQPanelSkeleton />; // 加载骨架屏
  }

  if (!faqList?.length) {
    return null; // 如果没有数据，不显示
  }

  return (
    <YStack gap="$4">
      <SizableText size="$headingLg">
        {intl.formatMessage({ id: ETranslations.global_faqs })}
      </SizableText>
      <YStack>
        <Accordion type="multiple" gap="$2">
          {faqList.map(({ question, answer }, index) => (
            <Accordion.Item value={String(index)} key={String(index)}>
              <Accordion.Trigger>
                {({ open }) => (
                  <>
                    <SizableText
                      size="$headingSm"
                      color={open ? '$text' : '$textSubdued'}
                    >
                      {question}
                    </SizableText>
                    <Icon
                      name="ChevronDownSmallOutline"
                      rotate={open ? '180deg' : '0deg'}
                    />
                  </>
                )}
              </Accordion.Trigger>
              <Accordion.Content>
                <SizableText size="$bodyMd" whiteSpace="pre-line">
                  {answer}
                </SizableText>
              </Accordion.Content>
            </Accordion.Item>
          ))}
        </Accordion>
      </YStack>
    </YStack>
  );
}
```

在协议详情页 V2 的 `FAQSection` 组件中：

```typescript
// packages/kit/src/views/Staking/pages/ProtocolDetailsV2/FAQSection.tsx (约第 29-162 行)
export function FAQSection({ faqs, tokenInfo }) {
  const handleAction = useCallback(async (actionId: string) => {
    // 支持在答案中执行操作（如跳转到交易页面）
    if (actionId === 'trade_usdf') {
      // 跳转到交易页面
      navigation.pushModal(EModalRoutes.SwapModal, { ... });
    }
  }, [navigation, tokenInfo]);

  return faqs?.items?.length ? (
    <YStack gap="$6">
      <EarnText text={faqs.title} size="$headingLg" />
      <YStack>
        <Accordion type="multiple" gap="$2">
          {faqs.items.map(({ title, description }, index) => (
            <Accordion.Item value={String(index)} key={String(index)}>
              <Accordion.Trigger>
                {({ open }) => (
                  <>
                    <SizableText
                      size="$bodyLgMedium"
                      color={open ? '$text' : '$textSubdued'}
                    >
                      {title.text}
                    </SizableText>
                    <Icon name="ChevronDownSmallOutline" />
                  </>
                )}
              </Accordion.Trigger>
              <Accordion.Content>
                <EarnText
                  text={description}
                  size="$bodyMd"
                  onAction={handleAction}  // 支持操作
                />
              </Accordion.Content>
            </Accordion.Item>
          ))}
        </Accordion>
      </YStack>
    </YStack>
  ) : null;
}
```

**特殊处理：**

1. **缓存机制**：

   - `getFAQListForHome` 使用 `memoizee` 进行缓存
   - 缓存时间：1 分钟（`maxAge: timerUtils.getTimeDurationMs({ minute: 1 })`）
   - 减少不必要的 API 调用

2. **自动刷新**：

   - Earn 首页的 FAQ 列表支持自动刷新
   - 使用 `revalidateOnFocus: true`，当标签页获得焦点时自动刷新
   - 代码：`packages/kit/src/views/Earn/EarnHome.tsx` 第 742 行

3. **条件渲染**：

   - 如果 FAQ 列表为空，不显示 FAQ 组件
   - `FAQPanel` 和 `FaqSection` 都会检查列表长度

4. **协议详情页 V2 的特殊处理**：

   - 不需要单独调用 `/earn/v1/faq/list` 接口
   - FAQ 数据从 `/earn/v2/stake-protocol/detail` 接口返回的 `faqs` 字段获取
   - 支持富文本和操作（如跳转到交易页面）

5. **响应式显示**：

   - **桌面端**：FAQ 面板显示在右侧
   - **移动端**：FAQ 面板显示在 `AvailableAssetsTabViewList` 组件底部

**完整调用链：**

```
用户操作流程：

1. Earn 首页：
   进入 Earn 首页
     ↓
   页面加载时调用 getFAQListForHome()
     ↓
   /earn/v1/faq/list API（无参数）
     ↓
   返回 FAQ 列表
     ↓
   在 FAQPanel 组件中显示
     ↓
   （可选）标签页获得焦点时自动刷新

2. 协议详情页 V1：
   进入协议详情页（ProtocolDetails）
     ↓
   页面加载时调用 getFAQList({ provider, symbol })
     ↓
   /earn/v1/faq/list API（带参数）
     ↓
   返回协议相关的 FAQ 列表
     ↓
   在 FaqSection 组件中显示

3. 协议详情页 V2：
   进入协议详情页（ProtocolDetailsV2）
     ↓
   调用 /earn/v2/stake-protocol/detail
     ↓
   返回协议详情（包含 faqs 字段）
     ↓
   在 FAQSection 组件中显示（不需要单独调用 FAQ 接口）
```

**代码位置：**

- **接口实现**：
  - `getFAQListForHome`：`packages/kit-bg/src/services/ServiceStaking.ts` 第 1315-1334 行
  - `getFAQList`：`packages/kit-bg/src/services/ServiceStaking.ts` 第 1336-1347 行
- **调用位置**：
  - Earn 首页：`packages/kit/src/views/Earn/EarnHome.tsx` 第 728-744 行
  - 协议详情页 V1：`packages/kit/src/views/Staking/components/ProtocolDetails/FaqSection.tsx` 第 173-185 行
- **UI 组件**：
  - FAQPanel：`packages/kit/src/views/Earn/components/FAQPanel.tsx` 第 28-116 行
  - FaqSection（V1）：`packages/kit/src/views/Staking/components/ProtocolDetails/FaqSection.tsx` 第 168-188 行
  - FAQSection（V2）：`packages/kit/src/views/Staking/pages/ProtocolDetailsV2/FAQSection.tsx` 第 29-162 行

**注意事项：**

1. **两种调用方式**：

   - `getFAQListForHome()`：获取通用的 FAQ 列表（无参数，用于 Earn 首页）
   - `getFAQList({ provider, symbol })`：获取协议相关的 FAQ 列表（带参数，用于协议详情页 V1）

2. **协议详情页 V2 不需要单独调用**：

   - FAQ 数据从 `/earn/v2/stake-protocol/detail` 接口返回的 `faqs` 字段获取
   - 不需要单独调用 `/earn/v1/faq/list` 接口

3. **缓存机制**：

   - `getFAQListForHome` 使用 `memoizee` 进行缓存，缓存时间 1 分钟
   - `getFAQList` 不使用缓存，每次都重新获取

4. **自动刷新**：

   - Earn 首页的 FAQ 列表支持自动刷新（`revalidateOnFocus: true`）
   - 当标签页获得焦点时自动刷新

5. **响应式显示**：

   - **桌面端**：FAQ 面板显示在右侧
   - **移动端**：FAQ 面板显示在 `AvailableAssetsTabViewList` 组件底部

6. **富文本支持**：

   - 协议详情页 V2 的 FAQ 支持富文本（`IEarnText` 格式）
   - 支持在答案中执行操作（如跳转到交易页面）

7. **数据为空时不显示**：

   - 如果 FAQ 列表为空，不显示 FAQ 组件
   - 确保只有有数据时才显示 FAQ 区域

#### 10.3 获取收益摘要

**接口：** `GET /earn/v1/rebate`

**方法：** `getEarnSummary`

**调用时机：**

1. **主要调用路径**：

   ```
   投资详情页 (InvestmentDetails)
     → 页面加载时
       → 获取 accounts 列表
         → 找到 EVM 账户 (evmAccount)
           → getEarnSummary(evmAccount)
             → /earn/v1/rebate API
   ```

2. **具体触发时机**：

   - 用户在 **投资详情页**（InvestmentDetails）加载时
   - 前提条件：必须存在 EVM 账户（`evmAccount`）
   - 在获取投资详情（`fetchInvestmentDetail`）后调用
   - 使用 `usePromiseResult` 在页面加载时自动获取数据

3. **前置条件**：
   - 用户已选择账户
   - 存在 EVM 网络账户（`networkId === evmNetworkId`）
   - `earnAccount.accounts` 列表不为空

**入口：**

1. **投资详情页（InvestmentDetails）**：
   - 页面加载时自动调用 `getEarnSummary`
   - 代码：`packages/kit/src/views/Staking/pages/InvestmentDetails/index.tsx` 第 177-179 行
   - 调用条件：
     - 存在 `accounts` 列表
     - 存在 EVM 账户（`evmAccount`）

**参数来源：**

```typescript
// 从 evmAccount 获取参数
{
  accountAddress: string; // evmAccount.accountAddress
  networkId: string; // evmAccount.networkId (必须是 EVM 网络)
}
```

**参数构建过程：**

```typescript
// packages/kit/src/views/Staking/pages/InvestmentDetails/index.tsx (约第 149-179 行)
const { result } = usePromiseResult(async () => {
  // 1. 获取 accounts 列表
  const list = earnAccountOnNetwork.accounts;

  if (list.length > 0) {
    // 2. 获取投资详情
    const response = await fetchInvestmentDetail(list.map(...));

    // 3. 找到 EVM 账户
    const evmAccount = list.find((item) => item.networkId === evmNetworkId);

    // 4. 如果存在 EVM 账户，调用 getEarnSummary
    if (evmAccount) {
      const earnSummary = await backgroundApiProxy.serviceStaking.getEarnSummary(evmAccount);
      return {
        evmAccount,
        earnSummary,
        earnInvestmentItems: response,
      };
    }
  }

  return {
    earnSummary: undefined,
    evmAccount: undefined,
    earnInvestmentItems: [],
  };
}, [dependencies]);
```

**请求参数：**

```typescript
{
  accountAddress: string; // EVM 账户地址
  networkId: string; // EVM 网络ID（如 "evm--1" 表示 Ethereum 主网）
}
```

**响应结构（完整）：**

```typescript
IEarnSummary = {
  icon: IEarnIcon;              // ⭐ 图标信息（用于显示在顶部）
  title: IEarnText;              // ⭐ 标题文本（用于显示在顶部）
  alerts?: IEarnAlert[];         // 提示信息列表（可选）
  items: Array<{                 // ⭐ 收益摘要项列表
    title: IEarnText;            // 项标题（如 "已发放返佣"）
    description: IEarnText;      // 项描述（如金额或说明）
    tooltip?: IEarnTooltip;      // 提示信息（可选，点击问号图标显示）
    button?: IEarnActionIcon;    // 操作按钮（可选，如"查看历史"按钮）
  }>;
}

// 相关类型定义
IEarnIcon = {
  name: string;                  // 图标名称（如 "GiftOutline"）
  color?: string;                // 图标颜色（可选）
}

IEarnText = {
  text: string;                  // 文本内容
  color?: string;                 // 文本颜色（可选）
  size?: FontSizeTokens;          // 文本大小（可选）
}

IEarnTooltip =
  | IEarnTextTooltip             // 文本提示
  | IEarnRebateTooltip;          // 返佣提示（包含详细信息）

IEarnActionIcon =
  | IEarnHistoryActionIcon       // 历史记录按钮（可跳转到历史页面）
  | IEarnLinkActionIcon          // 链接按钮（可打开外部链接）
  | ...;                          // 其他类型
```

**数据用途：**

1. **显示收益摘要信息**：

   - 在 `InvestmentDetails` 页面的 `EarnOverview` 组件中显示
   - 代码：`packages/kit/src/views/Staking/pages/InvestmentDetails/index.tsx` 第 56-105 行
   - 显示内容：
     - **顶部**：图标 + 标题（如 "返佣奖励"）
     - **提示信息**：`alerts` 数组中的提示
     - **收益项列表**：`items` 数组中的每个项
       - 标题（如 "已发放返佣"）
       - 描述（如金额或说明）
       - 提示图标（如果有 `tooltip`）
     - **操作按钮**：第一个 `item` 的 `button`（如"查看历史"按钮）

2. **跳转到历史记录**：

   - 点击第一个 `item` 的 `button`（`IEarnHistoryActionIcon`）时
   - 导航到 `HistoryList` 页面，并设置 `filterType: 'rebate'`
   - 代码：`packages/kit/src/views/Staking/components/ProtocolDetails/EarnActionIcon.tsx` 第 493 行

3. **显示提示信息**：
   - 如果 `item.tooltip` 存在，显示问号图标
   - 点击问号图标时，显示 Popover 提示
   - 支持 `IEarnRebateTooltip` 类型，显示返佣详细信息

**UI 显示：**

在 `InvestmentDetails` 页面的 `EarnOverview` 组件中：

```typescript
// packages/kit/src/views/Staking/pages/InvestmentDetails/index.tsx (约第 56-105 行)
function EarnOverview({ earnSummary, onHistory }) {
  if (!earnSummary?.items?.length) {
    return null; // 如果没有数据，不显示
  }

  return (
    <YStack px="$5">
      {/* 1. 提示信息 */}
      <EarnAlert alerts={earnSummary.alerts} />

      {/* 2. 顶部：图标 + 标题 + 操作按钮 */}
      <XStack ai="center" jc="space-between" h={44}>
        <XStack ai="center" gap="$1.5">
          <EarnIcon size="$5" icon={earnSummary.icon} />
          <EarnText
            text={earnSummary.title}
            size="$bodyMdMedium"
            color="$textSubdued"
          />
        </XStack>
        <EarnActionIcon
          actionIcon={earnSummary.items[0].button} // 第一个项的按钮
          onHistory={onHistory}
        />
      </XStack>

      {/* 3. 收益项列表 */}
      <YStack>
        {earnSummary.items.map((item) => (
          <XStack ai="center" h="$10" jc="space-between" key={item.title.text}>
            <XStack gap="$1.5">
              <EarnText text={item.title} size="$bodyMd" />
              <EarnText
                text={item.description}
                size="$bodyMd"
                color="$textSubdued"
              />
              <EarnTooltip tooltip={item.tooltip} /> {/* 提示图标 */}
            </XStack>
          </XStack>
        ))}
      </YStack>

      <Divider my="$3" />
    </YStack>
  );
}
```

**特殊处理：**

1. **仅限 EVM 账户**：

   - 只有在找到 EVM 账户时才会调用此接口
   - 如果不存在 EVM 账户，`earnSummary` 为 `undefined`
   - 代码：`packages/kit/src/views/Staking/pages/InvestmentDetails/index.tsx` 第 176-179 行

2. **条件渲染**：

   - 如果 `earnSummary?.items?.length` 为 0 或不存在，`EarnOverview` 组件不显示
   - 代码：`packages/kit/src/views/Staking/pages/InvestmentDetails/index.tsx` 第 63-65 行

3. **历史记录过滤**：
   - 点击"查看历史"按钮时，会导航到 `HistoryList` 页面
   - 并设置 `filterType: 'rebate'`，仅显示返佣相关的历史记录
   - 代码：`packages/kit/src/views/Staking/components/ProtocolDetails/EarnActionIcon.tsx` 第 493 行

**完整调用链：**

```
用户操作流程：
1. 进入投资详情页（InvestmentDetails）
   ↓
2. 获取 earnAccount.accounts 列表
   ↓
3. 调用 fetchInvestmentDetail 获取投资详情
   ↓
4. 找到 EVM 账户（evmAccount）
   ↓
5. 如果存在 EVM 账户，调用 getEarnSummary(evmAccount)
   ↓
6. /earn/v1/rebate API 调用
   ↓
7. 返回收益摘要数据（IEarnSummary）
   ↓
8. 在 EarnOverview 组件中显示
   ↓
9. （可选）用户点击"查看历史"按钮，跳转到历史记录页面（filterType: 'rebate'）
```

**代码位置：**

- **接口实现**：`packages/kit-bg/src/services/ServiceStaking.ts` 第 137-155 行
- **调用位置**：`packages/kit/src/views/Staking/pages/InvestmentDetails/index.tsx` 第 177-179 行
- **UI 组件**：
  - EarnOverview：`packages/kit/src/views/Staking/pages/InvestmentDetails/index.tsx` 第 56-105 行
  - EarnIcon：`packages/kit/src/views/Staking/components/ProtocolDetails/EarnIcon.tsx`
  - EarnText：`packages/kit/src/views/Staking/components/ProtocolDetails/EarnText.tsx`
  - EarnTooltip：`packages/kit/src/views/Staking/components/ProtocolDetails/EarnTooltip.tsx`
  - EarnActionIcon：`packages/kit/src/views/Staking/components/ProtocolDetails/EarnActionIcon.tsx`

**注意事项：**

1. **仅限 EVM 账户**：

   - 此接口仅针对 EVM 网络账户调用
   - 如果用户没有 EVM 账户，`earnSummary` 为 `undefined`，不会显示收益摘要

2. **数据为空时不显示**：

   - 如果 `earnSummary?.items?.length` 为 0 或不存在，`EarnOverview` 组件不会渲染
   - 确保只有有数据时才显示收益摘要区域

3. **历史记录过滤**：

   - 点击"查看历史"按钮时，会导航到历史记录页面
   - 并设置 `filterType: 'rebate'`，仅显示返佣相关的历史记录
   - 在历史记录页面中，`filterType === 'rebate'` 时不会合并本地历史记录

4. **提示信息**：

   - `alerts` 数组中的提示信息会显示在顶部
   - `item.tooltip` 会在该项旁边显示问号图标，点击可查看详细信息
   - 支持多种提示类型（`IEarnTextTooltip`、`IEarnRebateTooltip` 等）

5. **操作按钮**：
   - 只有第一个 `item` 的 `button` 会显示在顶部
   - 支持多种按钮类型（历史记录、链接、领取等）
   - 点击按钮会触发相应的操作（如跳转到历史记录页面）

#### 10.4 获取 Babylon 解绑委托列表

**接口：** `GET /earn/v1/unbonding-delegation/list`

**方法：** `getUnbondingDelegationList`

**调用时机：**

1. **主要调用路径**：

   ```
   协议详情页 (ProtocolDetails - V1)
     → 页面加载时
       → usePromiseResult
         → getUnbondingDelegationList
           → /earn/v1/unbonding-delegation/list API
   ```

2. **具体触发时机**：

   - **协议详情页 V1（ProtocolDetails）**：
     - 页面加载时自动调用
     - 使用 `usePromiseResult` 在页面加载时自动获取数据
     - **条件**：需要 `earnAccount?.accountAddress` 存在
     - 如果账户地址不存在，返回空数组 `[]`
     - 支持自动刷新（`revalidateOnFocus: true`，当页面获得焦点时刷新）
     - 代码：`packages/kit/src/views/Staking/pages/ProtocolDetails/index.tsx` 第 79-91 行

3. **前置条件**：

   - 用户已选择账户和协议
   - `earnAccount?.accountAddress` 存在
   - 协议为 Babylon（主要用于 Babylon BTC 协议）

**入口：**

1. **协议详情页 V1（ProtocolDetails）**：

   - 页面加载时自动调用
   - 代码：`packages/kit/src/views/Staking/pages/ProtocolDetails/index.tsx` 第 79-91 行
   - 触发条件：
     - 页面加载时
     - `earnAccount?.accountAddress` 存在
     - 页面获得焦点时（`revalidateOnFocus: true`）

**参数来源：**

```typescript
{
  accountAddress: string; // 从 earnAccount.accountAddress 获取
  provider: string; // 从路由参数获取（provider）
  networkId: string; // 从路由参数获取（networkId）
  symbol: string; // 从路由参数获取（symbol）
}
```

**参数构建过程：**

```typescript
// packages/kit-bg/src/services/ServiceStaking.ts (约第 1254-1269 行)
async getUnbondingDelegationList(params: {
  accountAddress: string;
  provider: string;
  networkId: string;
  symbol: string;
}) {
  const client = await this.getClient(EServiceEndpointEnum.Earn);
  const resp = await client.get<{
    data: {
      delegations: IEarnUnbondingDelegationList;
    };
  }>(`/earn/v1/unbonding-delegation/list`, {
    params,
  });
  return resp.data.data.delegations;  // 返回解绑委托列表
}

// 协议详情页调用（ProtocolDetails）
const { result: unbondingDelegationList } = usePromiseResult(
  () =>
    earnAccount?.accountAddress
      ? backgroundApiProxy.serviceStaking.getUnbondingDelegationList({
          accountAddress: earnAccount?.accountAddress,
          symbol,
          networkId,
          provider,
        })
      : Promise.resolve([]),  // 如果账户地址不存在，返回空数组
  [earnAccount?.accountAddress, symbol, networkId, provider],
  { watchLoading: true, initResult: [], revalidateOnFocus: true },
);
```

**请求参数：**

```typescript
{
  accountAddress: string; // 账户地址
  provider: string; // 协议名称（如 "Babylon"）
  networkId: string; // 网络ID（如 "btc--0"）
  symbol: string; // 代币符号（如 "BTC"）
}
```

**响应结构（完整）：**

```typescript
IEarnUnbondingDelegationList = IEarnUnbondingDelegationListItem[];

IEarnUnbondingDelegationListItem = {
  amount: string;           // ⭐ 解绑委托的金额
  timestampLeft: number;   // ⭐ 剩余时间戳（秒数）
}
```

**数据用途：**

1. **显示提取请求信息**：

   - 在 `PortfolioSection` 组件中显示
   - 显示位置：协议详情页的投资组合区域
   - 显示内容：
     - **状态文本**：`"提取请求中"`（`ETranslations.earn_withdrawal_requested`）
     - **金额**：`pendingInactive`（待提取金额）
     - **工具提示**：显示解绑委托列表详情

2. **处理解绑委托列表**：

   ```typescript
   // packages/kit/src/views/Staking/components/ProtocolDetails/PortfolioSection.tsx (约第 800-825 行)
   let unbondingDelegationListResult: IUnbondingDelegationListItem[] = [];

   // 1. 如果 API 返回了数据，处理并转换
   if (
     Array.isArray(unbondingDelegationList) &&
     unbondingDelegationList.length > 0
   ) {
     unbondingDelegationListResult = unbondingDelegationList
       .filter((i) => Number(i.timestampLeft) > 0) // 过滤掉已过期的项
       .map(({ amount, timestampLeft }) => {
         const timestampLeftNumber = Number(timestampLeft);
         return {
           amount,
           timestampLeft: Math.ceil(timestampLeftNumber / 3600 / 24), // ⭐ 转换为天数
         };
       });
     portfolio.showDetailWithdrawalRequested = true; // ⭐ 标记显示详细提取请求
   }
   // 2. 如果没有 API 数据，但协议详情中有 pendingInactive，使用协议详情的数据
   else if (
     portfolio.pendingInactive &&
     Number(portfolio.pendingInactive) &&
     portfolio.pendingInactivePeriod &&
     Number(portfolio.pendingInactivePeriod)
   ) {
     unbondingDelegationListResult.push({
       amount: portfolio.pendingInactive,
       timestampLeft: portfolio.pendingInactivePeriod,
     });
   }
   ```

3. **显示工具提示内容**：

   ```typescript
   // packages/kit/src/views/Staking/components/ProtocolDetails/PortfolioSection.tsx (约第 516-560 行)
   {
     unbondingDelegationList?.length && pendingInactive ? (
       <PortfolioItem
         tokenImageUri={token.logoURI}
         tokenSymbol={token.symbol}
         amount={pendingInactive}
         statusText={intl.formatMessage({
           id: ETranslations.earn_withdrawal_requested,
         })}
         renderTooltipContent={
           <YStack p="$5" gap="$4">
             {showDetailWithdrawalRequested ? (
               // ⭐ 显示详细列表：每个解绑委托项
               <>
                 {unbondingDelegationList.map(
                   ({ amount, timestampLeft }, index) => (
                     <PendingInactiveItem
                       key={index}
                       tokenSymbol={token.symbol}
                       pendingInactive={amount}
                       pendingInactivePeriod={timestampLeft} // 天数
                     />
                   ),
                 )}
                 <SizableText size="$bodySm" color="$textSubdued">
                   {intl.formatMessage({
                     id: ETranslations.earn_staked_assets_available_after_period,
                   })}
                 </SizableText>
               </>
             ) : (
               // ⭐ 显示简单信息：最多 X 天
               <SizableText size="$bodyLg">
                 {intl.formatMessage(
                   {
                     id: ETranslations.earn_withdrawal_up_to_number_days,
                   },
                   {
                     number: unbondingDelegationList[0]?.timestampLeft || 1,
                   },
                 )}
               </SizableText>
             )}
           </YStack>
         }
       />
     ) : null;
   }
   ```

4. **PendingInactiveItem 组件**：

   ```typescript
   // packages/kit/src/views/Staking/components/ProtocolDetails/PortfolioSection.tsx (约第 233-262 行)
   function PendingInactiveItem({
     pendingInactive,
     pendingInactivePeriod,
     tokenSymbol,
   }) {
     return (
       <XStack jc="space-between">
         <NumberSizeableText
           size="$bodyLgMedium"
           formatter="balance"
           formatterOptions={{ tokenSymbol }}
         >
           {pendingInactive}
         </NumberSizeableText>
         <SizableText size="$bodyLgMedium">
           {intl.formatMessage(
             {
               id: ETranslations.earn_number_days_left,
             },
             { number: pendingInactivePeriod },
           )}
         </SizableText>
       </XStack>
     );
   }
   ```

**UI 显示：**

在 `PortfolioSection` 组件中：

1. **投资组合项**：

   - 显示在投资组合区域
   - 包含：
     - **代币图标**：代币 Logo
     - **金额**：`pendingInactive`（待提取金额）
     - **状态文本**：`"提取请求中"`（`ETranslations.earn_withdrawal_requested`）
     - **工具提示图标**：点击可查看详细信息

2. **工具提示内容**：

   - **详细模式**（`showDetailWithdrawalRequested: true`）：
     - 显示所有解绑委托项的列表
     - 每个项显示：金额 + 剩余天数
     - 底部显示说明文字："质押资产将在期间后可用"
   - **简单模式**（`showDetailWithdrawalRequested: false`）：
     - 显示："最多 X 天"

**特殊处理：**

1. **时间转换**：

   - API 返回的 `timestampLeft` 是秒数
   - 前端转换为天数：`Math.ceil(timestampLeftNumber / 3600 / 24)`
   - 代码：`packages/kit/src/views/Staking/components/ProtocolDetails/PortfolioSection.tsx` 第 811 行

2. **数据过滤**：

   - 过滤掉 `timestampLeft <= 0` 的项（已过期的解绑委托）
   - 代码：`packages/kit/src/views/Staking/components/ProtocolDetails/PortfolioSection.tsx` 第 806 行

3. **数据回退**：

   - 如果 API 返回的数据为空，但协议详情中有 `pendingInactive` 和 `pendingInactivePeriod`，使用协议详情的数据
   - 代码：`packages/kit/src/views/Staking/components/ProtocolDetails/PortfolioSection.tsx` 第 815-825 行

4. **显示条件**：

   - 只有当 `unbondingDelegationList?.length > 0` 且 `pendingInactive` 存在时才显示
   - 代码：`packages/kit/src/views/Staking/components/ProtocolDetails/PortfolioSection.tsx` 第 516 行

5. **自动刷新**：

   - 使用 `revalidateOnFocus: true`，当页面获得焦点时自动刷新数据
   - 确保用户看到最新的解绑委托状态

**完整调用链：**

```
用户操作流程：
1. 进入协议详情页 V1（ProtocolDetails）
   ↓
2. 页面加载时检测 earnAccount?.accountAddress
   ↓
3. 如果账户地址存在，调用 getUnbondingDelegationList
   ↓
4. /earn/v1/unbonding-delegation/list API 调用
   ↓
5. 返回解绑委托列表（IEarnUnbondingDelegationList）
   ↓
6. 处理数据：
   - 过滤掉已过期的项（timestampLeft <= 0）
   - 将秒数转换为天数
   - 设置 showDetailWithdrawalRequested = true
   ↓
7. 传递给 PortfolioSection 组件
   ↓
8. 在 UI 中显示提取请求信息
   ↓
9. （可选）用户点击工具提示图标，查看详细列表
```

**代码位置：**

- **接口实现**：`packages/kit-bg/src/services/ServiceStaking.ts` 第 1254-1269 行
- **调用位置**：`packages/kit/src/views/Staking/pages/ProtocolDetails/index.tsx` 第 79-91 行
- **数据处理**：`packages/kit/src/views/Staking/components/ProtocolDetails/PortfolioSection.tsx` 第 800-825 行
- **UI 显示**：
  - PortfolioSection：`packages/kit/src/views/Staking/components/ProtocolDetails/PortfolioSection.tsx` 第 516-560 行
  - PendingInactiveItem：`packages/kit/src/views/Staking/components/ProtocolDetails/PortfolioSection.tsx` 第 233-262 行

**注意事项：**

1. **协议支持**：

   - 主要用于 **Babylon BTC** 协议
   - 其他协议可能不支持此接口

2. **账户地址**：

   - 必须存在 `earnAccount?.accountAddress`
   - 如果账户地址不存在，返回空数组 `[]`

3. **时间格式**：

   - API 返回的 `timestampLeft` 是秒数（`number`）
   - 前端转换为天数：`Math.ceil(timestampLeft / 3600 / 24)`
   - 确保显示的是整数天数

4. **数据过滤**：

   - 过滤掉 `timestampLeft <= 0` 的项
   - 只显示仍在解绑期内的委托项

5. **数据回退**：

   - 如果 API 返回的数据为空，但协议详情中有 `pendingInactive`，使用协议详情的数据
   - 确保即使 API 失败，也能显示基本信息

6. **显示条件**：

   - 只有当 `unbondingDelegationList?.length > 0` 且 `pendingInactive` 存在时才显示
   - 避免显示空数据

7. **自动刷新**：

   - 使用 `revalidateOnFocus: true`
   - 当页面获得焦点时自动刷新数据
   - 确保用户看到最新的解绑委托状态

8. **工具提示**：

   - 支持详细模式和简单模式
   - 详细模式显示所有解绑委托项的列表
   - 简单模式显示最多天数

#### 10.5 获取 Babylon 投资组合列表

**接口：** `GET /earn/v1/portfolio/list`

**方法：** `getPortfolioList`

**调用时机：**

1. **主要调用路径**：

   ```
   协议详情页 (ProtocolDetailsV2)
     → 点击"投资组合"按钮 (onPortfolioDetails)
       → 导航到 PortfolioDetails 页面
         → 页面加载时
           → getPortfolioList
             → /earn/v1/portfolio/list API
   ```

2. **具体触发时机**：

   - 用户在 **协议详情页**点击"投资组合"按钮（`actions` 中 `type: "portfolio"` 的按钮）
   - 导航到 **PortfolioDetails 页面**后，页面加载时自动调用
   - 使用 `usePromiseResult` 在页面加载时自动获取数据
   - 同时调用 `getPendingActivationPortfolioList` 获取待激活的投资组合列表
   - 在 `BabylonTrackingAlert` 组件中也会调用，用于清理已完成的跟踪项

3. **前置条件**：
   - 用户已选择账户和协议
   - 协议支持投资组合功能（主要是 **Babylon BTC** 协议）
   - 协议启用了投资组合功能（`actions` 中包含 `type: "portfolio"` 的按钮）

**入口：**

1. **协议详情页（ProtocolDetailsV2）**：

   - 点击协议详情页的"投资组合"按钮（`actions` 中 `type: "portfolio"` 的按钮）
   - 代码：`packages/kit/src/views/Staking/components/ProtocolDetails/EarnActionIcon.tsx` 第 237-274 行
   - 按钮显示条件：
     - 后端返回的 `portfolios` 数据存在
     - `portfolios.button` 存在（表示启用投资组合功能）

2. **投资组合详情页（PortfolioDetails）**：

   - 页面加载时自动调用 `getPortfolioList`
   - 代码：`packages/kit/src/views/Staking/pages/PortfolioDetails/index.tsx` 第 168-185 行

3. **Babylon 跟踪提示（BabylonTrackingAlert）**：
   - 组件加载时调用，用于清理已完成的跟踪项
   - 代码：`packages/kit/src/views/Staking/components/BabylonTrackingAlert/index.tsx` 第 27-35 行

**参数来源：**

```typescript
IGetPortfolioParams = {
  accountId: string;              // 从路由参数获取（ProtocolDetailsV2 → PortfolioDetails）
  networkId: string;              // 从路由参数获取
  symbol: string;                  // 从路由参数获取（tokenInfo.token.symbol）
  provider: string;                // 从路由参数获取（protocolInfo.provider）
}
```

**参数构建过程：**

```typescript
// packages/kit-bg/src/services/ServiceStaking.ts (约第 516-537 行)
async getPortfolioList(params: IGetPortfolioParams) {
  const { networkId, accountId, ...rest } = params;

  // 1. 获取账户信息
  const vault = await vaultFactory.getVault({ networkId, accountId });
  const acc = await vault.getAccount();

  // 2. 构建请求参数
  const requestParams = {
    accountAddress: acc.address,
    networkId,
    publicKey: networkUtils.isBTCNetwork(networkId) ? acc.pub : undefined,  // BTC 网络需要公钥
    ...rest,  // symbol, provider
  };

  // 3. 调用 API
  const resp = await client.get<{ data: IBabylonPortfolioItem[] }>('/earn/v1/portfolio/list', {
    params: requestParams,
    headers: await this.backgroundApi.serviceAccountProfile._getWalletTypeHeader({ accountId }),
  });

  return resp.data.data;  // 返回 IBabylonPortfolioItem[]
}
```

**请求参数：**

```typescript
{
  accountAddress: string;        // 账户地址（从账户获取）
  networkId: string;             // 网络ID
  symbol: string;                // 代币符号
  provider: string;              // 协议名称（主要是 "Babylon"）
  publicKey?: string;            // BTC 网络需要公钥（从账户获取）
}
```

**响应结构（完整）：**

```typescript
IBabylonPortfolioItem[] = Array<{
  txId: string;                  // ⭐ 交易ID（用于跳转到交易详情）
  status: IBabylonPortfolioStatus; // ⭐ 状态（'active' | 'withdraw_requested' | 'claimable' | 'claimed'）
  amount: string;                // ⭐ 投资金额（用于显示）
  fiatValue: string;             // ⭐ 法币价值（用于显示）
  lockBlocks: number;            // 锁定区块数
  isOverflow: string;            // ⭐ 是否溢出（'true' | 'false'，用于判断状态）
  startTime?: number;            // 开始时间（可选，时间戳）
  endTime?: number;              // 结束时间（可选，时间戳）
}>

IBabylonPortfolioStatus =
  | 'active'                    // 活跃状态
  | 'withdraw_requested'        // 已请求提取
  | 'claimable'                 // 可领取
  | 'claimed'                   // 已领取
  | 'local_pending_activation'; // 本地待激活（客户端创建）
```

**数据用途：**

1. **显示投资组合列表**：

   - 在 `PortfolioDetails` 页面使用 `ListView` 组件显示
   - 每个投资组合项显示：
     - **状态标签**：根据 `status` 和 `isOverflow` 显示不同颜色的 Badge
     - **交易 ID**：可点击跳转到交易详情
     - **投资金额**：`amount` 和 `fiatValue`
     - **时间范围**：`startTime` 和 `endTime`（如果存在）
     - **锁定天数**：根据 `startTime` 和 `endTime` 计算

2. **合并待激活投资组合**：

   ```typescript
   // packages/kit/src/views/Staking/pages/PortfolioDetails/index.tsx (约第 193-197 行)
   const data = useMemo(() => {
     if (!result) return [];
     const [v1, , v3] = result;
     // v1: getPortfolioList 返回的列表
     // v3: getPendingActivationPortfolioList 返回的待激活列表
     return [...v3, ...v1]; // 待激活列表在前，已激活列表在后
   }, [result]);
   ```

3. **清理跟踪项**：

   ```typescript
   // packages/kit/src/views/Staking/components/BabylonTrackingAlert/index.tsx (约第 27-69 行)
   // 1. 获取投资组合列表
   const portfolioItems = await getPortfolioList({ ... });

   // 2. 获取跟踪项
   const trackingItems = await getBabylonTrackingItems({ ... });

   // 3. 检查质押项是否已在投资组合中
   stakeItems.forEach((stakeItem) => {
     const findStaked = portfolioItems.find((o) => o.txId === stakeItem.txId);
     if (findStaked) {
       removed.push(findStaked.txId);  // 如果已存在，标记为已移除
     }
   });

   // 4. 检查领取项是否已领取
   claimItems.forEach((claimItem) => {
     const findClaim = portfolioItems.find(
       (o) => o.txId === claimItem.txId && o.status === 'claimed',
     );
     if (findClaim) {
       removed.push(claimItem.txId);  // 如果已领取，标记为已移除
     }
   });

   // 5. 移除已完成的跟踪项
   if (removed.length > 0) {
     await removeBabylonTrackingItem({ txIds: uniq(removed) });
   }
   ```

4. **状态判断和显示**：

   ```typescript
   // packages/kit/src/views/Staking/utils/babylon.ts (约第 13-71 行)
   // 获取投资组合状态（考虑溢出）
   export const getBabylonPortfolioStatus = (
     item: IBabylonPortfolioItem,
   ): IBabylonStatus => {
     return item.isOverflow ? 'overflow' : item.status;
   };

   // 获取状态标签列表
   export const getBabylonPortfolioTags = (
     item: IBabylonPortfolioItem,
   ): IBabylonStatus[] => {
     // 正常状态
     if (!item.isOverflow) {
       switch (item.status) {
         case 'active':
           return ['active'];
         case 'withdraw_requested':
           return ['active', 'withdraw_requested']; // 同时显示两个标签
         case 'claimable':
           return ['claimable'];
         case 'claimed':
           return ['claimed'];
         case 'local_pending_activation':
           return ['local_pending_activation'];
         default:
           return [];
       }
     }
     // 溢出状态
     switch (item.status) {
       case 'active':
         return ['overflow']; // 溢出时显示 overflow 标签
       case 'withdraw_requested':
         return ['withdraw_requested'];
       // ... 其他状态
     }
   };
   ```

**UI 显示：**

在 `PortfolioDetails` 页面中：

```typescript
// packages/kit/src/views/Staking/pages/PortfolioDetails/index.tsx (约第 52-157 行)
const PortfolioItem = ({ item, network }) => {
  // 1. 计算锁定天数
  const day = Math.floor(
    Math.max(1, (item.endTime ?? 0) - (item.startTime ?? 0)) /
      (1000 * 60 * 60 * 24),
  );

  // 2. 格式化日期
  const startDate = formatDate(new Date(Number(item.startTime)), {
    hideTimeForever: true,
  });
  const endDate = formatDate(new Date(Number(item.endTime)), {
    hideTimeForever: true,
  });

  return (
    <Stack>
      {/* 顶部：状态标签 + 交易ID */}
      <XStack>
        {getBabylonPortfolioTags(item).map((tag) => (
          <Badge key={tag} badgeType={statusBadgeType[tag] ?? 'default'}>
            {statusMap[tag]} // 状态文本（如 "活跃"、"溢出"）
          </Badge>
        ))}
        {item.txId ? (
          <Button
            onPress={() =>
              openTransactionDetailsUrl({ networkId, txid: item.txId })
            }
          >
            {accountUtils.shortenAddress({ address: item.txId })}
          </Button>
        ) : null}
      </XStack>

      {/* 中间：代币图标 + 金额 */}
      <XStack>
        <Token tokenImageUri={network?.logoURI} />
        <Stack>
          <SizableText size="$headingLg">
            {item.amount} {network?.symbol ?? ''}
          </SizableText>
          <NumberSizeableText
            formatter="value"
            formatterOptions={{ currency: symbol }}
          >
            {item.fiatValue}
          </NumberSizeableText>
        </Stack>
      </XStack>

      {/* 底部：时间范围 + 锁定天数 */}
      {item.startTime && item.endTime ? (
        <XStack>
          <SizableText>
            {startDate} - {endDate}
          </SizableText>
          <SizableText>
            {day} {intl.formatMessage({ id: ETranslations.global_days })}
          </SizableText>
        </XStack>
      ) : null}
    </Stack>
  );
};
```

**状态标签颜色：**

```typescript
const statusBadgeType: Record<IBabylonStatus, BadgeType> = {
  'active': 'success', // 绿色（活跃）
  'withdraw_requested': 'warning', // 黄色（已请求提取）
  'overflow': 'critical', // 红色（溢出）
  'claimable': 'info', // 蓝色（可领取）
  'claimed': 'default', // 灰色（已领取）
  'local_pending_activation': 'default', // 灰色（待激活）
};
```

**特殊处理：**

1. **合并待激活列表**：

   - 同时调用 `getPortfolioList` 和 `getPendingActivationPortfolioList`
   - 将待激活列表放在前面，已激活列表放在后面
   - 确保用户可以看到所有投资组合（包括待激活的）

2. **状态判断逻辑**：

   - 如果 `isOverflow === 'true'` 且 `status === 'active'`，显示 `overflow` 标签
   - 如果 `status === 'withdraw_requested'`，同时显示 `active` 和 `withdraw_requested` 标签
   - 其他状态直接显示对应的标签

3. **跟踪项清理**：

   - 在 `BabylonTrackingAlert` 组件中，使用投资组合列表来清理已完成的跟踪项
   - 如果质押项已在投资组合中，或领取项已领取，则从跟踪列表中移除

4. **BTC 网络特殊处理**：
   - 如果是 BTC 网络，需要传递 `publicKey` 参数
   - 从账户的 `acc.pub` 获取公钥

**完整调用链：**

```
用户操作流程：
1. 协议详情页点击"投资组合"按钮
   ↓
2. 导航到 PortfolioDetails 页面
   ↓
3. 页面加载时调用 getPortfolioList 和 getPendingActivationPortfolioList
   ↓
4. /earn/v1/portfolio/list API 调用
   ↓
5. 返回投资组合列表（IBabylonPortfolioItem[]）
   ↓
6. 合并待激活列表和已激活列表
   ↓
7. 在 ListView 中显示
   ↓
8. （可选）用户点击交易ID，跳转到交易详情页
```

**代码位置：**

- **接口实现**：`packages/kit-bg/src/services/ServiceStaking.ts` 第 516-537 行
- **调用位置**：
  - PortfolioDetails：`packages/kit/src/views/Staking/pages/PortfolioDetails/index.tsx` 第 168-185 行
  - BabylonTrackingAlert：`packages/kit/src/views/Staking/components/BabylonTrackingAlert/index.tsx` 第 27-35 行
- **UI 组件**：
  - PortfolioDetails：`packages/kit/src/views/Staking/pages/PortfolioDetails/index.tsx` 第 161-235 行
  - PortfolioItem：`packages/kit/src/views/Staking/pages/PortfolioDetails/index.tsx` 第 52-157 行
- **工具函数**：
  - getBabylonPortfolioStatus：`packages/kit/src/views/Staking/utils/babylon.ts` 第 13-15 行
  - getBabylonPortfolioTags：`packages/kit/src/views/Staking/utils/babylon.ts` 第 36-71 行

**注意事项：**

1. **仅限 Babylon 协议**：

   - 此接口主要用于 **Babylon BTC** 协议
   - 其他协议可能不支持投资组合功能

2. **BTC 网络需要公钥**：

   - 如果是 BTC 网络，必须传递 `publicKey` 参数
   - 从账户的 `acc.pub` 获取

3. **状态判断**：

   - `isOverflow` 字段用于判断是否溢出
   - 如果 `isOverflow === 'true'` 且 `status === 'active'`，显示 `overflow` 标签
   - `withdraw_requested` 状态会同时显示 `active` 和 `withdraw_requested` 标签

4. **时间字段**：

   - `startTime` 和 `endTime` 是可选字段
   - 如果存在，会显示时间范围和锁定天数
   - 如果不存在，不显示时间信息

5. **合并待激活列表**：

   - 待激活列表（`getPendingActivationPortfolioList`）会放在前面
   - 已激活列表（`getPortfolioList`）会放在后面
   - 确保用户可以看到所有投资组合（包括待激活的）

6. **跟踪项清理**：
   - 在 `BabylonTrackingAlert` 组件中，使用投资组合列表来清理已完成的跟踪项
   - 如果质押项已在投资组合中，或领取项已领取，则从跟踪列表中移除
   - 超过 3 天的跟踪项也会被清理

#### 10.6 获取 Lido ETH Permit 消息数据

**接口：** `POST /earn/v1/lido-eth/tx/permit_message`

**方法：** `buildLidoEthPermitMessageData`

**参数：**

```typescript
{
  amount: string;
  accountId: string;
  networkId: string;
}
```

**请求体：**

```typescript
{
  amount: string;
  accountAddress: string;
  networkId: string;
}
```

**响应结构：**

```typescript
{
  message: string; // 签名消息
  deadline: number; // 过期时间
}
```

#### 10.7 提交订单状态

**接口：** `POST /earn/v1/orders`

**方法：** `updateEarnOrderStatusToServer`

**调用时机：**

1. **主要调用路径**：

   ```
   质押成功 (handleStakeSuccess)
     → addEarnOrder
       → updateEarnOrderStatusToServer
         → /earn/v1/orders API（添加订单时）

   交易历史刷新 (ServiceHistory.fetchAccountHistory)
     → 检测到交易状态变化
       → updateEarnOrder
         → updateEarnOrderStatusToServer
           → /earn/v1/orders API（更新订单状态时）
   ```

2. **具体触发时机**：

   - **添加订单时（`addEarnOrder`）**：

     - 用户完成质押交易后，在 `handleStakeSuccess` 中调用
     - 先将订单保存到本地数据库（`simpleDb.earnOrders.addOrder`）
     - 然后调用 `updateEarnOrderStatusToServer` 同步到服务器
     - 如果同步失败，会记录错误日志，但不影响本地保存
     - 代码：`packages/kit/src/views/Staking/hooks/useUniversalHooks.ts` 第 49-54 行

   - **更新订单状态时（`updateEarnOrder`）**：

     - 交易历史服务（`ServiceHistory.fetchAccountHistory`）检测到交易状态变化时调用
     - 遍历所有状态变化的交易，查找对应的订单
     - 如果订单存在且状态不是 `Pending`，更新订单状态并同步到服务器
     - 代码：`packages/kit-bg/src/services/ServiceHistory.ts` 第 376-380 行

   - **单独更新订单状态时（`updateSingleEarnOrderStatus`）**：
     - 直接调用 `updateEarnOrderStatusToServer` 更新单个订单状态
     - 代码：`packages/kit-bg/src/services/ServiceStaking.ts` 第 1470-1474 行

3. **前置条件**：

   - 订单已保存在本地数据库（通过 `simpleDb.earnOrders`）
   - 订单有有效的 `orderId`、`networkId` 和 `txId`

**入口：**

1. **质押成功（handleStakeSuccess）**：

   - 用户完成质押交易后自动调用
   - 代码：`packages/kit/src/views/Staking/hooks/useUniversalHooks.ts` 第 32-57 行
   - 触发条件：
     - 交易成功完成
     - `stakeInfo.orderId` 存在
     - `data[0].signedTx?.txid` 存在

2. **交易历史刷新（ServiceHistory.fetchAccountHistory）**：

   - 交易历史服务检测到交易状态变化时自动调用
   - 代码：`packages/kit-bg/src/services/ServiceHistory.ts` 第 356-381 行
   - 触发条件：
     - 本地待处理交易的状态发生变化（从 `Pending` 变为其他状态）
     - 找到对应的订单（通过 `txId` 查找）

3. **单独更新（updateSingleEarnOrderStatus）**：

   - 直接调用 `updateSingleEarnOrderStatus`
   - 代码：`packages/kit-bg/src/services/ServiceStaking.ts` 第 1470-1474 行

**参数来源：**

```typescript
{
  order: IEarnOrderItem; // 从本地数据库获取的订单信息
}

// IEarnOrderItem 结构
IEarnOrderItem = {
  orderId: string;        // 订单ID（从 buildStakeTransaction 返回的 orderId）
  networkId: string;      // 网络ID
  txId: string;          // 交易ID（从交易签名后返回的 txid）
  previousTxIds: string[]; // 历史交易ID列表（用于交易替换）
  status: EDecodedTxStatus; // 交易状态（Pending | Confirmed | Failed）
  updatedAt: number;      // 更新时间戳
  createdAt: number;      // 创建时间戳
}
```

**参数构建过程：**

```typescript
// packages/kit-bg/src/services/ServiceStaking.ts (约第 1505-1526 行)
async updateEarnOrderStatusToServer({ order }: { order: IEarnOrderItem }) {
  const maxRetries = 3;
  let lastError;

  // 重试机制：最多重试 3 次
  for (let i = 0; i < maxRetries; i += 1) {
    try {
      const client = await this.getClient(EServiceEndpointEnum.Earn);
      await client.post('/earn/v1/orders', {
        orderId: order.orderId,    // 订单ID
        networkId: order.networkId, // 网络ID
        txId: order.txId,          // 交易ID
      });
      return; // 成功时提前返回
    } catch (error) {
      lastError = error;
      if (i === maxRetries - 1) break; // 最后一次重试后退出循环
      await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1))); // 1s, 2s, 3s
    }
  }

  throw lastError; // 所有重试失败后抛出错误
}

// 添加订单时调用（addEarnOrder）
async addEarnOrder(order: IAddEarnOrderParams) {
  defaultLogger.staking.order.addOrder(order);
  // 1. 先保存到本地数据库
  await simpleDb.earnOrders.addOrder(order);
  try {
    // 2. 同步到服务器
    await this.updateEarnOrderStatusToServer({
      order: order as IEarnOrderItem,
    });
  } catch (e) {
    // 如果同步失败，忽略错误，继续执行
    defaultLogger.staking.order.updateOrderStatusError({
      txId: order.txId,
      status: order.status,
    });
  }
}

// 更新订单状态时调用（updateEarnOrder）
async updateEarnOrder({ txs }: { txs: IChangedPendingTxInfo[] }) {
  for (const tx of txs) {
    try {
      // 1. 通过 txId 查找订单
      const order = await this.backgroundApi.simpleDb.earnOrders.getOrderByTxId(tx.txId);
      // 2. 如果订单存在且状态不是 Pending，更新状态
      if (order && tx.status !== EDecodedTxStatus.Pending) {
        order.status = tx.status;
        // 3. 同步到服务器
        await this.updateEarnOrderStatusToServer({ order });
        // 4. 更新本地数据库
        await this.backgroundApi.simpleDb.earnOrders.updateOrderStatusByTxId({
          currentTxId: tx.txId,
          status: tx.status,
        });
        defaultLogger.staking.order.updateOrderStatus({
          txId: tx.txId,
          status: tx.status,
        });
      }
    } catch (e) {
      // 忽略错误，继续处理下一个交易
      defaultLogger.staking.order.updateOrderStatusError({
        txId: tx.txId,
        status: tx.status,
      });
    }
  }
}

// 质押成功时调用（handleStakeSuccess）
const handleStakeSuccess = async ({ data, stakeInfo, networkId, onSuccess }) => {
  if (
    Array.isArray(data) &&
    data.length === 1 &&
    data[0].signedTx?.txid &&
    stakeInfo.orderId  // ⭐ 必须有 orderId
  ) {
    await backgroundApiProxy.serviceStaking.addEarnOrder({
      orderId: stakeInfo.orderId,  // ⭐ 从 buildStakeTransaction 返回
      networkId,
      txId: data[0].signedTx.txid, // ⭐ 交易签名后的 txid
      status: data[0].decodedTx.status, // ⭐ 交易状态（通常是 Pending）
    });
  }
  onSuccess?.(data);
};
```

**请求参数：**

```typescript
{
  orderId: string; // 订单ID（从 buildStakeTransaction 返回的 orderId）
  networkId: string; // 网络ID
  txId: string; // 交易ID（从交易签名后返回的 txid）
}
```

**响应结构：**

```typescript
// 接口成功时返回空响应（或成功状态码）
// 接口失败时会抛出错误，触发重试机制
```

**数据用途：**

1. **订单状态同步**：

   - 将本地订单状态同步到服务器
   - 服务器可以跟踪订单的完整生命周期
   - 支持订单状态的查询和统计

2. **订单跟踪**：

   - 服务器可以通过 `orderId` 和 `txId` 关联订单和交易
   - 支持订单状态的实时查询
   - 支持订单历史记录

3. **数据一致性**：

   - 确保本地和服务器端的订单状态一致
   - 支持订单状态的实时同步

**特殊处理：**

1. **重试机制**：

   ```typescript
   // packages/kit-bg/src/services/ServiceStaking.ts (约第 1505-1526 行)
   const maxRetries = 3;
   for (let i = 0; i < maxRetries; i += 1) {
     try {
       await client.post('/earn/v1/orders', { ... });
       return; // 成功时提前返回
     } catch (error) {
       lastError = error;
       if (i === maxRetries - 1) break;
       await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1))); // 1s, 2s, 3s
     }
   }
   ```

   - **最多重试 3 次**：如果第一次调用失败，会重试最多 3 次
   - **重试间隔**：1s、2s、3s（递增延迟）
   - **失败处理**：如果所有重试都失败，会抛出最后一个错误

2. **错误处理**：

   - **添加订单时**：如果同步失败，会记录错误日志，但不影响本地保存
   - **更新订单时**：如果同步失败，会记录错误日志，但继续处理下一个交易
   - **错误日志**：使用 `defaultLogger.staking.order.updateOrderStatusError` 记录错误

3. **状态过滤**：

   - 只有当交易状态不是 `Pending` 时，才会更新订单状态
   - 避免频繁更新 `Pending` 状态的订单
   - 代码：`packages/kit-bg/src/services/ServiceStaking.ts` 第 1482 行

4. **本地数据库同步**：

   - 先更新本地数据库，再同步到服务器
   - 如果服务器同步失败，本地数据仍然保持最新
   - 下次同步时会再次尝试同步

5. **订单查找**：

   - 通过 `txId` 查找订单（使用 `txIdToOrderIdMap` 映射）
   - 如果找不到订单，跳过更新
   - 支持交易替换（`newTxId` 更新）

**完整调用链：**

```
用户操作流程：

1. 添加订单：
   用户完成质押交易
     ↓
   handleStakeSuccess 检测到交易成功
     ↓
   addEarnOrder({ orderId, networkId, txId, status })
     ↓
   simpleDb.earnOrders.addOrder (保存到本地数据库)
     ↓
   updateEarnOrderStatusToServer (同步到服务器)
     ↓
   /earn/v1/orders API 调用（重试机制）
     ↓
   （可选）如果失败，记录错误日志

2. 更新订单状态：
   交易历史服务刷新
     ↓
   ServiceHistory.fetchAccountHistory 检测到交易状态变化
     ↓
   updateEarnOrder({ txs: changedPendingTxInfos })
     ↓
   遍历每个交易，通过 txId 查找订单
     ↓
   如果订单存在且状态不是 Pending
     ↓
   updateEarnOrderStatusToServer (同步到服务器)
     ↓
   /earn/v1/orders API 调用（重试机制）
     ↓
   simpleDb.earnOrders.updateOrderStatusByTxId (更新本地数据库)
     ↓
   （可选）如果失败，记录错误日志，继续处理下一个交易
```

**代码位置：**

- **接口实现**：`packages/kit-bg/src/services/ServiceStaking.ts` 第 1505-1526 行
- **添加订单**：`packages/kit-bg/src/services/ServiceStaking.ts` 第 1453-1467 行
- **更新订单**：`packages/kit-bg/src/services/ServiceStaking.ts` 第 1477-1502 行
- **调用位置**：
  - 质押成功：`packages/kit/src/views/Staking/hooks/useUniversalHooks.ts` 第 32-57 行
  - 交易历史刷新：`packages/kit-bg/src/services/ServiceHistory.ts` 第 356-381 行
- **本地数据库**：`packages/kit-bg/src/dbs/simple/entity/SimpleDbEntityEarnOrders.ts`

**注意事项：**

1. **重试机制**：

   - 最多重试 3 次，重试间隔为 1s、2s、3s
   - 如果所有重试都失败，会抛出最后一个错误
   - 确保在网络不稳定时也能成功同步

2. **错误处理**：

   - 添加订单时，如果同步失败，不会影响本地保存
   - 更新订单时，如果同步失败，会记录错误日志，但继续处理下一个交易
   - 使用 `defaultLogger.staking.order.updateOrderStatusError` 记录错误

3. **状态过滤**：

   - 只有当交易状态不是 `Pending` 时，才会更新订单状态
   - 避免频繁更新 `Pending` 状态的订单
   - 减少不必要的 API 调用

4. **订单查找**：

   - 通过 `txId` 查找订单（使用 `txIdToOrderIdMap` 映射）
   - 如果找不到订单，跳过更新
   - 支持交易替换（`newTxId` 更新）

5. **数据一致性**：

   - 先更新本地数据库，再同步到服务器
   - 如果服务器同步失败，本地数据仍然保持最新
   - 下次同步时会再次尝试同步

6. **订单 ID 来源**：

   - 订单 ID 从 `buildStakeTransaction` 返回的 `orderId` 获取
   - 只有支持订单跟踪的协议才会返回 `orderId`
   - 如果 `orderId` 不存在，不会调用此接口

7. **交易 ID 来源**：

   - 交易 ID 从交易签名后返回的 `txid` 获取
   - 必须在交易成功发送后才能获取
   - 如果交易失败，不会调用此接口

8. **本地数据库**：

   - 订单信息保存在 `simpleDb.earnOrders` 中
   - 支持通过 `txId` 查找订单
   - 支持订单状态的更新和查询

#### 10.8 查询邀请码

**接口：** `GET /earn/v1/account/invite-code/query`

**方法：** `queryInviteCodeByAddress`

**参数：**

```typescript
{
  networkId: string;
  accountAddress: string;
}
```

**响应结构：**

```typescript
{
  data: {
    referCode: string;
  }
}
```

#### 10.9 检查邀请码

**接口：** `GET /earn/v1/account/invite-code/check`

**方法：** `checkInviteCode`

**参数：**

```typescript
{
  inviteCode: string;
}
```

**响应结构：**

```typescript
{
  code: number; // 0 表示有效
}
```

#### 10.10 Ethena KYC 状态检查

**接口：** `POST /earn/v1/sumsub/status`

**方法：** `checkEthenaKycStatusByAccounts`

**参数：**

```typescript
{
  accounts: Array<{
    accountAddress: string;
    networkId: string;
  }>;
}
```

**响应结构：**

```typescript
{
  data: Array<{
    networkId: string;
    accountAddress: string;
    kycVerifyStatus: 'none' | 'pending' | 'verified' | 'rejected';
  }>;
}
```

### 11. Banner 接口（Utility 端点）

#### 11.1 获取首页 Banner

**接口：** `GET /utility/v1/earn-banner/list`

**端点：** `EServiceEndpointEnum.Utility`

**方法：** `fetchEarnHomePageData`

**响应结构：**

```typescript
IDiscoveryBanner[] = Array<{
  bannerId: string;
  title: string;
  src: string;
  href: string;
  hrefType: string;               // 'external' | 'internal'
  rank: number;
  useSystemBrowser: boolean;
  theme?: 'light' | 'dark';
}>
```

**缓存策略：**

- 缓存时间：60 秒

## 请求/响应格式

### 通用请求格式

所有 API 请求使用以下格式：

```typescript
// GET 请求
client.get<ResponseType>('/path', {
  params: { ... },
  headers?: { ... }
});

// POST 请求
client.post<ResponseType>('/path', {
  ...body,
  headers?: { ... }
});
```

### 通用响应格式

```typescript
{
  data: {
    data: T;                     // 实际数据
  };
  // 或
  code: string | number;
  message?: string;
  data: T;
}
```

### 错误响应格式

```typescript
{
  code: string | number;         // 非 0 表示错误
  message: string;              // 错误消息
  requestId?: string;           // 请求ID（用于追踪）
}
```

## 错误处理

### 错误类型

1. **OneKeyServerApiError**

   - API 返回错误码非 0
   - 自动显示 Toast 提示

2. **OneKeyLocalError**

   - 本地参数验证失败
   - 配置缺失等

3. **网络错误**
   - 自动重试机制（部分接口）

### 错误处理示例

```typescript
handleServerError(data: {
  code?: string | number;
  message?: string;
  requestId?: string;
}) {
  if (data.code !== undefined && Number(data.code) !== 0 && data.message) {
    throw new OneKeyServerApiError({
      autoToast: true,
      disableFallbackMessage: true,
      code: Number(data.code),
      message: data.message,
      requestId: data.requestId,
    });
  }
}
```

## 数据缓存

### 缓存策略

使用 `memoizee` 实现 API 响应缓存：

1. **协议列表**

   - 缓存时间：5 秒
   - Key：基于 symbol 和账户列表

2. **可质押资产列表**

   - 缓存时间：5 分钟
   - Key：基于 type 参数

3. **Banner 列表**

   - 缓存时间：60 秒

4. **FAQ 列表**
   - 缓存时间：1 分钟

### 缓存清除

```typescript
// 清除资产列表缓存
clearAvailableAssetsCache();

// 重置所有 Earn 缓存
resetEarnCache();
```

## 特殊处理

### 1. 多网络支持

部分接口支持批量查询多个网络：

```typescript
// 获取账户概览时，并行查询所有主网
const accounts = await getEarnAvailableAccountsParams({ ... });
const results = await Promise.allSettled(
  accounts.map(account => client.get('/earn/v1/overview', { params: account }))
);
```

### 2. BTC 网络特殊处理

- 需要传递 `publicKey` 参数
- 仅支持 Taproot 地址（BIP86）
- Babylon 协议使用 PSBT 格式

### 3. Permit 缓存

Permit 签名缓存到本地，避免重复签名：

```typescript
// 检查缓存
const cache = getPermitCache({
  accountId,
  networkId,
  tokenAddress,
  amount,
});

// 如果缓存有效，直接使用
if (cache && Date.now() < cache.expiredAt) {
  return cache.signature;
}
```

### 4. 账户类型适配

- **普通账户**：直接使用 `accountId`
- **索引账户**：优先使用 `indexedAccountId`
- **Others 账户**：需要特殊处理

### 5. 硬件钱包支持

部分接口需要传递硬件钱包类型：

```typescript
const firmwareDeviceType = await getFirmwareDeviceTypeParam({ accountId });
```

## 类型定义

主要类型定义位于：

- `packages/shared/types/staking.ts` - 质押相关类型
- `packages/shared/types/earn.ts` - Earn 模块类型

关键类型：

- `IStakeTx` - 交易数据
- `IStakeProviderInfo` - 协议信息
- `IEarnAccountToken` - 账户代币信息
- `IAvailableAsset` - 可质押资产
- `IEarnEstimateFeeResp` - 费用估算响应
- 等

## 注意事项

1. **网络过滤**：部分接口支持 `filterNetworkId` 参数过滤特定网络
2. **Vault 参数**：部分协议需要传递 `vault` 地址（useVaultProvider 协议）
3. **公钥传递**：BTC 网络或配置 `usePublicKey: true` 时需要传递公钥
4. **账户地址**：所有接口都需要先获取账户地址（`getAccountAddressForApi`）
5. **错误重试**：订单状态同步支持自动重试（最多 3 次）
