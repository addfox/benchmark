# Extension build benchmark

参考 [rstackjs/build-tools-performance](https://github.com/rstackjs/build-tools-performance)，本仓库为 **workspace 仓库**，对以下四种构建方案实现**功能完全一致**的同一款扩展，用于对比 **dev 启动时间** 与 **build 时间/产物大小**。

## 方案

| 目录 | 框架 | 说明 |
|------|------|------|
| `addfox/` | Addfox | 使用 addfox + Rsbuild（`addfox.config.ts`、`defineConfig` + `pluginReact`） |
| `plasmo/` | Plasmo | 使用 Plasmo |
| `extensionjs/` | Extension.js | 使用 Extension.js |
| `parcel-extension/` | Parcel | 使用 Parcel 官方 extension 插件 |

## 统一依赖

除各框架本身及其必需插件外，**所有库的名称与版本必须一致**，避免因依赖差异影响对比。版本以 [SHARED_DEPS.md](./SHARED_DEPS.md) 为准，四个子包的 `package.json` 已按该表对齐（生产依赖：lodash、react、react-dom、webextension-polyfill；开发依赖：@types/*、autoprefixer、postcss、tailwindcss、typescript 等）。

## 统一技术栈与功能

- **技术栈**：React + Tailwind CSS 3，统一依赖（含 lodash）
- **入口**：background, content, options, popup, sidepanel, devtools, space（自定义）
- **功能**：
  - Popup：点击截取当前页截图
  - Sidepanel：假 AI 聊天（固定回复）
  - DevTools：展示当前页捕获到的所有元素颜色
  - Space：展示已截图片（临时存储）
  - Options：常用设置 UI（语言、功能限制、权限等，可假数据）
- **资源**：图标统一使用 VideoRoll-Pro 的 icon（所有尺寸），i18n 使用 `_locales`（en / zh_CN）

## 时间埋点

- **Dev**：从执行 `dev` 命令开始，到开发服务器就绪（或浏览器启动）的时间。
- **Build**：执行 `build` 的耗时，以及构建产物的总大小（不含 dev）。

## 使用

1. 安装依赖（在 benchmark 仓库根目录；首次加入或升级 addfox 时需更新 lockfile）：
   ```bash
   pnpm install --no-frozen-lockfile
   ```

2. 复制图标（需已存在 VideoRoll-Pro 仓库）：
   ```bash
   cd benchmark && node scripts/copy-icons.mjs
   ```

3. 运行 benchmark：
   ```bash
   cd benchmark && pnpm run benchmark
   ```
   - 仅 dev：`pnpm run benchmark:dev`
   - 仅 build：`pnpm run benchmark:build`

## 目录结构

```
benchmark/
├── package.json          # 根脚本：benchmark, copy-icons
├── pnpm-workspace.yaml   # 子包：addfox, plasmo, extensionjs, parcel-extension
├── scripts/
│   ├── benchmark.mjs     # 测速脚本（dev 时长 + build 时长与体积）
│   └── copy-icons.mjs    # 从 VideoRoll-Pro 复制图标到各包 public/icons
├── shared/
│   ├── icons/            # 复制后的图标（及各包 public/icons）
│   └── locales/          # 参考 i18n 文案
├── addfox/               # Addfox 实现
├── plasmo/                # Plasmo 实现
├── extensionjs/          # Extension.js 实现
└── parcel-extension/     # Parcel 实现
```

- **addfox** 已实现完整功能与埋点；**plasmo / extensionjs / parcel-extension** 当前为占位包，需按同一功能与资源自行实现后再跑全量 benchmark。
