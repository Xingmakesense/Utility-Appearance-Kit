# Utility-Appearance-Kit

> 版本 `2.7.0` · 需要 DSH `>= 0.2.2-rc.3`

**把「切推理档」变成一次拖动，同时给 DSH 加上图片壁纸、液态玻璃和一张月度书卷统计卡。** 强度滑条的档位完全来自 DSH 原生模型设置：插件不写 profile 的模型配置、不探测模型、也不替你补任何 `reasoningEfforts` 字段。

它**不替换**官方模型选择器、`/model` 命令或推理强度菜单——只是给同一个原生模型目录换一种拖动入口。

```
[默认] ▬▬▬▬▬▬▬▬▬▬●▬▬▬▬▬▬▬▬  峰 ●
                     ↑
             低 ← 中 → 高 可拖
```

---

## 特性

| | 说明 |
|---|---|
| **档位来自原生设置** | 滑条读取 DSH 的模型目录快照；档位数、名称、默认值与官方模型菜单完全一致 |
| **按档位数定宽** | 每档固定 32.5px，4 档模型 130px，6 档 195px；值标签按该模型最长档位名预留宽度 |
| **只在松手时提交** | 拖动过程不发请求；宿主拒绝时回弹并在末尾显示 `!`；会话生成中锁定 |
| **峰谷价指示** | 侧栏显示 DeepSeek 峰/谷状态，悬停看倒计时，含法定节假日 |
| **图片壁纸与磨砂玻璃** | 图片、填充方式、透明度、模糊、亮度与弹出框材质，修改即时生效并持久化 |
| **月度书卷统计** | 空白会话页显示统计卡：六项指标、月份轨道、模型表和五档蓝色热力图，高度固定 360px |
| **离线可用** | 节假日请求失败时回退到包内基线；缺失年份显示「未知」，不误报成谷时 |

---

## 安装

### 从 tgz 安装（推荐）

```bash
# 1. 打包
pnpm pack --pack-destination dist
# 或（Windows，自动回退到 DSH 自带运行时）
pwsh -File scripts/build-tgz.ps1
```

2. 在 DSH 里打开 **插件管理 → 安装插件**，指向生成的 `.tgz` 文件；
3. 刷新页面。

> 替换已安装版本时，请**升版本号**再打包。包管理器用版本号判定是否重新解包，同版本号不会更新。

### 从源码开发

```bash
git clone <repo-url>
cd Utility-Appearance-Kit
node scripts/build-client.mjs
```

---

## 使用

### 拖动切档

滑条的每一格都是官方模型目录里真实存在的档位：

- 松手或按键盘确认时才提交，中间过程不会发请求；
- 宿主拒绝该档位时，滑条回弹并在末尾显示 `!`；
- 会话正在生成时滑条锁定，悬停会提示「暂不支持调整」；
- 切换模型后滑条按新模型的档位数重新定宽。

滑条左侧的「默认」表示**不发送显式的 `reasoningEffort`**，让 route 自己的默认值生效；`off` 是另一回事——它是路由声明的一个真实档位，会显式关闭思考。

### 档位从哪里来

**只来自 DSH 原生模型设置。** 有两种情况：

1. **内置 catalog 能描述的模型**：DSH 已经知道它支持哪些档位，滑条自动出现，无需任何配置。
2. **自定义/中转端点**：在 **设置 → 模型 → 该提供商的模型行 → 推理等级** 中声明档位（DSH 原生编辑器）。保存后 DSH 会刷新模型目录，滑条实时跟着变化，不需要重启。

插件不再读取或写入 profile 的 `llm-pi-ai` 段，也不会为了「猜」档位而发送 `max_tokens:1` 的探测请求。模型没有声明推理等级时，滑条不出现——这就是原生设置里的真实答案。

> 从 2.6.x 升级：旧版自动补写 `reasoningEfforts` 的功能已移除。此前依赖它出现的自定义端点，需要在 **设置 → 模型** 里声明一次；已经写进 profile 的档位会继续有效。

### 峰谷价

侧栏品牌字标右侧显示：

- **● 峰**（红）：北京时间周一至周五 09:00–12:00、14:00–18:00，法定节假日除外；
- **● 谷**（绿）：其余所有时段；
- **● 未知**（灰）：当前年份节假日数据尚未取得，不猜测为峰或谷。

