<template>
  <div
    ref="wrapperRef"
    class="yl-animated-caret-wrapper"
    :style="computedWrapperStyle"
  >
    <!-- 光标层 -->
    <div class="yl-caret-layer" v-show="isFocused">
      <!-- 尾迹 -->
      <template v-if="enableTrail">
        <div
          v-for="i in trailCount"
          :key="`trail-${i}`"
          class="yl-caret-group yl-trail"
          :class="`yl-trail-${i}`"
          :style="caretStyle"
        >
          <div class="yl-caret-visual"></div>
        </div>
      </template>

      <!-- 主光标 -->
      <div
        class="yl-caret-group yl-main-caret"
        :class="{ 'is-moving': isMoving }"
        :style="caretStyle"
      >
        <div class="yl-caret-visual"></div>
      </div>
    </div>

    <!-- 输入元素插槽 -->
    <slot></slot>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from "vue";

const props = defineProps({
  // 开关
  enableTrail: {
    type: Boolean,
    default: true,
  },
  enableBreathe: {
    type: Boolean,
    default: true,
  },

  // 预设
  preset: {
    type: String,
    default: "gradient-blue",
    validator: (value) =>
      ["gradient-blue", "gradient-red", "solid"].includes(value),
  },

  // 颜色（覆盖预设）
  caretColor: {
    type: Object,
    default: null,
  },

  // 尾迹配置
  trailCount: {
    type: Number,
    default: 2,
    validator: (value) => value >= 0 && value <= 5,
  },
  trailOpacity: {
    type: Array,
    default: () => [0.2, 0.1],
  },
  trailDelay: {
    type: Array,
    default: () => [0.24, 0.3],
  },

  // 呼吸配置
  breatheDuration: {
    type: Number,
    default: 1.3,
  },
  breatheMinOpacity: {
    type: Number,
    default: 0.3,
  },

  // CSS 变量覆盖
  customStyle: {
    type: Object,
    default: null,
  },
});

// 预设系统
const PRESETS = {
  "gradient-blue": {
    "--yl-caret-color-start": "#2979ff", // Deep Electric Blue (More visible)
    "--yl-caret-color-end": "rgba(41, 121, 255, 0.3)", // End opacity increased for "substance"
    "--yl-caret-glow": "0 0 8px rgba(41, 121, 255, 0.5)",
  },
  "gradient-red": {
    "--yl-caret-color-start": "#ff4d4f",
    "--yl-caret-color-end": "rgba(255, 77, 79, 0.3)",
    "--yl-caret-glow": "0 0 8px rgba(255, 77, 79, 0.6)",
  },
  solid: {
    "--yl-caret-color-start": "#409eff",
    "--yl-caret-color-end": "#409eff",
    "--yl-caret-glow": "none",
  },
};

// 状态
const wrapperRef = ref(null);
const targetInput = ref(null);
const isFocused = ref(false);
const isMoving = ref(false);
const caretPos = ref({ x: 0, y: 0, height: 20 });

// 光标移动定时器
let moveTimer = null;

// 镜像元素
let mirrorDiv = null;
let resizeObserver = null;

// 计算包裹容器样式
const computedWrapperStyle = computed(() => {
  const presetStyles = PRESETS[props.preset] || {};

  // 颜色覆盖
  const colorStyles = props.caretColor
    ? {
        "--yl-caret-color-start": props.caretColor.start,
        "--yl-caret-color-end": props.caretColor.end,
      }
    : {};

  // 尾迹配置
  const trailStyles = {};
  for (let i = 0; i < props.trailCount; i++) {
    trailStyles[`--yl-trail-opacity-${i + 1}`] = props.trailOpacity[i] || 0.2;
    trailStyles[`--yl-trail-delay-${i + 1}`] = `${
      props.trailDelay[i] || 0.24
    }s`;
  }

  // 呼吸配置
  const breatheStyles = {
    "--yl-breathe-duration": `${props.breatheDuration}s`,
    "--yl-breathe-min-opacity": props.breatheMinOpacity,
  };

  return {
    ...presetStyles,
    ...colorStyles,
    ...trailStyles,
    ...breatheStyles,
    ...(props.customStyle || {}),
  };
});

