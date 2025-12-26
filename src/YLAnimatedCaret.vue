<template>
  <div
    ref="wrapperRef"
    class="yl-animated-caret-wrapper"
    :style="computedWrapperStyle"
  >
    <!-- 光标层 -->
    <div class="yl-caret-layer" v-show="isFocused">
      <!-- 尾迹 (Trail Mode) -->
      <template v-if="type === 'trail' && enableTrail">
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

  // 拖尾类型
  type: {
    type: String,
    default: "trail", // 'trail' | 'particle'
    validator: (value) => ["trail", "particle"].includes(value),
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
    validator: (value) => value >= 0 && value <= 10,
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
    default: 1.6, // 更舒缓的呼吸节奏
  },
  breatheMinOpacity: {
    type: Number,
    default: 0.4, // 稍微提高最小透明度，避免过于暗淡
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
    "--yl-caret-color-start": "#2979ff",
    "--yl-caret-color-mid": "rgba(41, 121, 255, 0.85)",
    "--yl-caret-color-end": "rgba(41, 121, 255, 0.6)",
    "--yl-caret-glow": "0 0 8px rgba(41, 121, 255, 0.5)",
  },
  "gradient-red": {
    "--yl-caret-color-start": "#ff4d4f",
    "--yl-caret-color-mid": "rgba(255, 77, 79, 0.85)",
    "--yl-caret-color-end": "rgba(255, 77, 79, 0.6)",
    "--yl-caret-glow": "0 0 8px rgba(255, 77, 79, 0.6)",
  },
  solid: {
    "--yl-caret-color-start": "#409eff",
    "--yl-caret-color-mid": "#409eff",
    "--yl-caret-color-end": "#409eff",
    "--yl-caret-glow": "none",
  },
};

// 状态
const wrapperRef = ref(null);
const targetInput = ref(null);
const isFocused = ref(false);
const isMoving = ref(false);
const isComposing = ref(false); // 是否正在进行 IME 输入 (中文拼音等)
const caretPos = ref({ x: 0, y: 0, height: 20 });

// 光标移动定时器和连续移动检测
let moveTimer = null;
let lastMoveTime = 0;
const RAPID_MOVE_THRESHOLD = 200; // 200ms 内再次移动视为连续操作

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
  mirrorDiv.style.zIndex = "-9999";
  document.body.appendChild(mirrorDiv);
};

// 粒子工具函数
const randomRange = (min, max) => Math.random() * (max - min) + min;

// 生成粒子
const spawnParticles = (x, y, startX, height, colorVar) => {
  const container = wrapperRef.value?.querySelector(".yl-caret-layer");
  if (!container) return;

  // 粒子数量：每次生成 1-2 个粒子
  const particleCount = Math.floor(randomRange(1, 2));

  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement("div");
    particle.classList.add("yl-particle");

    // 位置：X 在光标附近，稍微向后偏移
    const pX = x + randomRange(-2, 6);
    // Y 集中在光标中心：使用高斯分布模拟，集中在中心 ±20% 范围内
    const centerY = y + height / 2;
    const offsetY = (Math.random() - 0.5) * 2 * (height * 0.2); // 中心 ±20%
    const pY = centerY + offsetY;

    // 随机大小：2px - 3.5px (稍微缩小一点)
    const size = randomRange(2, 3.5);

    // 运动优化：几乎静止，只有微弱的浮动
    // tx, ty 极小，模拟空气扰动
    const tx = randomRange(-5, 5);
    const ty = randomRange(-5, 5);

    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    particle.style.left = `${pX}px`;
    particle.style.top = `${pY}px`;
    particle.style.setProperty("--tx", `${tx}px`);
    particle.style.setProperty("--ty", `${ty}px`);

    // 颜色继承，更淡的效果
    const color = colorVar || "var(--yl-caret-color-start)";
    particle.style.backgroundColor = color;
    particle.style.opacity = "0.4"; // 降低初始透明度
    // 移除光晕，更 subtle
    particle.style.boxShadow = "none";

    // 延长的消失时间：0.8s - 1.2s，营造"慢慢消失"
    particle.style.animationDuration = `${randomRange(0.8, 1.2)}s`;

    container.appendChild(particle);

    // 动画结束后移除
    particle.addEventListener("animationend", () => {
      particle.remove();
    });
  }
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
    const now = Date.now();
    const isRapidMove = now - lastMoveTime < RAPID_MOVE_THRESHOLD;
    lastMoveTime = now;

    isMoving.value = true;
    if (moveTimer) clearTimeout(moveTimer);

    // 连续快速移动时延长移动状态，保持流畅
    const moveDuration = isRapidMove ? 500 : 350;

    moveTimer = setTimeout(() => {
      isMoving.value = false;
    }, moveDuration);

    // --- 粒子生成逻辑 ---
    // 向左移动且距离足够才触发
    const currentX = caretPos.value.x;
    const lastX = mirrorDiv
      ? parseFloat(mirrorDiv.getAttribute("data-last-x")) || currentX
      : currentX;

    // 记录上一次位置供下次使用
    if (mirrorDiv) mirrorDiv.setAttribute("data-last-x", currentX);

    if (props.type === "particle" && triggerMove) {
      // 这里的 caretPos 实际上是预期的目标位置，我们需要比较前后的位置
      // 但由于 updateCursor 被设计为幂等的，这里我们需要一个更可靠的方式来获取"上一次"位置
      // 或者我们可以简单判断：如果是 continuous backspace，我们就在当前位置生成

      // 实际上，为了效果好，我们可以不管通过什么方式触发，
      // 只要是 isRapidMove (连续操作) 且是向左删除（通常光标位置会变小，但换行时例外）
      // 简单起见，我们在每次 triggerMove 时，如果在连续模式下，都生成粒子

      // 注意：updateCursor 可能会在 resize 时触发，所以必须依赖 triggerMove
      spawnParticles(
        caretPos.value.x,
        caretPos.value.y,
        caretPos.value.x + 10,
        caretPos.value.height
      );
    }
    // ------------------
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
  targetInput.value.addEventListener(
    "compositionstart",
    handleCompositionStart
  );
  targetInput.value.addEventListener(
    "compositionupdate",
    handleCompositionUpdate
  );
  targetInput.value.addEventListener("compositionend", handleCompositionEnd);
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
  targetInput.value.removeEventListener(
    "compositionstart",
    handleCompositionStart
  );
  targetInput.value.removeEventListener(
    "compositionupdate",
    handleCompositionUpdate
  );
  targetInput.value.removeEventListener("compositionend", handleCompositionEnd);
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
  // IME 输入时也要更新光标位置
  updateCursor(true);
};

