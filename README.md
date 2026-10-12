# Template Plus · 贴纸工作站

独立于相邻 `Template/` 的本地工作站。原有形象编辑器、14 种轮廓、11 种参考颜色、固定白色眼睛、154 种组合、SVG / PNG / WebP、配置导入导出和原 CLI 全部保留。新的首页用于在 iPhone Air、17 / 18 Pro 与 Pro Max 平台底图，以及 MacBook Air / Pro / Neo 上盖上排版多个形象，再导出实际尺寸印切 PDF。

## 打开工作站

需要 Node.js 20.9 或更新版本。从本目录运行：

```sh
npm ci
npm start
```

打开 <http://127.0.0.1:4174>。顶部仅保留“贴纸”，形状与颜色直接在贴纸页操作；独立形象编辑器保留兼容地址 <http://127.0.0.1:4174/avatar.html>。也可以从上一级运行 `npm --prefix Template-Plus start`。端口被占用时用 `npm start -- --port 4175`。

原版 `Template` 仍使用端口 4173。两个项目的源码、依赖、导出和浏览器保存互相独立。工作站仅监听 `127.0.0.1`，无需账户、云服务或外部字体。

## 设计贴纸

1. 先在顶部选择 iPhone 或 MacBook 机型，再选择形象和颜色，点击“添加形象”。选中已有模板形象时，形状与颜色直接修改选中的形象。
2. 素材库内置 **Muse PNG 8 款、Muse SVG 9 款、Dots SVG 5 款、AI 标志 12 款（SVG 8 款、透明 PNG 4 款）**，共 34 个独立素材；选择系列后点击缩略图即可添加。Muse 默认使用透明 PNG。也可以通过“导入 SVG 形象”或“导入图片 JPG / PNG”载入自己的 SVG 或 PNG、JPG / JPEG、WebP、静态 GIF、单页 TIFF 素材；或在完整形象编辑器点击“将当前形象添加到贴纸排版”。完整编辑器的留白与透明 / 白色画布设置会随形象一起带入。
3. 在画布拖动形象移动位置，右下角方形控制点等比缩放，顶部圆点旋转。右侧可输入毫米坐标、画布宽度和角度。形象中心的坐标以平台底图左上角为原点，背面正视、镜头在左，无镜像。
4. 图层列表从上到下对应前到后，可复制、删除、置顶、置底。可撤销 / 重做，清空和替换示例均可撤销。点击画布形象后，方向键移动 0.1 mm，Shift + 方向键移动 1 mm，Ctrl / ⌘ Z 撤销，Ctrl / ⌘ Shift Z 重做。
5. 四款示例继承 iPhone-Air 已有排版数据。示例会按当前平台宽高映射中心位置；iPhone 保持原毫米尺寸，MacBook 按盖面比例等比放大图案。灰底、刀线、画布缩放只影响编辑预览。
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

刀线沿用现有标称几何，尚未加入机器公差、孔径补偿或出血。先按实尺寸出纸样核对位置；透明 PET 的白墨版和白色眼睛处理由供应商按工艺决定。排版允许形象重叠，边界 / 孔位会自动裁剪；右侧排版检查会提示重叠、间距不足和图片 DPI，不会阻止有意重叠的导出。

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

## MacBook 上盖机模（本地）

顶部机型菜单的 MacBook 分组新增 5 款，共 16 个配色机模：

|机型|上盖标称宽 × 深 / mm|颜色|
|---|---:|---|
|MacBook Air 13″|304.1 × 215.0|天蓝色、银色、星光色、午夜色|
|MacBook Air 15″|340.4 × 237.6|天蓝色、银色、星光色、午夜色|
|MacBook Pro 14″|312.6 × 221.2|深空黑色、银色|
|MacBook Pro 16″|355.7 × 248.1|深空黑色、银色|
|MacBook Neo 13″|297.5 × 206.4|银色、桃粉色、柑橘黄色、靛蓝色|

