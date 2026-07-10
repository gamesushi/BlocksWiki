# LifeWiki — 基于 Block 的生活 Wiki 平台（MVP）

> Are.na 式图状内容网络：Block（原子内容）× Channel（策展容器）× Connection（图的边）。
> 三层缝合架构：Editor.js（JSON 输入）→ Strapi v5（图关系托管）→ Next.js 14 App Router（极简网格消费）。

**可行性结论：1 名全栈工程师两周内可落地 MVP。** 前提是砍掉协作 Channel、实时通知与全文搜索，认证直接用 Strapi users-permissions，图片走 Strapi upload 本地盘。三张表 + 一个自定义控制器 + 三个页面就是全部核心面。

---

## 1. 核心建模决策（先读这个）

**Connection 是 Block↔Channel 多对多关系的唯一事实来源。**
没有使用 Strapi 裸 `manyToMany`，原因：Strapi 的 manyToMany 中间表不能携带业务字段，而本产品的灵魂恰恰是边上的元数据 —— *谁*、*何时*、*以什么顺序* 把 Block 连进了 Channel。因此采用关联对象（Association Object）模式：

```
User ──creator──> Block <──block── Connection ──channel──> Channel <──owner── User
                                        │
                                   connector (User)
                                   position / createdAt / pairKey
```

- `pairKey = "{blockDocumentId}:{channelDocumentId}"`，带数据库唯一索引 —— 同一 Block 不可能重复连进同一 Channel，并发双击由 DB 层兜底。
- `Block.excerpt / coverImageUrl / connectionCount` 是写时反规范化字段（lifecycle 自动生成），网格页渲染 100 张卡片零 JSON 解析。

## 2. 目录结构

```
lifewiki/
├── backend/                        # 拷入 Strapi v5 项目根目录
│   ├── src/api/block/              # schema + 强制注入 creator 的 controller + excerpt lifecycle
│   ├── src/api/channel/            # schema
│   ├── src/api/connection/         # schema + connect/disconnect 自定义控制器与路由
│   ├── src/extensions/users-permissions/  # User 增加 blocks/channels 反向关系
│   └── database/migrations/        # 图查询关键索引
└── frontend/                       # 拷入 Next.js 14 (App Router) 项目根目录
    ├── lib/strapi.ts               # 带 tag 缓存的 Strapi 客户端（JWT 存 httpOnly cookie）
    ├── lib/types.ts                # 全链路数据契约
    ├── lib/render-blocks.tsx       # Editor.js JSON -> React（服务端渲染）
    ├── app/actions/{blocks,connections}.ts   # Server Actions
    ├── app/channel/[slug]/page.tsx # 极简网格 Channel 页
    ├── app/api/upload-proxy/route.ts
    └── components/{block-editor,connect-button}.tsx
```

## 3. 运行（已 bootstrap 完成，2026-07-07）

`api/`（Strapi v5.50，端口 **1338**）与 `web/`（Next.js 15，Tailwind v4）已生成并拷入代码，端到端联调通过：

```bash
cd api && npm run develop     # http://localhost:1338，角色权限由 src/index.ts bootstrap 自动种子化
cd web && npm run dev         # web/.env.local: STRAPI_URL=http://localhost:1338, REVALIDATE_SECRET=...
```

`backend/`、`frontend/` 目录是与 `api/`、`web/` 保持同步的原型源（改动请双写或只改 api/web）。

**浏览器内完整用户旅程已验证通过**：`/login` 注册（JWT 入 httpOnly cookie）→ 首页建 Channel → `/capture` 快速采集发 Block → 首页 Feed 点 Connect 挂入 Channel → 频道页即时显示（revalidateTag 生效）→ `/block/[id]` 详情页含反向 Channel 边侧栏 → `/publish` Editor.js 编辑发布并跳转详情。
页面清单：`/`（Feed + My Channels + Connect）、`/login`、`/publish`（Editor.js）、`/capture`（PWA 采集）、`/channel/[slug]`（频道主可 disconnect ✕ / 删除频道）、`/block/[id]`（作者可删除）、`/user/[username]`（用户主页：Block 流 + 公开频道）。

