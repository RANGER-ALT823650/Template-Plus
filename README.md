# Template Plus · 贴纸工作站

独立于相邻 `Template/` 的本地工作站。原有形象编辑器、14 种轮廓、11 种参考颜色、固定白色眼睛、154 种组合、SVG / PNG / WebP、配置导入导出和原 CLI 全部保留。新的首页用于在 iPhone Air、17 / 18 Pro 与 Pro Max 平台底图上排版多个形象，再导出实际尺寸印切 PDF。

## 打开工作站

需要 Node.js 20.9 或更新版本。从本目录运行：

```sh
npm ci
npm start
```

打开 <http://127.0.0.1:4174>；完整形象编辑器为 <http://127.0.0.1:4174/avatar.html>。也可以从上一级运行 `npm --prefix Template-Plus start`。端口被占用时用 `npm start -- --port 4175`。

原版 `Template` 仍使用端口 4173。两个项目的源码、依赖、导出和浏览器保存互相独立。工作站仅监听 `127.0.0.1`，无需账户、云服务或外部字体。

## 设计贴纸

1. 先在顶部选择 iPhone 机型，再选择形象和颜色，点击“添加形象”。选中已有模板形象时，形状与颜色直接修改选中的形象。
2. 素材库内置 **Muse PNG 8 款、Muse SVG 9 款、Dots SVG 5 款、AI Logo SVG 8 款**，共 30 个独立素材；选择系列后点击缩略图即可添加。Muse 默认使用透明 PNG。也可以通过“导入 SVG 形象”或“导入图片 JPG / PNG”载入自己的 SVG 或 PNG、JPG / JPEG、WebP、静态 GIF、单页 TIFF 素材；或在完整形象编辑器点击“将当前形象添加到贴纸排版”。完整编辑器的留白与透明 / 白色画布设置会随形象一起带入。
3. 在画布拖动形象移动位置，右下角方形控制点等比缩放，顶部圆点旋转。右侧可输入毫米坐标、画布宽度和角度。形象中心的坐标以平台底图左上角为原点，背面正视、镜头在左，无镜像。
4. 图层列表从上到下对应前到后，可复制、删除、置顶、置底。可撤销 / 重做，清空和替换示例均可撤销。点击画布形象后，方向键移动 0.1 mm，Shift + 方向键移动 1 mm，Ctrl / ⌘ Z 撤销，Ctrl / ⌘ Shift Z 重做。
5. 四款示例继承 iPhone-Air 已有排版数据。示例会按当前平台宽高映射中心位置，形象保持毫米尺寸。灰底、刀线、画布缩放只影响编辑预览。
6. “保存布局”导出 JSON，包含所有形象素材和位置，同时保存所选机型（`model`）；没有 `model` 的旧布局继续按 Air 打开。切换机型会按平台比例映射图案中心，保持毫米宽度，支持撤销。之后可以重新导入。浏览器会自动保存；更换浏览器、端口、清理站点数据前请下载布局。浏览器通过 IndexedDB 保存较大的 PNG 布局，兼容原有小布局的 localStorage 保存。撤销历史最多 60 步、48 MB，较大图片布局可能保留更少步骤。
7. 画布下方的“整机背面预览”实时套用当前透明贴纸。Air 保留天蓝色、深空黑色、云白色、浅金色；17 Pro / Pro Max 提供银色、星宇橙色、深蓝色；18 Pro / Pro Max 提供黑色、银色、冰川蓝色、勃艮第酒红色。颜色选择按机型记忆于当前浏览器。机模按各自官方工程图尺寸及平台孔位绘制，外观和 RGB 色泽为近似示意；机模不会进入印刷导出。

形象宽度指 SVG 画布宽度，不是彩色主体包围框；完整编辑器的 padding 会影响画布内主体大小。导入 SVG 按 viewBox 保持宽高比例，最大 200 KB；支持纯色路径、分组、基本矢量图元、透明度、变换、内部线性 / 径向渐变及 Muse 使用的柔和滤镜。拒绝脚本、外部资源、文字、CSS、任意图片及 SVG 引用；只允许经验证的内部渐变 / 滤镜引用。不同素材实例的 ID 会隔离，避免渐变与滤镜串色。

