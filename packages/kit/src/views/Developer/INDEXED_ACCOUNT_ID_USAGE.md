# indexedAccountId 使用指南

## 概述

`indexedAccountId` 是 OneKey 账户系统中用于标识 HD/HW/QR 钱包账户索引的关键字段。通过 `indexedAccountId`，可以获取索引账户本身的信息，以及关联的所有实际账户信息。

---

## indexedAccountId 格式

```
{walletId}--{index}
```

**示例**：
- `hd-1--0`：HD 钱包 1 的第 0 个索引账户
- `hw-2--1`：硬件钱包 2 的第 1 个索引账户
- `qr-3--0`：QR 钱包 3 的第 0 个索引账户

---

## 通过 indexedAccountId 可以获取的信息

### 1. IndexedAccount 基本信息

通过 `getIndexedAccount()` 方法可以获取索引账户本身的信息：

```typescript
type IDBIndexedAccount = {
  id: string;                    // 索引账户ID：{walletId}--{index}
  idHash: string;                // ID哈希（用于隐私保护）
  walletId: string;              // 所属钱包ID
  name: string;                  // 账户名称：Account #1, Account #2
  index: number;                 // 索引号（0, 1, 2, ...）
  order?: number;                // 显示顺序（只读）
  orderSaved?: number;           // 显示顺序（数据库字段）
  associateAccount?: INetworkAccount; // 关联账户（只读，用于特定网络）
};
```

**使用示例**：

```typescript
// 获取索引账户信息
const indexedAccount = await localDb.getIndexedAccount({
  id: 'hd-1--0',
});

console.log(indexedAccount);
// {
//   id: 'hd-1--0',
//   walletId: 'hd-1',
//   name: 'Account #1',
//   index: 0,
//   idHash: '...',
//   order: 0
// }
```

---

### 2. 获取同一索引账户下的所有账户

通过 `getAccountsInSameIndexedAccountId()` 方法可以获取同一个 `indexedAccountId` 下关联的所有账户（不同网络、不同派生类型）：

```typescript
const { accounts, allDbAccounts } = await localDb.getAccountsInSameIndexedAccountId({
  indexedAccountId: 'hd-1--0',
});
```

**返回信息**：

- **accounts**：过滤后的账户列表，包含完整的账户信息
- **allDbAccounts**：所有账户列表（用于进一步筛选）

**账户信息包含**：

```typescript
type IDBAccount = IDBBaseAccount & {
  // 基础信息
  id: string;                    // 账户ID
  name: string;                  // 账户名称
  type: EDBAccountType;          // 账户类型
  
  // 派生路径
  path: string;                  // 完整路径：m/44'/60'/0'/0/0
  pathIndex?: number;            // 路径索引
  relPath?: string;               // 相对路径：0/0
  indexedAccountId?: string;     // 关联的索引账户ID
  
  // 网络信息
  coinType: string;              // 币种类型：60 (ETH), 0 (BTC)
  impl: string;                  // 实现类型：evm, btc, ada
  networks?: string[];            // 可用网络列表
  createAtNetwork?: string;      // 创建时的网络ID
  template?: string;              // 派生模板
  
  // 地址和密钥（根据账户类型不同）
  pub?: string;                  // 公钥
  xpub?: string;                 // 扩展公钥（UTXO账户）
  xpubSegwit?: string;           // Segwit扩展公钥（UTXO账户）
  address?: string;              // 地址（SimpleAccount）
  addresses?: Record<string, string>; // 地址映射（UTXO/Variant账户）
  customAddresses?: Record<string, string>; // 自定义地址（UTXO账户）
  
  // 外部账户特有
  connectionInfoRaw?: string;    // 连接信息（ExternalAccount）
  connectedAddresses?: Record<string, string>; // 已连接地址
  selectedAddress?: Record<string, number>;     // 选中的地址索引
  
  // 排序
  accountOrder?: number;         // 显示顺序（只读）
  accountOrderSaved?: number;    // 显示顺序（数据库字段）
};
```

**使用示例**：

```typescript
const { accounts } = await localDb.getAccountsInSameIndexedAccountId({
  indexedAccountId: 'hd-1--0',
});

// accounts 可能包含：
// [
//   {
//     id: 'hd-1--m/44'/60'/0'/0/0',
//     name: 'Account #1',
//     impl: 'evm',
//     coinType: '60',
//     address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
//     indexedAccountId: 'hd-1--0',
//     ...
//   },
//   {
//     id: 'hd-1--m/44'/0'/0'/0/0',
//     name: 'Account #1',
//     impl: 'btc',
//     coinType: '0',
//     address: 'bc1q...',
//     indexedAccountId: 'hd-1--0',
//     ...
//   },
//   {
//     id: 'hd-1--m/44'/60'/0'/0/0--LedgerLive',
//     name: 'Account #1',
//     impl: 'evm',
//     coinType: '60',
//     address: '0x...',
//     indexedAccountId: 'hd-1--0',
//     template: 'm/44'/60'/0'/0/{INDEX}',
//     ...
//   }
// ]
```

---

### 3. 获取特定网络的账户

