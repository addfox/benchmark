# 统一依赖版本

除各框架本身及其必需插件外，所有库的**名称与版本**必须与下表一致，以保证 benchmark 公平、无依赖差异。

## 生产依赖（dependencies）

| 包名 | 版本 |
|------|------|
| lodash | 4.17.21 |
| react | 18.2.0 |
| react-dom | 18.2.0 |
| webextension-polyfill | 0.10.0 |

## 开发依赖（devDependencies）

| 包名 | 版本 |
|------|------|
| @types/chrome | 0.0.326 |
| @types/lodash | 4.17.0 |
| @types/react | 18.2.0 |
| @types/react-dom | 18.2.0 |
| @types/webextension-polyfill | 0.10.0 |
| autoprefixer | 10.4.16 |
| postcss | 8.4.32 |
| tailwindcss | 3.4.0 |
| typescript | ~5.4.5 |

## 仅框架相关（各包不同）

- **addfox**: addfox (^0.1.1-beta.11), @rsbuild/plugin-react (^1.4.6)
- **plasmo**: plasmo
- **extensionjs**: extension
- **parcel-extension**: parcel, @parcel/config-default 等 Parcel 官方插件
