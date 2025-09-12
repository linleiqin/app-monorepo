# OneKey 应用路由结构详细分析

## 🏗️ 路由架构概览

OneKey采用React Navigation作为路由管理框架，实现了多层次的导航结构，支持Tab导航、Modal导航和Stack导航。

### 路由层次结构
```
Root Navigator
├── Main (Tab Navigator)
│   ├── Home Tab
│   ├── Market Tab  
│   ├── Swap Tab
│   ├── Discovery Tab
│   └── Me Tab
├── Modal Navigator
│   ├── 各种Modal页面
│   └── 设置Modal
└── iOS Full Screen Navigator
```

## 📱 根路由配置 (Root Routes)

| 路由名称 | 路由类型 | 组件 | 描述 | 平台支持 |
|---------|----------|------|------|----------|
| **Main** | Tab Navigator | TabNavigator | 主Tab导航器 | 全平台 |
| **Modal** | Modal Navigator | ModalNavigator | 模态页面导航器 | 全平台 |
| **iOSFullScreen** | iOS Full Screen | iOSFullScreenNavigator | iOS全屏导航器 | iOS |
| **Gallery** | Gallery | Gallery组件 | 开发调试页面 | 开发模式 |
| **NotFound** | 404页面 | NotFound组件 | 页面未找到 | 全平台 |
| **PermissionWebDevice** | 权限页面 | 权限组件 | Web设备权限 | Web |

## 🏠 主Tab路由配置 (Tab Routes)

### Tab导航器结构

| Tab名称 | 路由标识 | 图标 | 翻译ID | 重写路径 | 描述 |
|---------|----------|------|--------|----------|------|
| **Home** | ETabRoutes.Home | WalletSolid/Outline | global_wallet | / | 钱包首页 |
| **Market** | ETabRoutes.Market | ChartTrendingUp2Solid/Outline | global_market | /market | 市场数据 |
| **Swap** | ETabRoutes.Swap | SwapHorSolid/Outline | global_trade | /swap | 交易交换 |
| **Discovery** | ETabRoutes.Discovery | CompassSolid/Outline | global_explore | /discovery | 探索发现 |
| **Me** | ETabRoutes.Me | LayoutGrid2Solid/Outline | global_more | /me | 更多设置 |
| **Developer** | ETabRoutes.Developer | CodeBracketsSolid/Outline | global_dev_mode | /dev | 开发者模式 |
| **Earn** | ETabRoutes.Earn | TrendingUpSolid/Outline | global_earn | /earn | 收益理财 |
| **Perp** | ETabRoutes.Perp | TradingViewCandlesSolid/Outline | global_perp | - | 永续合约 |
| **DeviceManagement** | ETabRoutes.DeviceManagement | OnekeyDeviceCustom | global_my_onekey | - | 设备管理 |
| **ReferFriends** | ETabRoutes.ReferFriends | GiftSolid/Outline | global_referral | - | 推荐好友 |

### 平台特定显示逻辑

| 平台 | 显示的Tab | 隐藏的Tab | 特殊配置 |
|------|----------|----------|----------|
| **移动端** | Home, Market, Swap, Discovery, Me | Developer, DeviceManagement | 原生导航栏 |
| **桌面端** | Home, Market, Swap, Discovery, Me, DeviceManagement | Developer | 自定义导航栏 |
| **Web端** | Home, Market, Swap, Discovery, Me | Developer, DeviceManagement | 响应式布局 |
| **扩展端** | Home, Market, Swap, Discovery, Me | Developer, DeviceManagement | 扩展特定UI |
| **开发模式** | 所有Tab | 无 | 包含Developer Tab |

## 🏠 Home Tab 子路由

| 路由名称 | 组件 | 重写路径 | 描述 | 平台显示 |
|---------|------|----------|------|----------|
| **TabHome** | HomePageContainer | / | 钱包首页容器 | 全平台 |
| **TabHomeUrlAccountLanding** | UrlAccountLanding | /account/:accountId | 账户落地页 | Web |
| **TabHomeUrlAccountPage** | UrlAccountPageContainer | - | 账户页面容器 | Web |

## 📈 Market Tab 子路由

| 路由名称 | 组件 | 重写路径 | 描述 | 平台显示 |
|---------|------|----------|------|----------|
| **TabMarket** | MarketHome | / | 市场首页 | 全平台 |
| **MarketDetail** | MarketDetail | /tokens/:token | 代币详情页 | 全平台 |
| **MarketDetailV2** | MarketDetailV2 | /tokens/v2/:networkId | 代币详情页V2 | 全平台 |

