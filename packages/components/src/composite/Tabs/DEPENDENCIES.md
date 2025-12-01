# Tabs 组件依赖项分析

本文档详细列出了 `Tabs` 组件的所有依赖项，用于在其他项目中直接使用该组件时的参考。

## 📦 必需的外部 npm 包

### 核心依赖

```bash
npm install react react-native
```

### UI 框架和样式

```bash
npm install tamagui @tamagui/core
```

- **用途**: `XStack`, `YStack`, `SizableText`, `Separator` 等基础组件
- **必需度**: ⚠️ **必须安装** - 组件严重依赖 Tamagui

### 动画库

```bash
npm install react-native-reanimated
```

- **用途**: `useSharedValue`, `useAnimatedReaction`, `runOnJS` 等
- **必需度**: ⚠️ **必须安装**

### 虚拟化列表

```bash
npm install react-virtualized
```

- **用途**: `WindowScroller`, `AutoSizer`, `List`, `Collection`, `CellMeasurer`, `CellMeasurerCache`
- **必需度**: ⚠️ **必须安装** - 用于 Web 平台的列表虚拟化

### 原生平台标签页库

```bash
npm install react-native-collapsible-tab-view
```

- **用途**:
  - 原生平台（`.native.tsx`）使用
  - Web 平台仅用于类型定义
- **必需度**: ⚠️ **必须安装** - 即使只在 Web 使用也需要（类型依赖）

### 工具库

```bash
npm install lodash
```

- **用途**: `debounce` 函数
- **必需度**: ⚠️ **必须安装**

```bash
npm install use-debounce
```

- **用途**: `useThrottledCallback` hook
- **必需度**: ⚠️ **必须安装**

### FlashList 类型

```bash
npm install @shopify/flash-list
```

- **用途**: `FlashListProps` 类型定义
- **必需度**: ℹ️ **可选** - 仅用于类型定义，如果不使用可以移除相关类型

### 导航库（类型定义）

```bash
npm install @react-navigation/native
```

- **用途**: `EventArg`, `EventConsumer` 类型
- **必需度**: ℹ️ **可选** - 仅用于类型定义

---

## 🏠 OneKey 内部依赖（需要替换）

### 1. `@onekeyhq/kit-bg`

```typescript
import { useAppSideBarStatusAtom } from '@onekeyhq/kit-bg/src/states/jotai/atoms';
```

- **用途**: 获取侧边栏状态
- **替换方案**:
  - 移除侧边栏宽度计算逻辑，或
  - 使用你项目中的全局状态管理

**影响的文件**: `hooks.tsx` (line 12)

### 2. `@onekeyhq/shared`

```typescript
import platformEnv from '@onekeyhq/shared/src/platformEnv';
```

- **用途**: 平台检测（Web/Native/iOS/Android）
- **替换方案**:
  - 创建简单的平台检测工具
  - 或使用 `Platform.OS` from `react-native`

**影响的文件**: `hooks.tsx` (line 13)

### 3. `../../primitives` (内部组件)

```typescript
import { XStack, YStack } from '../../primitives';
import { SizableText } from '../../primitives';
```

- **实际来源**: `tamagui` (XStack, YStack, SizableText)
- **替换方案**: 直接使用 Tamagui 组件
- **影响的文件**:
  - `Container.tsx` (line 18)
  - `TabBar.tsx` (line 8)
  - `ScrollView.tsx` (line 3)

### 4. `../../content` (内部组件)

```typescript
import { Divider } from '../../content';
```

- **实际来源**: `tamagui` 的 `Separator` 组件
- **替换方案**:
  ```typescript
  import { Separator } from 'tamagui';
  // 或使用自定义 Divider 组件
  ```
- **影响的文件**: `TabBar.tsx` (line 6)

### 5. `../../layouts` (内部组件)

```typescript
import { ListView } from '../../layouts';
import type { IListViewRef } from '../../layouts';
```

- **实际来源**: 基于 `@shopify/flash-list` 和 `react-native` 的 `FlatList`
- **替换方案**:
  - 使用 `@shopify/flash-list` 的 `FlashList`，或
  - 使用 `react-native` 的 `FlatList`
- **影响的文件**: `TabBar.tsx` (line 7, 10)

### 6. `../../hooks` (内部 Hooks)

```typescript
import { getTokens, useIsHorizontalLayout, useMedia } from '../../hooks';
```

- **用途**:
  - `getTokens`: 获取 Tamagui tokens
  - `useIsHorizontalLayout`: 检测横向布局
  - `useMedia`: 响应式媒体查询
- **替换方案**:
  - `getTokens`: 使用 `getTokenValue` from `tamagui`
  - `useIsHorizontalLayout`: 使用 `useWindowDimensions` from `react-native`
  - `useMedia`: 使用 Tamagui 的媒体查询或自定义实现
- **影响的文件**: `hooks.tsx` (line 15)

---

## 📋 完整安装命令

### 最小依赖集（仅 npm 包）

