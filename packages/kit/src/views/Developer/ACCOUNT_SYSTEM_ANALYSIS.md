# OneKey 账户系统架构分析

## 目录

1. [系统概览](#系统概览)
2. [核心数据结构](#核心数据结构)
3. [钱包系统](#钱包系统)
4. [账户系统](#账户系统)
5. [网络系统](#网络系统)
6. [关系与关联](#关系与关联)
7. [账户派生机制](#账户派生机制)
8. [数据存储](#数据存储)

---

## 系统概览

OneKey 钱包采用分层架构设计，核心概念包括：

- **Wallet（钱包）**：用户创建的钱包容器，包含多个账户
- **Account（账户）**：具体的区块链账户，属于某个钱包
- **Network（网络）**：区块链网络配置（如 Ethereum、Bitcoin）
- **IndexedAccount（索引账户）**：HD/HW 钱包的账户索引抽象
- **AccountDerivation（账户派生）**：账户派生路径和模板管理

---

## 核心数据结构

### 1. 基础类型

```typescript
// 基础对象
type IDBBaseObject = {
  id: string;
};

type IDBBaseObjectWithName = IDBBaseObject & {
  name: string;
};
```

### 2. 钱包类型枚举

```typescript
type IDBWalletType =
  | 'hd' // HD钱包（助记词）
  | 'hw' // 硬件钱包
  | 'qr' // QR钱包（二维码钱包）
  | 'imported' // 导入钱包（私钥导入）
  | 'watching' // 观察钱包（只读）
  | 'external'; // 外部钱包（WalletConnect等）
```

### 3. 账户类型枚举

```typescript
enum EDBAccountType {
  SIMPLE = 'simple', // 简单账户（单地址）
  UTXO = 'utxo', // UTXO账户（如BTC，多地址）
  VARIANT = 'variant', // 变体账户（多网络地址）
  FAKE = 'FAKE', // 假账户（用于AllNetworks）
}
```

---

## 钱包系统

### IDBWallet 结构

```typescript
type IDBWallet = {
  // 基础信息
  id: string; // 钱包ID，格式：hd-xxx, hw-xxx, imported, watching, external
  name: string; // 钱包名称
  type: IDBWalletType; // 钱包类型

  // 状态信息
  backuped: boolean; // 是否已备份
  isTemp?: boolean; // 是否临时钱包
  isMocked?: boolean; // 是否模拟钱包
  deprecated?: boolean; // 是否已废弃（仅HW钱包）

  // 账户关联（仅单例钱包使用）
  accounts: string[]; // 账户ID列表（imported/watching/external钱包）

  // 索引管理
  nextIds: {
    accountHdIndex?: number; // 下一个HD账户索引
    accountGlobalNum?: number; // 全局账户编号
    hiddenWalletNum?: number; // 隐藏钱包编号
  };

  // 设备关联（硬件钱包）
  associatedDevice?: string; // 关联设备ID
  associatedDeviceInfo?: IDBDevice; // 设备信息（只读）

  // 显示信息
  avatar?: string; // 头像（emoji或图片）
  avatarInfo?: IAvatarInfo; // 头像信息（只读）
  walletNo: number; // 钱包编号
  walletOrder?: number; // 显示顺序（只读）
  walletOrderSaved?: number; // 显示顺序（数据库字段）

  // HD钱包特有
  hash?: string; // 助记词哈希值
  xfp?: string; // 短XFP（第一个Taproot xpub）
  firstEvmAddress?: string; // 第一个EVM地址
  passphraseState?: string; // 密码短语状态

  // QR钱包特有
  airGapAccountsInfoRaw?: string; // 离线账户信息（原始）
  airGapAccountsInfo?: IQrWalletAirGapAccountsInfo; // 离线账户信息（解析后）

  // 只读字段
  hiddenWallets?: IDBWallet[]; // 隐藏钱包列表
  dbAccounts?: IDBAccount[]; // 账户列表
  dbIndexedAccounts?: IDBIndexedAccount[]; // 索引账户列表
};
```

### 钱包类型说明

#### 1. HD 钱包 (hd)

- 通过助记词创建
- 支持派生多个账户
- 使用 `IDBIndexedAccount` 管理账户索引
- 每个账户通过 BIP44 路径派生

#### 2. 硬件钱包 (hw)

- 关联物理硬件设备
- 账户派生在硬件设备上完成
- 支持多种硬件设备类型（OneKey、Ledger 等）

#### 3. QR 钱包 (qr)

- 通过二维码进行离线签名
- 账户信息存储在 `airGapAccountsInfo` 中
- 支持离线交易签名

#### 4. 导入钱包 (imported)

- 单例钱包（全局唯一）
- 通过私钥导入
- 账户直接存储在 `accounts` 数组中

#### 5. 观察钱包 (watching)

- 单例钱包（全局唯一）
- 只读模式，仅观察地址余额
- 账户直接存储在 `accounts` 数组中

#### 6. 外部钱包 (external)

- 单例钱包（全局唯一）
- 通过 WalletConnect 等协议连接
- 账户信息包含连接信息

---

## 账户系统

### IDBBaseAccount 基础结构

```typescript
type IDBBaseAccount = {
  // 基础信息
  id: string; // 账户ID，格式：{walletId}--{path}--{template?}
  name: string; // 账户名称
  type: EDBAccountType; // 账户类型

  // 派生路径
  path: string; // 完整路径，如：m/44'/60'/0'/0/0
  pathIndex?: number; // 路径索引
  relPath?: string; // 相对路径，如：0/0
  indexedAccountId?: string; // 关联的索引账户ID（HD/HW钱包）

  // 网络信息
  coinType: string; // 币种类型，如：60 (ETH), 0 (BTC)
  impl: string; // 实现类型，如：evm, btc, ada
  networks?: string[]; // 可用网络列表（某些账户仅支持特定网络）
  createAtNetwork?: string; // 创建时的网络ID

  // 派生模板
  template?: string; // 派生模板，如：m/44'/60'/0'/0/{INDEX}

  // 排序
  accountOrder?: number; // 显示顺序（只读）
  accountOrderSaved?: number; // 显示顺序（数据库字段）
};
```

### 账户类型详解

#### 1. IDBSimpleAccount（简单账户）

```typescript
type IDBSimpleAccount = IDBBaseAccount & {
  pub: string; // 公钥
  address: string; // 地址（单地址）
};
```

**用途**：大多数单地址账户（如 EVM、Solana）

**示例**：

- Ethereum 账户：`0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb`
- Solana 账户：`9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM`

#### 2. IDBUtxoAccount（UTXO 账户）

```typescript
type IDBUtxoAccount = IDBBaseAccount & {
  pub?: string; // 公钥
  xpub: string; // 扩展公钥
  xpubSegwit?: string; // Segwit 扩展公钥
  address: string; // 显示/选中的地址
  addresses: Record<string, string>; // 地址映射：{ "0/0": "bc1q..." }
  customAddresses?: Record<string, string>; // 自定义地址（BTC动态地址）
};
```

**用途**：UTXO 模型账户（Bitcoin、Litecoin 等）

**特点**：

- 一个账户可以有多个地址
- 通过 `relPath`（如 `0/0`）索引不同地址
- 支持自定义地址派生

#### 3. IDBVariantAccount（变体账户）

```typescript
type IDBVariantAccount = IDBBaseAccount & {
  pub: string; // 公钥
  address: string; // 基础地址
  addresses: Record<string, string>; // 网络ID -> 地址映射
};
```

**用途**：支持多网络的账户（如 Cosmos 生态）

**特点**：

- 一个账户在不同网络上有不同地址
- `addresses` 键为网络 ID，值为该网络下的地址

#### 4. IDBExternalAccount（外部账户）

```typescript
type IDBExternalAccount = IDBVariantAccount & {
  address: string; // 基础地址（WalletConnect账户可能为空）

  connectionInfoRaw?: string; // 连接信息（原始JSON字符串）
  connectionInfo?: IExternalConnectionInfo; // 连接信息（解析后，只读）

  connectedAddresses: Record<string, string>; // 已连接地址映射
  selectedAddress: Record<string, number>; // 选中的地址索引
};
```

**用途**：外部钱包连接（WalletConnect、MetaMask 等）

**特点**：

- 包含外部连接信息
- 支持多地址选择
- 地址可能动态变化

### 账户 ID 格式

账户 ID 的格式根据钱包类型和账户类型有所不同：

```
{walletId}--{path}--{template?}--{addressEncoding?}
```

**示例**：

- HD 钱包账户：`hd-1--m/44'/60'/0'/0/0`
- 带模板：`hd-1--m/44'/60'/0'/0/0--LedgerLive`
- 带地址编码：`hd-1--m/44'/60'/0'/0/0--LedgerLive--Legacy`
- 导入账户：`imported--0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb`

---

## 网络系统

### IServerNetwork 结构

```typescript
type IServerNetwork = {
  // 标识信息
  id: string; // 网络ID，格式：{impl}--{chainId}，如：evm--1
  impl: string; // 实现类型：evm, btc, ada, sol, etc.
  chainId: string; // 链ID：1 (Ethereum), 56 (BSC), etc.

  // 显示信息
  name: string; // 网络名称：Ethereum, Bitcoin, etc.
  code: string; // 网络代码：eth, btc, etc.
  shortname: string; // 短名称
  shortcode: string; // 短代码
  symbol: string; // 代币符号：ETH, BTC, etc.
  logoURI: string; // Logo URI

  // 技术信息
  decimals: number; // 小数位数：18 (ETH), 8 (BTC)
  feeMeta: INetworkFeeInfo; // 手续费元数据
  defaultEnabled: boolean; // 是否默认启用
  backendIndex?: boolean; // 是否在后端索引
  support?: string[]; // 支持的功能列表

  // 状态信息
  status: ENetworkStatus; // 网络状态：LISTED, TRASH
  isTestnet: boolean; // 是否测试网
  isCustomNetwork?: boolean; // 是否自定义网络
  isAggregateNetwork?: boolean; // 是否聚合网络（AllNetworks）
  isAllNetworks?: boolean; // 是否AllNetworks视图

  // 扩展信息
  extensions?: Record<string, unknown>; // 扩展配置
  explorerURL?: string; // 浏览器URL
};
```

### 网络 ID 格式

网络 ID 采用 `{impl}--{chainId}` 格式：

**示例**：

- Ethereum 主网：`evm--1`
- BSC：`evm--56`
- Bitcoin 主网：`btc--0`
- Solana 主网：`sol--5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp`

### 网络与账户兼容性

账户通过以下字段与网络关联：

1. **impl**：账户的实现类型必须与网络匹配
2. **networks**：如果指定，账户只能在这些网络上使用
3. **createAtNetwork**：账户创建时的网络，用于兼容性回退

**兼容性检查逻辑**：

```typescript
function isAccountCompatibleWithNetwork({
  account,
  networkId,
}: {
  account: IDBAccount;
  networkId: string;
}): boolean {
  // 1. 检查 impl 是否匹配
  // 2. 检查 networks 数组（如果存在）
  // 3. 检查 createAtNetwork（回退）
}
```

---

## 关系与关联

### 1. 钱包 ↔ 账户

#### HD/HW/QR 钱包

```
Wallet (hd-1)
  └── IndexedAccount (hd-1--0)
        └── Account (hd-1--m/44'/60'/0'/0/0) [Ethereum]
        └── Account (hd-1--m/44'/60'/1'/0/0) [Ethereum]
        └── Account (hd-1--m/44'/0'/0'/0/0) [Bitcoin]
```

- 通过 `IDBIndexedAccount` 管理账户索引
- 每个 `IndexedAccount` 可以关联多个 `Account`（不同网络）
- 账户通过 `indexedAccountId` 关联到 `IndexedAccount`

#### 单例钱包（imported/watching/external）

```
Wallet (imported)
  └── Account (imported--0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb)
  └── Account (imported--0x8ba1f109551bD432803012645Hac136c22C1729)
```

- 账户直接存储在 `Wallet.accounts` 数组中
- 没有 `IndexedAccount` 概念

### 2. 账户 ↔ 网络

#### 单网络账户

```
Account (hd-1--m/44'/60'/0'/0/0)
  └── Network: evm--1 (Ethereum)
```

- `impl` 字段指定实现类型
- 账户只能在该实现类型的网络上使用

#### 多网络账户（VariantAccount）

```
Account (hd-1--m/44'/118'/0'/0/0)
  ├── Network: cosmos--cosmoshub-4 → address: cosmos1...
  ├── Network: cosmos--osmosis-1 → address: osmo1...
  └── Network: cosmos--juno-1 → address: juno1...
```

- 通过 `addresses` 字段存储不同网络的地址
- 键为网络 ID，值为该网络下的地址

#### 受限网络账户

```
Account (hd-1--m/44'/60'/0'/0/0)
  networks: ["evm--1", "evm--56"]  // 仅支持 Ethereum 和 BSC
```

- 通过 `networks` 字段限制可用网络

### 3. 账户 ↔ 地址

#### SimpleAccount

- 单地址：`address` 字段

#### UtxoAccount

- 多地址：`addresses` 字典
- 键：`relPath`（如 `0/0`）
- 值：地址字符串

#### VariantAccount / ExternalAccount

- 多地址：`addresses` 字典
- 键：网络 ID 或实现类型
- 值：地址字符串（可能包含多个地址，用逗号分隔）

### 4. 设备 ↔ 钱包

```
Device (device-1)
  └── Wallet (hw-1) [associatedDevice: device-1]
  └── Wallet (hw-2) [associatedDevice: device-1]  // 同一设备的不同钱包（不同密码短语）
```

- 硬件钱包通过 `associatedDevice` 关联设备
- 一个设备可以关联多个钱包（不同密码短语）

---

## 账户派生机制

### 派生模板（Template）

派生模板定义了账户的派生路径格式：

```typescript
// 模板格式
"m/44'/{COINTYPE}'/{INDEX}'/0/0";

// 示例
"m/44'/60'/0'/0/0"; // Ethereum 标准路径
"m/44'/60'/0'/0/{INDEX}"; // Ledger Live 路径
"m/44'/0'/0'/0/{INDEX}"; // Bitcoin 标准路径
```

### IAccountDeriveInfo

```typescript
type IAccountDeriveInfo = {
  idSuffix?: string; // ID后缀，用于区分相同路径的不同模板
  namePrefix: string; // 名称前缀：EVM #1, Ledger Live #2
  template: string; // 派生模板（包含 {INDEX} 占位符）
  coinType: string; // 币种类型
  coinName?: string; // 币种名称
  addressEncoding?: EAddressEncodings; // 地址编码方式
  useAddressEncodingDerive?: boolean; // 是否使用地址编码派生

  labelKey?: string; // 标签键（i18n）
  label?: string; // 标签
  desc?: string; // 描述
  subDesc?: string; // 子描述

  enableConditions?: {
    // 启用条件
    networkId?: string[]; // 仅在特定网络可用
  }[];
};
```

### 派生类型（DeriveType）

不同网络支持不同的派生类型：

**EVM 网络**：

- `default`：标准 BIP44 路径
- `LedgerLive`：Ledger Live 路径
- `LedgerLegacy`：Ledger 传统路径

**BTC 网络**：

- `default`：标准 BIP44 路径
- `BIP86`：Taproot 路径
- `BIP84`：Native Segwit 路径
- `BIP49`：P2SH-Segwit 路径
- `BIP44`：Legacy 路径

### IDBAccountDerivation

```typescript
type IDBAccountDerivation = {
  id: string; // 派生ID：{walletId}--{template}
  walletId: string; // 钱包ID
  template: string; // 派生模板
  accounts: string[]; // 账户ID列表
};
```

**用途**：记录钱包使用某个模板派生的所有账户

**示例**：

```
AccountDerivation {
  id: "hd-1--m/44'/60'/0'/0/{INDEX}",
  walletId: "hd-1",
  template: "m/44'/60'/0'/0/{INDEX}",
  accounts: [
    "hd-1--m/44'/60'/0'/0/0",
    "hd-1--m/44'/60'/0'/0/1",
    "hd-1--m/44'/60'/0'/0/2"
  ]
}
```

### IDBIndexedAccount

```typescript
type IDBIndexedAccount = {
  id: string; // 索引账户ID：{walletId}--{index}
  idHash: string; // ID哈希（用于隐私）
  walletId: string; // 钱包ID
  index: number; // 索引号（0, 1, 2, ...）
  name: string; // 名称：Account #1, Account #2
  order?: number; // 显示顺序（只读）
  orderSaved?: number; // 显示顺序（数据库字段）
  associateAccount?: INetworkAccount; // 关联账户（只读，用于特定网络）
};
```

**用途**：

- HD/HW/QR 钱包的账户索引抽象
- 一个 `IndexedAccount` 可以关联多个 `Account`（不同网络/模板）
- 用户看到的是 `IndexedAccount`，实际使用的是 `Account`

**关系示例**：

```
IndexedAccount (hd-1--0) "Account #1"
  ├── Account (hd-1--m/44'/60'/0'/0/0) [Ethereum, default]
  ├── Account (hd-1--m/44'/60'/0'/0/0--LedgerLive) [Ethereum, LedgerLive]
  └── Account (hd-1--m/44'/0'/0'/0/0) [Bitcoin, default]

IndexedAccount (hd-1--1) "Account #2"
  ├── Account (hd-1--m/44'/60'/1'/0/0) [Ethereum, default]
  └── Account (hd-1--m/44'/0'/1'/0/0) [Bitcoin, default]
```

---

## 数据存储

### 数据库架构

OneKey 使用混合存储方案：

- **IndexedDB**：主要数据存储（账户、钱包、设备等）
- **Realm**：同步存储（用于数据同步和备份）

### 存储桶（Bucket）

```typescript
enum EIndexedDBBucketNames {
  account = 'account_local-db_onekey-bucket', // 账户相关
  address = 'address_local-db_onekey-bucket', // 地址映射
  archive = 'archive_local-db_onekey-bucket', // 归档数据（签名记录等）
}
```

### 存储表（Store）

```typescript
enum ELocalDBStoreNames {
  Context = 'Context', // 上下文（全局配置）
  Credential = 'Credential', // 凭证（加密的助记词/私钥）
  Wallet = 'Wallet', // 钱包
  Account = 'Account', // 账户
  IndexedAccount = 'IndexedAccount', // 索引账户
  AccountDerivation = 'AccountDerivation', // 账户派生
  Device = 'Device', // 设备
  Address = 'Address', // 地址映射
  SignedMessage = 'SignedMessage', // 签名消息
  SignedTransaction = 'SignedTransaction', // 签名交易
  ConnectedSite = 'ConnectedSite', // 连接的DApp
  CloudSyncItem = 'CloudSyncItem', // 云同步项
  HardwareHomeScreen = 'HardwareHomeScreen', // 硬件钱包主屏
}
```

### 地址映射（IDBAddress）

```typescript
type IDBAddress = {
  id: string; // 地址ID：{networkId}--{address} 或 {impl}--{address}
  wallets: Record<string, string>; // 钱包映射：{walletId} -> {indexedAccountId/accountId}
};
```

**用途**：快速查找地址对应的账户

**示例**：

```
Address {
  id: "evm--1--0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  wallets: {
    "hd-1": "hd-1--0"  // 指向 IndexedAccount
  }
}
```

---

## 总结

OneKey 账户系统采用分层设计：

1. **Wallet 层**：用户钱包容器，支持多种钱包类型
2. **IndexedAccount 层**：HD/HW 钱包的账户索引抽象
3. **Account 层**：具体的区块链账户，包含地址和密钥信息
4. **Network 层**：区块链网络配置
5. **Derivation 层**：账户派生路径和模板管理

**关键设计特点**：

- 支持多钱包类型（HD、HW、QR、导入、观察、外部）
- 支持多账户类型（Simple、UTXO、Variant、External）
- 支持多网络（通过 impl 和 networks 字段）
- 支持多派生路径（通过 template 和 deriveType）
- 灵活的地址管理（单地址、多地址、多网络地址）
- 完善的索引和映射机制（IndexedAccount、Address 映射）

这种设计使得 OneKey 能够支持多种区块链网络和账户类型，同时保持数据结构的清晰和可扩展性。
