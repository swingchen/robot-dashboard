# Robot Dashboard 中文说明文档

这份文档用于保存项目实现过程的中文说明。
后续每完成一个阶段，都继续往这份文档里追加。

## Phase 1：根项目搭建

先从第 1 步开始。第 1 步的目标不是做业务，而是先把整个仓库整理成一个可以从根目录统一安装、统一构建、统一启动的双应用项目。这一步的重点就是根目录怎么显式调度 `apps/web` 和 `apps/server`。

### 第 1 步写了哪些代码

核心还是两个文件：

1. `package.json`
2. `tsconfig.base.json`

另外 `README.md` 也补了最基础的运行说明，但它更偏文档，不是第 1 步的核心逻辑。

### 一、`package.json` 写了什么

先看这一段：

```json
{
  "name": "robot-dashboard",
  "private": true,
  "version": "0.1.0",
  "scripts": {
    "dev": "concurrently -n web,server -c blue,green \"npm run dev:web\" \"npm run dev:server\"",
    "dev:web": "npm --prefix apps/web run dev",
    "dev:server": "npm --prefix apps/server run dev",
    "build": "npm --prefix apps/web run build && npm --prefix apps/server run build",
    "install:web": "npm --prefix apps/web install",
    "install:server": "npm --prefix apps/server install",
    "install:all": "npm run install:web && npm run install:server"
  },
  "devDependencies": {
    "concurrently": "^9.1.2",
    "typescript": "^5.6.3"
  }
}
```

这段的意思是：根目录通过显式脚本去调用两个子应用。
你这里实际还是两个 app：

1. `apps/web`
2. `apps/server`

控制方式就是“明确告诉 npm 去哪个目录执行命令”。

再看 scripts：

```json
"scripts": {
  "dev": "concurrently -n web,server -c blue,green \"npm run dev:web\" \"npm run dev:server\"",
  "dev:web": "npm --prefix apps/web run dev",
  "dev:server": "npm --prefix apps/server run dev",
  "build": "npm --prefix apps/web run build && npm --prefix apps/server run build",
  "install:web": "npm --prefix apps/web install",
  "install:server": "npm --prefix apps/server install",
  "install:all": "npm run install:web && npm run install:server"
}
```

这几组脚本就是第 1 步最重要的成果。

`dev`
意思是“一次把前后端都启动起来”。
这里用了 `concurrently`，也就是同时开两个开发进程，一个跑 web，一个跑 server。

`dev:web`
意思是“只启动前端应用”。

`dev:server`
意思是“只启动后端应用”。

`build`
意思是“从根目录依次跑 web 和 server 的 build”。

`install:web` 和 `install:server`
意思是分别给两个子应用安装自己的依赖。

`install:all`
意思是把上面两个安装动作串起来。

这里要注意一个关键区别：
现在根目录 `npm install` 只会安装根工具，比如 `concurrently` 和根层的 `typescript`。真正的前端和后端依赖，要靠 `install:all` 再下沉到各自目录去装。

所以第 1 步本质上是在解决一个问题：

以后你怎么从根目录统一控制整个项目。

再看 devDependencies：

```json
"devDependencies": {
  "concurrently": "^9.1.2",
  "typescript": "^5.6.3"
}
```

`concurrently` 是为了并行启动多个进程。
`typescript` 放在根目录，是为了让整个仓库共享一套 TypeScript 基础能力。

还有这两项：

```json
"name": "robot-dashboard",
"private": true
```

`name` 就是这个根工程的名字。
`private: true` 很重要，表示这个根包不是拿来发 npm 的，避免误发布。这个根目录仍然只是工程入口，不是要发布的业务包。

### 二、`tsconfig.base.json` 写了什么

这里定义的是整个仓库共享的 TypeScript 基础规则：

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "strict": true,
    "noImplicitOverride": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true
  }
}
```

这份文件的意思不是“让代码跑起来”，而是“先把代码质量底线定下来”。

几个关键项你可以这样理解：

`target: "ES2022"`
说明编译目标是比较新的 JavaScript 运行环境，适合你现在的 Node 版本。

`strict: true`
这是最关键的一项。它会让 TypeScript 尽量严格，不让很多模糊类型混过去。
后面你做 telemetry、trust state、reconnect 时，这个会很有价值。

`noUnusedLocals: true`
不允许写了变量却不用。
你前面 broadcaster 里那个未使用变量就是靠这类规则暴露出来的。

`noUnusedParameters: true`
函数参数写了但没用，也会报出来。

`forceConsistentCasingInFileNames: true`
避免文件大小写不一致导致不同系统上出问题。

`skipLibCheck: true`
跳过第三方依赖类型定义的深度检查，减少无意义的外部噪音。

所以这一步的意义是：

先统一工程结构，再统一类型规则。

### 三、`README.md` 在第 1 步里起什么作用

README 里现在最重要的是这几类信息：

1. 项目里有哪两个 app
2. 根目录有哪些安装、启动和构建命令
3. server 现在暴露了哪些接口和 websocket 地址

它帮助你把“这仓库怎么跑”写清楚，但不承担工程调度功能。
真正让仓库能跑的是 `package.json`，不是 README。

### 第 1 步做完以后，项目状态应该变成什么样

做到这一步时，你还不需要有真正的业务功能。
你只需要满足这几个结果：

1. 根目录能 `npm install`
2. 根目录能通过 `npm run install:all` 安装两个子应用
3. 根目录能统一跑 build
4. 根目录能统一转发启动命令给子应用

也就是说，第 1 步的验收关键词是：

工程组织正确，不是功能完整。

### 第 1 步怎么验证

按 kickoff 的验收标准，先做这几条就够。

1. 安装根目录依赖

```bash
npm install
```

预期结果：
根目录会生成自己的 `node_modules` 和 `package-lock.json`，安装结构会和子应用各自分开。

2. 安装两个子应用依赖

```bash
npm run install:all
```

预期结果：
`apps/web` 和 `apps/server` 都会生成各自的依赖安装结果，后面根脚本才有东西可调度。

3. 验证根目录能调度两个 app 的构建

```bash
npm run build
```

预期结果：
根脚本会继续调用 web 和 server 的 build。
现在你的仓库里这件事已经是通的。

4. 验证根目录能识别单独的 web 和 server 命令

```bash
npm run dev:web
npm run dev:server
```

预期结果：
两个命令都能从根目录正常转发到各自应用，而不是报路径或依赖缺失错误。

5. 验证 README 写的启动方式和仓库实际一致

对照 `README.md` 的脚本说明，逐条看是否和 `package.json` 一致。
这一步不是运行性验证，而是文档一致性验证。

### 如果你要把第 1 步讲给别人听，可以用这句

“第 1 步我先把根目录工程搭起来，用根脚本显式调度 `apps/web` 和 `apps/server`。这样我仍然可以从一个入口统一安装、构建和启动前后端，同时继续用一份共享的 TypeScript base config 锁住后续类型规则。”

## Phase 2：前后端脚手架

先从第 2 步开始。第 2 步在 kickoff 里叫“搭前端和后端脚手架”，目标不是马上做 telemetry，而是先把前后端都变成真正可运行的应用壳。

### 第 2 步写了哪些代码

核心是这些文件：

1. `apps/web/package.json`
2. `apps/web/src/main.tsx`
3. `apps/web/src/App.tsx`
4. `apps/web/src/styles.css`
5. `apps/server/package.json`
6. `apps/server/src/index.ts`

另外，`README.md` 在这一步里不是主角。第 2 步最重要的是前后端两个应用自己已经能跑，不是文档写得多完整。

另外，这一步和第 1 步最大的区别是：第 1 步解决的是“根目录怎么统一管理项目”，第 2 步解决的是“前后端自己能不能真的跑起来”。

### 一、`apps/web/package.json` 写了什么

先看这一段：

```json
{
  "name": "@robot-dashboard/web",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview"
  }
}
```

这一段的意思是：前端现在已经被搭成一个标准的 Vite + React + TypeScript 应用。

这里最重要的是这几个脚本：

1. `dev`
2. `build`
3. `preview`

`dev`
意思是启动前端开发服务器。

`build`
意思是先做 TypeScript 类型检查，再做前端打包。

`preview`
意思是把打包结果用本地预览服务跑起来。

所以这一部分本质上是在解决一个问题：

前端应用有没有一个标准的开发、构建、预览入口。

### 二、`apps/web/src/main.tsx` 写了什么

这里最关键的是这一段：

```tsx
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

