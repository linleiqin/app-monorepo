# 如何通过 indexedAccountId 和 networkId 获取 accountId

## ⚡ 快速参考（推荐）

**最简单的方式**：使用已封装好的 `createAddressIfNotExists()` 方法

```typescript
// 获取或创建账户（如果不存在会自动创建）
const account =
  await backgroundApiProxy.serviceAccount.createAddressIfNotExists(
    {
      walletId: 'hd-1',
      networkId: 'evm--1',
      indexedAccountId: 'hd-1--0',
    },
    {
      allowWatchAccount: false,
    },
  );

const accountId = account?.id; // 获取 accountId
```

**特点**：

- ✅ 自动获取默认 deriveType
- ✅ 自动处理账户创建（如果不存在）
- ✅ 返回完整账户信息
- ⚠️ 可能返回 `undefined`（创建失败或用户取消）

---

## 方法概览

通过 `indexedAccountId` 和 `networkId` 获取 `accountId` 有以下方式：

1. **推荐：获取或创建账户**：使用 `createAddressIfNotExists()`（已封装，自动处理创建）
2. **直接获取 accountId**：使用 `getDbAccountIdFromIndexedAccountId()`
3. **获取完整账户信息**：使用 `getNetworkAccount()` 或 `getAccountsByIndexedAccounts()`

---

## 方法 1：直接获取 accountId（推荐）

### 步骤

1. 获取网络的默认派生类型（deriveType）
2. 使用 `getDbAccountIdFromIndexedAccountId()` 获取 accountId

### 代码示例

```typescript
import backgroundApiProxy from '@onekeyhq/kit/src/background/instance/backgroundApiProxy';

// 方法1：获取默认派生类型，然后获取 accountId
async function getAccountIdFromIndexedAccountId(
  indexedAccountId: string,
  networkId: string,
): Promise<string> {
  // 1. 获取网络的默认派生类型
  const deriveType =
    await backgroundApiProxy.serviceNetwork.getGlobalDeriveTypeOfNetwork({
      networkId,
    });

  // 2. 获取 accountId
  const accountId =
    await backgroundApiProxy.serviceAccount.getDbAccountIdFromIndexedAccountId({
      indexedAccountId,
      networkId,
      deriveType,
    });

  return accountId;
}

// 使用示例
const accountId = await getAccountIdFromIndexedAccountId('hd-1--0', 'evm--1');
console.log(accountId); // 'hd-1--m/44'/60'/0'/0/0'
```

### 完整示例（包含错误处理）

```typescript
async function getAccountIdSafely(
  indexedAccountId: string,
  networkId: string,
): Promise<string | undefined> {
  try {
    // 获取默认派生类型
    const deriveType =
      await backgroundApiProxy.serviceNetwork.getGlobalDeriveTypeOfNetwork({
        networkId,
      });

    // 获取 accountId
    const accountId =
      await backgroundApiProxy.serviceAccount.getDbAccountIdFromIndexedAccountId(
        {
          indexedAccountId,
          networkId,
          deriveType,
        },
      );

    return accountId;
  } catch (error) {
    console.error('Failed to get accountId:', error);
    return undefined;
  }
}
```

---

## 方法 2：获取完整账户信息（包含 accountId）

### 使用 getNetworkAccount()

`getNetworkAccount()` 方法可以直接通过 `indexedAccountId` 和 `networkId` 获取完整的账户信息，包括 `accountId`：

```typescript
async function getAccountFromIndexedAccountId(
  indexedAccountId: string,
  networkId: string,
): Promise<INetworkAccount | undefined> {
  try {
    // 获取默认派生类型
    const deriveType =
      await backgroundApiProxy.serviceNetwork.getGlobalDeriveTypeOfNetwork({
        networkId,
      });

    // 获取完整账户信息
    const account = await backgroundApiProxy.serviceAccount.getNetworkAccount({
      indexedAccountId,
      networkId,
      deriveType,
    });

    return account;
  } catch (error) {
    console.error('Failed to get account:', error);
    return undefined;
  }
}

// 使用示例
const account = await getAccountFromIndexedAccountId('hd-1--0', 'evm--1');
if (account) {
  console.log('Account ID:', account.id);
  console.log('Address:', account.address);
  console.log('Name:', account.name);
}
```

### 使用 getAccountsByIndexedAccounts()

批量获取方式，适合需要获取多个账户的场景：