**迭代十一：频道网格就地新建磁贴（对齐 Are.na，已验证）**：Are.na 的频道网格首格永远是"+"添加磁贴（带 ⌘ENTER 提示）——此前缺失。[AddBlockTile](frontend/components/add-block-tile.tsx)：空闲态居中"+"，点击进入输入态，⌘/Ctrl+Enter 提交 → [addBlockToChannel](frontend/app/actions/channel.ts) 一步创建 Block 并连结到本频道，router.refresh() 让新块入网格。通过 PaginatedList 新增的 `leading` 槽固定在首格（不参与分页）。仅对有连结权者显示（public 任何登录用户 / closed·private 属主+协作者），匿名与无权者不渲染。

**迭代十二：富 compose（对齐 Are.na 磁贴能力 + expand markdown 编辑器，已验证）**：
- **磁贴富输入**：占位符"拖拽或选择文件、粘贴 URL（图片/视频/链接），或在此输入文字"。粘贴/输入单个 URL 自动识别（[urlToBlock](frontend/lib/markdown.ts)：图片扩展名→image 块内嵌，视频/普通链接→可点 link 块）；粘贴/拖拽/选择图片文件→走 upload-proxy 上传→image 块。
- **expand editor**：磁贴右上角"⤢ 展开"打开 [ExpandedEditor](frontend/components/expanded-editor.tsx) 大编辑器（对齐 Are.na 截图：蓝框卡片、标题+markdown 正文、左下角切换「M↓ 预览 ↔ ✎ 编辑」即原始 markdown 与渲染后互切、右下角 Add block ⌘⏎）。
- **markdown 管线**：[markdownToEditorJs](frontend/lib/markdown.ts) 解析实用子集（标题/段落/列表/引用/图片 + 内联 粗斜体/链接/代码）→ Editor.js JSON，与既有 RenderBlocks/searchText 完全兼容；`editorJsToHtml` 供预览。标题前置为 h2 header。存储层无需改动。
- 验证：markdown 全元素预览渲染正确、Add block 后 content 结构正确落库且 searchText 含内文可搜、URL 识别为 link 块、富占位符/展开/选择文件 UI 齐全。**已知**：markdown 内联 HTML 与 render-blocks 一样待生产环境套 sanitize（防 `javascript:` 链接等）。

**迭代十七：Block 描述 + 评论（已验证）**：Block 从孤立卡片变成能讨论的对象，评论联动通知。
- **数据模型**：Block 加 `description`（独立于正文的补充说明，仅作者可改）+ `commentCount` 反规范化计数。新增 `Comment` 内容类型（body + `authorName` 反规范化 + `block` manyToOne），Strapi v5 即便是 oneToMany/manyToOne 关系也走 `_lnk` 中间表（`comments_block_lnk`），已补对应索引与 `commentCount` 幂等回填（沿用既有 bootstrap 模式）。
- **API**：`PUT /blocks/:id/description`（独立路由，不与 content 编辑耦合，仅作者）；`POST /comments`（登录用户，作者名反规范化，维护 Block.commentCount，通知 Block 作者）；`DELETE /comments/:id`（仅评论作者，递减计数）；`find` 沿用核心路由（评论无隐私维度，跟随所属 Block 公开可读）。Block 删除时级联清理其评论（同连结边清理的一贯模式）。
- **通知联动**：新增 `comment_on_block` 通知类型，复用 [notify util](backend/src/utils/notify.ts)。
- **前端**：[BlockDescription](frontend/components/block-description.tsx)（作者就地编辑，非作者只读或不渲染）+ [CommentSection](frontend/components/comment-section.tsx)（列表 + 表单，客户端乐观追加，单击 ✕ 删除自己的评论——沿用 disconnect-button 的"低风险动作无需二次确认"先例）。BlockCard 展示 commentCount。
- 10 项 curl（描述改权限、评论 CRUD、空评论 400、越权 403、commentCount 增减）+ 浏览器全流程（双用户交叉验证：描述编辑入口仅作者可见、评论列表实时更新、删除按钮仅评论作者可见）。**过程中抓到一个真实 bug**：`comment_on_block` 加进了后端 `notify.ts` 的类型和数据库 enum，但漏改了前端 `notification-types.ts` 和 `NotificationRow` 的 `describe()` switch——通知列表全部退化显示成兜底文案"有新动态"。浏览器实测才暴露（纯类型检查不会报错，因为 TS 里两处类型定义各自独立、没有共享），修完后验证文案与跳转链接（→ 对应 Block）均正确。20 条路由生产构建通过，fresh server 零 console 报错。