它的意思是：把 React 应用真正挂到页面上，并且把最外层组件 `App` 渲染出来。

这一段看起来很小，但它很关键，因为没有它，前端应用虽然装好了依赖，也不会真正把页面渲染到浏览器里。

所以这一步的意义是：

前端现在不只是一个文件夹，而是已经有真实入口的 React 应用了。

### 三、`apps/web/src/App.tsx` 写了什么

这里最关键的是占位内容：

```tsx
const checkpoints = [
  'Root project configured',
  'Web shell ready',
  'Server shell ready',
  'Telemetry stream wiring next',
];
```

以及这句：

```tsx
<h1>Project skeleton is up.</h1>
```

这一步不是在做最终 dashboard，而是在做一个“最小可见前端壳”。

它的作用有两个：

1. 证明前端能正常渲染
2. 证明样式和组件结构已经接好了

这里故意没有接 telemetry，因为这个阶段的重点不是业务逻辑，而是让你能在浏览器里看到一个明确的“前端已经启动成功”的结果。

### 四、`apps/web/src/styles.css` 写了什么

这份样式文件不是在做最终视觉设计，它更像一个启动阶段的页面外壳。

它主要做了这些事：

1. 让页面不是一张白板
2. 给占位页面一个清晰的视觉层次
3. 让你在启动前端时马上能看出 React、样式、布局都已经正常工作

所以这份 CSS 的意义不是“漂亮”，而是“让脚手架状态可见”。

### 五、`apps/server/package.json` 写了什么

再看后端这一段：

```json
{
  "name": "@robot-dashboard/server",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/index.js"
  }
}
```

它的意思是：后端现在也已经被搭成一个标准的 TypeScript 服务应用。

这里最关键的是这三个脚本：

1. `dev`
2. `build`
3. `start`

`dev`
用 `tsx watch` 直接跑 `src/index.ts`，适合开发阶段边改边跑。

`build`
把后端 TypeScript 编译成构建产物。

`start`
运行编译后的 `dist/index.js`。

所以这一部分解决的问题是：

后端有没有一套清晰的开发态和构建态运行方式。

### 六、`apps/server/src/index.ts` 写了什么

这一阶段看这个文件，不要先盯着它现在已经有多少 telemetry 逻辑，而是先看它作为“后端应用入口”做了什么。

最关键的是这一段：

```ts
const app = express();
const server = createServer(app);
const wsServer = new WebSocketServer({
  server,
  path: '/telemetry',
});
```

这一段至少说明了几件事：

1. 后端已经是一个真正的 Express 应用
2. 它有一个真实可启动的 HTTP server
3. 它已经预留了后面 telemetry 要走的 WebSocket 通道

虽然这个文件在后续第 3、4、5 步里继续长大了，但从第 2 步的角度看，它最重要的意义是：

后端已经不再是空壳，而是有了一个稳定的运行入口。

### 第 2 步做完以后，项目状态应该变成什么样

做到这一步时，你还不需要把 telemetry、trust state、scenario 都做完。

你只需要满足这些结果：

1. 前端能启动并显示一个占位页面
2. 后端能作为一个 TypeScript 服务正常启动
3. 前后端都能从根目录脚本独立启动
4. 两边都已经有稳定入口，后面可以继续往上叠功能

也就是说，第 2 步的验收关键词是：

可运行的应用壳，而不是业务完整。

### 第 2 步怎么验证

按 kickoff 的验收标准，先做这几条就够。

1. 启动前端

```bash
npm run dev:web
```

预期结果：
浏览器里能看到占位页面，而不是空白页或报错页。

2. 启动后端

```bash
npm run dev:server
```

预期结果：
后端能正常启动，不会在启动阶段直接报运行时错误。

3. 一起启动前后端

```bash
npm run dev
```

预期结果：
根目录脚本能同时拉起前端和后端，说明第 1 步和第 2 步已经接上了。

4. 检查后端健康接口

```bash
curl -s http://localhost:3001/health
```

预期结果：
后端能返回一个正常响应，说明服务已经真的活着，而不只是进程存在。

### 如果你要把第 2 步讲给别人听，可以用这句

“第 2 步我把前后端都搭成了真正可运行的应用壳。前端现在已经是一个可以启动和渲染的 Vite + React 应用，后端也已经是一个可以启动的 TypeScript 服务。这一步的重点不是 telemetry 本身，而是先把两边的稳定入口建起来，让后面的实时流和 trust state 逻辑有地方落。”

## Phase 3：后端类型和 telemetry generator

先从第 3 步开始。第 3 步在 kickoff 里叫“写后端类型和 telemetry generator”，目标不是先把 WebSocket 推流做完，而是先把每一帧 telemetry 长什么样，以及后端在没有客户端连接时能不能自己持续产出合法 frame 这两件事固定下来。

### 第 3 步写了哪些代码

核心是两个文件：

1. `apps/server/src/telemetry/types.ts`
2. `apps/server/src/telemetry/generator.ts`

这一步和第 2 步最大的区别是：第 2 步解决的是“前后端能不能启动”，第 3 步开始真正处理业务数据本身。

### 一、`apps/server/src/telemetry/types.ts` 写了什么

先看这份文件：

```ts
export interface Pose {
  x: number;
  y: number;
  headingDeg: number;
}

export interface MissionState {
  id: string;
  label: string;
  progress: number;
  state: 'running';
}

export interface TelemetryAlarm {
  id: string;
  code: string;
  severity: 'warning' | 'critical';
  message: string;
  raisedAt: number;
}

export interface TelemetryFrame {
  ts: number;
  pose: Pose;
  speed: number;
  battery: number;
  mission: MissionState;
  alarms: TelemetryAlarm[];
}
```

这份文件本质上是在定义一件事：

后端每次推给前端的一帧 telemetry，到底长什么样。

这里最关键的是最底下这个 `TelemetryFrame`：

```ts
export interface TelemetryFrame {
  ts: number;
  pose: Pose;
  speed: number;
  battery: number;
  mission: MissionState;
  alarms: TelemetryAlarm[];
}
```

它把这次 assignment 最核心的数据字段固定住了：

1. `ts`
2. `pose`
3. `speed`
4. `battery`
5. `mission`
6. `alarms`

也就是说，从这一步开始，后端、前端、WebSocket 消息、后面 UI 面板，都会围绕这一个 frame 结构来走。

再往上看这几个子类型：

`Pose`
负责描述位置和朝向。

`MissionState`
负责描述当前任务的信息和进度。

`TelemetryAlarm`
负责描述告警对象本身，而不是把告警散落成几个独立字段。

所以这一份类型文件解决的问题是：

先把数据合同固定住，后面所有模块都按这个合同讲话。

### 二、`apps/server/src/telemetry/generator.ts` 写了什么

这个文件是真正开始“产数据”的地方。

先看最上面：

```ts
const MISSIONS = [
  'Transit to waypoint alpha',
  'Inspect storage lane',
  'Return to charging berth',
] as const;
```

这里不是随便放三条字符串，它的作用是让 mission 不会永远只有一条死数据，而是可以在后面进度走满时轮换。

再看内部状态定义：

```ts
interface GeneratorState {
  x: number;
  y: number;
  headingRad: number;
  battery: number;
  missionIndex: number;
  missionProgress: number;
  lastTimestamp: number;
}
```

这一步非常关键。它说明 generator 不是“每次凭空造一帧 JSON”，而是维护一个持续演化的内部状态。

也就是说：

1. 机器人上一刻在什么位置
2. 当前朝向是多少
3. 电量剩多少
4. 当前任务进度到哪里了

这些值都会被保存在 generator 里，然后下一帧再基于上一帧继续推进。

这也是为什么生成出来的数据看起来是连续变化的，而不是每次都随机跳。

再看初始化状态：

```ts
private readonly state: GeneratorState = {
  x: 0,
  y: 0,
  headingRad: Math.PI / 8,
  battery: 100,
  missionIndex: 0,
  missionProgress: 12,
  lastTimestamp: Date.now(),
};
```

这里的意思是 generator 一启动，就有一个明确的起点：

1. 位置从 `(0, 0)` 开始
2. 朝向有一个初始角度
3. 电量从 100 开始
4. mission 从第一条开始
5. 任务进度不是 0，而是 12，这样启动后看起来更像“系统已经在运行中”

### 三、`nextFrame()` 写了什么

