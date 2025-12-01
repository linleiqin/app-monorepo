# useHandleClaim 和 Claim 页面分析

## 概述

本文档详细分析 `useHandleClaim` hook 的实现逻辑，不同协议/产品的区别，以及 `EModalStakingRoutes.Claim` 页面的功能。

---

## 1. useHandleClaim Hook 分析

### 1.1 Hook 定义

```typescript
export const useHandleClaim = ({
  accountId,
  networkId,
}: {
  accountId?: string;
  networkId: string;
}) => {
  const appNavigation = useAppNavigation();
  const handleUniversalClaim = useUniversalClaim({
    networkId,
    accountId: accountId ?? '',
  });
  // ...
};
```

### 1.2 核心逻辑流程

`useHandleClaim` 根据不同的协议配置和参数，决定进入不同的领取流程：

```typescript
async ({
  claimType, // 领取类型：Claim | ClaimOrder | ClaimWithKyc
  protocolInfo, // 协议信息
  tokenInfo, // 代币信息
  symbol, // 代币符号
  claimAmount, // 可领取金额
  claimTokenAddress, // 领取代币地址
  isReward, // 是否是奖励领取
  stakingInfo, // 质押信息
  onSuccess, // 成功回调
}) => {
  // 1. 获取协议配置
  const stakingConfig = await getStakingConfigs({
    networkId,
    symbol,
    provider,
  });

  // 2. 判断流程分支
  if (isReward) {
    // 分支 1: 奖励领取（直接调用）
  } else if (provider === 'everstake' && symbol === 'apt') {
    // 分支 2: Everstake APT（导航到 Claim 页面）
  } else if (claimType === EClaimType.ClaimOrder) {
    // 分支 3: 订单领取（导航到 ClaimOptions 页面）
  } else if (claimType === EClaimType.Claim && claimAmount > 0) {
    // 分支 4: 有金额的直接领取（直接调用）
  } else if (stakingConfig.claimWithTx) {
    // 分支 5: 需要交易的领取（导航到 ClaimOptions 页面）
  } else {
    // 分支 6: 默认流程（直接调用）
  }
};
```

---

## 2. 不同产品的区别

### 2.1 分支 1: isReward（奖励领取）

**触发条件**: `isReward === true`

**处理方式**: 直接调用 `handleUniversalClaim`，不经过任何中间页面

**使用场景**:

- 某些协议的特殊奖励领取
- 不需要用户交互的自动领取

**代码**:

```typescript
if (isReward) {
  await handleUniversalClaim({
    amount: claimAmount,
    symbol,
    provider,
    stakingInfo,
    claimTokenAddress,
    vault,
  });
  return;
}
```

---

### 2.2 分支 2: Everstake APT（特殊处理）

**触发条件**:

- `provider.toLowerCase() === 'everstake'`
- `symbol.toLowerCase() === 'apt'`

**处理方式**: 导航到 `EModalStakingRoutes.Claim` 页面

**配置**: `claimWithAmount: true`（可选，根据配置决定是否传递 amount）

**使用场景**:

- Everstake 的 Aptos (APT) 质押奖励领取
- 需要用户输入或确认金额

**代码**:

```typescript
if (provider.toLowerCase() === 'everstake' && symbol.toLowerCase() === 'apt') {
  appNavigation.push(EModalStakingRoutes.Claim, {
    accountId,
    networkId,
    protocolInfo,
    tokenInfo,
    onSuccess,
    amount: stakingConfig.claimWithAmount ? claimAmount : undefined,
  });
  return;
}
```

---

### 2.3 分支 3: ClaimOrder（订单领取）

**触发条件**: `claimType === EClaimType.ClaimOrder`

**处理方式**: 导航到 `EModalStakingRoutes.ClaimOptions` 页面

**使用场景**:

- **Babylon BTC**: 需要选择具体的可领取订单
- 其他需要选择订单的协议

**代码**:

```typescript
if (claimType === EClaimType.ClaimOrder) {
  appNavigation.push(EModalStakingRoutes.ClaimOptions, {
    accountId,
    networkId,
    protocolInfo,
    tokenInfo,
    symbol,
    provider,
  });
  return;
}
```

**ClaimOptions 页面功能**:

- 调用 `getClaimableList` 获取可领取订单列表
- 用户选择订单后，调用 `handleUniversalClaim` 进行领取
- 对于 Babylon，领取后调用 `babylonClaimRecord` 记录

---

### 2.4 分支 4: Claim + 有金额（直接领取）

**触发条件**:

