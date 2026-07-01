# 娃屋世界 2

移动优先的城市同行 Demo：玩家必须先创建具有独立 MBTI 人格的 AI 分身，再与分身作为两个角色共同探索高德真实地图。训练模式保证异地评审不中断，并始终与真实到访区分。

## 核心体验

1. 创建分身：16 种 MBTI、人格微调、外观独立替换、关系选择。
2. 同行地图：玩家定位光点与分身视觉跟随、高德真实底图、训练地图降级。
3. 共同决策：Coze 生成短观察；失败时明确使用同人格预置结果。
4. 记忆闭环：同行、建议、玩家确认、打卡、记忆碎片、虚拟物品、储物柜式娃屋。
5. 全量展示：分身日报、创造台、路线、挑战、明信片与隐私页。

## 本地运行

复制 `.env.example` 为 `.env.local`，只在本地填写：

- `NEXT_PUBLIC_AMAP_JS_KEY`
- `AMAP_JS_SECURITY_CODE`
- `AMAP_WEB_SERVICE_KEY`
- 可选的 Coze 与 PostgreSQL 平台变量

```bash
pnpm install
pnpm dev --port 60553
```

打开 `http://localhost:60553/`。拒绝位置权限即可走完整训练链路；训练数据不会标记为真实打卡。

## 验证

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm assets:validate
pnpm build
```

## 地图与密钥

公开 JS Key 仅用于加载高德 JS API。JS 安全密钥通过同源 `/_AMapService` 代理附加，Web Service Key 只在服务端调用周边搜索和步行路线。部署后需在高德控制台将 Coze 公网域名加入白名单。

## Coze 部署

仓库包含 `.coze`、预览脚本和部署脚本。生产健康检查要求 PostgreSQL、高德三项配置和 Coze 模型身份全部存在；生产环境不会退回文件存储。

验收接口：`/api/health`。它只返回集成是否配置，不返回密钥值。

## 设计与审查

- 96 个 Imagegen 素材清单：`public/assets/manifest.json`
- 视觉规范：`docs/assets/style-bible.md`
- 产品审查：`docs/reviews/product-adversarial-review.md`
- 工程审查：`docs/reviews/engineering-adversarial-review.md`