尺寸、颜色名称来自 2026-10-10 核对的 [Air 官方规格](https://www.apple.com.cn/macbook-air/specs/)、[Pro 官方规格](https://www.apple.com.cn/macbook-pro/specs/) 和 [Neo 官方规格](https://www.apple.com.cn/macbook-neo/specs/)。画布为合盖上盖俯视，坐标原点在左上角，无摄像头开孔，Apple 标志仅出现在机模预览中；图案可覆盖标志。机身宽深用于上盖标称范围。Logo 包含果身和叶片，尺寸与位置按各款官方俯视图校准，Neo 优先使用官方工程图矢量；完整 Logo 外框中心比盖子中心上移约 3.7–4.0 mm。Air / Pro 轮廓按官方图片拟合，Neo 轮廓按工程图矢量提取。图片推算值存在约 0.5–1 mm 误差，不是官方标注的 Logo / 圆角尺寸；RGB 色泽和边缘光泽仍为示意，实裁前请核对纸样。

MacBook 新增形象、素材库和单个 SVG / 图片导入会按盖面比例设置初始尺寸：普通素材约 55–66 mm 宽，新增模板形象约 46–55 mm 宽；四款示例使用同一比例放大各个图案。完整布局导入恢复原毫米尺寸，已有布局不会自动放大。

沿用保存 / 导入、撤销 / 重做、素材排版、整机预览及 PDF / SVG / 600 DPI PNG 导出。切换机型映射图案中心并保留毫米宽度；MacBook PDF 页面为上盖宽深各加 4 mm，仅一条外轮廓刀线。坐标范围扩展到 X / Y -100–500 mm、宽度 0.5–1000 mm，使居中、复制和铺满支持完整上盖。

画布默认显示虚线 Apple **Logo 占位**，点击工具栏“Logo 占位”可隐藏。它叠加在图案上方，不能被选中或拖动，不作为布局对象保存，也不进入 PDF / SVG / PNG 印刷导出；整机预览仍保留机身原有 Logo，图案可覆盖它。

|机型|Logo 外框宽 × 高 / mm（含叶片，推算值）|圆角对角附近等效 R / mm（非恒定圆弧）|
|---|---:|---:|
|Air 13″|约 36.9 × 45.4|约 10.8|
|Air 15″|约 37.7 × 46.8|约 10.9|
|Pro 14″|约 37.6 × 46.1|约 9.2|
|Pro 16″|约 37.5 × 46.1|约 9.5|
|Neo 13″|约 36.3 × 44.6|约 13.1|

同系列两种尺寸的圆角接近，不能从图片差异确认它们有不同的精确半径；Air、Pro、Neo 三个系列的轮廓则有区别。工作站不再统一使用 7 mm 二次曲线圆角，而是使用各款校准轮廓。

共享机型与 Logo 渲染定义位于 `src/macbooks.js`，派生几何位于 `src/macbook-geometry.js`。原始官方图片、[Neo 官方工程图](https://developer.apple.com/download/files/accessories/dimensional-drawings/macbook-neo.pdf)、来源 URL、SHA-256、图片像素框、拟合方法和结果保存在 `assets/macbooks/sources/`。`scripts/calibrate-macbook-geometry.py` 从保留的原始来源重建几何，需要 Pillow / numpy / scipy / opencv-python；可通过 `--pdf-python <含 pdfplumber 的 Python>` 单独指定 PDF 解释器。运行 `node scripts/build-macbook-mockups.mjs` 可按校准结果重建全部本地机模。此次变更仅在本地，没有更新 `cloud/` 或发布 ChatGPT Sites。

## 命令行

### AI 图案、Logo 避让与排版检查（本地）

- 左侧“＋ AI 图案”可填写提示词、指定透明背景，下载生成请求或复制给 Agent，再导入生成图片；提示词会随布局保存。生图能力来自 Agent 自身的图片生成工具或配置的 CLI 生成器，网页没有内置模型服务，没有能力时明确报告待处理请求。透明背景请求会验证真实 alpha，拒绝不透明底图。
- “新增时避让 Logo”默认开启，添加形象、素材、生成图片及载入示例时尝试避让 MacBook Logo。右侧“避让 Logo”可处理现有布局，保留素材、毫米大小、角度和层次，支持撤销；找不到空位时保留对象并提示。完整布局导入和手动拖动保持用户指定位置。
- 右侧自动检查图案重叠、图案 / Logo 间距、真实外轮廓与孔位间距，以及图片实际 DPI。默认间距 2 mm、最低 300 DPI，均可调整；提醒可点击选中对应对象，不强制改变构图或阻止导出。
- 图案重叠和图案之间的间距按实际渲染的 **alpha 可见区域**检查，忽略透明留白、内部镂空；支持内置形象、SVG、PNG 和旋转 / 缩放，白色背景会计入。网页与 CLI 使用同一服务端渲染及检查实现。alpha 至少 16/255 才计入，通常以约 0.083 mm 网格采样，超大素材受最长边 2048 px / 总计 100 万像素限制，报告附采样精度。Logo 避让、图案与 Logo / 外轮廓 / 孔位的间距仍按旋转后的素材画布矩形保守检查，Logo 按含叶片的外框处理。这没有为每个图案生成独立刀线或自动出血补偿。外轮廓采用保留的标称路径，仍需按实际材料、设备公差和供应商要求核对。

Agent 可自由先构图，再运行 `check` / `avoid-logo`、查看预览并交还布局；不必使用固定示例。文生图协议和生成器接入见 [CLI 使用说明](STICKER-CLI.md)。

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
- `assets/library/`：34 个独立素材副本和素材库目录。
- `src/export-pdf.mjs` / `src/export-png.mjs`：实际尺寸成品导出。
- `assets/iphone-air/`：原底图、尺寸和四款排版数据的独立副本；来源与几何说明见 [底图来源](assets/iphone-air/README.md)。原始官方 PDF 继续留在相邻 iPhone-Air 项目。
- `examples/`、`references/`、`scripts/`：保留原形象示例、只读参考和维护脚本。
- `output/`：Plus 自身的导出与检查文件。

```sh
npm test
```

测试覆盖154 种形象 / 参考轮廓 / 原 CLI，以及布局与 SVG 导入验证、孔位透明裁剪、PDF 毫米尺寸 / 双图层 / CutContour 专色 / 刀线打印关闭、PNG 像素与 DPI、新 CLI 的实际文件输出、Agent 创作 / 编辑 / 批处理 / stdin 管道 / 失败不落盘 / 整机预览，四款 Pro 的六孔裁剪和页面尺寸、各机型配色、JPG / WebP / GIF / TIFF 导入与 EXIF 方向、本地 API 的导入及多机型导出，以及全部 34 个素材的导入 / JSON 恢复 / PNG 和 PDF 输出、PNG 透明度、内部引用安全和机模毫米坐标。浏览器交互与下载检查位于 `output/playwright/`。

PDF 矢量转换使用 [PDFKit](https://pdfkit.org/docs/vector.html) 和 [SVG-to-PDFKit](https://github.com/alafr/SVG-to-PDFKit)。

界面右上角可切换中文 / English，选择会在浏览器记忆；说明文字收在 ⓘ 中，支持鼠标悬停、键盘聚焦和手机点击。语言只影响界面，不改写保存的布局、用户命名或尺寸数据。
