# Design Thesis Retrieval

> 说明：该 README 仅用于源码仓库文档，不会被打包进 Design Thesis Retrieval 桌面应用的安装包（exe/dmg）。如需查看本文档，请直接在 GitHub 仓库或源码目录中打开。

## 1. 软件简介

Design Thesis Retrieval 是一款基于 Electron 的桌面应用，专注于设计学术论文的检索与管理。软件聚合了 arXiv 等开放论文源的数据，通过内置的关键词过滤、分类展示以及下载跳转等功能，帮助设计研究者快速定位参考资料。该应用提供跨平台的桌面体验（Windows、macOS），在保持轻量的同时提供尽可能接近网页检索的交互效率。

核心特性：

- 一站式检索：内置 arXiv 接口并可扩展到本地/自定义数据源。
- 图形化界面：基于 React + Ant Design 组件提供直观列表与详情面板。
- 结果管理：支持收藏、标记及外链跳转，方便后续整理。
- 离线友好：搜索历史与偏好设置存储在本地，便于反复查询。

## 2. 使用教程（含 arXiv 搜索语法）

### 安装与启动

1. 下载对应平台的安装包（例如 `DesignThesisRetrieval Setup x.x.x.exe`）。
2. Windows 用户按照引导选择安装目录；勾选“创建桌面快捷方式”便于后续启动。
3. 安装完成后点击“启动”，或在开始菜单/Launchpad 中找到 Design Thesis Retrieval。

### 基础操作

1. **输入检索式**：在顶部搜索框输入主题、作者或自定义检索语句。
2. **筛选/排序**：使用侧边筛选器选择学科分类、时间范围或结果数量；列表顶部通常提供按照发布时间、相关度排序的选项。
3. **查看详情**：点击某条搜索结果，可在右侧/弹窗中查看摘要、作者、arXiv 链接等信息。
4. **收藏与导出**：根据 UI 按钮（例如星标或“收藏”）保存结果到本地；若需要导出，可复制链接或使用下载按钮跳转至 arXiv 页面。

### arXiv 搜索语法速查

| 语法 | 示例 | 说明 |
| ---- | ---- | ---- |
| 关键词 | `design thinking` | 基本全文检索，默认匹配标题、摘要。 |
| 精确短语 | `"interaction design"` | 使用双引号限定完整短语。 |
| 布尔逻辑 | `design AND sustainability`, `design OR architecture` | 使用 `AND`、`OR` 组合多个子条件，`AND` 默认优先。 |
| 排除关键词 | `design NOT fashion` | `NOT` 排除包含某词的条目。 |
| 字段限定 | `ti:"urban design"`、`au:"Smith"`、`cat:cs.HC` | 使用 `ti`(标题)、`au`(作者)、`abs`(摘要)、`cat`(分类) 等字段前缀。 |
| 范围查询 | `submittedDate:[2023-01-01 TO 2024-12-31]` | 限定提交时间范围；日期格式 `YYYY-MM-DD`。 |

> 提示：在应用搜索框中可直接输入上述语法；若无需高级语法，可单纯输入关键词，系统会自动调用 arXiv API 返回相关结果。

## 3. 技术栈与软件包

| 分类 | 技术/包 | 用途 |
| ---- | ------- | ---- |
| 桌面容器 | Electron `^32.0.0` | 提供跨平台桌面运行时与打包能力（electron-builder）。 |
| 前端框架 | React `^18.2.0`、React DOM `^18.2.0` | 构建组件化界面与状态管理。 |
| UI 组件库 | Ant Design `^5.12.8`、@ant-design/icons `^5.2.6` | 提供表格、表单、抽屉等高级组件与图标。 |
| Dev 工具 | electron-reload、electron-reloader | 开发阶段热重载/刷新。 |

构建流程：

1. `npm install`：安装上述依赖。
2. `npm run dev`：开发模式启动，自动套用 `electron-reload`。
3. `npm run dist:win`：调用 electron-builder 生成 Windows 安装包；可在 `build/nsis/data-dir.nsh` 中自定义安装脚本。

如需在 README 之外标注“文档不会进入安装包”，可在相关源码（例如 `main.js`、`renderer.js`）的注释或 UI 中提示，避免用户误以为安装包内附带说明文档。