- `claimType === EClaimType.Claim`
- `claimAmount && Number(claimAmount) > 0`

**处理方式**: 直接调用 `handleUniversalClaim`

**使用场景**:

- Lido ETH: 有可领取金额，直接领取
- 其他协议：有明确金额的直接领取

**代码**:

```typescript
if (claimType === EClaimType.Claim && claimAmount && Number(claimAmount) > 0) {
  await handleUniversalClaim({
    amount: claimAmount,
    symbol,
    provider,
    claimTokenAddress,
    stakingInfo,
    protocolVault: vault,
    vault,
  });
  return;
}
```

---

### 2.5 分支 5: claimWithTx（需要交易的领取）

**触发条件**: `stakingConfig.claimWithTx === true`

**处理方式**: 导航到 `EModalStakingRoutes.ClaimOptions` 页面

**使用场景**:

- **Babylon BTC**: `claimWithTx: true`
- **Everstake POL**: `claimWithTx: true`
- 其他需要选择订单的协议

**配置示例**:

```typescript
// BTC 网络
Babylon: {
  claimWithTx: true,  // 需要选择订单
}

// EVM 网络
Everstake POL: {
  claimWithTx: true,  // 需要选择订单
}
```

**代码**:

```typescript
if (stakingConfig.claimWithTx) {
  appNavigation.push(EModalStakingRoutes.ClaimOptions, {
    accountId,
    networkId,
    protocolInfo,
    tokenInfo,
    symbol,
    provider,
  });
  return;
}
```

---

### 2.6 分支 6: 默认流程

**触发条件**: 不满足以上所有条件

**处理方式**: 直接调用 `handleUniversalClaim`

**使用场景**:

- 默认的领取流程
- 没有特殊配置的协议

**代码**:

```typescript
await handleUniversalClaim({
  amount: claimAmount,
  symbol,
  provider,
  claimTokenAddress,
  stakingInfo,
  protocolVault: vault,
  vault,
});
```

---

## 3. 协议配置对比

### 3.1 claimWithAmount

**含义**: 需要用户输入或确认金额的领取

**配置示例**:

```typescript
// EVM 网络
Lido ETH: {
  claimWithAmount: true,  // 导航到 Claim 页面
}

Everstake ETH: {
  claimWithAmount: true,  // 导航到 Claim 页面
}

// Cosmos 网络
Everstake ATOM: {
  claimWithAmount: true,  // 导航到 Claim 页面
}
```

**使用场景**:

- 用户需要输入或确认领取金额
- 需要显示费用估算和警告

---

### 3.2 claimWithTx

**含义**: 需要选择订单的领取（需要交易）

**配置示例**:

```typescript
// BTC 网络
Babylon BTC: {
  claimWithTx: true,  // 导航到 ClaimOptions 页面
}

// EVM 网络
Everstake POL: {
  claimWithTx: true,  // 导航到 ClaimOptions 页面
}
```

**使用场景**:

- 有多个可领取订单，需要用户选择
- 每个订单对应一个交易

---

### 3.3 无特殊配置

**含义**: 直接领取，不需要中间页面

**配置示例**:

```typescript
// 大多数协议默认配置
Morpho: {
  // 无 claimWithAmount 或 claimWithTx
  // 直接调用 handleUniversalClaim
}
```

**使用场景**:

- 有明确的领取金额
- 不需要用户选择或输入

---

## 4. EModalStakingRoutes.Claim 页面分析

### 4.1 页面功能

`Claim` 页面是一个**金额输入和确认页面**，用于需要用户输入或确认领取金额的协议。

### 4.2 页面结构

```typescript
<Page>
  <Page.Header title="领取 {token}" />
  <Page.Body>
    <UniversalClaim
      accountId={accountId}
      networkId={networkId}
      balance={protocolInfo?.claimable ?? '0'} // 可领取余额
      initialAmount={initialAmount} // 初始金额（可选）
      tokenSymbol={symbol}
      onConfirm={onConfirm} // 确认回调
      estimateFeeResp={estimateFeeResp} // 费用估算
      // ... 其他 props
    />
  </Page.Body>
</Page>
```

### 4.3 路由参数

```typescript
interface ClaimPageParams {
  accountId: string;
  networkId: string;
  protocolInfo?: IProtocolInfo;
  tokenInfo?: IEarnTokenInfo;
  amount?: string; // 初始金额（可选）
  identity?: string; // 身份标识（可选）
  onSuccess?: () => void; // 成功回调
}
```

### 4.4 页面加载时的操作

**费用估算**:

