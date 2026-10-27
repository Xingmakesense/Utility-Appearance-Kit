# Utility-Appearance-Kit

> 版本 `2.0.0` · 需要 DSH `>= 0.2.1-rc.2`

**在 DeepSeek Harness 输入区直接拖动推理强度，并查看 DeepSeek 峰谷状态。** 滑条紧贴官方模型选择器左侧，按模型的真实档位数伸缩；订阅卡片与认证已拆分为独立的 `dsh-Subscription-Management`。

它**不替换**官方模型选择器、`/model` 命令或推理强度菜单——只是把「切档」这件事变成一个可以拖的操作。

```
[默认] ▬▬▬▬▬▬▬▬▬▬●▬▬▬▬▬▬▬▬  峰 ●
                     ↑
             低 ← 中 → 高 可拖
```

---

## 特性

| | 说明 |
|---|---|
| **按档位数定宽** | 每档固定 32.5px，4 档模型 130px，6 档 195px；值标签按该模型最长档位名预留宽度，`Medium` 不会再被截断 |
| **优先问 DSH** | 先调用 `resolveModelInfo()`；已被 DSH 正确描述的模型不需要插件改配置 |
| **保守补声明** | 只为缺少声明、且能力表明确验证过的具体模型补 `reasoningEfforts`，不按厂商前缀猜 |
| **不猜测方言** | 不合成 `thinkingFormat`/`supportsReasoningEffort`；方言由 pi-ai 按端点和协议检测 |
| **峰谷价指示** | 侧栏显示 DeepSeek 峰/谷状态，悬停看倒计时，含法定节假日 |
| **离线可用** | 节假日失败时回退到包内基线；缺失年份显示“未知”，不误报成谷时 |

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
> 本包使用新的插件 id；旧版插件必须先从 profile 中移除，不能与本包同时启用，否则会出现重复滑条和重复节假日路由。

### 从源码开发

```bash
git clone <repo-url>
cd Utility-Appearance-Kit
pnpm pack --pack-destination dist
```

---

## 使用

### 拖动切档

- 松手或按键盘确认时才提交，中间过程不会发请求；
- 宿主拒绝该档位时，滑条回弹并在末尾显示 `!`；
- 会话正在生成时滑条锁定，悬停会提示「暂不支持调整」。

### 「默认」按钮

滑条左侧的「默认」表示**不发送显式的 `reasoningEffort`**，而不是保证请求里一定没有思考相关字段。若该 route 自己配置了 `reasoning`，由适配器按那个默认值发送；要显式关闭思考，请选择 `off`。

`off` 是另一回事——它是路由声明的一个真实档位，会显式关闭思考。两者别混：

| 选择 | 发出的请求 |
|---|---|
| 默认 | 不带显式 `reasoningEffort`；route 的 `reasoning` 默认值仍可能生效 |
| `off` | 按声明的线上值显式关闭（`off: null` 表示省略字段） |

### 峰谷价

侧栏品牌字标右侧显示：

- **● 峰**（红）：北京时间周一至周五 09:00–12:00、14:00–18:00，法定节假日除外；
- **● 谷**（绿）：其余所有时段；
- **● 未知**（灰）：当前年份节假日数据尚未取得，不猜测为峰或谷。

悬停显示距下次切换的倒计时；未知年份显示 `--:--:--`。

### 独立订阅插件

订阅额度卡片、厂商认证、DeepSeek 余额与今日用量已拆分为 `dsh-Subscription-Management`。本项目只保留推理强度滑条、峰谷指示、顶栏入口和档位兼容逻辑，不再加载订阅 RPC、凭据或账户模块。

---

## 它是怎么补档位的

插件需要在 profile 里为模型声明可用档位（`reasoningEfforts`），官方选择器和滑条才能画出格子。优先级从高到低：

| | 来源 | 说明 |
|---|---|---|
| 1 | 你已写的 `reasoningEfforts` | **永不覆盖**（包括 `false`） |
| 2 | DSH 的 `resolveModelInfo()` | 报告说“这个模型已经能选这些档位”。此时**不写配置**：报告不含线上映射值，写回会把 `off: "none"` 改成 `off: null` |
| 3 | 插件内置能力表 | 只对具体模型、且已人工验证的规则生效；没有厂商级兜底 |
| 4 | 一次性探测 | 仅启动时，对能力表完全没有规则的未知模型发一个 `max_tokens:1` 请求，只声明探测过的那一档 |

因此：catalog 能描述的模型由 DSH 自己负责，不需要插件升级；自建网关这类 DSH 完全描述不了的端点，才需要维护表或依赖探测。

### 什么情况下会写你的配置

只在模型的 `reasoningEfforts` **缺失**、且该模型不在 DSH 报告中、同时命中一条明确能力规则或探测结论时才补写。通过 DSH 官方的配置编辑接口完成，校验失败自动回滚。

已有值（包括 `reasoningEfforts: false`）一律视为你的决定，不会被改动。插件**不会**再写 route 的 `compat`，也不会按主机名子串或模型顺序猜测方言。

### 探测缓存

未知模型的探测结论按 `route + api + baseURL + model` 隔离，并带 TTL：成功 7 天、失败 6 小时后重新探测。一次网络错误不会再被记成永久“不支持”。

---

## 配置

插件没有必填配置项，默认 `declarations: "auto"`、`slider: true`。在插件自己的 bundle row 上可写：

```yaml
- id: utility-appearance-kit
  name: utility-appearance-kit
  config:
    declarations: off   # auto | off
    slider: false       # true | false
```

