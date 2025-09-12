import { ETabRoutes } from '@onekeyhq/shared/src/routes';

/**
 * Tab显示/隐藏配置
 * 优先级最高：如果为false，直接不显示该Tab
 * 如果为true，则继续根据原有逻辑判断
 */
const tabVisibilityConfig = {
  [ETabRoutes.Home]: true, // 钱包首页 - 始终显示
  [ETabRoutes.Market]: true, // 市场数据 - 可控制
  [ETabRoutes.Swap]: true, // 交易交换 - 可控制
  [ETabRoutes.Perp]: true, // 永续合约 - 可控制
  [ETabRoutes.Earn]: true, // 收益理财 - 可控制
  [ETabRoutes.Discovery]: true, // 发现页面 - 可控制
  [ETabRoutes.Me]: true, // 更多设置 - 可控制
  [ETabRoutes.Developer]: true, // 开发者模式 - 可控制
  [ETabRoutes.DeviceManagement]: true, // 设备管理 - 可控制
  [ETabRoutes.ReferFriends]: true, // 推荐好友 - 可控制
  [ETabRoutes.WebviewPerpTrade]: true, // 桌面端永续合约 - 可控制
  [ETabRoutes.MultiTabBrowser]: true, // 多标签浏览器 - 可控制
};

export { tabVisibilityConfig };
