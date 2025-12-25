<template>
  <div class="demo-container">
    <h1>YLAnimatedCaret Demo</h1>
    <p class="description">一个带尾迹效果的动画光标组件</p>

    <section class="demo-section">
      <h2>基础用法 - textarea</h2>
      <YLAnimatedCaret>
        <textarea
          v-model="text1"
          placeholder="请输入内容..."
          rows="4"
        ></textarea>
      </YLAnimatedCaret>
    </section>

    <section class="demo-section">
      <h2>基础用法 - input</h2>
      <YLAnimatedCaret>
        <input v-model="text2" type="text" placeholder="请输入内容..." />
      </YLAnimatedCaret>
    </section>

    <section class="demo-section">
      <h2>红色渐变预设</h2>
      <YLAnimatedCaret preset="gradient-red">
        <textarea
          v-model="text3"
          placeholder="红色渐变光标..."
          rows="3"
        ></textarea>
      </YLAnimatedCaret>
    </section>

    <section class="demo-section">
      <h2>自定义颜色</h2>
      <YLAnimatedCaret
        :caret-color="{ start: '#67c23a', end: 'rgba(103, 194, 58, 0.1)' }"
      >
        <textarea
          v-model="text4"
          placeholder="自定义绿色光标..."
          rows="3"
        ></textarea>
      </YLAnimatedCaret>
    </section>

    <section class="demo-section">
      <h2>禁用尾迹</h2>
      <YLAnimatedCaret :enable-trail="false">
        <textarea
          v-model="text5"
          placeholder="无尾迹效果..."
          rows="3"
        ></textarea>
      </YLAnimatedCaret>
    </section>

    <section class="demo-section">
      <h2>更多尾迹</h2>
      <YLAnimatedCaret
        :trail-count="8"
        :trail-opacity="[0.3, 0.2, 0.1, 0.05]"
        :trail-delay="[0.2, 0.28, 0.36, 0.44]"
      >
        <textarea
          v-model="text6"
          placeholder="4个尾迹效果..."
          rows="3"
        ></textarea>
      </YLAnimatedCaret>
    </section>
    <!-- 新增：粒子特效演示 -->
    <section class="demo-section highlight">
      <h2>✨ 新特性：粒子光晕特效</h2>
      <p class="tip">向左删除文字时查看效果</p>
      <YLAnimatedCaret type="particle">
        <textarea
          v-model="textParticle"
          placeholder="试着输入一些文字，然后按住 Backspace 连续删除..."
          rows="4"
        ></textarea>
      </YLAnimatedCaret>
    </section>
  </div>
</template>

<script setup>
import { ref } from "vue";
import YLAnimatedCaret from "../src/YLAnimatedCaret.vue";

const textParticle = ref(
  "Type some text here and try deleting it to see the new particle effect!"
);
const text1 = ref("");
const text2 = ref("");
const text3 = ref("");
const text4 = ref("");
const text5 = ref("");
const text6 = ref("");
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background: #f5f7fa;
  padding: 40px;
}

.demo-container {
  max-width: 800px;
  margin: 0 auto;
}

h1 {
  color: #303133;
  margin-bottom: 10px;
}

.description {
  color: #909399;
  margin-bottom: 40px;
}

.demo-section {
  background: #fff;
  border-radius: 8px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
}

.demo-section h2 {
  font-size: 16px;
  color: #606266;
  margin-bottom: 16px;
}

/* 高亮新特性区域 */
.highlight {
  border: 1px solid #409eff;
  box-shadow: 0 4px 16px rgba(64, 158, 255, 0.1);
}

.tip {
  font-size: 12px;
  color: #909399;
  margin-bottom: 12px;
}

textarea,
input {
  width: 100%;
  padding: 12px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  font-size: 14px;
  line-height: 1.5;
  resize: vertical;
  outline: none;
  transition: border-color 0.2s;
}

textarea:focus,
input:focus {
  border-color: #409eff;
}

input {
  height: 40px;
}
</style>
