# 机器人实时操作看板开工执行计划

这份文档保存最初的 kickoff 执行计划，方便后续新会话直接续做。

注意：下面内容保留的是最初归档版本，其中关于 `npm workspaces` 的表述属于当时锁定的默认方案。仓库当前已经改为非-workspace 根脚本结构，所以实际运行命令以根目录的 `README.md` 和 `package.json` 为准。

## 计划：机器人实时操作看板开工版

这是一份直接用于开工的简化执行文档。默认方案已经锁定，不再保留会影响开工节奏的分支选择。目标是在最短路径内完成一个满足 assignment 核心要求的 MVP：实时流、trust state、降级状态、最小可读 UI、README 与验证方式。

**本次锁定方案**
1. 使用 `npm workspaces`。
2. 只建立两个应用：`apps/web` 和 `apps/server`。
3. 暂不建立 `packages/shared`；前后端各维护一份小而稳定的 telemetry 类型。
4. 前端使用 `Vite + React + TypeScript + Zustand`。
5. 后端使用 `Node.js + TypeScript + Express + ws`。
6. telemetry 走 WebSocket；scenario control 走 HTTP。
7. 默认不做 Docker/Podman/compose。
8. 默认不做 scripted auto demo。
9. 默认不做 ROS 2 bridge 替换说明。
10. 自动化测试默认不作为 MVP 卡点；README 中的验证策略和手动验证清单必做。

**固定运行参数**
1. `STREAM_HZ = 15`
2. `STALE_THRESHOLD_MS = 2500`
3. `UI_COMMIT_INTERVAL_MS = 100`
4. `RECONNECT_BASE_MS = 1000`
5. `RECONNECT_MAX_MS = 30000`

**必做项**
1. 后端持续推送 telemetry，包含 `ts`、`pose`、`speed`、`battery`、`mission`、`alarms`。
2. 后端支持 `live`、`stale`、`drop`、`manual disconnect`、`alarm` 五类 demo 场景。
3. 前端明确区分 `no-data-yet`、`live`、`stale`、`reconnecting`、`disconnected`。
4. 前端把 `trust state` 作为页面级第一状态信号。
5. UI 至少包含 `TrustBanner`、`PoseView`、`VitalsPanel`、`AlarmsPanel`、`DemoControls`；`mission` 信息可以并入 `VitalsPanel`，也可以拆成独立 `MissionPanel`。
6. `PoseView` 必须提供车辆实时位置视图：使用简单 2D 俯视图（canvas、SVG 或类似方案）展示车辆位置与朝向；不需要地图数据，使用纯坐标平面即可。
7. 冻结数据不能伪装成当前值。
8. `AlarmsPanel` 必须显示 active alarms 的 `severity`、`code`、`message`；可以同时显示数量或时间，但不能只显示图标、颜色或计数。
9. alarm 独立显示，不能遮挡或盖过 trust-state banner。
10. alarm 是数据的一部分，当下一条数据不包含 alarm 时自动消失；前端不能手动关闭 alarm。
11. `design/` 目录中的参考图只用于 UI 布局、层级和状态表达参考；文案按本项目自己的 trust-state 和 scenario 定义书写，不直接复用图中文字。
12. README 写清运行方式、构建方式、demo 场景、验证方式、AI 使用说明。

**可以直接砍掉的内容**
1. `packages/shared`
2. Docker / Podman / compose
3. scripted auto demo
4. ROS 2 bridge 替换说明
5. 自动化测试
6. 复杂动画和细节视觉打磨
7. command round-trip