悬停显示距下次切换的倒计时；未知年份显示 `--:--:--`。

### 外观与月度书卷

设置 → **外观与月度书卷**：

- 图片壁纸：URL 或上传本地图片，填充/适应/平铺；
- 效果：界面透明度、磨砂模糊、卡片不透明度、亮度；
- 展开框：不透明度与模糊度；
- 月度书卷：随机或固定书目、篇幅分类、数字单位。

所有修改即时应用到当前页面并保存。统计卡高度**固定 360px**，不提供调节项；热力图在 360px 的预算内按面板宽度自动增加列数，日期格始终是正方形。

统计卡只读 DSH 会话日志；解析缓存与累计账本保存在 `<DSH_HOME>/utility-appearance-kit/cache/`。删除账本会丢失已从磁盘删除的会话对应的历史计数。

---

## 配置

插件只有一个可选配置，默认 `slider: true`。在插件自己的 bundle row 上可写：

```yaml
- id: utility-appearance-kit
  name: utility-appearance-kit
  config:
    slider: false   # true | false
```

| 选项 | 行为 |
|---|---|
| `slider: true` | 默认。显示输入区滑条；需要 `modelDirectories` 与 `sessions` 服务 |
| `slider: false` | 不注册输入区滑条；侧栏峰谷、外观与统计卡仍保留 |

旧配置里的 `declarations` 字段会被安静丢弃，不需要手动清理；非法 `slider` 值会安全回退为「不显示滑条」。

---

## 测试

```bash
node scripts/build-client.mjs          # 从 client/*.js 生成 client.js
node scripts/build-client.mjs --check  # 只检查生成物是否最新，不写文件
node --check client.js                # 生成物语法检查
node --check host.js                  # Host 入口语法检查
node verify-host.cjs                  # 配置、固定服务接线、已移除的档位声明引擎
node verify-holidays.mjs              # 节假日校准、部分失败与离线回退
node verify-client.mjs                # 滑条/峰谷/设置共享状态与开关
node verify-compat.mjs                # 与已安装 DSH 的槽位/版本兼容
node verify-features.mjs              # 书目、统计、热力图与设置形状
node verify-usage.mjs                 # zstd 会话聚合、缓存、账本与请求围栏
node verify-routes.mjs                # 外观路由隔离
```

也可以运行 `npm run check` 和 `npm test`（只使用 Node.js，不需要安装依赖）。修改 `client/*.js` 后必须重新生成 `client.js`；不要直接编辑生成物。

`verify-compat.mjs` 会查找 `DSH_DESKTOP_ASAR`、Program Files、LocalAppData 以及各盘符下的 `app.asar` 核对槽位名和原生模型目录；找不到时跳过已安装外壳部分。

---

## 兼容性

- **DSH** `>= 0.2.2-rc.3`；
- **槽位**：`conversation.input.right`（滑条）、`sidebar.brand.name`（峰谷）、`conversation.input.dock`（月度统计）、`settings.section`（独立设置页）；
- **可选本地服务**：`modelDirectories` 与 `sessions`（仅滑条需要）；
- **平台**：DSH Desktop 与 Web 端；
- 静态兼容检查覆盖 DSH `0.2.2-rc.3` 的槽位与原生模型目录；视觉效果与交互仍建议在目标机器上人工过一遍。

---

## 开发经验与容易掉的坑

这些是历次改动留下的结论，改代码前值得先看；更完整的维护流程见 [MAINTENANCE.md](MAINTENANCE.md)。

