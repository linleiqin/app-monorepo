# OneKey Mobile Bundle 构建指南

## 概述

本文档介绍如何构建OneKey Mobile应用的生产环境bundle包，基于Xcode工程脚本的逻辑。

## 构建脚本

我们提供了三种构建方式：

### 1. 快速构建（推荐）

```bash
yarn bundle:ios
```

这是最简单的方式，直接使用Expo CLI构建iOS bundle。

### 2. 简化脚本

```bash
yarn bundle:simple
# 或者
./build-bundle-simple.sh
```

使用简化的构建脚本，包含基本的错误检查和输出信息。

### 3. 完整构建脚本

```bash
yarn bundle:production
# 或者
./build-production-bundle.sh
```

使用完整的构建脚本，包含：
- 环境变量加载
- 依赖检查
- 详细的构建日志
- Sentry和React Native脚本执行

## 构建输出

构建完成后，文件将输出到 `dist/bundle/` 目录：

```
dist/bundle/
├── main.jsbundle          # 主要的JavaScript bundle文件 (~129MB)
└── assets/                # 资源文件目录
    ├── __node_modules/    # node_modules中的资源
    └── __packages/        # packages中的资源
```

## 环境要求

- Node.js (推荐 v22.18.0)
- Yarn
- Expo CLI
- 项目依赖已安装 (`yarn install`)

## 环境变量

构建脚本会自动设置以下环境变量：

- `NODE_ENV=production`
- `EXPO_PUBLIC_ENVIRONMENT=production`
- `SKIP_BUNDLING=0`
- `CONFIGURATION=Release`

## 故障排除

### 1. 依赖问题

如果遇到依赖问题，请确保：

```bash
# 在项目根目录运行
yarn install
```

### 2. 缓存问题

如果构建失败，可以清理缓存：

```bash
yarn clean:build
```

### 3. Tamagui警告

构建过程中会出现大量Tamagui警告，这是正常的，不影响功能：

```
Warning: Tamagui didn't find any valid components (DEBUG=tamagui for more)
```

### 4. Android构建错误

如果Android清理失败，可以跳过Android清理，直接构建iOS bundle：

```bash
# 直接运行iOS bundle构建
NODE_ENV=production EXPO_PUBLIC_ENVIRONMENT=production npx expo export:embed --platform ios --bundle-output dist/bundle/main.jsbundle --assets-dest dist/bundle --reset-cache
```

## 集成到iOS应用

构建完成后，可以将生成的bundle文件集成到iOS应用中：

1. 将 `main.jsbundle` 文件复制到iOS项目的合适位置
2. 将 `assets/` 目录复制到iOS项目中
3. 确保iOS项目正确配置了bundle路径

## 性能优化

- Bundle大小约为129MB，包含完整的应用代码
- 生产环境构建已启用代码压缩和优化
- 建议在真机上测试bundle的功能和性能

## 注意事项

1. 确保在生产环境中正确配置Sentry和其他服务
2. Bundle文件较大，建议通过CDN或应用内更新机制分发
3. 定期清理构建缓存以保持构建环境清洁
4. 建议在CI/CD流程中集成bundle构建步骤

## 相关文件

- `build-production-bundle.sh` - 完整构建脚本
- `build-bundle-simple.sh` - 简化构建脚本
- `package.json` - 包含构建命令
- `ios/.xcode.env` - iOS环境配置
- `ios/.xcode.env.local` - 本地环境配置
