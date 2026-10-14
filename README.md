# 网站开源

个人网站的开源合集。

## 生活灵感实验室 · Life Spark

把无聊玩出花：按时间和心情，抽一张马上能玩的生活灵感卡。趣味测试、行动清单、收藏与分享。

- **纯静态**，零依赖：HTML + CSS + 原生 JS，无框架、无构建
- **生活导航**：32 个精选条目（好用网站 / 实用 App / 在线工具 / 书影音），搜索框实时过滤，磁贴直达外链
- **9 张灵感卡**：独处充电 / 探索日常 / 一起玩，含免费与付费档位
- **手绘 SVG 插画**：全部卡片插画均为内联矢量图，主视觉小图置于页脚
- **完整功能**：按心情/时间/预算抽卡、收藏（localStorage）、系统分享、下载 PNG 灵感卡、三题色彩小测试
- **窗口玻璃风**：macOS 窗口框 + 毛玻璃 + 图标磁贴；灰白/暗黑双模式自动跟随系统，可手动切换
- **细节**：响应式（760px/460px/370px 断点）、`prefers-reduced-motion`、ARIA、走马灯丝带、外链 `rel="noopener"`

## 目录结构

```
sites-plugin-sites-openai-curated-remote/
├── work/life-spark/
│   ├── dist/            # 站点（部署目录）
│   │   ├── index.html
│   │   ├── style.css    # 全部样式
│   │   ├── app.js       # 交互逻辑与灵感卡数据
│   │   ├── art.js       # 卡片 SVG 插画
│   │   └── assets/      # 主视觉插画
│   ├── assets-src/      # 原始素材归档（旧版紫色照片，未部署）
│   ├── check-v3.cjs     # 站点校验脚本
│   └── serve.cjs        # 本地预览服务器
└── outputs/             # 部署快照（v2-v6）
```

## 本地预览

```bash
cd sites-plugin-sites-openai-curated-remote/work/life-spark
node serve.cjs        # 默认 http://localhost:4173
```

校验：`node check-v3.cjs`

## 版本快照

| 版本 | 体积 | 说明 |
|---|---|---|
| v2 | 12 KB | 无图初版 |
| v3 | 2.5 MB | + 紫色照片 |
| v4 | 369 KB | 图片压缩、favicon、社交分享卡 |
| v5 | 67 KB | 视觉精修 + 手绘 SVG 主视觉 |
| v6 | 68 KB | 预算卡、测试平局修正、下载卡片含插画 |
| v7 | 70 KB | 窗口玻璃双模式 + 生活导航 32 条目 + 深色舒适化 |