最核心的是这个方法：

```ts
nextFrame(now = Date.now()): TelemetryFrame {
```

它的意义是：

每调用一次，就基于当前内部状态生成一条新的 telemetry frame。

先看时间差处理：

```ts
const deltaMs = Math.max(now - this.state.lastTimestamp, 1000 / 15);
const deltaSeconds = deltaMs / 1000;
const headingDelta = Math.sin(now / 5000) * 0.16 * deltaSeconds;
```

这里不是简单写“每次移动一点点”，而是先算出这一次和上一次相差了多少时间，再按时间差推进状态。

它的意义是：

即使定时器不是每次都精确在同一个间隔触发，生成器也能按真实经过的时间去推进数据。

再看速度和位置更新：

```ts
const speed = clamp(0.45 + 0.55 * (1 + Math.sin(now / 2600)), 0.35, 1.65);

this.state.x += Math.cos(this.state.headingRad) * speed * deltaSeconds;
this.state.y += Math.sin(this.state.headingRad) * speed * deltaSeconds;
this.state.battery -= deltaSeconds * 0.35;
this.state.missionProgress += deltaSeconds * 7.5;
```

这几行代码做了四件事：

1. speed 不是常量，而是在一个区间里平滑波动
2. x 和 y 会根据当前朝向和速度持续前进
3. battery 会慢慢下降
4. missionProgress 会逐渐累积

所以这一步不是在制造随机数，而是在制造“看起来像真实系统”的连续变化数据。

再看边界处理：

```ts
if (this.state.battery < 18) {
  this.state.battery = 100;
}

if (this.state.missionProgress >= 100) {
  this.state.missionProgress -= 100;
  this.state.missionIndex = (this.state.missionIndex + 1) % MISSIONS.length;
}
```

这一段不是在追求物理真实，而是在追求 demo 可持续。

它的意思是：

1. 电量掉到某个阈值以下，就回满
2. 任务进度满了以后，切到下一条 mission

这样数据可以一直跑，不会跑几分钟就停在某个边界值上。

最后看返回值：

```ts
return {
  ts: now,
  pose: {
    x: roundTo(this.state.x),
    y: roundTo(this.state.y),
    headingDeg: roundTo(radiansToDegrees(this.state.headingRad)),
  },
  speed: roundTo(speed),
  battery: roundTo(this.state.battery),
  mission: {
    id: `mission-${this.state.missionIndex + 1}`,
    label: MISSIONS[this.state.missionIndex],
    progress: roundTo(this.state.missionProgress),
    state: 'running',
  },
  alarms: [],
};
```

这一段说明了 generator 在第 3 步的职责非常明确：

1. 生成一条结构合法的 `TelemetryFrame`
2. 把内部状态转换成对前端友好的字段
3. 默认不主动加 alarm

这里 `alarms: []` 很重要，因为它说明“告警注入”不是 generator 这一层的职责，而是后面场景控制那一层再叠上去。

### 第 3 步做完以后，项目状态应该变成什么样

做到这一步时，你还不需要让 WebSocket 真正广播给客户端。

你只需要满足这些结果：

1. 后端已经有固定的 telemetry schema
2. 后端已经能持续产出合法 frame
3. frame 里的数据是连续变化的，不是死的静态 JSON
4. generator 本身不依赖客户端连接也能工作

也就是说，第 3 步的验收关键词是：

数据合同固定了，数据源也跑起来了。

### 第 3 步怎么验证

按 kickoff 的验收标准，先做这几条就够。

1. 先构建 server

```bash
npm --prefix apps/server run build
```

预期结果：
server 能正常编译，说明类型和 generator 实现本身没有明显错误。

2. 单独跑 generator，连续取 3 帧

```bash
node --input-type=module -e "import { TelemetryGenerator } from './apps/server/dist/telemetry/generator.js'; const generator = new TelemetryGenerator(); const base = Date.now(); const frames = [generator.nextFrame(base), generator.nextFrame(base + 67), generator.nextFrame(base + 134)]; console.log(JSON.stringify(frames, null, 2));"
```

预期结果：

1. 能输出 3 条合法 frame
2. `ts` 会递增
3. `pose`、`speed`、`battery`、`mission`、`alarms` 都存在
4. 数值会变化，而不是三条完全一样的 JSON

3. 检查 `alarms` 在这一层默认是空数组

预期结果：
这一步生成的是基础 live 数据，不是带场景注入的 alarm 数据。

### 如果你要把第 3 步讲给别人听，可以用这句

“第 3 步我先把后端 telemetry 的数据合同和数据生成器固定下来。`types.ts` 定义了每一帧必须包含哪些字段，`generator.ts` 则负责持续生成会变化的 telemetry frame。这样即使还没接上 WebSocket，后端也已经有了一个稳定的数据源。”

## Phase 4：scenario controller、broadcaster、connection manager

先从第 4 步开始。第 4 步在 kickoff 里叫“写后端 scenario controller、broadcaster、connection manager”，目标不是加新的数据字段，而是把第 3 步已经能产生的 telemetry 数据，真正变成一个会推流、会静默 stale、会断连、会注入 alarm 的后端实时流系统。

### 第 4 步写了哪些代码

核心是这些文件：

1. `apps/server/src/scenarios/controller.ts`
2. `apps/server/src/scenarios/applyScenario.ts`
3. `apps/server/src/connection/manager.ts`
4. `apps/server/src/telemetry/broadcaster.ts`
5. `apps/server/src/index.ts`

这一步和第 3 步最大的区别是：第 3 步解决的是“后端能不能持续产出 frame”，第 4 步解决的是“这些 frame 怎么根据不同场景真正发给客户端”。

### 一、`apps/server/src/scenarios/controller.ts` 写了什么

先看最上面这段：

```ts
export const scenarioNames = ['live', 'stale', 'drop', 'manual-disconnect', 'alarm'] as const;
```

这行代码的意义非常直接：

后端现在支持 5 种 demo 场景：

1. `live`
2. `stale`
3. `drop`
4. `manual-disconnect`
5. `alarm`

也就是说，从第 4 步开始，后端不再只是“单纯一直推正常数据”，而是开始有状态、有场景地控制流行为。

再看 `ScenarioSnapshot`：

```ts
export interface ScenarioSnapshot {
  current: ScenarioName;
  changedAt: number;
}
```

这个结构的意思是：

后端不仅要知道当前是什么场景，还要知道这个场景是什么时候切过去的。

再看 `ScenarioController` 这个类：

```ts
export class ScenarioController {
  private snapshot: ScenarioSnapshot;
  private readonly listeners = new Set<ScenarioListener>();
```

它本质上就是一个很轻量的场景状态机。

这里最关键的几个方法是：

1. `getSnapshot()`
2. `setScenario()`
3. `subscribe()`
4. `shouldStream()`
5. `shouldInjectAlarm()`

`getSnapshot()`
意思是取当前场景快照。

`setScenario()`
意思是切换到新场景，并通知所有订阅者。

`subscribe()`
意思是别的模块可以监听“场景变化”这件事。

再看这两个特别关键的方法：

```ts
shouldStream(): boolean {
  return this.snapshot.current === 'live' || this.snapshot.current === 'alarm';
}

shouldInjectAlarm(): boolean {
  return this.snapshot.current === 'alarm';
}
```

它们把场景语义讲得非常清楚：

1. `live` 和 `alarm` 都继续推流
2. `alarm` 额外要求注入告警
3. `stale` 不继续发新帧

这也是为什么 stale 的表现不是“发一条 stale 消息”，而是“连接还在，但新数据停了”。

### 二、`apps/server/src/telemetry/broadcaster.ts` 写了什么

这个文件是真正把 generator 产出的 frame 变成实时流的地方。

先看构造函数：

```ts
constructor(private readonly options: TelemetryBroadcasterOptions) {
  this.intervalMs = Math.round(1000 / options.streamHz);
  this.latestFrame = options.generator.nextFrame();
}
```

这里做了两件关键事：

1. 把频率换成真正的时间间隔
2. 先缓存一份 `latestFrame`

缓存 `latestFrame` 的意义是：新客户端一连上来，不需要傻等下一次 tick，就可以先拿到最近一帧数据。

再看 `start()`：

```ts
start(): void {
  if (this.timer) {
    return;
  }

  this.timer = setInterval(() => {
    this.tick();
  }, this.intervalMs);
}
```

这一步的意义是：

从这里开始，后端正式进入“周期性发帧”状态。