```typescript
async function getAccountFromIndexedAccountId(
  indexedAccountId: string,
  networkId: string,
): Promise<INetworkAccount | undefined> {
  try {
    // 获取默认派生类型
    const deriveType =
      await backgroundApiProxy.serviceNetwork.getGlobalDeriveTypeOfNetwork({
        networkId,
      });

    // 获取账户列表（通常只有一个）
    const { accounts } =
      await backgroundApiProxy.serviceAccount.getAccountsByIndexedAccounts({
        indexedAccountIds: [indexedAccountId],
        networkId,
        deriveType,
      });

    return accounts[0];
  } catch (error) {
    console.error('Failed to get account:', error);
    return undefined;
  }
}
```

---

## 方法对比

| 方法                                   | 返回类型             | 优点                           | 缺点                         |
| -------------------------------------- | -------------------- | ------------------------------ | ---------------------------- |
| `getDbAccountIdFromIndexedAccountId()` | `string` (accountId) | 只返回 ID，性能最好            | 需要额外调用才能获取账户详情 |
| `getNetworkAccount()`                  | `INetworkAccount`    | 返回完整账户信息，包含地址详情 | 性能稍慢                     |
| `getAccountsByIndexedAccounts()`       | `INetworkAccount[]`  | 支持批量获取                   | 返回数组，需要取第一个元素   |

---

## 实际使用场景

### 场景 1：只需要 accountId

```typescript
// 获取 accountId 用于后续操作
const accountId = await getAccountIdFromIndexedAccountId(
  indexedAccountId,
  networkId,
);

// 使用 accountId 进行其他操作
if (accountId) {
  const balance = await serviceToken.getAccountBalance({
    accountId,
    networkId,
  });
}
```

### 场景 2：需要账户完整信息

```typescript
// 获取完整账户信息
const account = await getAccountFromIndexedAccountId(
  indexedAccountId,
  networkId,
);

if (account) {
  // 直接使用账户信息
  console.log('Address:', account.address);
  console.log('Name:', account.name);
  console.log('Account ID:', account.id);
}
```

### 场景 3：React Hook 中使用

```typescript
import { usePromiseResult } from '@onekeyhq/kit/src/hooks/usePromiseResult';

function MyComponent({
  indexedAccountId,
  networkId,
}: {
  indexedAccountId: string;
  networkId: string;
}) {
  const { result: accountId } = usePromiseResult(async () => {
    const deriveType =
      await backgroundApiProxy.serviceNetwork.getGlobalDeriveTypeOfNetwork({
        networkId,
      });

    return backgroundApiProxy.serviceAccount.getDbAccountIdFromIndexedAccountId(
      {
        indexedAccountId,
        networkId,
        deriveType,
      },
    );
  }, [indexedAccountId, networkId]);

  return <div>Account ID: {accountId}</div>;
}
```

---

## 注意事项

### 1. deriveType 的重要性

`deriveType` 决定了账户的派生路径。如果不指定，系统会使用默认值：

- **默认值**：通过 `getGlobalDeriveTypeOfNetwork()` 获取，通常是 `'default'`
- **自定义值**：如果用户选择了其他派生类型（如 `LedgerLive`），需要使用对应的 `deriveType`

```typescript
// 使用默认派生类型
const deriveType =
  await backgroundApiProxy.serviceNetwork.getGlobalDeriveTypeOfNetwork({
    networkId,
  });

// 或使用特定派生类型
const deriveType = 'LedgerLive'; // 或其他派生类型
```

### 2. 账户可能不存在（推荐使用已封装的方法）

✅ **已封装好的方法**：`createAddressIfNotExists()` 可以直接通过 `indexedAccountId` 和 `networkId` 获取或创建账户。

```typescript
/**
 * 通过 indexedAccountId 和 networkId 获取或创建账户
 * 如果账户已存在，直接返回；如果不存在，会尝试创建
 */
async function getAccountIdOrCreate(
  indexedAccountId: string,
  networkId: string,
  walletId: string,
): Promise<string | undefined> {
  const account =
    await backgroundApiProxy.serviceAccount.createAddressIfNotExists(
      {
        walletId,
        networkId,
        indexedAccountId, // 只需要 indexedAccountId，不需要 accountId
      },
      {
        allowWatchAccount: false, // 是否允许创建观察账户
      },
    );

  return account?.id; // 返回 accountId，如果创建失败返回 undefined
}
```

**使用示例**：

```typescript
// 获取钱包ID（从 indexedAccountId 解析）
const walletId = accountUtils.getWalletIdFromAccountId({
  accountId: indexedAccountId,
});

// 获取或创建账户
const account =
  await backgroundApiProxy.serviceAccount.createAddressIfNotExists(
    {
      walletId,
      networkId: 'evm--1',
      indexedAccountId: 'hd-1--0',
    },
    {
      allowWatchAccount: false,
    },
  );

if (account) {
  console.log('Account ID:', account.id);
  console.log('Address:', account.address);
} else {
  console.log('账户创建失败或用户取消');
}
```