**迭代十六：通知（社交回路完成，已验证）**：
- **数据模型**：`Notification` 内容类型全反规范化（recipientName/actorName/type/read + targetBlockId/targetChannelSlug/targetChannelTitle），无关系写入，生成成本极低。
- **生成点**（[notify util](backend/src/utils/notify.ts)，跳过自己触发自己）：connect（block 作者「你的 Block 被连结」+ 频道主「有人向你频道添加内容」，去重）、connectChannel（频道主）、followUser、followChannel（频道主）、manageCollaborator add（被加者）。
- **读取**：[notification 控制器](backend/src/api/notification/controllers/notification.ts) find 强制 `recipientName = 当前用户`（越权 filters 无效，实测 gardener 读 midori 通知返回空）+ `/notifications/unread-count` + `POST /notifications/mark-read`。
- **前端**：首页 nav "通知" + 红点未读徽标（[getUnreadCount](frontend/app/actions/notifications.ts)）；[/notifications](frontend/app/notifications/page.tsx) 页按 type 组装文案与链接（[NotificationRow](frontend/components/notification-row.tsx)），未读蓝底蓝点，进入即 markAllRead → 徽标归零。
- 验证：follow_user/connect_block 生成（含"重复 connect 是 no-op 不发通知"的正确行为）、unread-count、越权隔离 + 浏览器（徽标 2→点开列表→返回徽标消失）。**顺带修**：PaginatedList 的 `leading` 槽缺 key 的 React 警告（包进 keyed Fragment）。生产构建通过、fresh server 零 console 报错。

**迭代十五：关注 + 动态流（社交回路，已验证）**：
- **数据模型**：User 加自引用 M2M `following`/`followers` + `followingNames` JSON 反规范化（user 关系 API 会被 sanitize，用平面数组判断"是否已关注"和喂 feed）+ `followerCount` 计数；`followedChannels` M2M + Channel `channelFollowers` + `followerCount`。
- **Follow API**（`POST /follow/user`、`/follow/channel`，无 content-type 的纯自定义控制器）：关注/取关，维护关系 + followingNames + 双方 followerCount；禁止关注自己；关注私密频道需可见权。
- **动态流**（[getFeed](frontend/app/actions/follow.ts)）：以 Connection 为活动单元，查「connectorName ∈ 我关注的人」`$or`「channel ∈ 我关注的频道」，按 createdAt desc 分页；private 由 connection.find 过滤。[/feed](frontend/app/feed/page.tsx) 页 + [FeedRow](frontend/components/feed-row.tsx)（"X 把 [block/频道] 连结到 [频道] · 时间"）+ 复用 PaginatedList。
- **UI**：[FollowButton](frontend/components/follow-button.tsx)（用户/频道，乐观切换）挂在用户主页与频道页 header；主页/频道页显示 followerCount；首页 nav 加"动态"（仅登录）。公开 `users.find` 授权（仅返回非私密字段）以取他人 followerCount。
- 7 项 curl（关注/取关、自关注 400、followerCount 增减、followingNames、频道关注、feed 查询）+ 浏览器（feed 渲染混排活动、profile/频道 FollowButton 状态与切换）。17 条路由生产构建通过、零 console 报错。

**迭代十四：频道套频道（"This channel appears in"，Are.na 图模型核心，已验证）**：一条 Connection 现在可以是「block→频道」或「频道→频道」。
- **数据模型**：Connection 加可选 `contentChannel`（被连入的频道），Channel 加反向 `appearances`。频道网格是「blocks + 频道块」混排的单一有序列表，分页不受影响。pairKey 用 `chan:` 前缀区分。
- **connectChannel** 控制器（`POST /connections/connect-channel`）：禁止自连（400）、目标频道连结权校验、被连入频道可见性校验（不能连你看不到的私密频道）、幂等、维护目标计数。
- **可见性双向过滤**：connection.find 现在同时过滤容器频道与「频道块」内容——任一为无权私密则隐藏该边（强制注入 visibility 字段防绕过）。
- **删除级联**：删频道时同时清理它作为容器的边**和**它出现在别处的 appearances（各自递减容器计数）。
- **幽灵边判定修正**（关键）：频道块的边 `block` 为 null 但 `contentChannel` 有值，是合法边；graphHygiene cron 与 block afterDelete lifecycle 改为只清「`block` 与 `contentChannel` 皆 null」或「容器 null」的边，避免误删频道块。
- **前端**：[ConnectionCard](frontend/components/connection-card.tsx)/[ConnectionRow](frontend/components/connection-row.tsx) 把频道块渲染成深色"CHANNEL"卡片/行（与 block 区分）；频道页 header 加 [ChannelConnectButton](frontend/components/channel-connect-button.tsx)（"Connect →"，搜公开频道/我的频道，把当前频道连入选中的）；header 下加"出现在"区块（[getChannelAppearances](frontend/app/actions/channel.ts)）。
- 5 项 curl（自连 400、连入成功、幂等、网格频道块、appears-in）+ 浏览器全流程（频道块深色卡渲染、appears-in 显示、Connect 选择器连入并回显）。16 条路由生产构建通过、零 console 报错。