```typescript
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
    amount: '1', // 使用 1 作为示例金额
    protocolVault: vault,
    accountAddress: account.address,
    identity,
  });
  return resp;
}, [accountId, networkId, provider, symbol, vault, identity]);
```

### 4.5 用户确认流程

```typescript
const onConfirm = useCallback(
  async (amount: string) => {
    await handleClaim({
      amount,
      identity,
      vault,
      symbol,
      provider,
      protocolVault: vault,
      stakingInfo: {
        label: EEarnLabels.Claim,
        protocol: earnUtils.getEarnProviderName({ providerName: provider }),
        protocolLogoURI: protocolInfo?.providerDetail.logoURI,
        receive: { token: info as IEarnToken, amount },
        tags: [actionTag],
      },
      onSuccess: () => {
        appNavigation.pop(); // 返回上一页
        onSuccess?.();
      },
    });
  },
  [
    /* dependencies */
  ],
);
```

---

## 5. UniversalClaim 组件功能

### 5.1 主要功能

1. **金额输入**: 支持手动输入或选择百分比
2. **余额显示**: 显示可领取余额
3. **费用估算**: 显示网络费用
4. **金额验证**: 实时验证输入金额
5. **费用警告**: 如果代币价值 < Gas 费用，显示警告

### 5.2 关键特性

- **防抖输入**: 使用 `useDebouncedCallback` 防止频繁 API 调用
- **金额检查**: 调用 `checkAmount` 验证金额
- **费用比较**: 在 `useUniversalClaim` 中比较代币价值和 Gas 费用

---

## 6. 完整流程对比

### 6.1 Lido ETH（claimWithAmount: true）

```
ProtocolDetailsV2
  ↓ 点击领取
useHandleClaim
  ↓ claimType === Claim && claimAmount > 0
handleUniversalClaim (直接调用)
  ↓ amount > 0
estimateFee (检查费用)
  ↓ 代币价值 < Gas 费用?
显示费用警告对话框
  ↓ 用户确认
buildClaimTransaction
  ↓
导航到交易确认页
```

**注意**: Lido ETH 虽然有 `claimWithAmount: true`，但如果 `claimAmount > 0`，会直接调用 `handleUniversalClaim`，不会进入 `Claim` 页面。

---

### 6.2 Everstake APT（特殊处理）

```
ProtocolDetailsV2
  ↓ 点击领取
useHandleClaim
  ↓ provider === 'everstake' && symbol === 'apt'
导航到 Claim 页面
  ↓ 页面加载
estimateFee (估算费用)
  ↓ 用户输入金额
checkAmount (验证金额)
  ↓ 用户点击确认
handleUniversalClaim
  ↓
导航到交易确认页
```

---

### 6.3 Babylon BTC（claimWithTx: true）

```
ProtocolDetailsV2
  ↓ 点击领取
useHandleClaim
  ↓ claimType === ClaimOrder 或 claimWithTx === true
导航到 ClaimOptions 页面
  ↓ 页面加载
getClaimableList (获取可领取订单列表)
  ↓ 用户选择订单
handleUniversalClaim (传递 identity: item.id)
  ↓
导航到交易确认页
  ↓ 交易成功
babylonClaimRecord (记录领取)
addBabylonTrackingItem (添加跟踪项)
```

---

### 6.4 默认协议（无特殊配置）

```
ProtocolDetailsV2
  ↓ 点击领取
useHandleClaim
  ↓ 默认流程
handleUniversalClaim (直接调用)
  ↓
导航到交易确认页
```

---

## 7. 关键配置标志总结

| 配置标志                | 含义                  | 使用协议                     | 页面跳转                              |
| ----------------------- | --------------------- | ---------------------------- | ------------------------------------- |
| `claimWithAmount: true` | 需要用户输入/确认金额 | Lido ETH, Everstake ETH/ATOM | Claim 页面（Everstake APT）或直接调用 |
| `claimWithTx: true`     | 需要选择订单          | Babylon BTC, Everstake POL   | ClaimOptions 页面                     |
| `claimType: ClaimOrder` | 订单领取类型          | Babylon BTC                  | ClaimOptions 页面                     |
| `isReward: true`        | 奖励领取              | 特殊场景                     | 直接调用                              |
| 无特殊配置              | 默认流程              | 大多数协议                   | 直接调用                              |

---

## 8. 代码位置索引