**方法说明**：

- ✅ **自动获取 deriveType**：内部会自动调用 `getGlobalDeriveTypeOfNetwork()` 获取默认派生类型
- ✅ **自动处理账户创建**：如果账户不存在，会尝试创建（对于 HD 钱包会自动创建，其他钱包可能需要用户确认）
- ✅ **返回完整账户信息**：返回 `INetworkAccount` 对象，包含 `id`、`address`、`name` 等信息
- ⚠️ **可能返回 undefined**：如果创建失败或用户取消，返回 `undefined`

**完整示例（包含错误处理）**：

```typescript
async function getAccountIdOrCreateSafely(
  indexedAccountId: string,
  networkId: string,
  walletId: string,
): Promise<{ accountId: string; account: INetworkAccount } | null> {
  try {
    const account =
      await backgroundApiProxy.serviceAccount.createAddressIfNotExists(
        {
          walletId,
          networkId,
          indexedAccountId,
        },
        {
          allowWatchAccount: false,
        },
      );

    if (!account) {
      console.warn('账户创建失败或用户取消');
      return null;
    }

    return {
      accountId: account.id,
      account,
    };
  } catch (error) {
    console.error('获取或创建账户失败:', error);
    return null;
  }
}
```

---

### 2.1 手动实现（不推荐，仅作参考）

如果你需要手动实现，可以参考以下代码：

```typescript
async function getAccountIdOrCreateManual(
  indexedAccountId: string,
  networkId: string,
): Promise<string> {
  // 1. 获取 accountId
  const deriveType =
    await backgroundApiProxy.serviceNetwork.getGlobalDeriveTypeOfNetwork({
      networkId,
    });

  const accountId =
    await backgroundApiProxy.serviceAccount.getDbAccountIdFromIndexedAccountId({
      indexedAccountId,
      networkId,
      deriveType,
    });

  // 2. 检查账户是否存在，如果不存在则创建
  try {
    await backgroundApiProxy.serviceAccount.getAccount({
      accountId,
      networkId,
    });
  } catch (error) {
    // 账户不存在，创建账户
    const walletId = accountUtils.getWalletIdFromAccountId({
      accountId: indexedAccountId,
    });

    await backgroundApiProxy.serviceAccount.createAddressIfNotExists(
      {
        walletId,
        networkId,
        accountId,
        indexedAccountId,
      },
      {
        allowWatchAccount: false,
      },
    );
  }

  return accountId;
}
```

**注意**：推荐直接使用 `createAddressIfNotExists()` 方法，它已经封装了所有逻辑。

### 3. 仅适用于 HD/HW/QR 钱包

`indexedAccountId` 只存在于 HD、硬件钱包和 QR 钱包的账户中：

```typescript
import { accountUtils } from '@onekeyhq/shared/src/utils/accountUtils';

function canUseIndexedAccountId(accountId: string): boolean {
  return (
    accountUtils.isHdAccount({ accountId }) ||
    accountUtils.isHwAccount({ accountId }) ||
    accountUtils.isQrAccount({ accountId })
  );
}
```

### 4. 网络兼容性

不是所有网络都支持同一个索引账户。需要检查账户的兼容性：

```typescript
import { accountUtils } from '@onekeyhq/shared/src/utils/accountUtils';

async function isAccountCompatible(
  indexedAccountId: string,
  networkId: string,
): Promise<boolean> {
  try {
    const deriveType =
      await backgroundApiProxy.serviceNetwork.getGlobalDeriveTypeOfNetwork({
        networkId,
      });

    const accountId =
      await backgroundApiProxy.serviceAccount.getDbAccountIdFromIndexedAccountId(
        {
          indexedAccountId,
          networkId,
          deriveType,
        },
      );

    // 尝试获取账户，如果成功则兼容
    await backgroundApiProxy.serviceAccount.getAccount({
      accountId,
      networkId,
    });

    return true;
  } catch {
    return false;
  }
}
```

---

## 实际代码库中的使用示例

### 示例 1：ScanQrCode 中的使用

