# One Chat Hub · 单页官网

多模型分屏对话与共识提取 —— One Chat Hub 的单页介绍站。纯静态、零构建，直接发布到 GitHub Pages。

线上地址：**<https://thinkjunior.github.io/one-chat-hub/>**

## 内容取材约束（重要）

本页所有功能描述均来自扩展源码事实，逐条可回溯：

| 页面声明 | 依据 |
|---|---|
| 内置 22 个平台（国际 10 + 中国 12） | `src/config/platforms.ts` 的 `PLATFORM_CONFIGS` |
| 一次输入多平台自动提交、无按钮平台回退回车 | `src/content-scripts/auto-fill.ts`、`src/background/index.ts` |
| 共识提取（输入框旁「提取共识」按钮，首次需指定共识对话） | `src/components/layout/ChatHeader.tsx` 的 `doConsensus`；扩展商店描述「高效共识提取」；截图输入框右侧按钮 |
| 最大列数可调 | `src/components/layout/ChatContent.tsx`（`maxColumns`）、`src/store/chatStore.ts` |
| 提示词库（设置内管理面板） | `src/components/settings/PromptLibrary.tsx` |
| 平台地址可自定义 | `src/components/settings/PlatformUrlConfig.tsx` |
| 对话组管理 | `src/components/layout/ChatHeader.tsx`、`src/store/chatStore.ts` 的 `setActiveGroup` / `addDialogGroup` |
| 中英双语界面 | `src/i18n/index.ts`（仅 zh / en 两套）；`dist/_locales` 仅扩展名称与描述本地化 |
| 配置仅存本机 | `src/store/chatStore.ts` 的 `persistInstances` / `persistPlatformUrls` |
| 商店条目 | Chrome Web Store `mahknfabcidcbbpbjnbjoanhopbfbphn`、Edge Add-ons `hfdlhmcpmkejpbaflbnbbpcgnjfoheom`，版本均为 1.0.0 |

**新增功能前必须先确认代码里有实现**；未实现的设想只能写进"以后会有什么"，不能出现在功能列表。
商店链接只允许使用下表本品自己的条目，不要引用其他产品的商店链接、版本号、安装包或用户评价。

## 目录结构

```
one-chat-hub-site/
├─ index.html              单页正文（SEO 头部、全部文案与锚点，中英共用一份 DOM）
├─ 检查双语文案.mjs         中英文案一致性自检（node 检查双语文案.mjs）
├─ .nojekyll               GitHub Pages 原样发布，不走 Jekyll
├─ .gitattributes          统一 LF
├─ assets/
│  ├─ style.css            浅色新未来主义样式（仪器面板质感）
│  ├─ i18n.js              中英词典（唯一文案真相源，键值成对）
│  ├─ site.js              语言切换 / 截图 tab 切换 / 入场淡入 / 导航高亮
│  ├─ logo.png favicon.png                 取自本项目 public/img/
│  └─ screenshot-zh.png screenshot-en.png  取自本项目 public/screenshots/
└─ 发布到GitHub Pages.py    一键发布脚本
```

素材一律从扩展项目的 `public/` 复制，保证截图与 logo 是本品自己的。

## 发布到 GitHub Pages

### 方式一：脚本（推荐）

1. 申请 Token：GitHub → Settings → Developer settings → Personal access tokens →
   Fine-grained tokens → Repository permissions 勾选：
   `Contents: Read and write`（推代码）、`Pages: Read and write`（开 Pages）。
   若脚本创建仓库失败（fine-grained token 常常没有建库能力），
   先在浏览器手动新建空仓库 `thinkjunior/one-chat-hub`（Public、不要初始化 README），再重跑。
2. 把 token 写进 `.github-token`（已被 `.gitignore` 忽略；脚本发现它被 git 跟踪会直接拒绝运行）。
   密钥走文件就不会出现在命令行、进程列表或聊天记录里。
3. 先预演再发布：

```powershell
python "发布到GitHub Pages.py" --check-only      # 检查 canonical 一致性，不写入
python "发布到GitHub Pages.py"                   # 建仓库 → 推送 → 开 Pages
```

脚本会：校验站内自引用 URL → 检查仓库是否存在（不存在则创建）→ 提交并推送 →
开启 Pages → 打印站点地址。推送用的临时凭据 remote 会在推送后换回干净地址并复查无残留。
可用 `--owner` / `--repo` / `--branch` / `--proxy` / `--fix-canonical` 覆盖默认值。

### 方式二：手动

```powershell
git init -b main
git add -A
git commit -m "init: One Chat Hub 单页官网"
git remote add origin https://github.com/<你的账号>/one-chat-hub.git
git push -u origin main
```

再到仓库 **Settings → Pages**，Source 选 **Deploy from a branch**，分支 `main`、目录 `/ (root)`。

> GitHub Pages 项目站挂在 `/<仓库名>/` 子路径下，站内资源必须保持相对路径，
> 不要改成 `/assets/...` 开头，否则整站 404。
> 换仓库名后记得跑一次 `--fix-canonical`，canonical 与实际地址不一致会让搜索引擎收录 404 页。

## 中英双语

站点是**一份 DOM + 一份词典**：页面文案通过 `data-i18n`（innerHTML）、`data-i18n-content` /
`data-i18n-alt` / `data-i18n-aria`（属性）挂键，`window.OCH_I18N` 提供 zh / en 两套文案。
从结构上保证中英版永远同构，不会出现两个 HTML 各自漂移。

- 语言优先级：URL `?lang=en` → `localStorage['och-site-lang']` → 默认中文；切换后 URL 同步。
- 英文模式下 Hero 大图与界面预览 tab 自动切到 `screenshot-en.png`，og:image / twitter:image 同步。
- `index.html` 内联的中文只是**默认中文文案**（无 JS 时的兜底），改文案必须同时改 `assets/i18n.js` 的 zh 与 en。

**每次改文案后跑自检：**

```powershell
node 检查双语文案.mjs
```

脚本会校验：HTML 引用的每个键在 zh / en 都存在且非空、两个语言键集完全一致、英文值不含中文字符，
并列出页面里未挂 `data-i18n` 的中文（英文模式下会残留的部分）。有问题退出码非 0。

## 页面区块

以下区块均为中英双语，通过右上角「中 / EN」切换：

| 区块 | 内容 |
|---|---|
| Hero | 标语、机制说明、双 CTA、三条信任点、本品截图（随语言切换 zh/en 版） |
| 规格带 | v1.0.0 / 22 平台 / 12 语言 / MV3 / chrome.storage / 免费 |
| 功能详解 | 9 张卡，全部对应源码实现 |
| 支持平台 | 国际 10 + 中国 12 完整清单 |
| 界面预览 | 中英两张真实运行截图 tab 切换 |
| 获取与安装 | Chrome 应用商店 / Edge 加载项入口，附商店安装步骤 |
| FAQ | 6 条：API Key、数据流向、浏览器支持、平台改版、同页嵌入限制、后续方向 |

## 修改要点

- 改文案：编辑 `assets/i18n.js`（zh 与 en **必须成对**），HTML 内联文本同步改中文兜底，然后跑 `node 检查双语文案.mjs`
- 新增文案：HTML 加 `data-i18n="xxx"` 并同时在词典补 zh / en 两条，否则自检报错
- 换截图：替换 `assets/screenshot-zh.png` / `screenshot-en.png`（均为 1280×800，取自扩展项目构建产物）
- 改配色：`assets/style.css` 顶部 `:root` 变量
- 改版本号：`index.html` 头部 `brand-tag`、规格带与页脚的 `1.0.0`
