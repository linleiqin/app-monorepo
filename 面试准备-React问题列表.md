# React 面试问题列表

## React 基础

1. 请解释 React 的核心概念，包括组件、JSX、虚拟 DOM
2. 请说明 React 组件的生命周期，以及函数组件和类组件的区别
3. 什么是 React Hooks？请说明常用的 Hooks 及其使用场景
4. 请解释 React 中的 Props 和 State，以及它们的区别和使用场景
5. 什么是受控组件和非受控组件？它们有什么区别？
6. 请说明 React 中的事件处理机制，包括合成事件（SyntheticEvent）
7. 什么是 React 的条件渲染？有哪些实现方式？
8. 请解释 React 中的列表渲染和 key 的作用
9. 什么是 React 的组件组合和继承？何时使用组合？
10. 请说明 React 中的错误边界（Error Boundary）及其使用场景

## Hooks 深入

11. 请详细解释 useState Hook 的工作原理和使用注意事项
12. 请详细解释 useEffect Hook 的依赖数组和执行时机
13. 什么是 useRef Hook？它和 useState 有什么区别？
14. 请解释 useMemo 和 useCallback 的区别和使用场景
15. 什么是 useReducer Hook？它和 useState 有什么区别？
16. 请说明 useContext Hook 的使用和性能考虑
17. 什么是自定义 Hooks？如何创建和使用自定义 Hooks？
18. 请解释 Hooks 的规则，为什么不能在循环和条件语句中调用？
19. 什么是 Hooks 的依赖数组？如何正确设置依赖数组？
20. 请说明 useEffect 的清理函数（cleanup function）的作用

## 状态管理

21. 请解释 React 中的状态管理，包括 useState、useReducer 和状态提升
22. 什么是 Context API？如何使用 Context 进行跨组件数据传递？
23. 请说明 Context API 的性能问题和优化方法
24. 请说明 Redux 的工作原理，以及何时应该使用 Redux
25. 什么是 Redux 的三大原则？请详细解释
26. 请解释 Redux 的 Action、Reducer 和 Store
27. 什么是 Redux 中间件（Middleware）？常用的中间件有哪些？
28. 请说明 Redux Toolkit 的优势和使用方法
29. 什么是 Zustand、Jotai 等轻量级状态管理库？它们和 Redux 有什么区别？
30. 请说明状态管理的选择原则，何时使用本地状态、Context 或 Redux

## 性能优化

31. 请解释 React 的性能优化方法，包括 memo、useMemo、useCallback
32. 什么是 React 的渲染优化？如何避免不必要的重新渲染？
33. 请说明 React.memo 的作用和使用场景
34. 什么是 React 的懒加载（Code Splitting）？如何实现？
35. 请解释 React 的虚拟列表（Virtual List）及其实现原理
36. 什么是 React 的批量更新（Batching）？它如何提高性能？
37. 请说明 React 18 的并发特性（Concurrent Features）及其性能优势
38. 什么是 React 的 Suspense 和 SuspenseList？如何使用？
39. 请解释 React 的性能分析工具，如 React DevTools Profiler
40. 请说明大型 React 应用的性能优化策略

## React Native 路由与导航

41. 请说明 React Navigation 的工作原理和使用方法
42. 什么是 React Navigation 的导航器类型？包括 Stack、Tab、Drawer 等
43. 请解释 React Navigation 的导航参数传递和获取
44. 什么是 React Navigation 的嵌套导航？如何实现？
45. 请说明 React Navigation 的编程式导航和声明式导航
46. 什么是 React Navigation 的导航选项（Navigation Options）？如何配置？
47. 请解释 React Navigation 的导航生命周期和事件监听
48. 什么是 React Navigation 的深度链接（Deep Linking）？如何实现？
49. 请说明 React Navigation 的导航守卫和权限控制
50. 什么是 React Navigation 的性能优化？如何优化导航性能？

## 组件设计模式

51. 什么是高阶组件（HOC）？如何使用和创建？
52. 什么是渲染属性（Render Props）模式？它和 Hooks 有什么区别？
53. 请说明组件组合模式，包括容器组件和展示组件
54. 什么是受控组件模式？何时使用受控组件？
55. 请解释组件通信模式，包括父子通信、兄弟通信、跨级通信
56. 什么是 Provider 模式？如何使用 Context 实现 Provider？
57. 请说明组件的单一职责原则和可复用性设计
58. 什么是组件的受控和非受控模式？如何选择？
59. 请解释组件的插槽（Slot）模式和组合模式
60. 什么是组件的依赖注入？如何在 React 中实现？

## 测试

61. 请说明 React 组件的单元测试方法，包括 Jest 和 React Testing Library
62. 什么是快照测试（Snapshot Testing）？如何使用？
63. 请解释 React 组件的集成测试和端到端测试
64. 如何测试 React Hooks？有哪些测试工具？
65. 请说明 React 测试的最佳实践和常见问题
66. 什么是测试驱动开发（TDD）？如何在 React 中实践？
67. 请解释 Mock 和 Stub 在 React 测试中的使用
68. 如何测试异步操作和副作用？
69. 请说明 React 测试的代码覆盖率工具和使用方法
70. 什么是视觉回归测试？如何在 React 中实现？

## 构建与部署

71. 请说明 React 应用的构建流程，包括 Webpack 和 Vite
72. 什么是代码分割（Code Splitting）？如何实现？
73. 请解释 React 应用的打包优化策略
74. 什么是 Tree Shaking？它如何减少打包体积？
75. 请说明 React 应用的部署流程和环境配置
76. 什么是环境变量？如何在 React 中使用？
77. 请解释 React 应用的性能监控和错误追踪
78. 什么是 CDN 和静态资源优化？
79. 请说明 React 应用的 SEO 优化方法
80. 什么是服务端渲染（SSR）和静态站点生成（SSG）？它们有什么区别？

## 高级主题

81. 请解释 React 的 Fiber 架构及其工作原理
82. 什么是 React 的调度器（Scheduler）？它如何工作？
83. 请说明 React 18 的新特性，包括并发渲染、自动批处理等
84. 什么是 React Server Components？它和传统组件有什么区别？
85. 请解释 React 的 Suspense 和并发特性的关系
86. 什么是 React 的错误恢复机制？如何处理错误？
87. 请说明 React 的类型系统，包括 TypeScript 和 PropTypes
88. 什么是 React 的国际化（i18n）？如何实现？
89. 请解释 React 的可访问性（Accessibility）和 ARIA 属性
90. 什么是 React 的微前端架构？如何实现？

## 实际应用

91. 请说明大型 React 应用的项目结构和组织方式
92. 什么是模块化开发？如何在 React 中实现模块化？
93. 请解释 React 应用的代码规范和最佳实践
94. 什么是 React 的代码审查和重构策略？
95. 请说明 React 应用的版本管理和发布流程
96. 什么是 React 的文档和注释规范？
97. 请解释 React 应用的团队协作和开发流程
98. 什么是 React 的技术债务管理？
99. 请说明 React 应用的安全考虑，包括 XSS、CSRF 等
100. 什么是 React 应用的监控和日志记录？

---

总共 100 个问题，按主题分类。请选择需要生成答案的问题编号。

