import YLAnimatedCaret from './YLAnimatedCaret.vue'

// 单独导出组件
export { YLAnimatedCaret }

// 默认导出组件
export default YLAnimatedCaret

// 提供 install 方法，支持 app.use() 方式注册
export const install = (app) => {
  app.component('YLAnimatedCaret', YLAnimatedCaret)
}

// 作为插件导出
export const YLAnimatedCaretPlugin = {
  install,
}