**迭代十三：Table 视图 + 频道 Info（对齐 Are.na，已验证）**：Are.na 频道页有 View: Grid/Table 切换与 Info（Started/Modified/Length）——此前只有 Grid。[ViewToggle](frontend/components/view-toggle.tsx) 走 `?view=table` 查询（SSR 友好、可分享）；[ConnectionRow](frontend/components/connection-row.tsx) 密集行（缩略/摘要 · 连结者 · 引用数 · 添加时间）；[PaginatedConnections](frontend/components/paginated-connections.tsx) 加 `variant='grid'|'table'` 复用同一分页机制（table 用行布局、无 leading 磁贴）。频道 header 补 Info 行（创建/更新相对时间 + Length）。connection 查询补 `createdAt`。验证：table 24 行渲染、Grid↔Table 切换、Info 显示正确。

**Are.na 仍缺（供后续排期，按价值降序）**：① **频道套频道**（"This channel appears in"，channel 作为 block 连入其他 channel——Are.na 图模型的核心，需 Connection 支持 channel 引用）；② **关注 + 动态流**（follow 用户/频道 + 活动 feed）；③ **通知**（你的 block 被连结/被关注）；④ **拖拽排序** block（现有 position 但无拖拽 UI）；⑤ **多选批量** connect/移除；⑥ **block 描述 + 评论**；⑦ **来源溯源**（"Added by X from URL"）。

**迭代十二·修订（5 个反馈 bug，已验证）**：
- **控件与占位符重叠** → 磁贴底部改为独立控件行（⌘ENTER / 选择文件 / ⤢展开），textarea 加 `pb-10` 留白，"+" 居中在上方。
- **空白/文件按钮点击无反应** → 根因是点按钮先触发 textarea 的 `blur→setActive(false)` 把按钮卸载了；控件改为**始终渲染**（含 idle），并加 `onMouseDown preventDefault` 抢在 blur 前，点击必达。展开可从 idle 一键打开。
- **预览模式不能编辑**（Are.na 可）→ [ExpandedEditor](frontend/components/expanded-editor.tsx) 从"编辑/预览互斥切换"改为**并排实时预览**：左侧正文永远可编辑（等宽 mono），右侧实时渲染，切换只是显隐右栏。实测预览开启时仍可继续输入并即时更新。
- **`#` 与 `##` 渲染一样** → [markdownToEditorJs](frontend/lib/markdown.ts) 忠实映射 `#`→h1…`####`→h4；[render-blocks](frontend/lib/render-blocks.tsx) 与预览 CSS 均按 1–4 级分档字号。实测 #/##/### → 明显不同大小的 h1/h2/h3。
- 16 条路由生产构建通过，零 console 报错。

**迭代十：Wiki 功能（管理员精选编排，参考 wiki.js，已验证）**：管理员把平台的 Block/Channel 编排成树状 Wiki。
- **数据模型**：`WikiPage`（title/slug/order/intro/items/published/curatorName + parent 自关联树）。`items` 是有序 JSON 数组 `[{type:'text',content}|{type:'block',blockId,note}|{type:'channel',channelId,note}]` —— 编辑性文字串联精选的 Block/Channel 引用，非自由 markdown。引用失效（删除/private 无权）渲染占位符，不写脏数据。
- **管理员模型**：User 加 `isAdmin`，bootstrap 从 `LIFEWIKI_ADMINS` env（默认 midori）幂等提升；wiki 写路由对登录用户开放、controller 层校验 isAdmin（403）。三层防护：UI 不显示入口 + 编辑路由 redirect + 后端 403。
- **可见性**：草稿（published=false）对非管理员 findOne 404、list 过滤；嵌入的 private 频道走既有 channel.find 自动隐藏。
- **前端**：[/wiki](frontend/app/wiki/page.tsx) 树状导航 landing、[/wiki/[slug]](frontend/app/wiki/[slug]/page.tsx) 侧栏导航 + intro + 解析后的 items（block 内嵌完整内容 + 溯源链接、channel 卡片）、[/wiki/new](frontend/app/wiki/new/page.tsx) 与 [/wiki/[slug]/edit](frontend/app/wiki/[slug]/edit/page.tsx) 管理员编排器（[WikiEditor](frontend/components/wiki-editor.tsx)：文本/Block/频道 item 增删排序，Block/频道经搜索挑选）。items 引用批量 `$in` 解析零 N+1。
- **踩坑**：`content` 是 JSON 标量字段不是关系，`populate=content` 会让整个 `$in` 查询返回空 —— 必须用 `fields` 选取。删页时子页上提到父级避免孤立子树。
- 7 项 curl 验证（admin 提升、403 gate、草稿 404/发布 200、tree 层级、删除 reparent）+ 浏览器全流程（管理员建页含三类 item→渲染；非管理员无入口 + 编辑路由 redirect）。16 条路由生产构建通过。