## 🔄 Swap Tab 子路由

| 路由名称 | 组件 | 重写路径 | 描述 | 平台显示 |
|---------|------|----------|------|----------|
| **TabSwap** | SwapHome | / | 交换首页 | 全平台 |

## 🌐 Discovery Tab 子路由

| 路由名称 | 组件 | 重写路径 | 描述 | 平台显示 |
|---------|------|----------|------|----------|
| **TabDiscovery** | Browser/DiscoveryDashboard | / | 浏览器/发现面板 | 平台相关 |

### 平台特定显示逻辑
- **移动端**: 显示Browser组件
- **桌面端/Web端**: 显示DiscoveryDashboard组件

## ⚙️ Me Tab 子路由

| 路由名称 | 组件 | 重写路径 | 描述 | 平台显示 |
|---------|------|----------|------|----------|
| **TabMe** | TabMe | / | 更多页面 | 全平台 |

## 🎯 Modal路由配置 (Modal Routes)

### 主要Modal路由

| Modal名称 | 路由标识 | 描述 | 子路由数量 | 特殊功能 |
|-----------|----------|------|------------|----------|
| **MainModal** | EModalRoutes.MainModal | 主Modal | 3+ | 资产列表、详情、奖励中心 |
| **DiscoveryModal** | EModalRoutes.DiscoveryModal | 发现Modal | 5+ | DApp浏览、搜索 |
| **SettingModal** | EModalRoutes.SettingModal | 设置Modal | 20+ | 完整设置页面 |
| **SwapModal** | EModalRoutes.SwapModal | 交换Modal | 3+ | 代币交换流程 |
| **PerpModal** | EModalRoutes.PerpModal | 永续合约Modal | 2+ | 合约交易 |
| **MarketModal** | EModalRoutes.MarketModal | 市场Modal | 3+ | 市场数据展示 |
| **AccountManagerStacks** | EModalRoutes.AccountManagerStacks | 账户管理 | 10+ | 钱包管理 |
| **OnboardingModal** | EModalRoutes.OnboardingModal | 引导Modal | 15+ | 新用户引导 |
| **PrimeModal** | EModalRoutes.PrimeModal | Prime会员Modal | 5+ | 会员服务 |
| **FirmwareUpdateModal** | EModalRoutes.FirmwareUpdateModal | 固件更新Modal | 8+ | 硬件更新 |

### 功能Modal路由

| Modal名称 | 路由标识 | 描述 | 使用场景 |
|-----------|----------|------|----------|
| **AssetSelectorModal** | EModalRoutes.AssetSelectorModal | 资产选择器 | 选择代币 |
| **ChainSelectorModal** | EModalRoutes.ChainSelectorModal | 链选择器 | 选择网络 |
| **SendModal** | EModalRoutes.SendModal | 发送Modal | 转账操作 |
| **ReceiveModal** | EModalRoutes.ReceiveModal | 接收Modal | 收款操作 |
| **ScanQrCodeModal** | EModalRoutes.ScanQrCodeModal | 扫码Modal | QR码扫描 |
| **DAppConnectionModal** | EModalRoutes.DAppConnectionModal | DApp连接Modal | Web3连接 |
| **SignatureConfirmModal** | EModalRoutes.SignatureConfirmModal | 签名确认Modal | 交易确认 |
| **StakingModal** | EModalRoutes.StakingModal | 质押Modal | 质押操作 |
| **AddressBookModal** | EModalRoutes.AddressBookModal | 地址簿Modal | 地址管理 |
| **CloudBackupModal** | EModalRoutes.CloudBackupModal | 云备份Modal | 数据备份 |
| **LiteCardModal** | EModalRoutes.LiteCardModal | Lite卡Modal | 硬件卡操作 |
| **KeyTagModal** | EModalRoutes.KeyTagModal | KeyTagModal | 密钥标签 |
| **FiatCryptoModal** | EModalRoutes.FiatCryptoModal | 法币加密Modal | 法币交易 |
| **UniversalSearchModal** | EModalRoutes.UniversalSearchModal | 全局搜索Modal | 搜索功能 |
| **NotificationsModal** | EModalRoutes.NotificationsModal | 通知Modal | 消息通知 |
| **ShortcutsModal** | EModalRoutes.ShortcutsModal | 快捷键Modal | 快捷键设置 |
| **DeviceManagementModal** | EModalRoutes.DeviceManagementModal | 设备管理Modal | 硬件管理 |
| **ReferFriendsModal** | EModalRoutes.ReferFriendsModal | 推荐好友Modal | 推荐系统 |
| **BulkCopyAddressesModal** | EModalRoutes.BulkCopyAddressesModal | 批量复制地址Modal | 批量操作 |
| **ApprovalManagementModal** | EModalRoutes.ApprovalManagementModal | 授权管理Modal | 合约授权 |
| **SignAndVerifyModal** | EModalRoutes.SignAndVerifyModal | 签名验证Modal | 消息签名 |