```typescript
// packages/kit/src/views/ScanQrCode/hooks/useParseQRCode.tsx
export const getAccountIdOnNetwork = async ({
  account,
  network,
}: {
  account?: INetworkAccount;
  network: IChainValue['network'];
}) => {
  if (account?.indexedAccountId) {
    // 1. 先尝试查找已存在的账户
    const { accounts } =
      await backgroundApiProxy.serviceAccount.getAccountsInSameIndexedAccountId(
        {
          indexedAccountId: account.indexedAccountId,
        },
      );
    const networkAccount = accounts.find((item) => item.impl === network?.impl);
    if (networkAccount) {
      return networkAccount.id;
    }

    // 2. 如果不存在，使用 createAddressIfNotExists 创建
    if (account?.id) {
      const newAccount =
        await backgroundApiProxy.serviceAccount.createAddressIfNotExists(
          {
            walletId: accountUtils.getWalletIdFromAccountId({
              accountId: account.id,
            }),
            networkId: network?.id || '',
            accountId: account.id,
            indexedAccountId: account.indexedAccountId,
          },
          {
            allowWatchAccount: false,
          },
        );
      return newAccount?.id;
    }
  }
};
```

### 示例 2：Market Trade Hook 中的使用

```typescript
// packages/kit/src/views/Market/components/tradeHook.tsx
const createAccountIfNotExists = useCallback(
  async (
    { allowWatchAccount }: { allowWatchAccount: boolean } = {
      allowWatchAccount: false,
    },
  ) => {
    if (networkId) {
      return backgroundApiProxy.serviceAccount.createAddressIfNotExists(
        {
          walletId: activeAccount?.wallet?.id || '',
          networkId,
          accountId: activeAccount?.account?.id,
          indexedAccountId: activeAccount?.indexedAccount?.id,
        },
        {
          allowWatchAccount,
        },
      );
    }
    return undefined;
  },
  [activeAccount, networkId],
);
```

---

## 完整工具函数

```typescript
import backgroundApiProxy from '@onekeyhq/kit/src/background/instance/backgroundApiProxy';
import type { INetworkAccount } from '@onekeyhq/shared/types/account';

/**
 * 通过 indexedAccountId 和 networkId 获取 accountId
 */
export async function getAccountIdFromIndexedAccountId(
  indexedAccountId: string,
  networkId: string,
  deriveType?: IAccountDeriveTypes,
): Promise<string> {
  // 如果没有提供 deriveType，使用默认值
  const finalDeriveType =
    deriveType ??
    (await backgroundApiProxy.serviceNetwork.getGlobalDeriveTypeOfNetwork({
      networkId,
    }));

  return backgroundApiProxy.serviceAccount.getDbAccountIdFromIndexedAccountId({
    indexedAccountId,
    networkId,
    deriveType: finalDeriveType,
  });
}

/**
 * 通过 indexedAccountId 和 networkId 获取完整账户信息
 */
export async function getAccountFromIndexedAccountId(
  indexedAccountId: string,
  networkId: string,
  deriveType?: IAccountDeriveTypes,
): Promise<INetworkAccount | undefined> {
  try {
    // 如果没有提供 deriveType，使用默认值
    const finalDeriveType =
      deriveType ??
      (await backgroundApiProxy.serviceNetwork.getGlobalDeriveTypeOfNetwork({
        networkId,
      }));

    return backgroundApiProxy.serviceAccount.getNetworkAccount({
      indexedAccountId,
      networkId,
      deriveType: finalDeriveType,
    });
  } catch (error) {
    console.error('Failed to get account:', error);
    return undefined;
  }
}

/**
 * 通过 indexedAccountId 和 networkId 获取 accountId（安全版本，返回 undefined 而不是抛出错误）
 */
export async function getAccountIdFromIndexedAccountIdSafe(
  indexedAccountId: string,
  networkId: string,
  deriveType?: IAccountDeriveTypes,
): Promise<string | undefined> {
  try {
    return await getAccountIdFromIndexedAccountId(
      indexedAccountId,
      networkId,
      deriveType,
    );
  } catch (error) {
    console.error('Failed to get accountId:', error);
    return undefined;
  }
}
```

---

## 总结

**最简单的方式**：

```typescript
// 1. 获取默认派生类型
const deriveType =
  await backgroundApiProxy.serviceNetwork.getGlobalDeriveTypeOfNetwork({
    networkId,
  });

// 2. 获取 accountId
const accountId =
  await backgroundApiProxy.serviceAccount.getDbAccountIdFromIndexedAccountId({
    indexedAccountId,
    networkId,
    deriveType,
  });
```

**或者直接获取完整账户信息**：

```typescript
// 1. 获取默认派生类型
const deriveType =
  await backgroundApiProxy.serviceNetwork.getGlobalDeriveTypeOfNetwork({
    networkId,
  });

// 2. 获取完整账户信息（包含 accountId）
const account = await backgroundApiProxy.serviceAccount.getNetworkAccount({
  indexedAccountId,
  networkId,
  deriveType,
});

const accountId = account.id;
```

两种方式都可以，选择哪种取决于你只需要 `accountId` 还是需要完整的账户信息。