**迭代九：分页组件收敛为泛型（内部重构，已验证）**：`PaginatedBlocks`/`PaginatedConnections` 各自内联的分页 state + 去重 + 加载按钮抽成泛型 [PaginatedList&lt;T&gt;](frontend/components/paginated-list.tsx)（`getKey` + `renderItem` 注入）。两个原组件退化为薄封装，只做 `{blocks}`/`{connections}` → `{items}` 适配并注入卡片渲染；**公开 props 不变，页面代码零改动**。加载更多机制现在单点维护。生产构建类型检查通过，Feed 与频道页分页浏览器回归全绿。

**迭代八：Block 编辑（已验证）**：补全内容生命周期的"改"。后端 block `update` 覆盖（仅作者，只允许改 content，creator/creatorName 不可变），`beforeUpdate` lifecycle 重算 excerpt/coverImageUrl/searchText。前端 [BlockEditor](frontend/components/block-editor.tsx) 泛化为创建/编辑共用（`initialData` 载入现有内容 + `onSubmit` 自定义保存），[/block/[id]/edit](frontend/app/block/[id]/edit/page.tsx) 页仅作者可进（后端再校验一次），Block 详情页对作者显示"编辑"入口。验证：非作者 PUT 403、作者编辑后 excerpt 重算、searchText **替换**（新词命中、旧词失配，非追加）、空内容 400；浏览器全流程（详情页→编辑→载入原文→改写→保存→跳回详情显示新内容）。

**迭代七：Connect 频道选择器（已验证）**：兑现"任何人可连公开频道"的语义 —— 此前 backend 已支持但 UI 无入口。ConnectButton 下拉加防抖搜索框（[searchConnectableChannels](frontend/app/actions/search.ts) 查任意公开频道，按 connectionCount 排序），空查询时回落到"我的频道"快捷列表（owned + collab）。验证：midori 搜到 gardener 的公开频道并把自己的 Block 连结进去，`connectorName=midori`、频道属主仍是 gardener、原 Block 无污染。

**迭代六：closed 频道协作语义（已验证）**：让三种 visibility 真正自洽，按创始 spec（他人可连结公共频道）确立：
- **public**：任何登录用户可 connect + 任何人可看；**closed**：仅属主 + 协作者可 connect + 任何人可看；**private**：仅属主 + 协作者可 connect + 可看。
- 机制：Channel 加 `collaborators` M2M（连结鉴权的事实来源，controller 内 populate 不经 sanitize 可直读 id）+ `collaboratorNames` JSON 反规范化数组（视图过滤用，绕开 user 关系被 sanitize）。User 侧加 `collaboratingChannels` 反向 M2M，`getSession` 合并 owned + collaborating 为"可连结频道"。
- 属主管理：`POST /channels/collaborators { channelId, username, action }`（用 POST 因 Strapi 不解析 DELETE body），前端 [CollaboratorsPanel](frontend/components/collaborators-panel.tsx)。私密视图过滤统一走 `canViewPrivateChannel` helper（connection + channel 控制器共用）。
- 6 项 curl 验证全绿：closed 非协作者 403 → 加协作者 → 201、public 任何人 201、private 对协作者可见+可连、匿名不可见、移除协作者后 403。浏览器验证协作者面板增删 + 反向关系（gardener 的 collaboratingChannels 含该频道）。

