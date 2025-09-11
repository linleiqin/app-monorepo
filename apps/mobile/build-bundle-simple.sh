#!/bin/bash

# OneKey Mobile App - 简化版Bundle构建脚本
# 快速构建生产环境bundle包

set -e

echo "🚀 快速构建OneKey Mobile Bundle包..."

# 获取项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

# 设置环境变量
export NODE_ENV=production
export EXPO_PUBLIC_ENVIRONMENT=production
export SKIP_BUNDLING=0

# 检查依赖
if [[ ! -f "node_modules/expo/package.json" ]]; then
    echo "❌ 请先运行: yarn install"
    exit 1
fi

# 创建输出目录
mkdir -p dist/bundle

# 构建bundle
echo "📦 构建iOS Bundle..."
npx expo export:embed --platform ios --bundle-output dist/bundle/main.jsbundle --assets-dest dist/bundle --reset-cache

echo "✅ Bundle构建完成!"
echo "📁 输出目录: dist/bundle"
ls -la dist/bundle