再看最核心的 `tick()`：

```ts
private tick(): void {
  if (!this.options.controller.shouldStream()) {
    return;
  }

  const baseFrame = this.options.generator.nextFrame();
  const nextFrame = this.options.controller.shouldInjectAlarm()
    ? withInjectedAlarm(baseFrame)
    : baseFrame;

  this.latestFrame = nextFrame;
  this.options.connectionManager.broadcast(JSON.stringify(nextFrame));
}
```

这一段基本就是第 4 步的核心。

它做了 4 件事：

1. 先看当前场景允不允许继续推流
2. 如果允许，就从 generator 取一帧基础数据
3. 如果当前是 `alarm`，就在这一帧上注入告警
4. 最后把这帧广播给所有已连接客户端

所以你可以把 broadcaster 理解成：

“它不负责算数据，它负责按场景把数据发出去。”

最后看 alarm 注入：

```ts
function withInjectedAlarm(frame: TelemetryFrame): TelemetryFrame {
  const alarm: TelemetryAlarm = {
    id: 'motor-temp-high',
    code: 'MOTOR_OVER_TEMP',
    severity: 'critical',
    message: 'Drive motor temperature is above the safe threshold.',
    raisedAt: frame.ts,
  };

  return {
    ...frame,
    alarms: [alarm],
  };
}
```

这也解释了你前面问过的问题：

为什么 `alarms` 不在 generator 那一层注入。

因为 generator 负责基础 live 数据，而告警注入属于场景层行为，所以放在 broadcaster 这一层更合理。

### 三、`apps/server/src/connection/manager.ts` 写了什么

这个文件负责回答一个问题：

后端现在有多少个客户端，它们怎么被管理，怎么广播，怎么断开。

先看最上面：

```ts
export class ConnectionManager {
  private readonly sockets = new Set<WebSocket>();
```

这表示当前所有在线 websocket 连接都会被放在一个集合里统一管理。

再看 `addConnection()`：

```ts
addConnection(socket: WebSocket, scenario: ScenarioSnapshot): boolean {
  if (scenario.current === 'drop') {
    socket.terminate();
    return false;
  }

  if (scenario.current === 'manual-disconnect') {
    socket.close(MANUAL_DISCONNECT_CODE, MANUAL_DISCONNECT_REASON);
    return false;
  }

  this.sockets.add(socket);
```

这里最关键的是：

新连接不是无条件加入的。

如果当前场景本来就是 `drop`，新连接会直接被异常终止。
如果当前场景是 `manual-disconnect`，新连接会立刻收到主动关闭。

只有正常场景下，这个连接才会真的进集合。

再看 `broadcast()`：

```ts
broadcast(payload: string): void {
  for (const socket of Array.from(this.sockets)) {
    if (socket.readyState !== WebSocket.OPEN) {
      this.sockets.delete(socket);
      continue;
    }

    socket.send(payload, (error) => {
      if (!error) {
        return;
      }

      this.sockets.delete(socket);
      socket.terminate();
    });
  }
}
```

这里做的事情是：

1. 只给还处于 OPEN 状态的连接发消息
2. 发失败的连接会被清理掉

这可以避免死连接一直留在集合里。

再看这两个方法：

```ts
closeAll(code: number, reason: string): void
terminateAll(): void
```

它们分别对应两种不同的断开语义：

1. `closeAll()` 是主动、可解释的关闭
2. `terminateAll()` 是更粗暴的异常断开

这正好对应了 `manual-disconnect` 和 `drop` 这两种 demo 场景。

### 四、`apps/server/src/scenarios/applyScenario.ts` 写了什么

这个文件负责回答一个问题：

场景一旦切换了，后端应该立刻做什么副作用。

看最核心这段：

```ts
if (next.current === 'drop') {
  connectionManager.terminateAll();
  return;
}

if (next.current === 'manual-disconnect') {
  connectionManager.closeAll(MANUAL_DISCONNECT_CODE, MANUAL_DISCONNECT_REASON);
}
```

这里把两种断连场景明确分开了：

`drop`
走 `terminateAll()`，意味着客户端看到的是异常断开。

`manual-disconnect`
走 `closeAll()`，意味着客户端能拿到明确的 close code 和 reason。

所以这一步的意义不是“让连接断掉”这么简单，而是：

让不同 demo 场景表现出不同的连接语义。

### 五、`apps/server/src/index.ts` 在第 4 步里起什么作用

这一阶段看 `index.ts`，重点不是把它当成业务实现，而是把它当成装配层。

先看这一段：

```ts
const scenarioController = new ScenarioController(initialScenario);
const connectionManager = new ConnectionManager();
const telemetryGenerator = new TelemetryGenerator();
const telemetryBroadcaster = new TelemetryBroadcaster({
  controller: scenarioController,
  connectionManager,
  generator: telemetryGenerator,
  streamHz: STREAM_HZ,
});
```

这表示：

1. 场景状态由 `ScenarioController` 管
2. 在线连接由 `ConnectionManager` 管
3. 基础数据由 `TelemetryGenerator` 产
4. 推流由 `TelemetryBroadcaster` 调度

再看 websocket 连接入口：

```ts
wsServer.on('connection', (socket) => {
  const accepted = connectionManager.addConnection(socket, scenarioController.getSnapshot());

  if (!accepted) {
    return;
  }

  const latestFrame = telemetryBroadcaster.getLatestFrame();

  if (latestFrame && scenarioController.shouldStream()) {
    socket.send(JSON.stringify(latestFrame));
  }
});
```

这里最关键的是：

1. 新连接会先经过当前场景判断
2. 合法连接会立刻收到一帧最近数据

这可以避免新客户端连上来以后先空等一个推流周期。

再看场景订阅：

```ts
scenarioController.subscribe((next, previous) => {
  applyScenario(next, previous, connectionManager);
  console.log(`[scenario] ${previous.current} -> ${next.current}`);
});
```

这一段的意义是：

场景切换不只是改状态，还会立刻触发副作用。

最后看这句：

```ts
telemetryBroadcaster.start();
```

这一句就是“实时流正式开始跑”的时刻。

### 第 4 步做完以后，项目状态应该变成什么样

做到这一步时，后端应该已经不只是“能产数据”，而是已经能表现出不同流状态的差异。

你只需要满足这些结果：

1. `live` 场景下会持续推流
2. `stale` 场景下连接还在，但不再发新帧
3. `alarm` 场景下继续推流，但 frame 里会带 alarm
4. `manual-disconnect` 会主动关闭连接
5. `drop` 会异常断开连接

也就是说，第 4 步的验收关键词是：

同一套 telemetry 数据源，已经能表现出不同场景行为。

### 第 4 步怎么验证

按 kickoff 的验收标准，先做这几条就够。

1. 启动 server

```bash
npm run dev:server
```

预期结果：
后端开始监听 websocket telemetry 通道。

2. 用任意 websocket 客户端连到：

```text
ws://localhost:3001/telemetry
```

预期结果：
在 `live` 场景下，客户端会持续收到 frame。

3. 切到 `stale`

预期结果：
连接不会立刻断开，但新 frame 会停掉。

4. 切到 `alarm`

预期结果：
客户端继续收到 frame，同时 `alarms` 不再是空数组。

5. 切到 `manual-disconnect` 和 `drop`

预期结果：

1. `manual-disconnect` 是带明确语义的主动关闭
2. `drop` 是异常断开

### 如果你要把第 4 步讲给别人听，可以用这句

“第 4 步我把后端的场景控制、推流调度和连接管理接起来了。这样 generator 产出的基础 telemetry 不再只是存在内存里，而是会根据 `live`、`stale`、`alarm`、`manual-disconnect`、`drop` 这些场景表现出不同的流行为。”

## Phase 5：后端 scenario control HTTP 接口

先从第 5 步开始。第 5 步在 kickoff 里叫“写后端 scenario control HTTP 接口”，目标不是新增一套场景逻辑，而是把第 4 步已经存在的 `ScenarioController` 正式暴露成可操作的 HTTP 控制面。

### 第 5 步写了哪些代码

核心是这些文件：

1. `apps/server/src/routes/scenario-control.ts`
2. `apps/server/src/index.ts`

另外，`apps/server/src/scenarios/controller.ts` 在这一步没有新增一套新逻辑，但它是 HTTP 接口真正调用的状态源。

### 一、`apps/server/src/routes/scenario-control.ts` 写了什么