## ⚙️ 设置页面路由结构

### 设置主页面

| 设置分类 | 路由标识 | 组件 | 描述 | 子页面数量 |
|---------|----------|------|------|------------|
| **通用设置** | SettingListModal | SettingTabModal | 设置列表 | 10+ |
| **子设置页面** | SettingListSubModal | SettingListSubModal | 子设置页面 | 动态 |

### 设置子页面路由

| 设置页面 | 路由标识 | 组件 | 描述 | 重写路径 |
|---------|----------|------|------|----------|
| **货币设置** | SettingCurrencyModal | SettingCurrencyModal | 货币单位设置 | - |
| **UTXO设置** | SettingSpendUTXOModal | SettingSpendUTXOModal | UTXO消费设置 | - |
| **账户派生** | SettingAccountDerivationModal | SettingAccountDerivationModal | 账户派生路径 | - |
| **自定义RPC** | SettingCustomRPC | SettingCustomRPCModal | 自定义RPC节点 | - |
| **自定义网络** | SettingCustomNetwork | SettingCustomNetworkModal | 自定义网络 | - |
| **自动锁定** | SettingAppAutoLockModal | SettingAppAutoLockModal | 应用自动锁定 | - |
| **安全保护** | SettingProtectModal | SettingProtectionModal | 安全保护设置 | /protection |
| **清除缓存** | SettingClearAppCache | SettingClearAppCacheModal | 清除应用缓存 | - |
| **签名记录** | SettingSignatureRecordModal | SettingSignatureRecordModal | 签名记录 | - |
| **通知设置** | SettingNotifications | NotificationsSettings | 通知设置 | - |
| **账户活动** | SettingManageAccountActivity | - | 账户活动管理 | - |

### 开发模式设置页面

| 开发页面 | 路由标识 | 组件 | 描述 | 显示条件 |
|---------|----------|------|------|----------|
| **固件更新** | SettingDevFirmwareUpdateModal | FirmwareUpdateDevSettings | 固件更新设置 | 开发模式 |
| **V4迁移** | SettingDevV4MigrationModal | V4MigrationDevSettings | V4数据迁移 | 开发模式 |
| **单元测试** | SettingDevUnitTestsModal | PageDevUnitTests | 单元测试页面 | 开发模式 |
| **API代理测试** | SettingDevDesktopApiProxyTestModal | DesktopApiProxyTestDevSettings | API代理测试 | 开发模式 |
| **Perp画廊** | SettingDevPerpGalleryModal | PerpGallery | Perp组件画廊 | 开发模式 |
| **加密画廊** | SettingDevCryptoGalleryModal | CryptoGallery | 加密组件画廊 | 开发模式 |
| **网络配置导出** | SettingExportCustomNetworkConfig | ExportCustomNetworkConfig | 网络配置导出 | 开发模式 |

## 🔗 深度链接配置

### 支持的URL前缀

| 前缀类型 | 前缀值 | 描述 | 平台支持 |
|---------|--------|------|----------|
| **应用深度链接** | onekey-wallet:// | 应用深度链接 | 移动端 |
| **Web深度链接** | https://onekey.so/ | Web深度链接 | Web |
| **WalletConnect** | wc:// | WalletConnect协议 | 全平台 |
| **以太坊** | ethereum:// | 以太坊协议 | 全平台 |

### 路由白名单配置

| 路由类型 | 白名单规则 | 显示URL | 显示参数 | 描述 |
|---------|------------|---------|----------|------|
| **首页** | / | ✅ | ❌ | 钱包首页 |
| **市场** | /market | ✅ | ❌ | 市场页面 |
| **交换** | /swap | ✅ | ❌ | 交换页面 |
| **发现** | /discovery | ✅ | ❌ | 发现页面 |
| **设置** | /settings | ✅ | ❌ | 设置页面 |
| **代币详情** | /tokens/:token | ✅ | ✅ | 代币详情 |
| **账户页面** | /account/:accountId | ✅ | ✅ | 账户页面 |