// 光标样式
const caretStyle = computed(() => ({
  transform: `translate(${caretPos.value.x}px, ${caretPos.value.y}px)`,
  height: `${caretPos.value.height}px`,
}));

// 初始化镜像元素
const initMirror = () => {
  if (mirrorDiv) return;
  mirrorDiv = document.createElement("div");
  mirrorDiv.style.position = "absolute";
  mirrorDiv.style.top = "0";
  mirrorDiv.style.left = "0";
  mirrorDiv.style.visibility = "hidden";
  mirrorDiv.style.whiteSpace = "pre-wrap";
  mirrorDiv.style.wordWrap = "break-word";
  mirrorDiv.style.pointerEvents = "none";
  mirrorDiv.style.zIndex = "-9999";
  document.body.appendChild(mirrorDiv);
};

// 复制样式
const copyStyles = (sourceNode, targetNode) => {
  const computedStyle = window.getComputedStyle(sourceNode);
  const properties = [
    "font-family",
    "font-size",
    "font-weight",
    "font-style",
    "letter-spacing",
    "line-height",
    "text-transform",
    "word-spacing",
    "text-indent",
    "box-sizing",
    "padding-top",
    "padding-bottom",
    "padding-left",
    "padding-right",
    "border-width",
    "width",
  ];
  properties.forEach((prop) => {
    targetNode.style[prop] = computedStyle.getPropertyValue(prop);
  });
};

// 更新光标位置
const updateCursor = (triggerMove = false) => {
  if (triggerMove) {
    isMoving.value = true;
    if (moveTimer) clearTimeout(moveTimer);
    moveTimer = setTimeout(() => {
      isMoving.value = false;
    }, 100);
  }

  if (!targetInput.value) return;

  // 获取输入元素的位置信息
  const { offsetLeft, offsetTop, offsetHeight } = targetInput.value;

  // 获取计算样式
  const computedStyle = window.getComputedStyle(targetInput.value);
  const fontSize = parseInt(computedStyle.fontSize) || 14;
  const caretHeight = fontSize + 4;

  // 判断是否也是单行输入框 (input 标签)
  const isSingleLineInput = targetInput.value.tagName.toLowerCase() === "input";

  let x = 0;
  let y = 0;

  if (isSingleLineInput) {
    // Input 单行输入框处理：
    // 1. 获取光标水平位置
    if (!mirrorDiv) initMirror();
    copyStyles(targetInput.value, mirrorDiv);

    // 特殊处理 input 的样式复制，确保在一行显示
    mirrorDiv.style.whiteSpace = "pre";
    mirrorDiv.style.overflow = "hidden";

    const text = targetInput.value.value;
    const selectionEnd = targetInput.value.selectionEnd;
    const subText = text.substring(0, selectionEnd);

    mirrorDiv.textContent = subText;

    const span = document.createElement("span");
    span.textContent = "|";
    span.style.display = "inline-block";

    mirrorDiv.appendChild(span);

    const scrollLeft = targetInput.value.scrollLeft;

    // 计算位置
    // x = span在mirror中的位置 - 滚动距离
    x = span.offsetLeft - scrollLeft;
    // y = 垂直居中: (输入框高度 - 光标高度) / 2
    // 注意：这里不需要减 scrollTop，因为 input 单行通常不垂直滚动，或者也可以加上 offsetTop
    y = (offsetHeight - caretHeight) / 2;
  } else {
    // Textarea 多行处理 (原有逻辑优化)
    if (!mirrorDiv) initMirror();
    copyStyles(targetInput.value, mirrorDiv);

    // 恢复 textarea 的换行特性
    mirrorDiv.style.whiteSpace = "pre-wrap";
    mirrorDiv.style.overflow = "hidden"; // 或者是 auto，但 mirror 不应该有滚动条

    const text = targetInput.value.value;
    const selectionEnd = targetInput.value.selectionEnd;
    const subText = text.substring(0, selectionEnd);

    mirrorDiv.textContent = subText;

    const span = document.createElement("span");
    span.textContent = "|";
    span.style.display = "inline-block";
    span.style.width = "0";

    mirrorDiv.appendChild(span);

    const tailText = document.createTextNode(text.substring(selectionEnd));
    mirrorDiv.appendChild(tailText);

    const scrollTop = targetInput.value.scrollTop;
    const scrollLeft = targetInput.value.scrollLeft;

    const lineHeight = parseInt(computedStyle.lineHeight) || 20;
    const offsetY = (lineHeight - caretHeight) / 2;

    x = span.offsetLeft - scrollLeft;
    y = span.offsetTop - scrollTop + offsetY;
  }

  // 加上元素本身的 offset (处理 padding/margin 导致的错位)
  // 注意：wrapper 是 relative，input 是 wrapper 的子元素(slot)。
  // 如果 input 有 margin，offsetLeft 会体现出来。
  // 如果 slot 只有 input，通常 offsetLeft/Top 是 0 (如果有 padding/border 可能会有值)

  caretPos.value = {
    x: x + offsetLeft,
    y: y + offsetTop,
    height: caretHeight,
  };
};