const handleCompositionStart = () => {
  isComposing.value = true;
};

const handleCompositionUpdate = () => {
  // IME 组合文本变化时，实时更新光标位置
  updateCursor(true);
};

const handleCompositionEnd = () => {
  isComposing.value = false;
  // 上屏后立即更新位置
  updateCursor(true);
};

const handleClick = () => {
  updateCursor(true);
};

const handleKeyup = () => {
  updateCursor(true);
};

const handleKeydown = (e) => {
  // 对于会触发 input 事件的按键（如删除、普通字符输入），
  // 交给 handleInput 处理，避免重复计算或竞态条件
  // 仅对光标移动类按键立即响应
  const navigationKeys = [
    "ArrowLeft",
    "ArrowRight",
    "ArrowUp",
    "ArrowDown",
    "Home",
    "End",
    "PageUp",
    "PageDown",
  ];
  if (navigationKeys.includes(e.key)) {
    nextTick(() => updateCursor(true));
  }
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
     使用更符合人类视觉感知的渐变曲线
     更早开始、更平滑的过渡
  */
  background: linear-gradient(
    180deg,
    var(--yl-caret-color-start, #409eff) 0%,
    var(--yl-caret-color-mid, rgba(64, 158, 255, 0.85)) 60%,
    var(--yl-caret-color-end, rgba(64, 158, 255, 0.6)) 100%
  );
  box-shadow: var(--yl-caret-glow, 0 0 8px rgba(64, 158, 255, 0.4));
}

/* 主光标 - Fluid Motion */
.yl-main-caret {
  z-index: 2;
  /* 优化过渡时间和缓动函数，实现更自然的移动效果 */
  transition: transform 0.18s cubic-bezier(0.25, 0.46, 0.45, 0.94),
    /* ease-out-quad: 快速启动，优雅减速 */ height 0.18s ease-out;

  .yl-caret-visual {
    animation: yl-breathe var(--yl-breathe-duration, 2.2s) ease-in-out infinite;
    /* 渐进式动画恢复，避免突兀 */
    transition: opacity 0.2s ease-out;
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
  /* 尾迹稍慢于主光标，形成自然的拖尾效果 */
  transition: transform 0.22s cubic-bezier(0.25, 0.46, 0.45, 0.94),
    height 0.22s ease-out;
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
    opacity: var(--yl-breathe-min-opacity, 0.4);
    box-shadow: none; /* Breathe the glow too */
  }
}

/* 粒子特效 */
:deep(.yl-particle) {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
  z-index: 100;
  will-change: transform, opacity;
  animation-name: yl-particle-fade;
  animation-timing-function: cubic-bezier(0.25, 0.46, 0.45, 0.94);
  animation-fill-mode: forwards;
  /* 柔和边缘 */
  filter: blur(0.5px);
}

@keyframes yl-particle-fade {
  0% {
    transform: translate(0, 0) scale(1);
    opacity: 0.35;
  }
  100% {
    /* 几乎原地消失，带一点点漂浮感 */
    transform: translate(var(--tx), var(--ty)) scale(0.2);
    opacity: 0;
  }
}
</style>