```bash
npm install \
  react \
  react-native \
  tamagui \
  @tamagui/core \
  react-native-reanimated \
  react-virtualized \
  react-native-collapsible-tab-view \
  lodash \
  use-debounce \
  @shopify/flash-list \
  @react-navigation/native
```

### 类型定义（TypeScript）

```bash
npm install --save-dev \
  @types/lodash \
  @types/react \
  @types/react-native
```

---

## 🔧 迁移步骤建议

### 1. 替换内部组件导入

#### `primitives` → `tamagui`

```typescript
// 替换前
import { XStack, YStack, SizableText } from '../../primitives';

// 替换后
import { XStack, YStack, SizableText } from 'tamagui';
```

#### `content/Divider` → `tamagui/Separator`

```typescript
// 替换前
import { Divider } from '../../content';

// 替换后
import { Separator } from 'tamagui';
// 或创建自定义 Divider 组件
const Divider = styled(Separator, {
  borderColor: '$borderSubdued',
  borderBottomWidth: StyleSheet.hairlineWidth,
});
```

#### `layouts/ListView` → `FlashList` 或 `FlatList`

```typescript
// 替换前
import { ListView } from '../../layouts';

// 替换后
import { FlashList } from '@shopify/flash-list';
// 或
import { FlatList } from 'react-native';
```

### 2. 替换内部 Hooks

在 `hooks.tsx` 中：

```typescript
// 替换 getTokens
import { getTokenValue } from 'tamagui';
// 使用: getTokenValue('$size.sideBarWidth', 'size')

// 替换 useIsHorizontalLayout
import { useWindowDimensions } from 'react-native';
const isHorizontal = width > height; // 简化实现

// 替换 useMedia
// 使用 Tamagui 的 useMedia 或自定义实现
```

### 3. 替换平台检测

```typescript
// 替换前
import platformEnv from '@onekeyhq/shared/src/platformEnv';

// 替换后
import { Platform } from 'react-native';
const platformEnv = {
  isNative: Platform.OS !== 'web',
  isNativeIOSPad: Platform.OS === 'ios' && /* iPad 检测逻辑 */,
  // ... 其他平台属性
};
```

### 4. 移除或替换侧边栏依赖

```typescript
// 替换前
import { useAppSideBarStatusAtom } from '@onekeyhq/kit-bg/src/states/jotai/atoms';

// 替换后
// 方案 1: 移除侧边栏宽度计算
const sideBarWidth = 0;

// 方案 2: 使用你的状态管理
const [{ collapsed: leftSidebarCollapsed }] = useYourSidebarState();
```

---

## 📊 依赖项优先级总结

| 依赖项                              | 必需度  | 说明               |
| ----------------------------------- | ------- | ------------------ |
| `react`                             | 🔴 必须 | React 核心         |
| `react-native`                      | 🔴 必须 | React Native 核心  |
| `tamagui`                           | 🔴 必须 | UI 框架基础        |
| `react-native-reanimated`           | 🔴 必须 | 动画和响应式值     |
| `react-virtualized`                 | 🔴 必须 | Web 平台列表虚拟化 |
| `react-native-collapsible-tab-view` | 🔴 必须 | 原生平台实现和类型 |
| `lodash`                            | 🔴 必须 | debounce 函数      |
| `use-debounce`                      | 🔴 必须 | 节流回调           |
| `@shopify/flash-list`               | 🟡 可选 | 仅类型定义         |
| `@react-navigation/native`          | 🟡 可选 | 仅类型定义         |

---

## ⚠️ 注意事项

1. **Tamagui 配置**: 确保正确配置 Tamagui 的 tokens 和主题系统
2. **平台特定代码**: 组件使用 `.native.tsx` 和 `.tsx` 区分平台，确保构建工具支持
3. **类型定义**: TypeScript 项目需要安装相应的类型定义包
4. **React Native 版本兼容性**: 确保 `react-native-reanimated` 与你的 React Native 版本兼容
5. **Web 平台**: 如果只在 Web 使用，可以考虑移除 `react-native-collapsible-tab-view` 的相关代码

---

## 🔍 文件清单

需要迁移的文件：

- ✅ `index.tsx` - 主入口（需调整导入）
- ✅ `Container.tsx` - 容器组件（需替换 primitives）
- ✅ `TabBar.tsx` - 标签栏（需替换多个内部依赖）
- ✅ `List.tsx` - 列表组件（需替换 layouts）
- ✅ `ScrollView.tsx` - 滚动视图（需替换 primitives）
- ✅ `Tab.tsx` - 标签页（无内部依赖）
- ✅ `hooks.tsx` - Hooks（需替换多个内部依赖）
- ✅ `context.ts` - 上下文（无内部依赖）
- ✅ `useEventEmitter.tsx` - 事件发射器（无内部依赖）
- ✅ `TabNameContext.ts` - 标签名上下文（无内部依赖）
- ✅ `utils.ts` - 工具函数（无内部依赖）
- ✅ `index.native.tsx` - 原生平台入口（使用原生库）
- ✅ `useCurrentTabScrollY.ts` - Web 实现（无内部依赖）
- ✅ `useFocusedTab.ts` - Web 实现（无内部依赖）