图片导入最大 5 MB、最长边 8192 px、最多 3200 万像素；自动纠正 JPEG EXIF 方向，保留 alpha 和原图宽高比例；静态图片统一转换为内嵌 PNG，转换后的 PNG 也须在 5 MB 内，位置面板显示像素尺寸及当前实际 DPI。“铺满平台”会将选中图案居中并保持比例放大到覆盖整个平台，再裁剪外边界和孔位；可继续拖动、缩放或旋转调整构图。布局 JSON 最大 32 MB，图片以 PNG data URL 内嵌，保存后不依赖来源文件或服务器路径。

## 成品格式

### 印刷 + 裁切 PDF

- 一页，按所选平台的实际尺寸输出，四边各留 2 mm。Air 页面仍为 **69.1568924 × 27.5286084 mm**；其余机型见下表。
- **Artwork - PRINT**：透明的矢量形象、白色眼睛和内嵌 PNG 素材，按真实平台外轮廓和所有孔位裁剪，不印灰色预览底图。若形象配置选择白色画布，该形象的白色画布会保留。
- **CutContour - CUT ONLY - DO NOT PRINT**：独立图层，`CutContour` 洋红专色，0.1 mm 线宽，外轮廓及全部孔位（Air 三孔，Pro 六孔含三镜头、闪光灯、麦克风和 LiDAR）。PDF 图层打印状态为 OFF，屏幕显示为 ON。
- 使用 **100% 实际尺寸** 输出，勿适应页面。图层可在支持 OCG 的软件中独立开关；导入或扁平化软件可能忽略打印状态，供应商应按 CutContour 专色分离刀线。

刀线沿用现有标称几何，尚未加入机器公差、孔径补偿或出血。先按实尺寸出纸样核对位置；透明 PET 的白墨版和白色眼睛处理由供应商按工艺决定。排版允许形象重叠，边界 / 孔位会自动裁剪；工作站没有自动检查工艺安全间距。

### SVG / PNG

SVG 是透明印刷图案，毫米尺寸，无刀线，PNG 素材作为内嵌图片保留。PDF 保留无滤镜 SVG 的矢量与渐变；PNG 保持原像素，含滤镜 SVG 按排版尺寸以 600 DPI 转成透明图像，刀线仍是独立矢量。PNG 是同样的透明图案，600 DPI，Air 为 **1539 × 556 px**；其他机型按各自平台毫米尺寸换算像素，写入 DPI 元数据。导出不包含选中框、编辑控制点或灰底。

示例：`output/pdf/iphone-air-template-plus-print-and-cut.pdf`；可恢复布局：`examples/iphone-air-layout.json`。


## 机型与尺寸来源

