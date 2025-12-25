# YLAnimatedCaret

一个 Vue 3 动画光标组件，为 input/textarea 提供带尾迹效果的自定义光标。

## 安装

由于该包尚未发布到 npm 仓库，你可以通过以下方式安装：

### 方式一：从 GitHub 安装（推荐）

```bash
npm install github:EnjoyWT/YLAnimatedCaret
```

或者使用完整地址：

```bash
npm install https://github.com/EnjoyWT/YLAnimatedCaret.git
```

### 方式二：从本地路径安装

```bash
npm install /path/to/YLAnimatedCaret
```

### 方式三：直接复制文件

将 `src/YLAnimatedCaret.vue` 和 `dist/` 目录复制到你的项目中，然后直接引入组件。

## 使用

### 全局注册

```js
import { createApp } from "vue";
import App from "./App.vue";
import { YLAnimatedCaretPlugin } from "yl-animated-caret";
import "yl-animated-caret/dist/yl-animated-caret.css";

const app = createApp(App);
app.use(YLAnimatedCaretPlugin);
app.mount("#app");
```

### 局部引入

```vue
<template>
  <YLAnimatedCaret>
    <textarea v-model="text" placeholder="请输入内容..."></textarea>
  </YLAnimatedCaret>
</template>

<script setup>
import { ref } from "vue";
import { YLAnimatedCaret } from "yl-animated-caret";
import "yl-animated-caret/dist/yl-animated-caret.css";

const text = ref("");
</script>
```

## Props

| 属性                | 类型    | 默认值            | 说明                                                           |
| ------------------- | ------- | ----------------- | -------------------------------------------------------------- |
| `enableTrail`       | Boolean | `true`            | 是否启用尾迹效果                                               |
| `enableBreathe`     | Boolean | `true`            | 是否启用呼吸效果                                               |
| `preset`            | String  | `'gradient-blue'` | 颜色预设，可选：`'gradient-blue'`, `'gradient-red'`, `'solid'` |
| `caretColor`        | Object  | `null`            | 自定义光标颜色，格式：`{ start: '#color', end: '#color' }`     |
| `trailCount`        | Number  | `2`               | 尾迹数量 (0-5)                                                 |
| `trailOpacity`      | Array   | `[0.2, 0.1]`      | 各尾迹透明度                                                   |
| `trailDelay`        | Array   | `[0.24, 0.3]`     | 各尾迹延迟时间(秒)                                             |
| `breatheDuration`   | Number  | `1.3`             | 呼吸动画周期(秒)                                               |
| `breatheMinOpacity` | Number  | `0.3`             | 呼吸动画最低透明度                                             |
| `customStyle`       | Object  | `null`            | 自定义 CSS 变量                                                |

## 示例

### 红色渐变光标

```vue
<YLAnimatedCaret preset="gradient-red">
  <textarea v-model="text"></textarea>
</YLAnimatedCaret>
```

### 自定义颜色

```vue
<YLAnimatedCaret
  :caret-color="{ start: '#67c23a', end: 'rgba(103, 194, 58, 0.1)' }"
>
  <textarea v-model="text"></textarea>
</YLAnimatedCaret>
```

### 禁用尾迹

```vue
<YLAnimatedCaret :enable-trail="false">
  <textarea v-model="text"></textarea>
</YLAnimatedCaret>
```

### 更多尾迹

```vue
<YLAnimatedCaret
  :trail-count="4"
  :trail-opacity="[0.3, 0.2, 0.1, 0.05]"
  :trail-delay="[0.2, 0.28, 0.36, 0.44]"
>
  <textarea v-model="text"></textarea>
</YLAnimatedCaret>
```

## 支持的输入元素

- `<textarea>`
- `<input type="text">`
- Element Plus 的 `<el-input>` 和 `<el-input type="textarea">`

## 开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建
npm run build
```

## License

MIT
