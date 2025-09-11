#!/bin/bash

# OneKey Mobile App - 生产环境Bundle构建脚本
# 基于Xcode工程脚本逻辑构建生产环境bundle包

set -e  # 遇到错误立即退出

echo "🚀 开始构建OneKey Mobile生产环境Bundle包..."

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"
IOS_DIR="$PROJECT_ROOT/ios"

echo "📁 项目根目录: $PROJECT_ROOT"
echo "📱 iOS目录: $IOS_DIR"

# 检查必要的环境变量和文件
if [[ -f "$IOS_DIR/.xcode.env" ]]; then
    echo "📋 加载 .xcode.env 文件..."
    source "$IOS_DIR/.xcode.env"
fi

if [[ -f "$IOS_DIR/.xcode.env.local" ]]; then
    echo "📋 加载 .xcode.env.local 文件..."
    source "$IOS_DIR/.xcode.env.local"
fi

# 设置Node.js路径
if [[ -z "$NODE_BINARY" ]]; then
    export NODE_BINARY=$(command -v node)
    echo "🔧 设置NODE_BINARY: $NODE_BINARY"
fi

# 验证Node.js是否可用
if [[ ! -x "$NODE_BINARY" ]]; then
    echo "❌ 错误: 找不到Node.js可执行文件"
    exit 1
fi

echo "✅ Node.js版本: $($NODE_BINARY --version)"

# 设置项目根目录（相对于iOS目录）
export PROJECT_ROOT="$PROJECT_ROOT"

# 生产环境配置 - 不跳过bundling
export SKIP_BUNDLING=0
export CONFIGURATION="Release"
export ENVIRONMENT="production"

echo "🏗️  构建配置: $CONFIGURATION"
echo "🌍 环境: $ENVIRONMENT"

# 解析入口文件
if [[ -z "$ENTRY_FILE" ]]; then
    echo "🔍 解析入口文件..."
    export ENTRY_FILE="$("$NODE_BINARY" -e "require('expo/scripts/resolveAppEntry')" "$PROJECT_ROOT" ios relative | tail -n 1)"
    echo "📄 入口文件: $ENTRY_FILE"
fi

# 设置CLI路径
if [[ -z "$CLI_PATH" ]]; then
    echo "🔧 设置Expo CLI路径..."
    export CLI_PATH="$("$NODE_BINARY" --print "require.resolve('@expo/cli', { paths: [require.resolve('expo/package.json')] })")"
    echo "📦 CLI路径: $CLI_PATH"
fi

# 设置Bundle命令
if [[ -z "$BUNDLE_COMMAND" ]]; then
    export BUNDLE_COMMAND="export:embed"
    echo "📦 Bundle命令: $BUNDLE_COMMAND"
fi

# 检查必要的依赖
echo "🔍 检查项目依赖..."
if [[ ! -f "$PROJECT_ROOT/package.json" ]]; then
    echo "❌ 错误: 找不到package.json文件"
    exit 1
fi

if [[ ! -f "$PROJECT_ROOT/node_modules/expo/package.json" ]]; then
    echo "❌ 错误: 找不到Expo依赖，请先运行 yarn install"
    exit 1
fi

# 创建输出目录
BUNDLE_OUTPUT_DIR="$PROJECT_ROOT/dist/bundle"
mkdir -p "$BUNDLE_OUTPUT_DIR"

echo "📁 Bundle输出目录: $BUNDLE_OUTPUT_DIR"

# 清理之前的构建
echo "🧹 清理之前的构建文件..."
rm -rf "$BUNDLE_OUTPUT_DIR"/*

# 构建Bundle
echo "🏗️  开始构建生产环境Bundle..."

# 使用Expo CLI构建bundle
cd "$PROJECT_ROOT"

# 设置生产环境变量
export NODE_ENV=production
export EXPO_PUBLIC_ENVIRONMENT=production

# 执行bundle构建
echo "📦 执行Bundle构建命令: $BUNDLE_COMMAND"
"$NODE_BINARY" "$CLI_PATH" $BUNDLE_COMMAND --platform ios --output-dir "$BUNDLE_OUTPUT_DIR" --clear

# 检查构建结果
if [[ $? -eq 0 ]]; then
    echo "✅ Bundle构建成功!"
    
    # 显示构建结果
    echo "📊 构建结果:"
    ls -la "$BUNDLE_OUTPUT_DIR"
    
    # 计算文件大小
    BUNDLE_SIZE=$(du -sh "$BUNDLE_OUTPUT_DIR" | cut -f1)
    echo "📏 Bundle大小: $BUNDLE_SIZE"
    
    echo ""
    echo "🎉 生产环境Bundle构建完成!"
    echo "📁 输出目录: $BUNDLE_OUTPUT_DIR"
    echo ""
    echo "💡 提示:"
    echo "   - 可以将生成的bundle文件集成到iOS应用中"
    echo "   - 确保在生产环境中正确配置Sentry和其他服务"
    echo "   - 建议在真机上测试bundle的功能"
    
else
    echo "❌ Bundle构建失败!"
    exit 1
fi

# 可选: 运行Sentry和React Native的构建脚本
echo ""
echo "🔧 运行额外的构建脚本..."

# Sentry脚本
SENTRY_SCRIPT="$("$NODE_BINARY" --print "require('path').dirname(require.resolve('@sentry/react-native/package.json')) + '/scripts/sentry-xcode.sh'")"
if [[ -f "$SENTRY_SCRIPT" ]]; then
    echo "📊 运行Sentry构建脚本..."
    /bin/sh "$SENTRY_SCRIPT"
fi

# React Native脚本
RN_SCRIPT="$("$NODE_BINARY" --print "require('path').dirname(require.resolve('react-native/package.json')) + '/scripts/react-native-xcode.sh'")"
if [[ -f "$RN_SCRIPT" ]]; then
    echo "⚛️  运行React Native构建脚本..."
    /bin/sh "$RN_SCRIPT"
fi

echo "🏁 所有构建步骤完成!"