// 查找输入元素
const findInputElement = () => {
  const wrapper = wrapperRef.value;
  if (!wrapper) return null;

  // 尝试多种查找方式
  let input =
    wrapper.querySelector("textarea") ||
    wrapper.querySelector('input[type="text"]') ||
    wrapper.querySelector(".el-textarea__inner") ||
    wrapper.querySelector(".el-input__inner");

  // 如果没找到，尝试从 el-input 组件中查找
  if (!input) {
    const elInput =
      wrapper.querySelector(".el-textarea") ||
      wrapper.querySelector(".el-input");
    if (elInput) {
      input =
        elInput.querySelector("textarea") || elInput.querySelector("input");
    }
  }

  return input;
};

// 初始化输入元素（支持异步渲染）
const initInputElement = async () => {
  // 首次尝试
  await nextTick();
  targetInput.value = findInputElement();

  // 如果没找到，延迟再试（处理 el-input 异步渲染）
  if (!targetInput.value) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    targetInput.value = findInputElement();
  }

  if (targetInput.value) {
    // 隐藏原生光标
    targetInput.value.style.caretColor = "transparent";

    initMirror();
    bindEvents();

    // ResizeObserver
    resizeObserver = new ResizeObserver(() => updateCursor());
    resizeObserver.observe(targetInput.value);

    window.addEventListener("resize", () => updateCursor());
  } else {
    console.warn(
      '[YLAnimatedCaret] 未找到输入元素，支持的选择器：textarea, input[type="text"], .el-textarea__inner, .el-input__inner'
    );
  }
};

// 绑定事件
const bindEvents = () => {
  if (!targetInput.value) return;

  targetInput.value.addEventListener("focus", handleFocus);
  targetInput.value.addEventListener("blur", handleBlur);
  targetInput.value.addEventListener("input", handleInput);
  targetInput.value.addEventListener("click", handleClick);
  targetInput.value.addEventListener("keyup", handleKeyup);
  targetInput.value.addEventListener("keydown", handleKeydown);
  targetInput.value.addEventListener("scroll", handleScroll);
};

// 解绑事件
const unbindEvents = () => {
  if (!targetInput.value) return;

  targetInput.value.removeEventListener("focus", handleFocus);
  targetInput.value.removeEventListener("blur", handleBlur);
  targetInput.value.removeEventListener("input", handleInput);
  targetInput.value.removeEventListener("click", handleClick);
  targetInput.value.removeEventListener("keyup", handleKeyup);
  targetInput.value.removeEventListener("keydown", handleKeydown);
  targetInput.value.removeEventListener("scroll", handleScroll);
};

// 事件处理
const handleFocus = () => {
  isFocused.value = true;
  updateCursor(true);
};