**迭代五：搜索即时结果（已验证）**：搜索页输入框 `instant` 模式 —— 防抖 350ms 后 `router.replace(?q=)`，服务端组件重渲染出结果（保 SSR、URL 可分享、分页原样工作），`useTransition` 提供"搜索中"态且不阻塞输入。`focused` ref 守卫防止 URL 回流的 `defaultValue` 打断正在输入的内容。首页搜索框保持回车跳转（`instant` 默认关）。验证：不按回车打「薄荷」→ 4 结果、改「种植」→ 4 频道 chip，URL 同步。

**迭代四：Channel 页分页（已验证）**：修掉此前 48 条边的硬截断。复用"加载更多"模式，但频道页渲染 Connection（连结者署名 + 频道主 disconnect ✕），故建并行的 [PaginatedConnections](frontend/components/paginated-connections.tsx) + [ConnectionCard](frontend/components/connection-card.tsx) + [loadChannelConnections](frontend/app/actions/channel.ts) action，`position` desc 保持 Are.na 式新连结置顶。验证：30 边频道首屏 24 张 + 加载更多 → 30，到末页按钮消失。（注：header 的计数依赖 `revalidateTag('max')` 的 stale-while-revalidate，webhook 触发后首访可能显示上一版计数，二次访问自愈 —— server action 走 `updateTag` 无此延迟。）

**迭代三：Feed 分页 + 全文搜索（已验证）**：
- **Feed 分页**："加载更多"按钮（server action 取下一页、客户端 `PaginatedBlocks` 追加，按 `documentId` 去重防并发重叠），保住 SSR 首屏。首页/搜索共用同一分页组件与 `BlockCard`。
- **全文搜索 `/search`**：不引 Meilisearch 守护进程 —— Block 加 `searchText` 反规范化字段（[lifecycle](backend/src/api/block/content-types/block/lifecycles.ts) 从 Editor.js JSON 提取全部 paragraph/header/quote/list/caption 文本），用 `$containsi`（SQL `LIKE`）子串匹配。中文子串无需分词，`LIKE` 即正解；英文大小写不敏感。频道搜 `$or` 标题/描述。历史数据 bootstrap 幂等回填（`searchText $null` 才补，需解析 JSON 故走 document API 而非 SQL）。验证：搜正文深处词「侵略性」（不在 excerpt）命中 3、搜 caption 词命中、频道描述匹配命中。到搜索质量瓶颈再换 Meilisearch，前端接口形态不变。
- 字段派生逻辑抽到 [utils/derive-block-fields.ts](backend/src/utils/derive-block-fields.ts)，lifecycle 与 bootstrap 回填共用（此前 excerpt 逻辑在 lifecycle 内联，加 searchText 时顺手消重）。

**迭代二：探索页 `/explore`（已验证）**：公开频道发现，按最近活跃排序 —— connect 维护 `Channel.connectionCount` 时天然 touch `updatedAt`，免费拿到活跃度信号。缩略预览用一次 `$in` 批量查询 + 内存分组（3 格/频道），零 N+1。配套：`$in` 是 private 防护的新绕过面（迭代一只拦了 `$eq`），connection.find 现将两者统一收集、剔除非属主 private id；`connectionCount` 计数缓存 bootstrap 时以 `*_lnk` 表为准一条 SQL 幂等重算（顺带修复幽灵边清理造成的计数漂移）；Block 删除时同步递减被挂载频道的计数。

**MVP 后第一轮迭代（已验证）**：
- **Private 频道访问控制**（原为安全缺口）：channel `find`/`findOne` 对非属主隐藏 private（404 不暴露存在性）；connection `find` 堵两个泄漏面 —— 按频道过滤时 private 非属主 403、Block 侧栏 populate 时滤掉 private 边；`visibility`/`ownerName` 字段被服务端强制注入查询，客户端 `fields` 参数无法绕过过滤。建频道表单支持 公开/私密。
- **用户主页**：按反规范化平面字段 `creatorName`/`ownerName` 过滤（user 关系过滤被 users-permissions 禁止，平面字段再次立功）；全站用户名均可点击。
- **删除闭环**：Block（仅作者）与 Channel（仅属主）删除，控制器内显式清边并回滚 `connectionCount`，不留幽灵边；前端两击确认按钮（不用 confirm() 模态）。10 项 curl 验证 + 浏览器全流程通过，生产构建 12 条路由零错误。
补充的坑：users-permissions 禁止 `filters[owner][id]` 这类对 user 关系的过滤（user 字段私有），"我的频道"须从 `/users/me?populate[channels]` 反向取。
联调中修掉的坑：core routes/services 三件套不可省略（否则 405）；uid 字段在 content API 不自动生成（slug 服务端生成）；`Record<string, unknown>` 与 Strapi `JSONValue` 不兼容（用 `any`）；匿名请求下 user 关系被 sanitize（用 `connectorName`/`ownerName`/`creatorName` 反规范化）；**Strapi 不解析 DELETE 请求体**（disconnect 改 POST）；**Next 16 缓存 API 迁移**（Server Action 内用 `updateTag` 读己之写，Route Handler 用 `revalidateTag(tag, 'max')` = stale-while-revalidate，旧单参形式已废弃）；Strapi 返回的 `/uploads/*` 相对路径由 next.config `rewrites` 代理（DB 不落绝对域名）；cookie 里的失效 JWT 会让公共读 401 —— `strapiFetch` 对 GET 做匿名降级重试，否则坏 cookie = 访客整站 500；Turbopack 持久缓存偶发损坏导致全站 404（`rm -rf .next` 解决）。
`npm run build` 生产构建通过（11 条路由，TS 严格检查零错误）。
缓存失效：本站动作走 server action 的 `revalidateTag`；Strapi 侧变更（管理后台/脚本）走 `POST /api/revalidate?tag=channel:<slug>`（header `x-revalidate-secret`），可配成 Strapi Webhook。