**开发顺序**
1. 搭根工作区。
动作：创建根目录 `package.json`、`tsconfig.base.json`、workspace 配置、根脚本 `dev` / `dev:web` / `dev:server` / `build`。
验收：根目录可以安装依赖并识别前后端两个应用。
2. 搭前端和后端脚手架。
动作：初始化 `apps/web` 和 `apps/server`。
验收：前后端都能分别启动一个最小占位应用。
3. 写后端类型和 telemetry generator。
动作：在 server 中定义 telemetry 类型，并实现持续变化的数据生成逻辑。
验收：不接 WebSocket 时也能持续产出合法 frame。
4. 写后端 scenario controller、broadcaster、connection manager。
动作：实现推流、静默 stale、异常断连、手动断连、alarm 注入；alarm 场景下注入 alarm 数据，下一帧取消 alarm 字段以清除前端显示。
验收：使用任意 WebSocket 客户端能观察到 `live -> stale -> drop` 等行为差异；alarm 注入后下一帧消失。
5. 写后端 scenario control HTTP 接口。
动作：提供切场景和重置接口。
验收：通过 HTTP 请求可以稳定切换所有 demo 场景。
6. 写前端类型、store、freshness、backoff。
动作：定义 `rawFrame`、`uiSnapshot`、`lastReceiveTime`、`alarms`、`connectionState`、`freshnessState`、`trustState`、`viewState`。
验收：不用最终 UI 也能通过手动触发 action 看出状态推导正确。
7. 写 WebSocket client 和 message router。
动作：实现 connect/disconnect/reconnect、latest-only 缓冲、immediate alarm/trust-state 更新。
验收：不会重复注册 listener；短暂 alarm 不会被节流吞掉。
8. 跑通前端状态层。
动作：先用占位组件或日志验证 `no-data-yet`、`live`、`stale`、`reconnecting`、`disconnected`。
验收：已经满足 assignment 对 connection/trust state 的核心要求。
9. 搭全局样式底座和页面骨架。
动作：建立 `tokens.css`、`base.css`、`layout.css`、`state.css`，完成页面区块布局。
验收：能看到完整 dashboard 结构和大致视觉层级。
10. 完成 TrustBanner。
动作：参考 `design/linde_dashboard_stale.png` 和 `design/linde_dashboard_disconnected.png` 的高可见状态提示形式；显示五类 trust state；`stale` 显示“多久没更新”；`reconnecting` 和 `disconnected` 使用本项目自己的状态文案；不能只靠颜色。
验收：操作者能明显区分 `live`、`stale`、`reconnecting`、`disconnected`，并且第一眼先看到 trust-state。
11. 完成 MissionPanel、VitalsPanel、PoseView。
动作：参考 `design/linde_dashboard_normal.png` 的信息组织方式；显示 `speed`、`battery`、`mission label`、`mission state`、`mission progress`、`pose`；`mission` 信息可以做成独立 `MissionPanel`，也可以并入 `VitalsPanel`；`PoseView` 使用简单 2D 俯视坐标平面显示位置和朝向；在 `stale`、`reconnecting`、`disconnected` 下改成 last-known 语义并冻结图形。
验收：没有地图时也能清楚看出车辆位置与 `heading`；`mission` 信息完整可读；冻结值不会被误认为当前值；没有第一帧时只显示 placeholder。
12. 完成 DemoControls 场景联动。
动作：六个按钮全部接入实际行为：① no-data-yet → live（connect + first frame）② live → stale（HTTP 切 `stale`）③ stale → live（HTTP reset）④ live → reconnecting → live（simulate reconnect flow）⑤ live → disconnected（本地手动断开）⑥ alarm 场景（HTTP 切 `alarm` 后自动 reset）；controls 请求错误只局部提示。
验收：demo 时可手动切完所有六个关键状态转换；场景请求失败时只在 controls 区域看到错误提示，不影响主界面其他区域。
13. 完成 AlarmsPanel。
动作：参考 `design/linde_dashboard_normal.png` 的告警展示层级；alarm 按 `severity` 显示，并明确打出 `code` 与 `message`；如有多条 active alarm，使用列表或堆叠方式展示。
验收：操作者能直接读到当前 alarm 是什么，而不只是知道"有 alarm"；alarm 可见但不主导整页。
14. 做 README 和手动验证清单。
动作：补运行方式、构建方式、架构、demo 场景、验证步骤、AI 使用说明。
验收：别人只看 README 就知道怎么跑、怎么看、怎么验证。
15. 做最终演练。
动作：完整演示 `no-data-yet -> live -> stale -> reconnecting -> live -> disconnected -> reconnect -> alarm`。
验收：10 分钟内可以稳定讲清状态、恢复机制、更新频率处理和 UI 取舍。

**每阶段最低验收线**
1. 后端完成线：前端能真正收到 WebSocket telemetry，并能通过 HTTP 切场景。
2. 前端状态层完成线：五类 trust state 已经能被准确推导并切换。
3. UI 完成线：至少能从页面上清楚看出 `live`、`stale`、`reconnecting` 的区别。
4. 交付完成线：README 和手动验证清单齐全。

**推荐目录树**
1. 根目录
`package.json`
`tsconfig.base.json`
`README.md`
`apps/`
2. `apps/server/src`
`index.ts`
`telemetry/types.ts`
`telemetry/generator.ts`
`telemetry/broadcaster.ts`
`scenarios/controller.ts`
`scenarios/applyScenario.ts`
`connection/manager.ts`
`routes/scenario-control.ts`
3. `apps/web/src`
`main.tsx`
`App.tsx`
`styles/tokens.css`
`styles/base.css`
`styles/layout.css`
`styles/state.css`
`types/telemetry.ts`
`utils/backoff.ts`
`utils/freshness.ts`
`services/websocketClient.ts`
`services/messageRouter.ts`
`store/telemetryStore.ts`
`store/selectors.ts`
`components/TrustBanner.tsx`
`components/MissionPanel.tsx`（可选；也可并入 `components/VitalsPanel.tsx`）
`components/PoseView.tsx`
`components/VitalsPanel.tsx`
`components/AlarmsPanel.tsx`
`components/DemoControls.tsx`

**MVP 最低完成线**
1. 后端稳定推流并支持五类 demo 场景。
2. 前端明确区分 `live`、`stale`、`reconnecting`、`disconnected`。
3. UI 不把冻结数据伪装成实时数据。
4. alarm 独立显示，不遮挡 trust-state。
5. README 写清运行、构建、demo 和验证方式。

**开工前最后确认**
1. 就用 `npm workspaces + Vite + Express + ws`。
2. 就保留 `apps/web` 和 `apps/server` 两个应用。
3. 不为了 bonus 项复杂化当前架构。
4. trust-state 是页面级第一状态信号，alarm 保持局部处理。