## 📱 平台特定路由配置

### 移动端路由特性

| 特性 | 配置 | 描述 |
|------|------|------|
| **原生导航栏** | headerShown: false | 使用原生导航栏 |
| **手势导航** | gestureEnabled: true | 支持手势返回 |
| **状态栏** | statusBarStyle | 自动状态栏样式 |
| **安全区域** | safeAreaInsets | 自动安全区域适配 |

### 桌面端路由特性

| 特性 | 配置 | 描述 |
|------|------|------|
| **自定义导航栏** | headerShown: true | 使用自定义导航栏 |
| **侧边栏** | drawerType: 'permanent' | 固定侧边栏 |
| **窗口管理** | windowManagement | 多窗口支持 |
| **快捷键** | keyboardShortcuts | 键盘快捷键 |

### Web端路由特性

| 特性 | 配置 | 描述 |
|------|------|------|
| **URL同步** | urlSync: true | URL与路由同步 |
| **浏览器历史** | browserHistory | 浏览器历史记录 |
| **SEO优化** | metaTags | 页面元标签 |
| **PWA支持** | pwaRoutes | PWA路由配置 |

### 扩展端路由特性

| 特性 | 配置 | 描述 |
|------|------|------|
| **弹窗模式** | popupMode | 弹窗模式路由 |
| **内容脚本** | contentScript | 内容脚本路由 |
| **后台页面** | backgroundPage | 后台页面路由 |
| **权限管理** | permissionRoutes | 权限相关路由 |

## 🔄 路由导航模式

### 导航类型

| 导航类型 | 使用场景 | 实现方式 | 示例 |
|---------|----------|----------|------|
| **Tab导航** | 主要功能切换 | TabNavigator | Home ↔ Market ↔ Swap |
| **Stack导航** | 页面层级跳转 | StackNavigator | 列表页 → 详情页 |
| **Modal导航** | 临时页面展示 | ModalNavigator | 设置页面、确认对话框 |
| **Drawer导航** | 侧边栏菜单 | DrawerNavigator | 桌面端侧边栏 |

### 路由参数传递

| 参数类型 | 传递方式 | 使用场景 | 示例 |
|---------|----------|----------|------|
| **路径参数** | /:param | 动态路由 | /tokens/:tokenId |
| **查询参数** | ?key=value | 可选参数 | /market?tab=trending |
| **状态参数** | navigation.navigate | 复杂数据 | 传递对象数据 |
| **全局状态** | Jotai/Redux | 跨页面状态 | 用户信息、设置 |

## 🎯 路由性能优化

### 懒加载配置

| 组件类型 | 加载方式 | 优化效果 | 实现方式 |
|---------|----------|----------|----------|
| **Tab页面** | LazyLoadRootTabPage | 减少初始加载 | React.lazy |
| **Modal页面** | LazyLoadPage | 按需加载 | 动态import |
| **子页面** | LazyLoadPage | 减少内存占用 | 代码分割 |
| **开发页面** | 条件加载 | 生产环境排除 | 环境判断 |

### 路由缓存策略

| 缓存类型 | 缓存策略 | 适用场景 | 配置方式 |
|---------|----------|----------|----------|
| **Tab缓存** | freezeOnBlur | Tab切换保持状态 | freezeOnBlur: true |
| **Modal缓存** | 临时缓存 | Modal快速打开 | 内存缓存 |
| **页面缓存** | 智能缓存 | 常用页面 | 缓存策略 |
| **数据缓存** | 持久化缓存 | 用户数据 | 本地存储 |

## 📊 路由统计信息

| 统计项目 | 数量 | 说明 |
|---------|------|------|
| **根路由** | 6个 | 主要导航结构 |
| **Tab路由** | 10个 | 底部Tab导航 |
| **Modal路由** | 30+个 | 模态页面路由 |
| **设置子路由** | 20+个 | 设置页面子路由 |
| **开发路由** | 10+个 | 开发模式路由 |
| **深度链接** | 4种 | 支持的链接协议 |
| **平台适配** | 5个 | 不同平台的路由配置 |

---

*文档生成时间: 2024年12月*  
*OneKey开源钱包项目路由结构分析*