## 4. 数据契约范例（Editor.js → Strapi）

**输入端**（`editor.save()` 原样产出，中间零转换）：

```json
{
  "time": 1751846400000,
  "version": "2.30.7",
  "blocks": [
    { "id": "oUq2g_tl8y", "type": "header", "data": { "text": "阳台种薄荷的三个教训", "level": 2 } },
    { "id": "zbGZFPM-iI", "type": "paragraph", "data": { "text": "薄荷根系有极强侵略性，<b>千万不要</b>和其他香草混栽。" } },
    { "id": "qYIGsjS5rt", "type": "image", "data": { "file": { "url": "/uploads/mint_9a3c.jpg" }, "caption": "第三周的状态" } }
  ]
}
```

**发布请求** `POST /api/blocks`（creator 由后端从 JWT 注入，前端传了也会被忽略）：

```json
{ "data": { "content": { "...上面的 OutputData 原样..." }, "blockType": "image" } }
```

**Strapi 响应**（注意 lifecycle 已生成的反规范化字段）：

```json
{
  "data": {
    "documentId": "wj2n8xo4l5c2bq9zki7ehmv0",
    "blockType": "image",
    "excerpt": "阳台种薄荷的三个教训",
    "coverImageUrl": "/uploads/mint_9a3c.jpg",
    "connectionCount": 0,
    "content": { "blocks": ["..."] },
    "creator": { "id": 12, "username": "userA" },
    "createdAt": "2026-07-07T02:40:00.000Z"
  }
}
```

**Connect 请求** `POST /api/connections/connect`：

```json
{ "blockId": "wj2n8xo4l5c2bq9zki7ehmv0", "channelId": "k3f9dh27slx0mqp5vt81nzy6" }
```

成功后 `revalidateTag("channel:{slug}")` 使目标 Channel 页的下一次渲染立即包含该 Block —— 原 Block 一个字节都没被复制或改写。

## 5. 性能与架构盲点审计（Blindspot Pass）

### 盲点 1：Strapi v5 的 `_lnk` 中间表在图查询下裸奔
Strapi 把每个 relation 存成独立的 link 表（`connections_channel_lnk` 等），"取 Channel 全部 Block" 是 connections → 两张 link 表 → blocks 的三跳 JOIN。Strapi 只给外键建默认索引，`position` 排序 + channel 过滤的组合路径没有覆盖，万级 Connection 后 Channel 页直接慢查询。
**对策（已实现，含一个实测踩坑）**：索引创建放在 [src/index.ts](backend/src/index.ts) 的 `bootstrap()` 而非 `database/migrations/` —— Strapi 首次启动时**先跑迁移、后同步表结构**，迁移里的 `hasTable()` 全部 false 静默跳过，且被记录为已执行永不重跑（我们第一版就这么翻车的，migrations 表里有记录、库里零索引）。bootstrap 在 schema 同步后运行，`IF NOT EXISTS` 保证幂等。已建：`pair_key` 唯一（并发重复 connect 的 DB 级兜底，schema 的 `unique: true` 对后加列不生效）、`position`、`created_at`、`connection_count`；`*_lnk` 关系表的 fk/uq 索引 Strapi v5 会自动创建。上线后用 `EXPLAIN ANALYZE` 验证 Channel 页查询走 Index Scan。