先看入口：

```ts
export function createScenarioControlRouter(controller: ScenarioController): Router {
  const router = Router();
  return router;
}
```

这段的意思是：把场景控制相关的 HTTP 路由独立收进一个 router，而不是把 GET/POST 逻辑直接塞进 `index.ts`。

这样做的好处是：

1. server 入口文件继续只负责组装
2. 控制接口和推流逻辑分开
3. 后面前端做 `DemoControls` 时，接口边界已经固定

### 二、查询接口做了什么

先看这一段：

```ts
router.get('/scenario', (_request, response) => {
  response.json({
    scenario: controller.getSnapshot().current,
    availableScenarios: scenarioNames,
  });
});
```

这一段的意思是：客户端可以通过 HTTP 直接问服务器“当前是什么场景”，同时拿到所有可选场景列表。

这里返回的不只是 `scenario`，还有 `availableScenarios`。这样前端或手动调用者不需要靠文档硬记合法值。

### 三、切场景接口做了什么

再看这一段：

```ts
router.post('/scenario', (request, response) => {
  const { scenario } = request.body as ScenarioRequestBody;

  if (!scenario || !isScenarioName(scenario)) {
    response.status(400).json({
      error: 'scenario must be one of the supported demo scenario names',
      availableScenarios: scenarioNames,
    });
    return;
  }

  const snapshot = controller.setScenario(scenario satisfies ScenarioName ? scenario : 'live');

  response.json({
    scenario: snapshot.current,
    changedAt: snapshot.changedAt,
  });
});
```

这段解决的是“外部怎么安全地切场景”。

这里有三个关键点：

1. 请求体里必须带 `scenario`
2. 值必须是后端真正支持的场景名
3. 场景切换仍然统一走 `ScenarioController`

这第三点很重要。HTTP 路由本身不去实现 `stale`、`drop`、`alarm` 的行为，它只负责把变更请求交给已有的 controller。这样第 4 步里 broadcaster 和 connection manager 已经实现好的副作用链路会继续生效，不会出现“HTTP 改了状态，但 websocket 行为没跟着变”的分叉实现。

另外，这里返回了 `changedAt`。它的意义是：调用方不仅知道“现在是什么场景”，还知道“这次切换发生在什么时候”。

### 四、重置接口做了什么

再看这一段：

```ts
router.post('/scenario/reset', (_request, response) => {
  const snapshot = controller.setScenario('live');

  response.json({
    scenario: snapshot.current,
    changedAt: snapshot.changedAt,
  });
});
```

这一段的作用很直接：

无论你前面切到了 `alarm`、`stale`、`manual-disconnect` 还是 `drop`，都可以通过一个固定接口回到默认 `live`。

这对 demo 很重要，因为它让“恢复到基线状态”变成一个稳定动作，而不是依赖重新启动 server。

### 五、`apps/server/src/index.ts` 在这一步里起什么作用

这里最关键的是这两句：

```ts
app.use(express.json());
app.use('/api', createScenarioControlRouter(scenarioController));
```

第一句的意思是：server 能解析 JSON 请求体。

第二句的意思是：刚才定义的 router 被挂到 `/api` 前缀下面。

所以最终暴露出来的不是文件里看到的相对路径，而是这三个真正可调用的地址：

1. `GET /api/scenario`
2. `POST /api/scenario`
3. `POST /api/scenario/reset`

这就是 kickoff 第 5 步里“提供切场景和重置接口”的真正落地形式。

### 第 5 步做完以后，项目状态应该变成什么样

做到这一步时，后端应该已经不只是“内部有场景状态”，而是已经有一个外部可控的控制面。

你只需要满足这些结果：

1. 可以通过 HTTP 查询当前场景
2. 可以通过 HTTP 切到五个 demo 场景
3. 可以通过 HTTP 一键重置回 `live`
4. 非法场景名会被明确拒绝
5. HTTP 切换后，websocket 行为会立刻跟着变

也就是说，第 5 步的验收关键词是：

场景系统已经从“后端内部能力”变成“外部可操作能力”。

### 第 5 步怎么验证

按 kickoff 的验收标准，先做这几条就够。

1. 启动 server

```bash
npm run dev:server
```

预期结果：
后端开始监听 HTTP 和 WebSocket。

2. 查询当前场景

```bash
curl -s http://localhost:3001/api/scenario
```

预期结果：
返回当前 `scenario` 和 `availableScenarios`。

3. 切到某个场景，例如 `stale`

```bash
curl -s -X POST http://localhost:3001/api/scenario \
  -H 'Content-Type: application/json' \
  -d '{"scenario":"stale"}'
```

预期结果：
返回新的 `scenario` 和对应的 `changedAt`。

4. 再分别切 `alarm`、`manual-disconnect`、`drop`

预期结果：
HTTP 请求都能稳定成功，对应 WebSocket 行为也会按第 4 步定义变化。

5. 执行重置

```bash
curl -s -X POST http://localhost:3001/api/scenario/reset
```

预期结果：
场景稳定回到 `live`。

6. 验证错误输入

```bash
curl -i -X POST http://localhost:3001/api/scenario \
  -H 'Content-Type: application/json' \
  -d '{"scenario":"unsupported"}'
```

预期结果：
返回 `400`，并告知可用场景列表。

### 如果你要把第 5 步讲给别人听，可以用这句

“第 5 步我把后端场景系统对外开放成了一组 HTTP 控制接口。这样 WebSocket 继续负责传 telemetry，HTTP 则负责切换 `live`、`stale`、`alarm`、`manual-disconnect`、`drop` 这些 demo 场景，整个演示不需要为了切状态去重启服务或引入额外控制通道。”

## Phase 6：前端类型、store、freshness、backoff

先从第 6 步开始。第 6 步在 kickoff 里叫“写前端类型、store、freshness、backoff”，目标不是马上做最终 dashboard 组件，而是先把前端状态层独立搭出来，让 `trust state`、`stale`、`reconnecting`、`disconnected` 这些判断在真正接 websocket 之前就能被验证。

### 第 6 步写了哪些代码

核心是这些文件：

1. `apps/web/src/types/telemetry.ts`
2. `apps/web/src/utils/freshness.ts`
3. `apps/web/src/utils/backoff.ts`
4. `apps/web/src/store/telemetryStore.ts`
5. `apps/web/src/store/selectors.ts`
6. `apps/web/src/App.tsx` 里的临时状态调试页

这一步的重点不是“界面长什么样”，而是“状态从哪里来、怎么推导、怎么保证 frozen data 不会伪装成 live data”。

### 一、`apps/web/src/types/telemetry.ts` 写了什么

这个文件先把前端状态层需要的词汇表定下来。

先看这些关键类型：

```ts
export type ConnectionState = 'idle' | 'connecting' | 'open' | 'reconnecting' | 'disconnected';

export type FreshnessState = 'no-data-yet' | 'fresh' | 'stale';

export type TrustState = 'no-data-yet' | 'live' | 'stale' | 'reconnecting' | 'disconnected';
```

这三组类型分别解决三个问题：

1. transport 现在处于什么连接状态
2. 数据从“新鲜度”角度看是不是已经过期
3. 操作者现在到底该不该信任页面上的值

另外，这个文件还定义了 `UiTelemetrySnapshot`，把前端真正需要消费的一份聚合状态整理出来，包括：

1. `ts`
2. `pose`
3. `speed`
4. `battery`
5. `mission`
6. `alarms`
7. `connectionState`
8. `freshnessState`
9. `trustState`
10. `viewState`
11. `ageMs`
12. `hasData`
13. `isFrozen`

这里最重要的是：

前端不只保存原始 frame，也保存一份已经为 UI 推导好的快照。

### 二、`apps/web/src/utils/freshness.ts` 写了什么

这个文件负责把“时间”和“连接状态”翻译成 UI 能直接消费的状态。

先看 stale 阈值：

```ts
export const STALE_THRESHOLD_MS = 2500;
```

这正好对应 kickoff 里锁定的参数。

再看 freshness 推导：

```ts
export function deriveFreshnessState(
  lastReceiveTime: number | null,
  now: number,
  thresholdMs = STALE_THRESHOLD_MS,
): FreshnessState {
  if (lastReceiveTime === null) {
    return 'no-data-yet';
  }

  return now - lastReceiveTime > thresholdMs ? 'stale' : 'fresh';
}
```

这段的意义是：

前端不需要靠组件自己算“多久没更新”，而是先统一算出 freshness state。