- **useHandleClaim**: `packages/kit/src/views/Staking/pages/ProtocolDetails/useHandleClaim.ts`
- **Claim 页面**: `packages/kit/src/views/Staking/pages/Claim/index.tsx`
- **ClaimOptions 页面**: `packages/kit/src/views/Staking/pages/ClaimOptions/index.tsx`
- **UniversalClaim 组件**: `packages/kit/src/views/Staking/components/UniversalClaim/index.tsx`
- **useUniversalClaim**: `packages/kit/src/views/Staking/hooks/useUniversalHooks.ts`
- **协议配置**: `packages/kit-bg/src/vaults/impls/*/settings.ts`

---

## 9. Claim 页面详细分析

### 9.1 页面入口

**路由**: `EModalStakingRoutes.Claim`

**导航方式**:

```typescript
appNavigation.push(EModalStakingRoutes.Claim, {
  accountId,
  networkId,
  protocolInfo,
  tokenInfo,
  onSuccess,
  amount: stakingConfig.claimWithAmount ? claimAmount : undefined,
});
```

### 9.2 页面功能

#### 9.2.1 费用估算（页面加载时）

```typescript
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
    amount: '1', // 使用 1 作为示例金额
    protocolVault: vault,
    accountAddress: account.address,
    identity,
  });
  return resp;
}, [accountId, networkId, provider, symbol, vault, identity]);
```

**用途**:

- 在页面加载时估算网络费用
- 传递给 `UniversalClaim` 组件显示费用信息

#### 9.2.2 确认回调

```typescript
const onConfirm = useCallback(
  async (amount: string) => {
    await handleClaim({
      amount,
      identity,
      vault,
      symbol,
      provider,
      protocolVault: vault,
      stakingInfo: {
        label: EEarnLabels.Claim,
        protocol: earnUtils.getEarnProviderName({ providerName: provider }),
        protocolLogoURI: protocolInfo?.providerDetail.logoURI,
        receive: { token: info as IEarnToken, amount },
        tags: [actionTag],
      },
      onSuccess: () => {
        appNavigation.pop();
        onSuccess?.();
      },
    });
  },
  [
    /* dependencies */
  ],
);
```

**流程**:

1. 用户输入金额并点击确认
2. 调用 `handleClaim`（即 `useUniversalClaim`）
3. 在 `useUniversalClaim` 中检查费用警告
4. 构建交易并导航到交易确认页

---

### 9.3 UniversalClaim 组件详细功能

#### 9.3.1 金额输入

**功能**:

- 支持手动输入金额
- 支持选择百分比（25%, 50%, 75%, 100%）
- 支持点击余额自动填入最大金额
- 实时验证金额格式和精度

**验证逻辑**:

```typescript
const onChangeAmountValue = useCallback(
  (value: string) => {
    // 1. 验证输入格式
    if (!validateAmountInputForStaking(value, decimals)) {
      return;
    }

    // 2. 检查是否为 NaN
    const valueBN = new BigNumber(value);
    if (valueBN.isNaN()) {
      if (value === '') {
        setAmountValue('');
        setCheckoutAmountMessage('');
        setCheckAmountAlerts([]);
      }
      return;
    }

    // 3. 检查小数位数
    const isOverflowDecimals = Boolean(
      decimals && Number(decimals) > 0 && countDecimalPlaces(value) > decimals,
    );
    if (isOverflowDecimals) {
      setAmountValue((oldValue) => oldValue);
    } else {
      setAmountValue(value);
    }

    // 4. 防抖调用 checkAmount
    void checkAmount(value);
  },
  [decimals, checkAmount],
);
```

#### 9.3.2 金额检查（防抖 300ms）

**API 调用**: `GET /earn/v1/check-amount`

**参数**:

```typescript
{
  accountId,
  networkId,
  symbol: tokenSymbol,
  provider: providerName,
  action: ECheckAmountActionType.CLAIM,
  amount,
  withdrawAll: false,
}
```

**返回数据**:

```typescript
{
  code: string;
  message: string;
  data?: {
    alerts: ICheckAmountAlert[];  // 警告信息数组
  };
}
```

**用途**:

- 验证金额是否有效
- 获取风险提示和警告
- 显示在 UI 上（Alert 组件）

#### 9.3.3 余额验证

**验证项**:

1. **余额不足**: `amountValue > balance`
2. **小于最小金额**: `amountValue < minAmount`
3. **金额检查错误**: `checkAmountMessage` 存在

**禁用条件**:

```typescript
const isDisable = useMemo(
  () =>
    BigNumber(amountValue).isNaN() ||
    BigNumber(amountValue).isLessThanOrEqualTo(0) ||
    isInsufficientBalance ||
    isLessThanMinAmount ||
    isCheckAmountMessageError,
  [
    amountValue,
    isCheckAmountMessageError,
    isInsufficientBalance,
    isLessThanMinAmount,
  ],
);
```

