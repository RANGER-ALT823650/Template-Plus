# 小小形象 · Little Shape Studio

根据两张参考截图制作的可复用形象模板：8 种轮廓 × 11 种颜色，白色眼睛位置固定，支持人类通过 GUI 编辑，也支持 Agent 通过 CLI 生成相同图形。

## 打开编辑器

需要 Node.js 20.9 或更新版本。首次运行：

从工作目录进入本项目 `Template-Plus/` 后执行以下命令；在工作目录根部也可以用 `npm --prefix Template-Plus start` 启动。

```sh
npm ci
npm start
```

浏览器访问 <http://127.0.0.1:4174>。端口被占用时运行 `npm start -- --port 4175`。服务仅监听本机地址，无外部字体、账户或网络服务。

点击图案和颜色即时预览。可以调整导出尺寸、画布留白与透明/白色背景，导出 SVG、PNG 和 WebP。棋盘格按钮只影响预览底色，文件背景由“画布背景”决定。SVG 不包含预览界面的选中边框。

“查看 88 种组合”展示完整组合，点选即可返回编辑器。“保存配置”导出 `avatar.json`，“导入配置”恢复形象。配置同时保存在浏览器本地，下次打开可接着创作；“重置”恢复棕色水滴。

## 命令行 / Agent

CLI 可在无浏览器环境运行。GUI 和 CLI 都调用 `src/avatar.js`，SVG 完全一致；PNG/WebP 分别由浏览器 Canvas 和 Sharp 光栅化，边缘抗锯齿可能存在极小差异。

```sh
# 机器可读的全部图案、颜色和色值
node cli.mjs list --json

# 生成 SVG / PNG / WebP，自动创建父目录
node cli.mjs render --shape drop --color brown --out output/avatar.svg
node cli.mjs render --shape cloud --color purple --size 2048 --out output/cloud.png
node cli.mjs render --shape circle --color teal --out output/circle.webp

# 读取 GUI 保存的配置；命令参数可覆盖配置字段
node cli.mjs render --config examples/avatar.json --out output/avatar.png --json

# 将 SVG 写入 stdout，适合管道操作
node cli.mjs render --shape hexagon --color blue --out - --format svg

# 一次导出所有 88 种组合，共 176 个图片文件及 manifest.json
node cli.mjs batch --out output/all --formats svg,png --size 512 --json
```

`--json` 在成功时输出一个 JSON 对象。失败时 stderr 输出 `{"ok":false,"error":"…"}`，退出码为 1。SVG stdout 模式不可同时使用 `--json`。默认生成透明背景；白底用 `--background white`。导出目录中的同名文件会被覆盖。

## 图案与颜色

图案顺序对应图一；水滴的最终轮廓与眼睛取自图二。

| ID | 图案 | ID | 图案 |
|---|---|---|---|
| circle | 圆形 | triangle | 圆角三角 |
| oval | 椭圆 | hexagon | 六边形 |
| square | 圆角方形 | cloud | 云朵 |
| capsule | 胶囊 | drop | 水滴 |

| ID | 颜色 | sRGB |
|---|---|---|
| black | 黑色 | #000000 |
| brown | 棕色 | #936439 |
| red | 红色 | #FF253C |
| orange | 橙色 | #FE6603 |
| yellow | 黄色 | #FE9800 |
| green | 绿色 | #00C972 |
| teal | 青色 | #00BCA6 |
| blue | 蓝色 | #1084FD |
| purple | 紫色 | #9158FE |
| pink | 粉色 | #FE309A |
| gray | 灰色 | #777777 |

原 PNG 带有 Display ICC 配置。以上数值为原图纯色区域转换为 sRGB 后的色值，不是直接读取未经转换的 RGB 字节。截图、屏幕色彩配置和矢量光栅化会影响像素观感；此模板是截图轮廓的矢量重建，不是原设计文件的数学路径。

眼睛由图二的两块白色区域重建，保持倾斜方向、相对大小与间距。各形象使用固定位置；三角形使用固定的向内偏移，以确保眼睛落在轮廓内部。眼睛颜色、位置、大小不属于可编辑配置。

## 配置格式

见 `avatar.schema.json` 和 `examples/avatar.json`。字段不允许额外扩展，方便 Agent 做确定性操作。

```json
{
  "version": 1,
  "shape": "drop",
  "color": "brown",
  "size": 1024,
  "padding": 16,
  "background": "transparent"
}
```

`size` 为 64–4096 的整数。`padding` 为 0–40 的百分比，表示画布最小留白；不同轮廓的宽高比保持不变。SVG 与 PNG 都是正方形画布。源图形体略不对称，留白数值存在小于一个原始像素的轮廓差异。

## 修改模板

- `src/reference-data.js`：截图重建后的矢量路径和 sRGB 色值。
- `src/avatar.js`：图案/颜色目录、配置验证、固定眼睛与 SVG 生成。
- `app.js` / `style.css` / `index.html`：GUI。
- `cli.mjs`：Agent 操作入口。
- `references/`：保留的两张原图、提取的轮廓与色值。

可将 `renderSVG(config)` 直接用于其他 JavaScript 应用。无需浏览器或 Sharp 即可生成 SVG 字符串。CLI 的 PNG/WebP 使用 [Sharp 官方输出接口](https://sharp.pixelplumbing.com/api-output/)。

重新提取参考图仅属于开发维护流程，需要 Python 的 Pillow、numpy，以及临时安装的矢量描摹工具：

```sh
npm install --no-save --package-lock=false potrace@2.1.8
python3 scripts/extract-reference.py
node scripts/trace-reference.mjs
# 还原运行依赖
npm ci
```

描摹工具不是运行模板所需的依赖。提取脚本利用截图抗锯齿信息做 4 倍采样，生成平滑 Bézier 曲线；不会修改保留的参考截图。

## 验证

```sh
npm test
```

验证参考掩码的轮廓重合度、全部 88 种组合的纯白眼睛、轮廓内位置、透明角像素、配置边界，以及 CLI 配置读取、SVG/PNG/WebP 实际文件、批量清单和错误退出码。实际 GUI 点击、配置恢复与下载检查的截图及文件保存于 `output/playwright/`。

本次在原截图分辨率下，8 种主体与提取掩码的交并比为 99.54%–99.90%，眼睛为 98.16%。详情见 `output/reference-fidelity.json`；这些数据衡量截图轮廓重建，不代表与不可用的原始设计矢量文件完全相同。