const handleBlur = () => {
  isFocused.value = false;
};

const handleInput = () => {
  updateCursor(true);
};

const handleClick = () => {
  updateCursor(true);
};

const handleKeyup = () => {
  updateCursor(true);
};

const handleKeydown = () => {
  nextTick(() => updateCursor(true));
};

const handleScroll = () => {
  updateCursor();
};

// 生命周期
onMounted(() => {
  initInputElement();
});

onBeforeUnmount(() => {
  unbindEvents();

  if (mirrorDiv && mirrorDiv.parentNode) {
    mirrorDiv.parentNode.removeChild(mirrorDiv);
  }

  if (resizeObserver) {
    resizeObserver.disconnect();
  }

  window.removeEventListener("resize", () => updateCursor());

  if (moveTimer) {
    clearTimeout(moveTimer);
  }
});

// 暴露方法（如果需要）
defineExpose({
  updateCursor,
  targetInput,
});
</script>

<script>
export default { name: "YLAnimatedCaret" };
</script>

<style lang="scss" scoped>
.yl-animated-caret-wrapper {
  position: relative;
  display: inline-block;
  width: 100%;
}

.yl-caret-layer {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 10;
}

/* 光标容器 */
.yl-caret-group {
  position: absolute;
  width: 2px; /* Reverted to 2px for a cleaner look */
  top: 0;
  left: 0;
  will-change: transform;
}

/* 光标视觉 */
.yl-caret-visual {
  width: 100%;
  height: 100%;
  border-radius: 4px;
  /* 
     Design Update:
     Solid color for top 50% to prevent "disappearing" feeling.
     Smooth fade to 30% opacity at the bottom.
  */
  background: linear-gradient(
    180deg,
    var(--yl-caret-color-start, #409eff) 50%,
    var(--yl-caret-color-end, rgba(64, 158, 255, 0.3)) 100%
  );
  box-shadow: var(--yl-caret-glow, 0 0 8px rgba(64, 158, 255, 0.4));
}

/* 主光标 - Fluid Motion */
.yl-main-caret {
  z-index: 2;
  transition: transform 0.1s cubic-bezier(0.2, 0.9, 0.1, 1),
    /* Snappy but Smooth */ height 0.1s ease-out;

  .yl-caret-visual {
    animation: yl-breathe var(--yl-breathe-duration, 1.3s) ease-in-out infinite;
  }

  &.is-moving {
    .yl-caret-visual {
      animation: none;
      opacity: 1;
    }
  }
}

/* 尾迹 */
.yl-trail {
  z-index: 1;
  transition: transform 0.15s cubic-bezier(0.2, 0.9, 0.1, 1),
    height 0.15s ease-out;
}

/* Smoother trail decay */
.yl-trail-1 {
  opacity: var(--yl-trail-opacity-1, 0.35);
  transition-duration: var(--yl-trail-delay-1, 0.15s);
}

.yl-trail-2 {
  opacity: var(--yl-trail-opacity-2, 0.2);
  transition-duration: var(--yl-trail-delay-2, 0.18s);
}

.yl-trail-3 {
  opacity: var(--yl-trail-opacity-3, 0.1);
  transition-duration: var(--yl-trail-delay-3, 0.21s);
}

.yl-trail-4 {
  opacity: var(--yl-trail-opacity-4, 0.05);
  transition-duration: var(--yl-trail-delay-4, 0.24s);
}

.yl-trail-5 {
  opacity: var(--yl-trail-opacity-5, 0.02);
  transition-duration: var(--yl-trail-delay-5, 0.27s);
}

/* 呼吸动画 */
@keyframes yl-breathe {
  0%,
  100% {
    opacity: 1;
    box-shadow: var(--yl-caret-glow, 0 0 8px rgba(64, 158, 255, 0.4));
  }
  50% {
    opacity: var(--yl-breathe-min-opacity, 0.6);
    box-shadow: none; /* Breathe the glow too */
  }
}
</style>
