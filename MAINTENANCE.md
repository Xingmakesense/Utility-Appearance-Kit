# 维护手册

面向**插件维护者**：改代码、接新 DSH 基座、排查设置不生效或统计异常时按本手册走。

普通使用者只看 [README](README.md)。

---

## 目录

1. [现在的模块边界](#1-现在的模块边界)
2. [模型档位：只读原生设置](#2-模型档位只读原生设置)
3. [设置为什么能即时生效](#3-设置为什么能即时生效)
4. [桌面代理与请求头](#4-桌面代理与请求头)
5. [热力图 360px 的高度预算](#5-热力图-360px-的高度预算)
6. [客户端构建](#6-客户端构建)
7. [统计聚合与缓存](#7-统计聚合与缓存)
8. [节假日数据](#8-节假日数据)
9. [验证与发布](#9-验证与发布)
10. [排查清单](#10-排查清单)
11. [历史经验与坑](#11-历史经验与坑)
12. [`status.json` 字段](#12-statusjson-字段)

---

## 1. 现在的模块边界

```
client/  runtime / options / slider / pricing / styles / topbar
         appearance-data / appearance / settings-page / settings-styles
         statistics-i18n / books / statistics / statistics-views / statistics-ui / apply
host/    options / holiday / status / appearance / usage-store / usage-cache / usage-ledger / usage-route
共享     holiday-calendar.js, holidays.json
```

- **Host 只有三条服务**：节假日路由与刷新、外观设置与图片路由、月度统计路由。它**不请求** `configEditor`，不读写 `llm-pi-ai` 配置。
- **Client 不注入** `connection` 或 `credentials`；订阅额度、认证、DeepSeek 账户账本属于独立的 `dsh-Subscription-Management`。
- 旧版的 `host/declarations.js`、`capabilities.json`、探测缓存和 `declarations` 配置已删除。不要以「兼容旧模型」为理由把它们加回来。

---

## 2. 模型档位：只读原生设置

滑条的数据来源只有一条：

```
DSH 原生模型设置 / catalog
        ↓
modelDirectories.directoryFor(sessionId).store.groups[].models[].reasoning
        ↓
client/slider.js 的 levels / defaultEffort
```

- 档位数量、名称、默认值、线上值（含 `off: null`）都由 DSH 的模型目录决定；
- 插件通过 `directory.select({ provider, model, reasoningEffort })` 提交，不自己拼请求；
- 自定义/中转端点要让滑条出现，请在 **设置 → 模型 → 模型行 → 推理等级** 里声明；
- 原生设置保存后，DSH 会刷新目录（`settings/document-updated`、`llm/models-updated` 等事件），滑条订阅同一个 store，无需刷新页面。

**不要**再按模型前缀猜档位、不要探测端点、不要写 `compat` 或 `thinkingFormat`。这些工作在旧版曾导致「不同档位发同一个请求」和「写坏用户配置」两类问题。

---

## 3. 设置为什么能即时生效

外观设置、壁纸层和月度统计卡共享 `client/appearance-data.js` 里的**同一个 store**。保持下面四条同时成立：

1. **设置页订阅 store**：`uakSettingsStore.subscribe` 把远端或其它窗口的变化同步到当前表单；
2. **提交即应用**：`commit` 同步更新内存状态并通知订阅者，壁纸层和统计卡立即重绘；
3. **跨窗口同步**：`storage` 事件接收其它窗口的保存；窗口重新获得焦点/可见时调用 `uakRefreshSettings()` 从 Host 再读一次；
4. **旧快照不能回滚新编辑**：每次本地提交递增 `uakLocalRevision`；Host 快照带着读取时的 revision 返回，`applyRemote` 只在 revision 未变、且没有在途保存时落地。

Host 侧的 `GET /utility-appearance-kit/settings` 每次读取 `settings.json`，不做进程内缓存。旧实现缓存到进程重启，第二窗口或外部编辑读不到新值。

**排查顺序**：先看设置页是否订阅了 store，再看 `uakCommitSettings` 是否被 revision 守卫挡掉，最后看 Host GET 是否返回旧文件。

---

## 4. 桌面代理与请求头

DSH Desktop 用 `dsh-app://app` 自定义协议加载页面，其余路径转发到本地 Web server。转发器会：

- 删除 `host`、`origin`、`cookie`、`sec-fetch-site`；
- 补回 Host 进程的 cookie；
- 放行自定义标记头（`x-dsh-uak-settings`、`x-dsh-uak-usage`）。

因此自定义路由的信任判断：

- **必须**要求私有标记头（写请求）或接受匿名读（图片 GET）；
- **不能**要求 `host` 一定存在，也不能只信 `host`；
- `origin` / `sec-fetch-site` 出现时才校验；`dsh-app://app` 与 `null` 视为原生外壳；
- 路由保持 exact/prefix 精确匹配；不要注册 `/utility-appearance-kit` 通配前缀，否则会挡住其它插件（尤其是订阅插件的认证通道）。

统计接口 `refuseRequest` 与外观接口应保持同一套判断；改其中一个时同时跑 `verify-routes.mjs` 和 `verify-usage.mjs`。

---

## 5. 热力图 360px 的高度预算

统计卡高度固定为 `UAK_STATS_HEIGHT = 360`（`client/appearance-data.js`）。设置页**不提供**高度选项；`client/statistics-ui.js` 直接用这个常量计算布局。

360px 内依次扣掉：

```
指标卡实测高度 + 说明行实测高度 + 20px 内容边距
+ 热力容器内边距 × 2 + 行间距 × 6
= 七行正方形格子的可用高度
```

格子边长按 18 / 13 / 9px 三档回退；列数按面板宽度和格子尺寸取整（至少 22 列），所以宽面板是增加列数而不是拉伸格子。改高度或字号前先把这套算法在 1100px 与窄面板两种宽度下各目测一次。

高度常量同时写入 `html { --uak-stats-height }` 和统计卡根节点，CSS 里的 360px 只是没有 JS 时的兜底。

---

## 6. 客户端构建

- 源码在 `client/*.js`，按 `scripts/build-client.mjs` 里的顺序拼接成 `client.js`；
- 改完源码必须运行 `node scripts/build-client.mjs`；
- 提交前跑 `node scripts/build-client.mjs --check`，生成物过期会直接失败；
- **不要**直接编辑 `client.js`；
- 模块顺序有意义：`runtime → options → slider → pricing → styles → appearance-data → appearance → settings-styles → statistics-i18n → books → statistics → statistics-views → statistics-ui → settings-page → topbar → apply`。新增文件时同时改构建列表与 `package.json` 的 `files`。

React 由 DSH 的模块加载器提供；`react-dom` 和 UI primitives 用 `try/catch` 可选加载。组件里的 Hook 数量必须稳定：提前 return 之前不要漏掉 Hook。

---

## 7. 统计聚合与缓存

- 只读 DSH 的会话日志（`sessions/**/*.jsonl.zstd`），不读原统计插件的缓存或账本；
- 解析缓存与累计账本在 `<DSH_HOME>/utility-appearance-kit/cache/`；
- 缓存格式见 `host/usage-cache.js` 的 `VERSION`，改结构必须同时处理旧格式；
- 账本只增不减：会话日志被删除后，历史计数仍保留；
- 紧凑计数只保留非零小时、去掉零 token 的模型项；不要为了省空间丢掉正的 lifetime 历史；
- 统计接口需要同源标记头 `x-dsh-uak-usage: 1`；`?refresh=1` 会强制重扫，仍要过同一道围栏。

---

## 8. 节假日数据

- 包内 `holidays.json` 是离线基线（当前只含 2026 年）；
- Host 每个北京月份最多请求一次公共日历，合并结果写入 `<profile>/.utility-appearance-kit/holidays.json`；
- 请求失败保留旧值并 20 小时后再试；某年取不到时客户端显示「未知」，不要按「谷」处理；
- 补新年份时可以手工编辑 profile 缓存，或等联网刷新。

---

## 9. 验证与发布

```bash
node scripts/build-client.mjs
node scripts/build-client.mjs --check
node --check client.js
node verify-host.cjs
node verify-holidays.mjs
node verify-client.mjs
node verify-compat.mjs
node verify-features.mjs
node verify-usage.mjs
node verify-routes.mjs
```

发布步骤：

1. 改代码；
2. 升 `package.json` 版本号（patch/minor，按变更性质）；
3. 重新生成 `client.js`；
4. 跑全套测试；
5. `pwsh -File scripts/build-tgz.ps1` 打包；
6. 通过插件管理器安装 tgz，刷新页面。

提交信息建议使用 Conventional Commits：

```
feat: move effort levels to native model settings
fix: keep appearance settings live across windows
docs: rewrite the maintenance guide
```

---

## 10. 排查清单

| 现象 | 先查 |
|---|---|
| 滑条不出现 | 该模型在原生设置里是否有推理等级；`modelDirectories` 是否可用；会话是否 subagent |
| 档位数不对 | 原生模型设置里的档位声明；是否还在跑旧版插件 |
| 拖过去回弹 | 该档位是否真的受支持；`UNSUPPORTED_REASONING_EFFORT` 的报错 |
| 改了设置要刷新 | 设置页是否订阅 store；revision 守卫是否拦掉旧快照；Host GET 是否还缓存 |
| 设置保存失败 | 标记头是否被转发器保留；响应是否 403；`settings.json` 是否可写 |
| 统计卡报错 | `/utility-appearance-kit/usage` 的 403/500；会话日志目录；缓存/账本是否损坏 |
| 热力图挤压 | 360px 预算是否被指标卡撑爆；`ResizeObserver` 是否量到高度 |
| 节假日显示未知 | 当前年份是否已在基线或 profile 缓存中；网络刷新是否成功 |
| `verify-compat` 解析 asar 失败 | 头部 4 字节对齐；DSH 版本是否 >= 0.2.2-rc.3 |

---

## 11. 历史经验与坑

1. **代写配置的代价。** 旧引擎通过 `configEditor.edit` 补 `reasoningEfforts`。基座升级后这类写入更容易撞上 `HMR transactions cannot be nested`，重试也只是把问题推迟；同时原生模型设置开始管理同一个字段，两边互相覆盖。结论：档位只读原生，插件不写配置。
2. **不要探测。** `max_tokens:1` 的探测只能证明「该端点没拒绝这个字段」，不能证明档位存在；把探测结果写成完整档位会让下一次真实调用 400。
3. **方言不归插件管。** `thinkingFormat` / `supportsReasoningEffort` 由 pi-ai 的 catalog 和端点检测决定；按模型前缀或 URL 子串猜方言曾让不同模型顺序产生不同结果。
4. **Host 头不可依赖。** 桌面转发器会删 `host`/`origin`/`sec-fetch-site`；信任只能建立在私有标记头和「出现时才校验」的跨站信号上。
5. **进程内缓存会杀死「实时」。** 外观设置曾经缓存到进程重启，第二个窗口永远读旧值；现在 GET 每次读文件，客户端用 revision 守卫合并。
6. **异步启动会回滚编辑。** 首次加载的 Host 快照如果晚于用户保存返回，就会把新值改回去；`uakLocalRevision` + `uakPendingSaves` 是为此加的。改 store 时保留这两个守卫。
7. **asar 头部有 4 字节对齐。** 读取文件要用 `16 + align4(headerSize) + offset`；否则 `verify-compat.mjs` 会在新版 DSH 上把 `package.json` 解析成垃圾。
8. **生成物与源码会分叉。** 忘记跑构建时，测试和运行时各用一份代码；`--check` 是唯一防线。
9. **固定高度是布局契约。** 360px 是热力图七行、指标卡和说明行共同的结果；把它改回设置项会重新引入「不同机器高度不一致」的问题。
10. **精确路由是隔离手段。** 外观路由曾占用 `/utility-appearance-kit` 通配前缀，挡住订阅插件的认证；现在只注册 settings、asset、usage、holidays 四条精确/受限路径。
11. **外观挂载要等 `document.body`。** 客户端插件可能先于 HTML body 完成组合；旧代码的重试只重新检查 body，随后直接返回，导致壁纸和所有外观设置第一条命都不生效。现在 `uakMountAppearance` 会一直等到 body 再挂载，修改时不要退回「只检查不继续」的写法。

---

## 12. `status.json` 字段

位置：`~/.dsh/profiles/<profile>/.utility-appearance-kit/status.json`

`plugin` 与 `holiday` 两个作用域各自保留最后一次状态，互不覆盖；顶层的 `phase` 只是最后一次写入的副本。

| 字段 | 含义 |
|---|---|
| `plugin.phase` | `apply` / `config-error` |
| `plugin.error` | 配置非法时的说明 |
| `holiday.phase` | `route-ready` / `route-error` / `calendar` / `calendar-error` |
| `holiday.changed` / `failedYears` | 是否有年份写入、哪些年份失败 |

旧版的 `engine.*` 字段已不再写入，升级后第一次记录状态时会被清理；`probes.json` 也可以安全删除。