再看 trust state 推导：

```ts
export function deriveTrustState(
  connectionState: ConnectionState,
  freshnessState: FreshnessState,
): TrustState {
  if (connectionState === 'reconnecting') {
    return 'reconnecting';
  }

  if (connectionState === 'disconnected') {
    return 'disconnected';
  }

  if (freshnessState === 'no-data-yet') {
    return 'no-data-yet';
  }

  return freshnessState === 'stale' ? 'stale' : 'live';
}
```

这里最关键的是优先级：

1. `reconnecting` 优先于 freshness
2. `disconnected` 优先于 freshness
3. 没有第一帧时必须是 `no-data-yet`
4. stale 绝不能被显示成 live

这正好对应 assignment 里“trust-state 是页面级第一状态信号”的要求。

最后看 `buildUiSnapshot()`。这个函数会把：

1. 原始 `rawFrame`
2. `lastReceiveTime`
3. `connectionState`
4. `alarms`
5. `now`

合并成一份 UI 能直接吃的 snapshot，并顺手算出：

1. `ageMs`
2. `hasData`
3. `isFrozen`

这里的 `isFrozen` 很关键，因为它让后续 UI 能明确知道“现在显示的是 last-known 值，不是 live 值”。

### 三、`apps/web/src/utils/backoff.ts` 写了什么

这个文件专门处理 reconnect 延迟。

```ts
export const RECONNECT_BASE_MS = 1000;
export const RECONNECT_MAX_MS = 30000;
```

还是直接对齐 kickoff 里的锁定参数。

再看核心函数：

```ts
export function getReconnectDelay(
  attempt: number,
  baseMs = RECONNECT_BASE_MS,
  maxMs = RECONNECT_MAX_MS,
): number {
  const normalizedAttempt = Number.isFinite(attempt) ? Math.max(0, Math.floor(attempt)) : 0;

  return Math.min(maxMs, baseMs * 2 ** normalizedAttempt);
}
```

它的作用是：

把第几次重连尝试，转成一个有上限的指数退避延迟。

这一步虽然还没有真正接 websocket client，但 backoff 规则已经先独立好了。到第 7 步接 transport 时，不需要再让组件层临时发明延迟算法。

### 四、`apps/web/src/store/telemetryStore.ts` 写了什么

这个文件是前端状态层的核心。

它集中管理这些状态：

1. `rawFrame`
2. `uiSnapshot`
3. `lastReceiveTime`
4. `alarms`
5. `connectionState`
6. `freshnessState`
7. `trustState`
8. `viewState`
9. `reconnectAttempt`
10. `nextReconnectDelayMs`
11. `now`

先看这里：

```ts
function buildDerivedState(source: DerivationSource): Pick<
  TelemetryStateShape,
  'uiSnapshot' | 'freshnessState' | 'trustState' | 'viewState' | 'nextReconnectDelayMs'
> {
  const uiSnapshot = buildUiSnapshot({
    rawFrame: source.rawFrame,
    alarms: source.alarms,
    connectionState: source.connectionState,
    lastReceiveTime: source.lastReceiveTime,
    now: source.now,
  });

  return {
    uiSnapshot,
    freshnessState: uiSnapshot.freshnessState,
    trustState: uiSnapshot.trustState,
    viewState: uiSnapshot.viewState,
    nextReconnectDelayMs: getReconnectDelay(source.reconnectAttempt),
  };
}
```

这段的意义是：

所有衍生状态都在 store 层统一推导，不让组件各算各的。

再看 action：

1. `receiveFrame()`
2. `syncClock()`
3. `markConnecting()`
4. `markConnected()`
5. `markReconnecting()`
6. `markDisconnected()`
7. `resetState()`

这些 action 的设计非常直接，都是为了后面 websocket client 和 message router 能顺滑接进来。

例如 `receiveFrame()` 会同时做几件事：

1. 更新 `rawFrame`
2. 更新 `lastReceiveTime`
3. 更新 `alarms`
4. 把连接状态置成 `open`
5. 清零重连计数
6. 重新计算整份衍生状态

这让“收到一帧数据”在状态层里成为一个完整原子动作。

### 五、`apps/web/src/store/selectors.ts` 写了什么

这个文件目前提供了三类选择器：

1. `selectUiSnapshot`
2. `selectRawFrame`
3. `selectDebugSummary`

它的作用是把“组件关心的读取面”收窄，不让页面到处直接依赖整个 store 全量结构。

这一步虽然看起来不大，但它能减少后面组件层和 store 内部实现的耦合。

### 六、`apps/web/src/App.tsx` 在这一步里起什么作用

当前的 `App.tsx` 不是最终 dashboard，而是一个临时状态调试页。

它现在做的事情很明确：

1. 显示当前 `trustState`
2. 显示 `connectionState`、`freshnessState`、`viewState`
3. 显示最近一帧的 pose、speed、battery、mission
4. 显示 alarm 数量
5. 通过按钮直接触发 store action
6. 把 raw frame 和 derived snapshot 打出来方便人工检查

这一步最重要的不是视觉效果，而是手动验收路径已经成立。

比如这些动作：

1. `Mark open`
2. `Receive live frame`
3. `Advance past stale threshold`
4. `Mark reconnecting`
5. `Mark disconnected`
6. `Receive frame with alarm`
7. `Reset store`

它们让你不用先做最终 UI，就能直接验证状态推导是不是正确。

### 第 6 步做完以后，项目状态应该变成什么样

做到这一步时，前端应该已经不只是“能渲染一个占位页”，而是已经有一套真正的状态层骨架。

你只需要满足这些结果：

1. 前端有自己的 telemetry 类型定义
2. freshness、trust-state、view-state 都能统一推导
3. reconnect backoff 已经独立实现
4. alarms 被单独保存，不会覆盖 trust-state
5. 不用最终 UI，也能通过手动 action 验证状态切换

也就是说，第 6 步的验收关键词是：

前端状态层已经独立成立，UI 只是后续消费它。

### 第 6 步怎么验证

按 kickoff 的验收标准，先做这几条就够。

1. 先跑前端构建

```bash
npm --prefix apps/web run build
```

预期结果：
类型检查和打包都通过。

2. 启动前端

```bash
npm run dev:web
```

预期结果：
页面能显示当前临时状态调试页。

3. 点击 `Mark open`

预期结果：
连接已打开，但因为还没有第一帧，trust state 仍然是 `no-data-yet`。

4. 点击 `Receive live frame`

预期结果：
页面进入 `live`，并显示一组可读 telemetry 值。

5. 点击 `Advance past stale threshold`

预期结果：
trust state 变成 `stale`，同时数据仍保留为 last-known 值。

6. 点击 `Mark reconnecting` 和 `Mark disconnected`

预期结果：
trust state 分别变成 `reconnecting` 和 `disconnected`，并且 reconnect attempt / next backoff delay 会联动变化。

7. 点击 `Receive frame with alarm`

预期结果：
alarm 数量变化，但 trust-state 逻辑仍然按连接和 freshness 优先级判断。

### 如果你要把第 6 步讲给别人听，可以用这句

“第 6 步我先把前端状态层单独搭起来了。这样前端已经能用统一的类型、freshness 规则、trust-state 推导和 reconnect backoff 来描述 telemetry，而不用等最终 dashboard 组件都做完才发现状态语义有问题。”

## Phase 7：WebSocket client 和 message router

先从第 7 步开始。第 7 步在 kickoff 里叫“写 WebSocket client 和 message router”，目标不是再做一层手动 mock，而是把前端真的接到后端 `ws://localhost:3001/telemetry`，同时把 transport 行为单独收口：连接、断开、重连、latest-only 缓冲、alarm 立即刷新。

### 第 7 步写了哪些代码

核心是这些文件：

1. `apps/web/src/services/websocketClient.ts`
2. `apps/web/src/services/messageRouter.ts`
3. `apps/web/src/App.tsx` 里的真实 websocket wiring

这一阶段的重点不是“前端终于拿到数据”这么简单，而是“前端怎么拿、怎么重连、怎么避免每一帧都直接打到 UI 上”。

### 一、`apps/web/src/services/websocketClient.ts` 写了什么

这个文件把 websocket 生命周期单独包成了一个客户端类。

先看 websocket 地址解析：