新增底图按 [Apple 官方工程图](https://developer.apple.com/accessories/dimensional-drawings/)第 1 张图的 Detail D 提取顶部平面最内侧矢量轮廓，以左侧两个镜头的官方中心间距校准。孔位及直径使用工程图标注。平台宽高和左上角位置属于轮廓推导值，不是直接标注尺寸；18 Pro 右下方局部片段被尺寸线打断，使用完整左下片段对称重建，记录在尺寸 JSON 中。

|机型|平台宽 × 高 / mm|PDF 页面宽 × 高 / mm|孔数|
|---|---:|---:|---:|
|iPhone Air|65.1569 × 23.5286|69.1569 × 27.5286|3|
|iPhone 17 Pro|61.6808 × 37.8044|65.6808 × 41.8044|6|
|iPhone 17 Pro Max|67.8088 × 37.8044|71.8088 × 41.8044|6|
|iPhone 18 Pro|61.6033 × 37.7286|65.6033 × 41.7286|6|
|iPhone 18 Pro Max|67.7312 × 37.7268|71.7312 × 41.7268|6|

原始 PDF 保存在 `assets/phones/sources/`，每款底图、来源 URL、SHA-256、孔位、标称机身尺寸和推导方法在 `assets/phones/<机型>/dimensions.json`；生成脚本为 `scripts/build-pro-plateaus.py`（需要 pdfplumber）和 `scripts/build-pro-mockups.mjs`。17 配色参考 [Apple 官方规格](https://support.apple.com/zh-cn/125090)，18 配色参考 [Apple 官方规格](https://www.apple.com.cn/iphone-18-pro/specs/)。云端版本位于 `cloud/`，同样提供五款机型与全部形象轮廓。

## 命令行

原形象 CLI 保持原命令与契约，详细说明见 [形象编辑器使用说明](AVATAR-README.md)：

```sh
node cli.mjs list --json
node cli.mjs render --shape drop --color brown --out output/avatar.svg
node cli.mjs batch --out output/all --formats svg,png --json
```

贴纸 CLI 支持新建、查询素材、导入本地 SVG / 图片、按 ID 修改位置 / 尺寸 / 形象配方、复制删除与图层重排、机型切换、JSON 批量操作、预检及 PDF / SVG / PNG 导出。整机预览可导出 SVG / PNG，无需启动服务器。GUI 顶部的 **Agent / CLI** 可下载当前布局与复制命令。完整契约与操作示例见 [贴纸 CLI 使用说明](STICKER-CLI.md)。

```sh
node sticker-cli.mjs list --json
node sticker-cli.mjs create --model iphone-18-pro --ops examples/sticker-agent-operations.json --out output/agent-layout.json --json
node sticker-cli.mjs update --config output/agent-layout.json --id buddy --x 40 --rotation -15 --out output/revised.json --json
node sticker-cli.mjs preview --config output/revised.json --phone-color glacierblue --out output/preview.png --json
```

CLI 可读写 GUI 的同一布局 JSON，通过“保存布局 / 导入布局”交换：

```sh
node sticker-cli.mjs render --config examples/iphone-air-layout.json --out output/pdf/my-sticker.pdf --json
node sticker-cli.mjs render --config iphone-air-layout.json --out output/my-sticker.svg
node sticker-cli.mjs render --config iphone-air-layout.json --out output/my-sticker.png
```

导出到同名路径会覆盖既有文件，请为不同版本使用不同文件名。

## 文件归属与验证

- `src/avatar.js` 和 `src/reference-data.js`：原形象 GUI / CLI 的共享渲染实现。
- `avatar.html` / `app.js` / `style.css`：保留的完整形象编辑器。
- `index.html` / `workstation.js` / `workstation.css`：排版工作站。
- `sticker-cli.mjs` / `src/sticker-edit.mjs` / `sticker.schema.json` / `sticker-operations.schema.json`：Agent 查询、创作、批量修改、CLI 与 JSON 契约。
- `src/design.js` / `src/phones.js` / `src/pro-geometry.js` / `src/svg-import.js` / `src/png-import.js` / `src/image-import.mjs`：共享排版与安全素材导入契约。
- `src/layout-store.js`：IndexedDB 自动保存及旧布局兼容。
- `src/mockup.js` / `assets/iphone-air/mockups/`：Air 四种机身配色及背面示意机模；Pro 素材和原始工程图位于 `assets/phones/`。
- `assets/library/`：30 个独立素材副本和素材库目录。
- `src/export-pdf.mjs` / `src/export-png.mjs`：实际尺寸成品导出。
- `assets/iphone-air/`：原底图、尺寸和四款排版数据的独立副本；来源与几何说明见 [底图来源](assets/iphone-air/README.md)。原始官方 PDF 继续留在相邻 iPhone-Air 项目。
- `examples/`、`references/`、`scripts/`：保留原形象示例、只读参考和维护脚本。
- `output/`：Plus 自身的导出与检查文件。

```sh
npm test
```

测试覆盖154 种形象 / 参考轮廓 / 原 CLI，以及布局与 SVG 导入验证、孔位透明裁剪、PDF 毫米尺寸 / 双图层 / CutContour 专色 / 刀线打印关闭、PNG 像素与 DPI、新 CLI 的实际文件输出、Agent 创作 / 编辑 / 批处理 / stdin 管道 / 失败不落盘 / 整机预览，四款 Pro 的六孔裁剪和页面尺寸、各机型配色、JPG / WebP / GIF / TIFF 导入与 EXIF 方向、本地 API 的导入及多机型导出，以及全部 30 个素材的导入 / JSON 恢复 / PNG 和 PDF 输出、PNG 透明度、内部引用安全和机模毫米坐标。浏览器交互与下载检查位于 `output/playwright/`。

PDF 矢量转换使用 [PDFKit](https://pdfkit.org/docs/vector.html) 和 [SVG-to-PDFKit](https://github.com/alafr/SVG-to-PDFKit)。

界面右上角可切换中文 / English，选择会在浏览器记忆；说明文字收在 ⓘ 中，支持鼠标悬停、键盘聚焦和手机点击。语言只影响界面，不改写保存的布局、用户命名或尺寸数据。