#### 9.3.4 费用警告（在 useUniversalClaim 中）

**检查逻辑**:

```typescript
if (Number(amount) > 0) {
  const estimateFeeResp = await backgroundApiProxy.serviceStaking.estimateFee({
    networkId,
    provider,
    symbol,
    action: 'claim',
    amount,
    protocolVault,
    identity,
    accountAddress: account.address,
  });

  const tokenFiatValueBN = BigNumber(estimateFeeResp.token.price).multipliedBy(
    amount,
  );

  // 如果代币价值 < Gas 费用，显示警告
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

**警告内容**:

- 代币价值: `claimTokenFiatValue`
- 预估 Gas 费用: `estFiatValue`
- 提示用户代币价值可能小于 Gas 费用

#### 9.3.5 UI 显示

**显示内容**:

1. **金额输入框**: 支持输入和选择百分比
2. **余额显示**: 显示可领取余额
3. **法币价值**: 显示输入金额的法币价值
4. **费用估算**: 显示网络费用（来自 `estimateFeeResp`）
5. **警告信息**: 显示 `checkAmountAlerts` 和 `checkAmountMessage`
6. **预计收到**: 显示预计收到的代币数量

**可编辑性**:

```typescript
const editable = initialAmount === undefined;
```

- 如果传入了 `initialAmount`，输入框不可编辑（只读模式）
- 如果没有传入，用户可以自由输入

---

## 10. 不同协议使用 Claim 页面的场景

### 10.1 Everstake APT（唯一明确使用）

**触发条件**:

- `provider === 'everstake' && symbol === 'apt'`

**特点**:

- 总是进入 `Claim` 页面
- 可能需要用户输入或确认金额
- 显示费用估算和警告

### 10.2 Lido ETH（间接使用）

**触发条件**:

- `claimWithAmount: true`
- 但如果有 `claimAmount > 0`，会直接调用 `handleUniversalClaim`

**特点**:

- 如果金额为 0 或未定义，可能会进入 `Claim` 页面
- 主要用于需要用户确认金额的场景

### 10.3 其他协议（很少使用）

大多数协议不会进入 `Claim` 页面，而是：

- 直接调用 `handleUniversalClaim`（有明确金额）
- 进入 `ClaimOptions` 页面（需要选择订单）

---

## 11. 总结

### 11.1 useHandleClaim 的核心逻辑

`useHandleClaim` 是一个**路由分发器**，根据协议配置和参数决定进入不同的领取流程：

1. **直接领取**: 大多数协议，直接调用 `handleUniversalClaim`
2. **金额输入**: Everstake APT，导航到 `Claim` 页面
3. **订单选择**: Babylon BTC 等，导航到 `ClaimOptions` 页面

### 11.2 Claim 页面的作用

`Claim` 页面主要用于：

- 需要用户输入或确认金额的协议（如 Everstake APT）
- 显示费用估算和警告
- 提供金额验证和输入界面
- 支持只读模式（传入 `initialAmount`）和可编辑模式

### 11.3 不同协议的区别

| 协议              | 配置                    | 流程              | 页面                |
| ----------------- | ----------------------- | ----------------- | ------------------- |
| **Lido ETH**      | `claimWithAmount: true` | 有金额 → 直接调用 | 无                  |
| **Everstake APT** | 特殊处理                | 总是进入          | `Claim` 页面        |
| **Babylon BTC**   | `claimWithTx: true`     | 选择订单          | `ClaimOptions` 页面 |
| **Everstake POL** | `claimWithTx: true`     | 选择订单          | `ClaimOptions` 页面 |
| **其他协议**      | 无特殊配置              | 直接调用          | 无                  |

### 11.4 关键配置标志

- **`claimWithAmount: true`**: 需要用户输入/确认金额（但 Everstake APT 是特殊处理）
- **`claimWithTx: true`**: 需要选择订单，进入 `ClaimOptions` 页面
- **`claimType: ClaimOrder`**: 订单领取类型，进入 `ClaimOptions` 页面
- **`isReward: true`**: 奖励领取，直接调用

### 11.5 Claim 页面的核心功能

1. **金额输入和验证**: 支持手动输入、百分比选择、余额填入
2. **实时金额检查**: 防抖调用 `checkAmount` API
3. **费用估算**: 页面加载时估算费用
4. **费用警告**: 在 `useUniversalClaim` 中检查并显示警告
5. **UI 反馈**: 显示余额、法币价值、警告信息等