### 盲点 2：N+1 与 JSON 大字段拖垮网格页
天真实现是 populate 出每个 Block 的完整 `content` JSON 再在前端截取预览 —— 48 张卡片就是 48 份全文 JSON payload，外加 populate creator 的 N+1。
**对策（已实现）**：写时反规范化。lifecycle 在 Block 创建/更新时生成 `excerpt`（前 240 字符纯文本）与 `coverImageUrl`，网格页 [page.tsx](frontend/app/channel/[slug]/page.tsx) 只 `fields` 这两个平面字段，`content` JSON 只在 Block 详情页加载。缓存层用 Next.js fetch tag（`channel:{slug}`）+ connect 动作精确 `revalidateTag`，读多写少场景下命中率极高；到 10w 日活量级再在 Strapi 前加 Redis（键 = `channel:{documentId}:page:{n}`，connect 时 DEL）。

### 盲点 3：无主 Block 与幽灵边（引用完整性黑洞）
两个方向都会漏：(a) Block 被作者删除后，Strapi 只清 link 表、不删 Connection 行，Channel 里留下 `block: null` 的幽灵卡片；(b) Block 从所有 Channel 断开后成为无主孤儿，永远占存储且不可发现。
**对策（已实现 + 建议）**：(a) Block 的 `afterDelete` lifecycle 同步清除 `block: null` 的 Connection（[lifecycles.ts](backend/src/api/block/content-types/block/lifecycles.ts)）；(b) `connectionCount` 计数器缓存由 connect/disconnect 控制器维护，配一个每日 cron（Strapi `config/server.ts` 的 `cron.tasks`）扫 `connectionCount = 0 AND updatedAt < now() - 90d` 的 Block 做软删除归档，而不是物理删除 —— 生活记录类产品，用户找回旧内容的诉求远高于省磁盘。

## 6. iOS 采集策略（已定案：不起原生壳）

种子用户偏 iOS。决策：**PWA + iOS 快捷指令 + 剪贴板粘贴 + IndexedDB 离线队列**，不上 Capacitor —— 快捷指令能直接挂进系统分享菜单，以零发版成本拿到原生分享扩展 90% 的价值。

**采集链路四件套（已实现）：**

| 场景 | 路径 | 文件 |
| --- | --- | --- |
| 主屏幕点开即记 | PWA `start_url: /capture`，打开就是输入框 | [manifest.ts](frontend/app/manifest.ts) · [capture/page.tsx](frontend/app/capture/page.tsx) |
| 任意 App 分享菜单 | 快捷指令 POST `/api/capture`（文字/链接/照片） | [api/capture/route.ts](frontend/app/api/capture/route.ts) |
| 复制后快速粘贴 | 显式"📋 粘贴"按钮（iOS 要求用户手势内 readText） | [quick-capture.tsx](frontend/components/quick-capture.tsx) |
| 地铁断网 | IndexedDB 队列，online 事件 / 下次打开自动补发 | [offline-queue.ts](frontend/lib/offline-queue.ts) |

**快捷指令配置（发给种子用户的一次性设置，约 1 分钟）：**

1. 打开「快捷指令」→ 新建 → 添加动作「获取 URL 内容」。
2. URL 填 `https://<你的域名>/api/capture`，方法 POST，Headers 加 `Authorization: Bearer <登录后拿到的 JWT>`。
3. 请求体 JSON：`text` 取「快捷方式输入」；分享图片时先加「Base64 编码」动作，填入 `imageBase64`。
4. 详情页开启「在共享表单中显示」，接收类型勾选 文本 / URL / 图片。
5. 之后在任意 App（Safari、相册、微信长按文字）点系统分享 → 该快捷指令 → 内容直接成为 Block。

已知取舍：JWT 有效期默认 30 天（`plugins.ts` 里 users-permissions 的 `jwt.expiresIn` 可调到 `"365d"`，MVP 建议直接拉长）；快捷指令离线时会失败弹提示，离线兜底只覆盖 PWA 内采集 —— iOS Safari 不支持 Background Sync，这是平台边界而非实现缺口。图标资产需自备 `public/icons/icon-{192,512,512-maskable}.png`。

## 7. MVP 明确不做

协作 Channel（多人共同维护）、通知/关注流、全文搜索（等 Meilisearch）、Block 版本历史、嵌套 Channel（Channel connect Channel —— Are.na 有，但会让 MVP 的图查询复杂度翻倍）。