通过 `getDbAccountIdFromIndexedAccountId()` 方法可以根据 `indexedAccountId`、`networkId` 和 `deriveType` 获取特定网络的实际账户ID：

```typescript
const realDBAccountId = await serviceAccount.getDbAccountIdFromIndexedAccountId({
  indexedAccountId: 'hd-1--0',
  networkId: 'evm--1',        // Ethereum 主网
  deriveType: 'default',       // 默认派生类型
});

// 返回：'hd-1--m/44'/60'/0'/0/0'
```

**然后可以通过账户ID获取完整账户信息**：

```typescript
const account = await serviceAccount.getAccount({
  accountId: realDBAccountId,
  networkId: 'evm--1',
});
```

**使用示例**：

```typescript
// 获取 Ethereum 主网的账户
const ethAccountId = await serviceAccount.getDbAccountIdFromIndexedAccountId({
  indexedAccountId: 'hd-1--0',
  networkId: 'evm--1',
  deriveType: 'default',
});

const ethAccount = await serviceAccount.getAccount({
  accountId: ethAccountId,
  networkId: 'evm--1',
});

console.log(ethAccount.address); // 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb

// 获取 Bitcoin 主网的账户
const btcAccountId = await serviceAccount.getDbAccountIdFromIndexedAccountId({
  indexedAccountId: 'hd-1--0',
  networkId: 'btc--0',
  deriveType: 'default',
});

const btcAccount = await serviceAccount.getAccount({
  accountId: btcAccountId,
  networkId: 'btc--0',
});

console.log(btcAccount.address); // bc1q...
```

---

### 4. 批量获取多个索引账户的账户信息

通过 `getAccountsByIndexedAccounts()` 方法可以批量获取多个索引账户在特定网络下的账户信息：

```typescript
const { accounts } = await serviceAccount.getAccountsByIndexedAccounts({
  indexedAccountIds: ['hd-1--0', 'hd-1--1', 'hd-1--2'],
  networkId: 'evm--1',
  deriveType: 'default',
  allDbAccounts: [...], // 可选：预加载的账户列表
  skipDbQueryIfNotFoundFromAllDbAccounts: false, // 可选
});
```

**返回**：`INetworkAccount[]` 数组，包含每个索引账户在指定网络下的账户信息

**使用示例**：

```typescript
// 获取前3个索引账户在 Ethereum 主网下的账户
const { accounts } = await serviceAccount.getAccountsByIndexedAccounts({
  indexedAccountIds: ['hd-1--0', 'hd-1--1', 'hd-1--2'],
  networkId: 'evm--1',
  deriveType: 'default',
});

// accounts 包含3个账户：
// [
//   { id: 'hd-1--m/44'/60'/0'/0/0', address: '0x...', ... },
//   { id: 'hd-1--m/44'/60'/1'/0/0', address: '0x...', ... },
//   { id: 'hd-1--m/44'/60'/2'/0/0', address: '0x...', ... }
// ]
```

---

## 核心 API 方法

### LocalDbBase 方法

#### 1. `getIndexedAccount({ id })`

获取索引账户信息。

```typescript
const indexedAccount = await localDb.getIndexedAccount({
  id: 'hd-1--0',
});
```

#### 2. `getAccountsInSameIndexedAccountId({ indexedAccountId })`

获取同一索引账户下的所有账户。

```typescript
const { accounts, allDbAccounts } = await localDb.getAccountsInSameIndexedAccountId({
  indexedAccountId: 'hd-1--0',
});
```

#### 3. `getIndexedAccountByAccount({ account })`

通过账户获取关联的索引账户。

```typescript
const indexedAccount = await localDb.getIndexedAccountByAccount({
  account: someAccount,
});
```

### ServiceAccount 方法

#### 1. `getDbAccountIdFromIndexedAccountId({ indexedAccountId, networkId, deriveType })`

根据索引账户ID、网络ID和派生类型获取实际账户ID。

```typescript
const accountId = await serviceAccount.getDbAccountIdFromIndexedAccountId({
  indexedAccountId: 'hd-1--0',
  networkId: 'evm--1',
  deriveType: 'default',
});
```

#### 2. `getAccountsByIndexedAccounts({ indexedAccountIds, networkId, deriveType })`

批量获取多个索引账户在特定网络下的账户。

```typescript
const { accounts } = await serviceAccount.getAccountsByIndexedAccounts({
  indexedAccountIds: ['hd-1--0', 'hd-1--1'],
  networkId: 'evm--1',
  deriveType: 'default',
});
```

#### 3. `getAccount({ accountId, networkId })`

获取完整账户信息（包含地址详情）。

```typescript
const account = await serviceAccount.getAccount({
  accountId: 'hd-1--m/44'/60'/0'/0/0',
  networkId: 'evm--1',
});
```

---

## 使用场景

### 场景1：获取账户在不同网络下的所有地址

