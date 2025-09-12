# OneKey Tab显示控制功能

## 🎯 功能概述

OneKey现在支持通过 `tabVisibilityConfig` 配置来优先控制底部Tab的显示/隐藏。这个配置具有最高优先级，可以覆盖原有的条件判断逻辑。

## 📁 文件位置

### 配置文件
```
📁 packages/kit/src/routes/Tab/config.ts
```

### 路由逻辑
```
📁 packages/kit/src/routes/Tab/router.ts
```

## ⚙️ 配置说明

### 优先级规则
1. **最高优先级**: `tabVisibilityConfig` 配置
   - 如果设置为 `false`，直接不显示该Tab
   - 如果设置为 `true`，继续使用原有逻辑判断
   - 如果未定义，使用原有逻辑判断

2. **原有逻辑**: 平台条件、功能开关等

### 配置示例

```typescript
const tabVisibilityConfig = {
  [ETabRoutes.Home]: true,        // 钱包首页 - 始终显示
  [ETabRoutes.Market]: true,      // 市场数据 - 可控制
  [ETabRoutes.Swap]: true,        // 交易交换 - 可控制
  [ETabRoutes.Perp]: true,        // 永续合约 - 可控制
  [ETabRoutes.Earn]: true,        // 收益理财 - 可控制
  [ETabRoutes.Discovery]: true,   // 发现页面 - 可控制
  [ETabRoutes.Me]: true,          // 更多设置 - 可控制
  [ETabRoutes.Developer]: true,   // 开发者模式 - 可控制
  [ETabRoutes.DeviceManagement]: true,  // 设备管理 - 可控制
  [ETabRoutes.ReferFriends]: true,      // 推荐好友 - 可控制
  [ETabRoutes.WebviewPerpTrade]: true,  // 桌面端永续合约 - 可控制
  [ETabRoutes.MultiTabBrowser]: true,   // 多标签浏览器 - 可控制
};
```

## 🔧 使用方法

### 1. 隐藏特定Tab
```typescript
const tabVisibilityConfig = {
  [ETabRoutes.Market]: false,     // 隐藏市场Tab
  [ETabRoutes.Swap]: false,       // 隐藏交易Tab
  [ETabRoutes.Perp]: false,       // 隐藏永续合约Tab
  // ... 其他配置
};
```

### 2. 显示特定Tab（使用原有逻辑）
```typescript
const tabVisibilityConfig = {
  [ETabRoutes.Discovery]: true,   // 显示发现Tab（如果原有条件满足）
  [ETabRoutes.Developer]: true,   // 显示开发者Tab（仅在开发模式）
  // ... 其他配置
};
```

### 3. 使用原有逻辑（不干预）
```typescript
const tabVisibilityConfig = {
  [ETabRoutes.Home]: true,        // 明确显示
  // 其他Tab不配置，使用原有逻辑
};
```

## 📋 支持的Tab列表

| Tab名称 | 路由常量 | 默认显示条件 | 可控制性 |
|---------|----------|-------------|----------|
| **钱包首页** | `ETabRoutes.Home` | 始终显示 | ✅ 可控制 |
| **市场数据** | `ETabRoutes.Market` | 始终显示 | ✅ 可控制 |
| **交易交换** | `ETabRoutes.Swap` | 始终显示 | ✅ 可控制 |
| **永续合约** | `ETabRoutes.Perp` | 始终显示 | ✅ 可控制 |
| **收益理财** | `ETabRoutes.Earn` | 始终显示 | ✅ 可控制 |
| **发现页面** | `ETabRoutes.Discovery` | 条件显示 | ✅ 可控制 |
| **更多设置** | `ETabRoutes.Me` | 开发模式 | ✅ 可控制 |
| **开发者模式** | `ETabRoutes.Developer` | 开发模式 | ✅ 可控制 |
| **设备管理** | `ETabRoutes.DeviceManagement` | 条件显示 | ✅ 可控制 |
| **推荐好友** | `ETabRoutes.ReferFriends` | 条件显示 | ✅ 可控制 |
| **桌面永续合约** | `ETabRoutes.WebviewPerpTrade` | 桌面端 | ✅ 可控制 |
| **多标签浏览器** | `ETabRoutes.MultiTabBrowser` | 条件显示 | ✅ 可控制 |

## 🚀 实现原理

### 核心函数
```typescript
const shouldShowTab = (tabName: ETabRoutes, originalCondition: boolean): boolean => {
  // 首先检查tabVisibilityConfig
  const visibilityConfig = tabVisibilityConfig[tabName];
  if (visibilityConfig === false) {
    return false; // 如果配置为false，直接不显示
  }
  if (visibilityConfig === true) {
    return originalCondition; // 如果配置为true，使用原有逻辑
  }
  // 如果配置未定义，使用原有逻辑
  return originalCondition;
};
```

### 应用方式
```typescript
// 在路由配置中使用
shouldShowTab(ETabRoutes.Market, true) ? {
  name: ETabRoutes.Market,
  // ... 其他配置
} : undefined,
```

## 💡 使用场景

### 1. 功能开关
- 根据用户权限隐藏某些功能Tab
- 根据地区限制隐藏特定功能
- 根据设备类型调整Tab显示

### 2. A/B测试
- 为不同用户组显示不同的Tab组合
- 测试新功能的用户接受度

### 3. 定制化部署
- 为企业客户定制Tab显示
- 为不同平台优化Tab布局

### 4. 渐进式发布
- 逐步开放新功能Tab
- 根据用户反馈调整显示策略

## ⚠️ 注意事项

1. **配置优先级**: `tabVisibilityConfig` 具有最高优先级
2. **类型安全**: 确保配置的Tab名称存在于 `ETabRoutes` 枚举中
3. **平台兼容**: 某些Tab可能只在特定平台显示
4. **性能考虑**: 配置变更会触发路由重新渲染
5. **用户体验**: 隐藏核心功能Tab可能影响用户体验

## 🔄 更新配置

修改 `packages/kit/src/routes/Tab/config.ts` 文件中的 `tabVisibilityConfig` 对象，保存后应用会自动重新加载Tab配置。

## 📊 调试技巧

1. **控制台日志**: 可以在 `shouldShowTab` 函数中添加日志
2. **开发工具**: 使用React DevTools查看Tab组件状态
3. **条件检查**: 验证原有条件是否按预期工作

这个功能为OneKey提供了灵活的Tab显示控制能力，可以根据不同的业务需求和用户场景来定制底部导航栏的显示内容。