- **不要代写 DSH 配置。** 旧版宿主半侧会扫描模型、补写 `reasoningEfforts`、探测未知端点。基座升级后这些写入更容易撞上 HMR 事务冲突，而且会和原生模型设置抢同一个字段。档位现在只有一个来源：原生模型设置；插件只读目录快照。
- **桌面代理会剥掉请求头。** DSH Desktop 的 `dsh-app://app` 转发器会删除 `host`、`origin`、`cookie`、`sec-fetch-site`，再补回 cookie。自定义路由的信任判断只能依赖**私有标记头 + 出现时才校验的跨站信号**，不能要求 `host` 一定存在；路由保持 exact/prefix 精确匹配，不要占用整个 `/utility-appearance-kit` 前缀。
- **设置只有一份状态。** 设置页、壁纸层和统计卡共用同一个 store；服务端 GET 每次读文件，客户端在 `storage`/聚焦时刷新，并且**较旧的远端快照不能覆盖更新的本地编辑**（本地 revision 守卫）。这三件事少一件，就会出现「改了设置要刷新才生效」。
- **热力图高度是布局预算，不是普通像素值。** 360px 要同时容纳指标卡、七行热力格和说明行；格子尺寸从测量高度反推。改高度常量前先看 [MAINTENANCE.md](MAINTENANCE.md) 的高度预算说明。
- **生成物不要手改。** `client.js` 是 `scripts/build-client.mjs` 拼接出来的；改完 `client/*.js` 必须重新生成，否则测试与运行时各跑一份。
- **读 asar 要按 4 字节对齐。** asar 头部的 JSON 长度会补到 4 字节边界；用 `16 + headerSize + offset` 读文件会整体偏移，`verify-compat.mjs` 曾因此在 DSH 0.2.2 上解析失败。
- **统计只读会话日志。** 不要复用原统计插件的缓存或账本；累计账本独立保存，删除日志后历史计数仍应保留。

---

## 文件结构

| 路径 | 作用 |
|---|---|
| `client.js` | 生成的浏览器模块，请勿直接编辑 |
| `client/options.js` | Client 配置归一化与安全回退 |
| `client/runtime.js` | 浏览器 factory 的共享运行时引用 |
| `client/slider.js` | 推理强度滑条（读取原生模型目录） |
| `client/pricing.js` | 峰谷 pill、节假日读取与品牌栏 |
| `client/styles.js` | 统一样式安装与卸载 |
| `client/topbar.js` | Windows 顶栏入口 |
| `client/appearance-data.js` | 外观设置、热力图高度常量、设置存储与跨窗口同步 |
| `client/appearance.js` | 图片壁纸、玻璃效果与日志弹窗处理 |
| `client/settings-page.js` | 原生二级设置页与即时保存 |
| `client/settings-styles.js` | 设置页独立样式 |
| `client/statistics-i18n.js` | 统计卡中英文文案 |
| `client/books.js` | 书目数据、篇幅与 Token 对照 |
| `client/statistics.js` | 月度统计、日历与自适应 Token 分档纯函数 |
| `client/statistics-views.js` | 月份轨道、六卡、热力、书籍和模型展示块 |
| `client/statistics-ui.js` | 统计状态、按需抓取、拖动交互与槽位注册 |
| `client/apply.js` | 独立挂载、槽位注册、清理与测试导出 |
| `scripts/build-client.mjs` | 无依赖拼接构建，支持 `--check` |
| `host.js` | Host 入口（节假日、外观、统计三条服务） |
| `host/options.js` | Host 配置归一化与 `Config` |
| `host/holiday.js` | 峰谷路由与节假日调度 |
| `host/status.js` | Host 共享日志与诊断状态 |
| `host/appearance.js` | 图片保存与外观配置接口 |
| `host/usage-store.js` | zstd 会话聚合与增量读取 |
| `host/usage-cache.js` | 紧凑持久化计数与校验 |
| `host/usage-ledger.js` | 独立累计账本 |
| `host/usage-route.js` | 统计接口与同源请求防护 |
| `holiday-calendar.js` | 节假日合并、月度刷新、缓存 |
| `holidays.json` | 离线基线 |
| `cordis.patch.yml` | bundle 插入声明 |
| `verify-*.{cjs,mjs}` | 测试 |
| `scripts/build-tgz.ps1` | 打包脚本 |
| `MAINTENANCE.md` | 维护手册（给维护者） |
| `UPLOAD-TO-GITHUB.md` | 上传到 GitHub 的步骤 |

---

## 贡献

- 改代码前先读 [MAINTENANCE.md](MAINTENANCE.md)；
- 想把仓库传到 GitHub：见 [UPLOAD-TO-GITHUB.md](UPLOAD-TO-GITHUB.md)；
- 提交前确保七个 `verify-*` 脚本全部通过。

---

## 许可证

[MIT](LICENSE)

来源与第三方 MIT 许可说明见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