```ts
export function getTelemetryWebSocketUrl(): string {
  const configuredUrl = import.meta.env.VITE_TELEMETRY_WS_URL;

  if (configuredUrl) {
    return configuredUrl;
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';

  return `${protocol}//${window.location.hostname}:3001/telemetry`;
}
```

这段的意义是：

1. 默认直接连本地 backend 的 `/telemetry`
2. 如果后面部署环境不一样，也可以通过 `VITE_TELEMETRY_WS_URL` 覆盖

再看 `connect()`：

```ts
connect(): void {
  if (
    this.socket &&
    (this.socket.readyState === WebSocket.OPEN ||
      this.socket.readyState === WebSocket.CONNECTING ||
      this.socket.readyState === WebSocket.CLOSING)
  ) {
    return;
  }
```

这里最关键的是它会挡住重复连接，尤其是 socket 还在 `OPEN`、`CONNECTING`、`CLOSING` 时，不会重新开一个并行连接。

这正好对应 kickoff 第 7 步里“不重复注册 listener / 不重复接 transport”的核心要求。

这个 client 还会向外发这几类事件：

1. `connecting`
2. `open`
3. `message`
4. `reconnecting`
5. `closed`
6. `error`

这样 UI 层不需要自己去直接操作底层 socket 事件，就能知道 transport 现在处于什么阶段。

### 二、重连逻辑做了什么

先看普通重连：

```ts
private scheduleReconnect(now: number, immediate = false): void {
  if (this.reconnectTimer !== null) {
    return;
  }

  const attempt = this.reconnectAttempt + 1;
  const delayMs = immediate ? 0 : getReconnectDelay(this.reconnectAttempt);
```

这段的意义是：

1. 每次断开后不会无限叠加多个 timer
2. 重连延迟继续复用第 6 步定义好的 backoff 规则
3. 可以区分“手动断开不重连”和“非手动断开后按退避重连”

再看 `simulateReconnectFlow()`：

```ts
simulateReconnectFlow(): void {
  this.manualClose = false;
  this.clearReconnectTimer();

  if (this.socket && this.socket.readyState !== WebSocket.CLOSED) {
    this.socket.close(4001, 'Simulated reconnect flow');
    return;
  }

  this.scheduleReconnect(Date.now());
}
```

这段的作用是：

调试页可以强制触发一次“进入 reconnecting 流程”，并且继续按默认的 1s / 2s / 4s backoff 恢复。

这对演示 reconnecting 状态很有价值，因为你不需要每次都靠真实断线，但又不会绕开真正的退避逻辑。

### 三、`apps/web/src/services/messageRouter.ts` 写了什么

这个文件解决的不是“能不能收到消息”，而是“收到消息之后怎么喂给 UI”。

先看 commit 间隔：

```ts
export const UI_COMMIT_INTERVAL_MS = 100;
```

这对应 kickoff 锁定参数里的 `100ms`。

再看 `routeMessage()`：

```ts
routeMessage(data: string, receivedAt = Date.now()): boolean {
  const frame = this.parseFrame(data);

  if (!frame) {
    return false;
  }

  if (this.shouldFlushImmediately(frame)) {
    this.clearFlushTimer();
    this.pendingFrame = null;
    this.pendingReceivedAt = null;
    this.commit(frame, receivedAt);
    return true;
  }

  this.pendingFrame = frame;
  this.pendingReceivedAt = receivedAt;
```

这段的核心意思是：

1. 正常 frame 不需要每条都立刻进 UI
2. router 只保留“最新的一条待提交 frame”
3. 到了 commit interval 再统一 flush

这就是 latest-only buffering。

它的好处是：

前端不会因为 websocket 每来一条消息就重渲染一次。

### 四、为什么 alarm 要立即刷新

再看这一段：

```ts
private shouldFlushImmediately(frame: RawTelemetryFrame): boolean {
  if (!this.hasCommittedFrame) {
    return true;
  }

  return getAlarmSignature(frame.alarms) !== this.lastCommittedAlarmSignature;
}
```

这里就是 kickoff 第 7 步里“短暂 alarm 不会被节流吞掉”的真正实现点。

含义很直接：

1. 第一帧必须立刻提交
2. alarm 集合只要变了，就立刻提交
3. 只有普通连续 telemetry 才走 latest-only 缓冲

这样你就不会出现“alarm 只出现了几十毫秒，但 UI 因为节流完全没看见”的问题。

### 五、`apps/web/src/App.tsx` 在这一步里起什么作用

当前 `App.tsx` 还是调试页，但它已经不是第 6 步那种手动造 frame 的状态页了。

现在它做的是：

1. 页面 mount 时创建 `TelemetryWebSocketClient`
2. 创建 `TelemetryMessageRouter`
3. 把 websocket 事件翻译成 store action
4. 把 websocket message 先送进 router，再进 `receiveFrame()`
5. 用定时 `syncClock()` 推进 stale 检测
6. 页面 unmount 时清理 listener、socket、timer

关键 wiring 在这里：

```tsx
useEffect(() => {
  const router = new TelemetryMessageRouter({
    onFrame: receiveFrame,
    commitIntervalMs: UI_COMMIT_INTERVAL_MS,
  });
  const client = new TelemetryWebSocketClient(streamUrlRef.current);
```

这段的意义是：

transport 层和第 6 步的状态层已经真正接上了。

另外，cleanup 也很关键。因为这里在 `useEffect` 返回函数里做了：

1. `unsubscribe()`
2. `client.disconnect()`
3. `router.dispose()`

它保证组件卸载或重建时，不会把旧 listener 留在后台继续工作。

### 第 7 步做完以后，项目状态应该变成什么样

做到这一步时，前端应该已经不再依赖手动注入 frame，而是已经真正消费后端实时流。

你只需要满足这些结果：

1. 页面打开后会自动连 websocket
2. 数据会持续变化，不需要手动点 `Receive live frame`
3. backend 进入 `stale` 时，前端会靠 freshness 逻辑进入 `stale`
4. backend 断开连接时，前端会进入 `reconnecting` 或 `disconnected`
5. alarm 变化不会被 UI commit interval 吞掉
6. 不会因为重复 mount / rerender 造成重复 listener

也就是说，第 7 步的验收关键词是：

前端已经具备真实 transport 能力，而不是只具备本地状态推导能力。

### 第 7 步怎么验证

按 kickoff 的验收标准，先做这几条就够。

1. 启动 backend

```bash
npm run dev:server
```

预期结果：
server 开始监听 `ws://localhost:3001/telemetry`。

2. 启动前端

```bash
npm run dev:web
```

预期结果：
页面加载后会自动连接 websocket，并逐步进入 `live`。

3. 点击 `Disconnect stream`

预期结果：
trust state 进入 `disconnected`，页面保留 last-known telemetry。

4. 点击 `Connect stream` 或 `Simulate reconnect flow`

预期结果：
连接恢复，数据继续变化；`Simulate reconnect flow` 会先进入 `reconnecting`，再按默认 backoff 恢复。

5. 用 HTTP 切后端场景

```bash
curl -s -X POST http://localhost:3001/api/scenario -H 'Content-Type: application/json' -d '{"scenario":"stale"}'
curl -s -X POST http://localhost:3001/api/scenario -H 'Content-Type: application/json' -d '{"scenario":"alarm"}'
curl -s -X POST http://localhost:3001/api/scenario -H 'Content-Type: application/json' -d '{"scenario":"manual-disconnect"}'
curl -s -X POST http://localhost:3001/api/scenario/reset
```

预期结果：

1. `stale` 会让页面最终进入 `stale`
2. `alarm` 会让 alarm 立刻出现
3. `manual-disconnect` / `drop` 会触发 reconnect 流程
4. `reset` 后页面能回到 `live`

### 如果你要把第 7 步讲给别人听，可以用这句

“第 7 步我把前端真正接到了后端 websocket，并把 transport 规则单独抽成了 websocket client 和 message router。这样页面不只是能推导 trust-state，还能在真实流里处理 reconnect、latest-only 更新和 alarm 的即时刷新。”

## Phase 8：跑通前端状态层

先从第 8 步开始。第 8 步在 kickoff 里叫“跑通前端状态层”，目标不是再新增一层 transport，也不是立刻做最终 dashboard 组件，而是把第 6、7 步已经搭好的 store、freshness、backoff、websocket client 和 message router 真正串起来，明确验证五种 trust state 在真实流里是不是按预期变化。

这一步最大的重点不是“多写几个文件”，而是“把状态语义跑实”。

也就是说，第 7 步更偏 transport 接通，第 8 步更偏前端状态验收。

### 第 8 步写了哪些代码

这一步没有再新增一套大模块，核心还是把前面几步已经写好的代码当成一套完整系统来运行和验证。主要落点是这些文件：

1. `apps/web/src/App.tsx`
2. `apps/web/src/store/telemetryStore.ts`
3. `apps/web/src/utils/freshness.ts`
4. `apps/web/src/services/websocketClient.ts`
5. `apps/web/src/services/messageRouter.ts`

如果第 7 步解决的是“浏览器能不能接上真实 telemetry 流”，那第 8 步解决的就是：

1. `no-data-yet`
2. `live`
3. `stale`
4. `reconnecting`
5. `disconnected`

这五种状态到底有没有被清楚地区分开。

### 一、为什么这一步虽然没长出很多新文件，仍然是单独一阶段

因为 assignment 真正关心的不是你有没有写出 websocket client 这个类本身，而是：

页面能不能把“当前数据还能不能信”这件事表达清楚。

这件事单靠前面把 transport 接通还不够。你还得继续确认：

1. stale 不是伪装成 live
2. reconnecting 不是伪装成 disconnected
3. alarm 不会盖过 trust-state
4. 本地主动断开和后端把你踢下线不是一回事

所以第 8 步本质上是在做一件事：

把前端状态层从“代码结构看起来合理”，推进到“浏览器里跑出来也合理”。

### 二、`App.tsx` 在第 8 步里的角色是什么

当前这个 `App.tsx` 仍然不是最终 dashboard，但它已经不只是一个 transport 调试页了。

到了第 8 步，它更像一块“前端状态验收面板”。

它现在已经会把这些信号直接显示出来：

1. `trustState`
2. `connectionState`
3. `freshnessState`
4. `viewState`
5. `Last Receive Age`
6. `Reconnect Attempt`
7. `Next Backoff Delay`
8. `Alarm Count`
9. `Frozen Values`

另外它还会把：

1. raw frame
2. derived snapshot

直接打出来。

这意味着第 8 步不需要你再额外造一套日志系统，页面本身就已经是验收工具。

### 三、五种 trust state 在这一步里是怎么被跑出来的

先看 `no-data-yet`。

它表示 websocket 可以已经在连，甚至已经 open 了，但第一帧数据还没有真正 commit 到 UI。

它的意义是：

前端不会因为 transport 活着，就假装自己已经有可信 telemetry。

再看 `live`。

它表示：

1. 连接状态没有掉进 reconnecting 或 disconnected
2. 最新一帧数据还在 freshness 阈值内

这时候页面显示的值才算当前可信值。

再看 `stale`。

它不是后端发一条“你现在 stale 了”的特殊消息，而是前端自己根据：

1. `lastReceiveTime`
2. `now`
3. `STALE_THRESHOLD_MS`

推出来的。

所以 stale 的本质不是“连接断了”，而是：

连接可能还在，但你已经太久没拿到新 frame 了。

再看 `reconnecting`。

它表示连接不是你主动停掉的，而是 transport 中断后，前端正在按 backoff 规则重试。

最后看 `disconnected`。

它表示是本地操作者自己把 stream 停了。也就是说：

这不是异常恢复态，而是一个有意停机态。

### 四、为什么 stale 不是靠后端发一个 stale 消息

这是第 8 步里最关键的一层理解。

你切后端 `stale` 场景时，server 做的事情其实不是“广播一条 stale 事件”，而是“停止继续发新 frame，但连接保持着”。

这时候前端如果什么都不做，页面就会永远停在最后一次 `live`，因为状态没有新的输入。

所以 `App.tsx` 里这段定时 `syncClock()` 很关键：

```tsx
const clockTimer = window.setInterval(() => {
  syncClock(Date.now());
}, 250);
```

它的作用就是让前端在“没新 frame”时仍然继续推进 `now`。这样 `lastReceiveTime` 和 `now` 之间的差值才会越来越大，最后跨过 stale 阈值，页面自然转成 `stale`。

所以第 8 步里 stale 被证明的是：

前端不是靠后端贴标签，而是真的能识别 frozen data。

### 五、为什么 `alarm` 仍然会显示成 `live`

这个点很容易误解，但第 8 步正好要把它讲清楚。

前端的 `TrustState` 里根本没有 `alarm` 这个值。它只有：

1. `no-data-yet`
2. `live`
3. `stale`
4. `reconnecting`
5. `disconnected`

也就是说，alarm 不是页面级第一状态。

trust-state 先回答的问题是：

“这份数据现在还能不能信？”

alarm 回答的问题则是：

“在这份数据里，有没有需要单独注意的异常事件？”

所以当后端切到 `alarm` 场景时，前端的正确表现应该是：

1. trust state 仍然保持 `live`
2. `Alarm Count` 变化
3. alarm 相关内容立刻刷新

这不是 bug，而是语义设计本来就应该这样。

### 六、为什么 `Disconnect stream` 和后端 `manual-disconnect` 不一样

这个点也是第 8 步必须明确验证的。

点页面上的 `Disconnect stream`，走的是前端本地 `client.disconnect()`。这是一种“操作者主动停掉流”的语义。

因此它的目标状态是：

`disconnected`

而后端 `manual-disconnect` 场景的语义是：

server 主动把现有连接关掉。

对前端来说，这不是“我自己决定停掉”，而是“远端把我断开了”，所以它应该进入的是：

`reconnecting`

而不是 `disconnected`。

你可以把它们理解成：

1. `Disconnect stream` = 本地停机
2. `manual-disconnect` / `drop` = 远端故障或远端关闭后的恢复流

这两条路径都会保留 last-known telemetry，但 trust-state 含义并不一样。

### 第 8 步做完以后，项目状态应该变成什么样

做到这一步时，前端状态层应该已经不只是“理论上写对了”，而是已经能在真实流里被证明写对了。

你只需要满足这些结果：

1. 页面上能看见全部五种 trust state
2. `stale` 是靠时间推进推出来的，不是后端硬贴标签
3. `alarm` 会显示出来，但不会覆盖 trust-state
4. 本地断开和远端断开恢复在页面上能明确区分
5. 冻结数据会保留，但不会被伪装成 live data

也就是说，第 8 步的验收关键词是：

前端状态语义已经被真实跑通，而不只是代码结构成立。

### 第 8 步怎么验证

先启动 backend：

```bash
npm run dev:server
```

再启动前端：

```bash
npm run dev:web
```

然后按这条路径检查：

1. 页面打开后，先经历连接过程，再进入 `live`
2. 用 HTTP 切到 `stale`，观察 `Last Receive Age` 持续增长，并在超过阈值后进入 `stale`
3. 切到 `alarm`，确认 trust state 仍然是 `live`，但 `Alarm Count` 会立刻变化
4. 点击 `Disconnect stream`，确认页面进入 `disconnected`，而且不会自动重连
5. 点击 `Connect stream`，确认流能恢复
6. 点击 `Simulate reconnect flow`，确认页面进入 `reconnecting`，并能看到重连次数和 backoff 延迟
7. 切后端到 `manual-disconnect` 或 `drop`，确认页面进入的是 `reconnecting`，不是 `disconnected`

切后端场景可以继续用这些命令：

```bash
curl -s -X POST http://localhost:3001/api/scenario -H 'Content-Type: application/json' -d '{"scenario":"stale"}'
curl -s -X POST http://localhost:3001/api/scenario -H 'Content-Type: application/json' -d '{"scenario":"alarm"}'
curl -s -X POST http://localhost:3001/api/scenario -H 'Content-Type: application/json' -d '{"scenario":"manual-disconnect"}'
curl -s -X POST http://localhost:3001/api/scenario -H 'Content-Type: application/json' -d '{"scenario":"drop"}'
curl -s -X POST http://localhost:3001/api/scenario/reset
```

预期结果：

1. 五类 trust state 都能被稳定看见
2. stale 的产生方式是可解释的
3. alarm 不会劫持 trust-state
4. reconnecting 和 disconnected 的边界是清楚的

### 如果你要把第 8 步讲给别人听，可以用这句

“第 8 步我把前端状态层在真实流里跑通了。现在这个页面不只是连上 websocket，而是已经能把 `no-data-yet`、`live`、`stale`、`reconnecting`、`disconnected` 这些 trust-state 差异明确表现出来；同时 alarm 继续独立显示，不会盖过页面对数据可信度的判断。”