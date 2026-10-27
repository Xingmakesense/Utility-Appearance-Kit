# 维护手册

面向**插件维护者**：厂商发布新模型、修改档位、或新增兼容端点时，按本手册更新。

普通使用者不需要读这个文件，直接看 [README](README.md) 即可。

---

## 目录

1. [先判断该不该动](#1-先判断该不该动)
2. [`capabilities.json` 结构](#2-capabilitiesjson-结构)
3. [更新流程](#3-更新流程)
4. [最常见的四个错误](#4-最常见的四个错误)
5. [验证档位真的生效](#5-验证档位真的生效)
6. [发布新版本](#6-发布新版本)
7. [排查清单](#7-排查清单)
8. [模块边界与 quota 维护](#8-模块边界与-quota-维护)

---

## 1. 先判断该不该动

插件补档位时有四级优先级，**只有 DSH 完全描述不了的模型**才需要改表或探测：

| 优先级 | 来源 | 什么时候用 |
|---|---|---|
| 1 | 用户已写的 `reasoningEfforts` | 永远不覆盖，无需维护 |
| 2 | DSH 的 `llm.resolveModelInfo()` | catalog 能描述的模型；报告只表示“已可选中”，插件不写配置 |
| 3 | `capabilities.json` | 只对明确验证过的具体模型生效，没有家族兜底 |
| 4 | 一次性探测 | 启动时对未知模型发 `max_tokens:1`，只声明实际探测的 `low` |

判断方法：该模型的端点在 pi-ai catalog 里吗？

- **在**（如 `api.openai.com`、`api.moonshot.ai`、`api.z.ai`）→ 不用动表，catalog 升级后自动生效；
- **不在**（自建网关、第三方中转、`https://api.example.com/v1` 这类）→ 先看是否需要探测，再考虑加明确规则。

### 快速自检

```bash
cat ~/.dsh/profiles/<profile>/.utility-appearance-kit/status.json
```

看 `.engine.phase` 和 `.engine.reported`。若 `phase` 是 `declared` 且 `reported` 计数大于 0，说明 DSH 已经描述了部分模型；它们不会被表覆盖。

---

## 2. `capabilities.json` 结构

```json
{
  "version": 3,
  "vendors": [
    {
      "name": "qwen",
      "match": "^qwen",
      "exclude": "(image|embed|rerank|tts|asr|ocr)",
      "api": "openai-completions",
      "levelsByModel": [
        { "match": "^qwen3\\.8-", "levels": ["low", "medium", "xhigh"] },
        { "match": "^qwen3\\.[67]-(max|plus|flash)$", "levels": ["off", "minimal", "low", "medium", "high"] }
      ]
    }
  ]
}
```

| 字段 | 作用 | 注意 |
|---|---|---|
| `name` | 可读名 | 不参与匹配，仅便于阅读 |
| `match` | 模型 id 正则，决定归哪个厂商 | 不区分大小写 |
| `exclude` | 命中则剔除 | **优先于 `match`**，用于排除图片/嵌入模型 |
| `api` | 限定协议 | 与路由的 `api` 不同则不匹配；省略则不限 |
| `levelsByModel[].match` | 单模型精确档位 | **从上往下，命中第一条即停；必须命中，否则不声明** |
| `levelsByModel[].levels` | 该模型的档位列表 | 顺序即滑条从左到右 |
| `levelsByModel[].wire` | 非恒等的线上值 | 例如 `{ "off": "none" }`；未写的档位发同名值 |
| `levels` | **已废弃** | 不再有厂商级兜底；写了也会被忽略 |
| `officialDialect` / `officialHosts` | **已废弃** | 不再猜测方言；交给 pi-ai 按端点/协议检测 |

### 档位语义速查

| 写法 | 含义 |
|---|---|
| `"off": null` | 支持关闭思考，**不发任何字段** |
| `"off": "none"` | 支持关闭思考，**显式发送** `"none"` |
| 不写某个档位 | **不支持**，滑条不会出现这一格 |
| `"high": "high"` | 支持，线上发 `"high"` |

---

## 3. 更新流程

### 第 1 步：查到真实档位

按可靠性排序：

1. **厂商官方文档**的「思考 / reasoning effort / thinking」章节——最权威；
2. **pi-ai catalog**（如果已覆盖同款模型）——打开 `@earendil-works/pi-ai` 包内的 `providers/data/<vendor>.json`，看该模型的 `thinkingLevelMap`。

判断规则（与 pi-ai 的 `getSupportedThinkingLevels()` 一致）：

```
thinkingLevelMap[level] === null        → 不支持
level 是 xhigh / max 且键不存在          → 不支持（这两种没有「默认支持」）
level 是 off 且值为 null                 → 支持，但不发字段
其他，值为字符串                          → 支持，发这个字符串
```

### 第 2 步：决定改哪里

| 情况 | 改哪里 |
|---|---|
| 新模型属于已有家族，档位与其他模型不同 | 加一条完整的 `levelsByModel` 规则（不要依赖家族兜底） |
| 新模型属于全新厂商 | 新增一个 `vendors` 条目，只写明确的模型规则 |
| 模型换了个网关，档位没变 | **不用改**——插件不写 `compat`，方言由 pi-ai 检测 |
| 厂商自己的域名变了 | **不用改**——插件不再按域名固定方言 |

### 第 3 步：写规则

```json
{ "match": "^vendor-model\\.\\d+$", "levels": ["low", "medium", "high"] }
```

要点：

- 具体规则放在宽泛规则**前面**；
- 模型 id 里的 `.` 必须转义成 `\\.`；
- 非恒等的线上值写 `wire`，例如 `{ "levels": ["off", "high"], "wire": { "off": "none" } }`；
- 只在确认支持时才写 `off`。

### 第 4 步：跑测试

```bash
node scripts/build-client.mjs --check # client.js 必须与 client/*.js 同步
node verify-host.cjs                 # 精确档位、报告不写回、无兜底、compat 不被改动
node verify-engine.mjs               # 端到端：扫描 → 计划 → 写入
node verify-holidays.mjs             # 节假日部分失败与回退
node verify-client.mjs               # 滑条 + quota 选择/格式/状态/竞态/开关
node verify-compat.mjs               # 包清单与已安装 DSH 槽位
```

断言失败说明新规则覆盖了既有模型，调整正则或同步更新断言。**不要**为了让旧断言通过而恢复家族级兜底。

### 第 5 步：生效

1. 改 `capabilities.json`；
2. **升 `package.json` 版本号**（必须，否则包管理器不会重新解包）；
3. 运行 `scripts/build-tgz.ps1` 打包；
4. 通过插件管理器安装新 tgz；
5. **删掉 profile 里受影响的旧 `reasoningEfforts`**；
6. 重启 DSH，或等待配置变更扫描。

> 第 5 步最容易漏。插件只在字段缺失时才写，已有值一律视为用户决定。
> 装完新版本没变化，先看 profile 的 `cordis.patch.yml` 里那段旧声明是否还在。

profile 位置：

```
~/.dsh/profiles/<profile>/cordis.patch.yml
```

---

## 4. 最常见的四个错误

### ① `levelsByModel` 顺序错了

```json
"levelsByModel": [
  { "match": "^kimi", "levels": [...] },            // ❌ 先命中，下面永远轮不到
  { "match": "^kimi-k2\\.7-code", "levels": [...] }
]
```

**宽规则必须放在最后。**

### ② 多写了 `off`

很多模型既没有 `off`，也**不需要**它。写了会让滑条多出一格，用户拖过去就报 `UNSUPPORTED_REASONING_EFFORT`。

### ③ 正则没转义

```json
{ "match": "^qwen3.8" }    // ❌ 也会匹配 qwen3x8
{ "match": "^qwen3\\.8" }  // ✅
```

### ④ 把方言当档位修

如果某个厂商的档位**顺序对、数量对，但线上行为都一样**（比如三档都只发一个开关），问题在端点协议或 pi-ai 为该模型检测出的 `compat`，不在 `levels`。插件从 `1.0.0` 起不再写 `thinkingFormat`/`supportsReasoningEffort`，也不按 URL 子串推断方言；请检查 catalog 的 compat 和实际 endpoint，不要重新引入 `officialHosts`。

诊断方法见下一节。

---

## 5. 验证档位真的生效

**报错信息不能证明档位生效。** 零余额、401、超时都只说明请求发出去了，不说明 `reasoning_effort` 带了什么。

要看请求体里的字段：

| 方言 | 应该出现 |
|---|---|
| `openai`（默认） | `reasoning_effort: "low"` / `"medium"` / ... |
| `zai` | `thinking: { type: "enabled" }` + `reasoning_effort` |
| `deepseek` | `thinking: { type: "enabled" }` + `reasoning_effort` |
| `qwen` | `enable_thinking: true` + `reasoning_effort` |

**判据：如果不同档位的请求体完全相同，说明档位被折叠成了一个开关**——那是适配器/`compat` 或端点协议问题。插件本身不再合成方言。

抓取请求体的方式：

- 在 `llm/stream` 层拦截；
- 或用 mitmproxy / Fiddler 之类的工具抓 HTTPS；
- 或临时在 `host/declarations.js` 的 `probeThinking` 附近加日志。

---

## 6. 发布新版本

```bash
# 1. 改代码
# 2. 升版本号（patch）
# 3. 生成并检查浏览器模块
node scripts/build-client.mjs
node scripts/build-client.mjs --check
# 4. 跑测试
node verify-host.cjs && node verify-engine.mjs && node verify-holidays.mjs \
  && node verify-client.mjs && node verify-compat.mjs
# 5. 打包
pwsh -File scripts/build-tgz.ps1
# 6. 安装
#    plugin_manager → install_bundle → 指向新的 tgz
```

提交信息建议用 Conventional Commits：

```
fix: stop overwriting pi-ai catalog levels
feat: size the slider per reasoning level
docs: add maintenance guide
```

---

## 7. 排查清单

| 现象 | 先查 |
|---|---|
| 滑条不出现 | profile 里该模型是否有 `reasoning` 元数据；`status.json` 的 `.engine.phase` |
| 滑条档位数不对 | 该模型是否走了第 3/4 级；规则是否命中；是否被 DSH 报告跳过 |
| 拖过去就回弹 | 该档位是否真的受支持；看 `UNSUPPORTED_REASONING_EFFORT` 的报错 |
| 改了表没效果 | 版本号是否升了；旧 `reasoningEfforts` 是否还在；模型是否已被 DSH 报告覆盖 |
| 每档行为一样 | 适配器/`compat` 或端点协议（见第 5 节） |
| `.engine.phase: error` | 看 `error`；常见是 `HMR transactions cannot be nested`（瞬时冲突，插件会自动重试）或超时 |

---

## 8. 拆分后的模块边界

- 本项目只维护滑条、峰谷、顶栏和档位声明，不再包含订阅卡片、订阅认证或 DeepSeek 账户账本。
- `dsh-Subscription-Management` 独立维护这些功能，两个项目不得互相复制状态文件或账户 RPC。
- Client 仅由 `runtime/options/slider/pricing/styles/topbar/apply` 组成；Host 仅由 `options/declarations/holiday/status` 组成。
- 不向 Client 注入 `connection` 或 `credentials`，避免无用服务初始化和账户数据驻留内存。

## 附：`status.json` 字段

位置：`~/.dsh/profiles/<profile>/.utility-appearance-kit/status.json`

`engine`、`holiday`、`plugin` 三个作用域各自保留最后一次状态，互不覆盖；顶层的 `phase` 只是最后一次写入的副本。

| 字段 | 含义 |
|---|---|
| `engine.phase` | `inject-wait` / `injected` / `scheduled` / `scan` / `declared` / `clean` / `error` / `hmr-busy`；`declarations-disabled` 表示 `declarations: "off"`，`config-error` 表示插件配置非法 |
| `engine.reason` | 触发扫描的原因：`boot` / `adapters` / `config` / `retry` |
| `engine.changes` | 本次实际写入的模型列表 |
| `engine.reported` | 从 DSH 拿到报告的模型数量 |
| `engine.error` | 仅错误状态出现 |
| `holiday.phase` | `route-ready` / `route-error` / `calendar` / `calendar-error` |
| `holiday.changed` / `failedYears` | 是否有年份写入、哪些年份失败 |