| 选项 | 行为 |
|---|---|
| `declarations: "auto"` | 默认。只补 DSH 完全描述不了的缺口；已有 `reasoningEfforts` 和 DSH 报告的档位一律不改 |
| `declarations: "off"` | 不注入 `configEditor`，不读取或写入档位配置，由新版 DSH 原生自定义档位完全接管 |
| `slider: true` | 默认。显示输入区滑条 |
| `slider: false` | 不注册输入区滑条，也不要求 `modelDirectories/sessions`；侧栏峰谷 pill 仍保留 |

如果只想使用新版 DSH 的原生档位与原生 UI，设置 `declarations: "off"` 和 `slider: false`。如果要保留拖动滑条但由 DSH 原生管理档位，使用 `declarations: "off"`、`slider: true`。非法配置会安全回退为 `declarations: "off"`、`slider: false`。

`auto` 模式下，插件在 profile 的 `llm-pi-ai` 段写入形如：

```yaml
providers:
  my-gateway:
    api: openai-completions
    baseURL: https://api.example.com/v1
    models:
      - id: some-model
        reasoningEfforts:
          low: low
          medium: medium
          high: high
```

`off: null` 表示「支持关闭思考，但不发送字段」。

**想固定某个模型的档位**，自己写死即可，插件不会再碰它。

---

## 测试

```bash
node scripts/build-client.mjs          # 从 client/*.js 生成 client.js
node scripts/build-client.mjs --check  # 只检查生成物是否最新，不写文件
node --check client.js                # 生成物语法检查
node --check host.js                  # Host 入口语法检查
node verify-host.cjs                  # 档位决策、选项、wire 映射、applyPlan 合并
node verify-engine.mjs                # 端到端：扫描 → 计划 → 写入
node verify-holidays.mjs              # 节假日校准、部分失败与离线回退
node verify-client.mjs                # 滑条/峰谷、布局与开关
node verify-compat.mjs                # 与已安装 DSH 的槽位/版本兼容
```

也可以运行 `npm run check` 和 `npm test`（只使用 Node.js，不需要安装依赖）。修改 `client/*.js` 后必须重新生成 `client.js`；不要直接编辑生成物。

`verify-compat.mjs` 会查找 `DSH_DESKTOP_ASAR`、Program Files、LocalAppData 以及各盘符下的 `app.asar` 核对槽位名；找不到时跳过已安装外壳部分，仍检查包清单、源码和文档版本。

---

## 兼容性

- **DSH** `>= 0.2.1-rc.2`；
- **槽位**：`conversation.input.right`（滑条）、`sidebar.brand.name`（峰谷）；
- **可选本地服务**：`modelDirectories` 与 `sessions`（仅滑条需要）；
- **平台**：DSH Desktop，Web 端可用；
- 已在 DSH `0.2.1-rc.3` 上验证。

---

## 已知限制

- 只有自定义端点（带 `baseURL`）才需要内置表；能力表只列明确验证过的模型，未列出的模型不会被猜测，详见 [MAINTENANCE.md](MAINTENANCE.md)；
- 节假日离线基线只含 2026 年；缺失年份显示「未知」，之后由月度扫描补，或在无网络时手工补 `holidays.json`；
- DSH 的 `configEditor` 以完整 config override 保存；首次补档会把当时的其它字段固定在 profile 层（官方 API 限制，插件已按编辑时最新配置合并，无法只持久化增量）；
- 175% DPI 下 composer 可能被窗口下缘裁切。

---

## 文件结构

| 路径 | 作用 |
|---|---|
| `client.js` | 生成的浏览器模块，请勿直接编辑 |
| `client/options.js` | Client 配置归一化与安全回退 |
| `client/runtime.js` | 浏览器 factory 的共享运行时引用 |
| `client/slider.js` | 推理强度滑条与既有视觉修复 |
| `client/pricing.js` | 峰谷 pill、节假日读取与品牌栏 |
| `client/styles.js` | 统一样式安装与卸载 |
| `client/topbar.js` | Windows 顶栏入口 |
| `client/apply.js` | 独立挂载、槽位注册、清理与测试导出 |
| `scripts/build-client.mjs` | 无依赖拼接构建，支持 `--check` |
| `host.js` | Host 入口与兼容导出 |
| `host/options.js` | Host 配置归一化与 `Config` |
| `host/declarations.js` | 档位声明扫描、探测与配置合并 |
| `host/holiday.js` | 峰谷路由与节假日调度 |
| `host/status.js` | Host 共享日志与诊断状态 |
| `holiday-calendar.js` | 节假日合并、月度刷新、缓存 |
| `holidays.json` | 离线基线 |
| `capabilities.json` | 内置能力表 |
| `cordis.patch.yml` | bundle 插入声明 |
| `verify-*.{cjs,mjs}` | 测试 |
| `scripts/build-tgz.ps1` | 打包脚本 |
| `MAINTENANCE.md` | 维护手册（给维护者） |
| `UPLOAD-TO-GITHUB.md` | 上传到 GitHub 的步骤 |

---

## 贡献

- 改代码或内置能力表：先读 [MAINTENANCE.md](MAINTENANCE.md)
- 想把仓库传到 GitHub：见 [UPLOAD-TO-GITHUB.md](UPLOAD-TO-GITHUB.md)
- 提交前请确保五个 `verify-*` 脚本全部通过

---

## 许可证

[MIT](LICENSE)