```typescript
// 1. 获取索引账户下的所有账户
const { accounts } = await localDb.getAccountsInSameIndexedAccountId({
  indexedAccountId: 'hd-1--0',
});

// 2. 按网络分组
const accountsByNetwork = accounts.reduce((acc, account) => {
  const networkId = account.createAtNetwork || `${account.impl}--*`;
  if (!acc[networkId]) {
    acc[networkId] = [];
  }
  acc[networkId].push(account);
  return acc;
}, {} as Record<string, IDBAccount[]>);

// 3. 获取每个网络下的地址
for (const [networkId, networkAccounts] of Object.entries(accountsByNetwork)) {
  console.log(`Network: ${networkId}`);
  networkAccounts.forEach(account => {
    if (account.type === 'simple') {
      console.log(`  Address: ${account.address}`);
    } else if (account.type === 'variant') {
      console.log(`  Addresses:`, account.addresses);
    }
  });
}
```

### 场景2：在特定网络下查找账户

```typescript
// 1. 获取索引账户ID
const indexedAccountId = 'hd-1--0';

// 2. 获取特定网络的账户ID
const accountId = await serviceAccount.getDbAccountIdFromIndexedAccountId({
  indexedAccountId,
  networkId: 'evm--1',
  deriveType: 'default',
});

// 3. 获取完整账户信息
const account = await serviceAccount.getAccount({
  accountId,
  networkId: 'evm--1',
});

console.log(`Account Address: ${account.address}`);
```

### 场景3：批量获取多个账户的余额

```typescript
// 1. 获取多个索引账户在 Ethereum 主网下的账户
const { accounts } = await serviceAccount.getAccountsByIndexedAccounts({
  indexedAccountIds: ['hd-1--0', 'hd-1--1', 'hd-1--2'],
  networkId: 'evm--1',
  deriveType: 'default',
});

// 2. 批量查询余额
const balances = await Promise.all(
  accounts.map(async (account) => {
    const balance = await serviceToken.getAccountBalance({
      accountId: account.id,
      networkId: 'evm--1',
    });
    return {
      accountId: account.id,
      address: account.address,
      balance,
    };
  })
);
```

### 场景4：跨网络账户查找

```typescript
// 1. 获取索引账户下的所有账户
const { accounts } = await localDb.getAccountsInSameIndexedAccountId({
  indexedAccountId: 'hd-1--0',
});

// 2. 查找特定实现类型的账户
const evmAccounts = accounts.filter(account => account.impl === 'evm');
const btcAccounts = accounts.filter(account => account.impl === 'btc');

console.log('EVM Accounts:', evmAccounts.map(a => a.address));
console.log('BTC Accounts:', btcAccounts.map(a => a.address));
```

---

## 关系图

```
IndexedAccount (hd-1--0) "Account #1"
  │
  ├── Account (hd-1--m/44'/60'/0'/0/0) [Ethereum, default]
  │     ├── address: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
  │     ├── impl: evm
  │     └── networkId: evm--1
  │
  ├── Account (hd-1--m/44'/60'/0'/0/0--LedgerLive) [Ethereum, LedgerLive]
  │     ├── address: 0x8ba1f109551bD432803012645Hac136c22C1729
  │     ├── impl: evm
  │     ├── template: m/44'/60'/0'/0/{INDEX}
  │     └── networkId: evm--1
  │
  └── Account (hd-1--m/44'/0'/0'/0/0) [Bitcoin, default]
        ├── address: bc1q...
        ├── impl: btc
        └── networkId: btc--0
```

---

## 注意事项

1. **仅适用于 HD/HW/QR 钱包**：
   - `indexedAccountId` 只存在于 HD、硬件钱包和 QR 钱包的账户中
   - 导入钱包（imported）、观察钱包（watching）、外部钱包（external）的账户没有 `indexedAccountId`

2. **账户可能不存在**：
   - 如果某个网络下的账户尚未创建，`getDbAccountIdFromIndexedAccountId()` 会返回账户ID，但实际账户可能不存在
   - 需要先创建账户或使用 `createAddressIfNotExists()` 方法

3. **派生类型影响**：
   - 同一个 `indexedAccountId` 在不同 `deriveType` 下可能对应不同的账户
   - 例如：`default` 和 `LedgerLive` 派生类型会产生不同的账户ID

4. **网络兼容性**：
   - 不是所有网络都支持同一个索引账户
   - 需要检查账户的 `impl` 和 `networks` 字段来判断兼容性

5. **性能考虑**：
   - `getAccountsInSameIndexedAccountId()` 会查询所有账户，对于大量账户的场景可能较慢
   - 建议使用 `getAccountsByIndexedAccounts()` 并传入 `allDbAccounts` 参数来优化性能

---

## 总结

通过 `indexedAccountId` 可以：

1. ✅ 获取索引账户的基本信息（名称、索引、钱包ID等）
2. ✅ 获取该索引账户下关联的所有账户（不同网络、不同派生类型）
3. ✅ 根据网络ID和派生类型获取特定网络下的账户
4. ✅ 批量获取多个索引账户在特定网络下的账户信息
5. ✅ 实现跨网络的账户查找和管理

这使得 `indexedAccountId` 成为 OneKey 账户系统中连接用户视图（IndexedAccount）和实际账户（Account）的重要桥梁。

