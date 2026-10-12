# 贴纸工作站 CLI · Agent 创作与修改

从 `Template-Plus/` 运行 `node sticker-cli.mjs`，或从工作区根目录运行 `npm --prefix Template-Plus run sticker -- <命令>`。Node.js 20.9+；不需要启动浏览器、服务器或云服务。原有 `cli.mjs` 继续负责单个形象。

## 查询 → 创作 → 修改 → 导出

```sh
node sticker-cli.mjs list --json
node sticker-cli.mjs create --model iphone-18-pro --name 我的贴纸 --out output/layout.json --json
node sticker-cli.mjs add --config output/layout.json --id buddy --shape drop --color brown --x 42 --y 16 --width 12 --rotation -15 --out output/layout.json --json
node sticker-cli.mjs add --config output/layout.json --id coffee --asset muse-png-04-coffee --x 50 --y 28 --width 10 --out output/layout.json --json
node sticker-cli.mjs inspect --config output/layout.json --json
node sticker-cli.mjs update --config output/layout.json --id buddy --x 40 --color blue --out output/layout-v2.json --json
node sticker-cli.mjs render --config output/layout-v2.json --out output/sticker.pdf --json
node sticker-cli.mjs preview --config output/layout-v2.json --phone-color glacierblue --out output/preview.png --json
```

`list` 返回命令、10 款机型（5 款 iPhone 和 5 款 MacBook）及毫米平台尺寸 / 孔数 / 机身颜色、14 种形状、11 种形象颜色、30 个内置素材 ID、4 款示例与操作字段。`create` 默认空布局；`--preset 1` 至 `4` 可从 GUI 同款示例开始，中心按机型比例映射；iPhone 保留原毫米宽度，MacBook 按盖面比例等比放大图案。

工作站顶部 **Agent / CLI** 提供当前布局下载、当前选中形象 ID 对应的命令和契约链接。GUI 保存的布局可交给 CLI；CLI 的布局 JSON 通过 GUI **导入布局** 打开，继续拖拽修改。文件交换不会自动改动浏览器中的当前设计或自动保存。

## 命令与字段

|命令|输入 / 选项|行为|
|---|---|---|
|`list`|`--json`|查询全部能力、素材、机型与颜色|
|`create`|`--model`、`--name`、`--preset 1..4`、`--ops`|新建空布局或示例，随后可批量创作|
|`inspect`|`--config`|输出对象 ID、图层、中心、宽高、角度、形象配置、PNG 像素与 DPI，省略素材正文|
|`validate`|`--config`|校验完整布局及内嵌素材|
|`check`|`--config`、间距 / DPI 选项、可选 `--strict`|报告图案重叠、Logo / 外轮廓 / 孔位间距和低 DPI；不修改布局|
|`avoid-logo`|`--config`、可选 `--ids` / 间距选项|尝试移动挡住 Logo 的对象，保持尺寸、角度和图层；找不到位置时报错，不写出布局|
|`generate`|`--prompt` 或 `--request`、可选 `--generator` / `--opaque`|无生成器时创建 Agent 生图请求；配置生成器时输出实际 PNG|
|`add`|`--id`、素材来源、位置与尺寸|添加对象，默认平台中心、iPhone 宽 12 mm / MacBook 按盖面比例约 55–66 mm、旋转 0°（指定 width 时保留指定值）；未指定 ID 时生成 UUID|
|`update`|`--id`、素材来源或任意位置与尺寸字段|部分更新；ID、图层与未指定字段保留，可替换素材类型|
|`duplicate`|`--id`、`--new-id`、任意位置与尺寸字段|复制到最前；默认偏移 1.5 mm，可显式设置新位置与名称|
|`remove`|`--id`|删除指定对象；未知 ID 报错|
|`front` / `back`|`--id`|置顶 / 置底|
|`reorder`|`--ids a,b,c`|从后到前重排，必须包含每个 ID 各一次|
|`center` / `cover`|`--id`|居中 / 按比例铺满平台；cover 将角度设为 0°，孔位按原几何裁剪|
|`model`|`--model`|切换机型，按平台比例映射对象中心，保留毫米宽度|
|`rename`|`--name`|修改布局名称|
|`clear`|无额外选项|清空对象|
|`apply`|`--config`、`--ops`|顺序执行操作数组，全部通过校验后才写出布局|
|`render`|`--config`、`--out`、可选 `--format`|PDF / SVG / 600 DPI PNG；未指定 config 保留原默认示例|
|`preview`|`--config`、`--out`、可选 `--phone-color`|含内嵌机模的整机 SVG / 150 DPI PNG，独立于印刷图案|

编辑与新建命令使用 `--out <布局 JSON>`；**不会自动写回输入文件**。同一 `--config` / `--out` 路径表示明确覆盖，其他路径保留旧版。写文件使用临时文件及原子替换；整批任一步失败都不会写出结果。

共同对象字段是 `--name`、`--x`、`--y`、`--width`、`--rotation`。中心坐标以平台左上角为原点，单位 mm，背面正视、镜头在左；宽度是素材画布宽度，角度单位度。支持 `--rotation -15` 或 `--rotation=-15`。数组与 `reorder` 均从后到前，GUI 图层列表显示相反顺序。

素材来源三选一：

- `--asset <ID>`：复用 `list` 中的本地内置素材。
- `--file <路径>`：SVG、PNG、JPG / JPEG、WebP、静态 GIF、单页 TIFF，沿用 GUI 的安全校验、EXIF 方向纠正和 alpha 保留。图片转换为内嵌 PNG，布局不再依赖源文件。
- `--avatar-config <形象 JSON>`：直接读取形象编辑器保存的配方。`--shape`、`--color`、`--size`、`--padding`、`--background` 可覆盖配方；无素材来源时默认添加模板形象，padding 为 0。

更新模板形象时只改指定配方字段，其他配方字段保留；`--avatar-config` 表示换用新配方，配方缺失字段使用形象编辑器的默认值。更新对象始终保留原名称，可用 `--name` 改名。图片或 SVG 不能直接设置形象颜色，需替换源素材。`size` 是形象配方分辨率，实际排版大小由 `width` 控制。

## 一次提交多步操作

操作数组可由 Agent 直接生成，无需脚本拼接一串 CLI。JSON 字段与 CLI 相同，`newId` 对应 `--new-id`，`ids` 是字符串数组，`config` 是形象配方对象（CLI 的 `--config` 则是布局文件）。不允许未知操作或未知字段。

```json
[
  {"op":"add","id":"buddy","shape":"cloud","color":"pink","x":42,"y":17,"width":12},
  {"op":"add","id":"coffee","asset":"muse-png-04-coffee","x":51,"y":28,"width":10},
  {"op":"update","id":"buddy","rotation":-15,"color":"blue"},
  {"op":"duplicate","id":"buddy","newId":"buddy-copy","x":32,"y":28,"width":8},
  {"op":"back","id":"coffee"},
  {"op":"rename","name":"Agent 的贴纸"}
]
```

```sh
node sticker-cli.mjs create --model iphone-18-pro --ops examples/sticker-agent-operations.json --out output/agent-layout.json --json
node sticker-cli.mjs apply --config output/layout.json --ops operations.json --out output/revised.json --json
node sticker-cli.mjs apply --config output/layout.json --ops operations.json --dry-run --json
```

`--dry-run` 校验完整结果并返回 `design`，不写任何文件，即使同时指定 `--out`。单条编辑、新建也支持预检。JSON 操作文件中的 `file` 路径相对操作文件所在目录；`--file` 命令行参数及 stdin 操作中的路径相对当前工作目录。内置素材永远相对项目位置查找，因此 CLI 脚本可从其他目录调用。

## 管道与返回值

`--config -` 或 `--ops -` 或 `--avatar-config -` 从 stdin 读取 JSON；每次只能有一个输入使用 stdin。布局 `--out -` 输出原始 JSON，便于串联，无额外成功报告，即使使用 `--json`。

```sh
node sticker-cli.mjs create --out - |
  node sticker-cli.mjs add --config - --id buddy --shape drop --color brown --out - |
  node sticker-cli.mjs update --config - --id buddy --rotation -15 --out output/pipeline.json --json
node sticker-cli.mjs render --config output/pipeline.json --out - --format svg > output/pipeline.svg
```

成功退出码 0。加 `--json` 时 stdout 单个 JSON 报告，例如：

```json
{"ok":true,"out":"/absolute/path/layout.json","model":"iphone-air","name":"我的贴纸","objects":1,"ids":["buddy"]}
```

失败退出码 1，stderr 为 `{"ok":false,"error":"…"}`；批量错误包含 1 起算的操作序号。`inspect` 输出 `objects` 数组及 `layer` 索引，其他报告的 `objects` 为数量。SVG stdout 不可与 `--json` 合用；PDF / PNG 需写文件。

## 契约与限制

布局契约见 [sticker.schema.json](sticker.schema.json)，操作契约见 [sticker-operations.schema.json](sticker-operations.schema.json)。CLI `validate` 还会检查重复 ID、SVG 安全子集、PNG 内容、机型和完整布局大小。所有创作与导出共用 GUI 的 `normalizeDesign`、渲染器和毫米几何；居中、铺满与机型映射也共用实现。

最多 100 个对象、1000 步操作、32 MB JSON；SVG 最大 200 KB，图片 5 MB、最长边 8192 px、最多 3200 万像素。宽 0.5–1000 mm，X / Y -100–500 mm，旋转 -360–360°。名称上限：布局 80 字符，对象 100 字符。PDF 保留毫米页面、独立 Artwork / CutContour、专色刀线及刀线默认不打印；CLI 不更改原有印切契约。

MacBook 示例：`node sticker-cli.mjs create --model macbook-neo --preset 1 --out output/macbook-neo-layout.json --json`；预览可用 `--phone-color blush`。各机型颜色 ID 由 `list --json` 查询，上盖尺寸 / 示意圆角说明见 README。

CLI 已覆盖素材生成 / 导入、毫米排版、批量编辑、机模预览和印切文件输出。Agent 可以自由构图，随后运行检查与 Logo 避让；CLI 没有审美构图算法、逐像素碰撞分析或自动出血补偿。跨机型批量导出可由 shell / Agent 循环调用，当前没有贴纸 `batch` 命令。`cli.mjs batch` 仅生成单个形象的全部形状与颜色组合。

## 文生图：原生 Agent 工具或生成器适配器

```sh
node sticker-cli.mjs generate --prompt "戴耳机的橘猫，水彩风格" --out output/image-request.json --json
```

没有 `--generator` 时返回 `status: needs-agent`，输出的是请求 JSON，**不是图片**。请求包含原提示词、透明背景要求、图片大小限制和 Agent 工作流。Agent 若支持原生生图，调用自己的生图工具生成独立贴纸图片；不支持时明确告知，不能用占位图冒充生成结果。

生成后导入（真实 PNG 图片由 Agent 保存到 `output/cat.png`）：

```sh
node sticker-cli.mjs add --config output/layout.json --id cat --file output/cat.png --generation-request output/image-request.json --width 55 --x 70 --y 70 --out output/layout-v2.json --json
```

`--generation-request`（批量 JSON 为 `generationRequest`）须与图片 `file` 一起使用；提示词及透明背景要求保存在 PNG 对象的 `generation` 字段，位置修改、复制、GUI 保存 / 导入均保留。替换为其他素材时移除原生成信息。请求文件最大 32 KB，提示词最多 4000 字符。默认要求真实透明 alpha；不透明图片会被拒绝。确需不透明背景时，在首次创建请求加 `--opaque`。

若有能调用模型的本地生成器适配器，可直接执行：

```sh
node sticker-cli.mjs generate --request output/image-request.json --generator '["python3","my_image_generator.py"]' --out output/cat.png --json
```

适配器协议：CLI 将完整请求 JSON 写入生成器 stdin；生成器调用其可用生图模型，将图片保存到本地，然后在 stdout 返回单个 JSON `{"file":"/absolute/path/to/result.png"}`。日志写 stderr；退出码非 0 表示失败。`--generator` 是可信可执行程序的 argv 数组，不经 shell 展开；请求文件不能指定可执行程序。超时 180 秒，stdout 上限 1 MB，输出沿用 5 MB / 8192 px / 3200 万像素的导入约束并转换为 PNG。生成失败、不满足透明要求、无能力或超时时不写出假图片，不覆盖原输出。提供 `--dry-run` 可查看请求而不调用生成器、不写文件。当前没有默认配置的模型服务或 API 密钥。

## 检查和 Logo 避让

```sh
node sticker-cli.mjs check --config output/layout-v2.json --clearance 2 --edge-clearance 2 --hole-clearance 2 --min-dpi 300 --json
node sticker-cli.mjs avoid-logo --config output/layout-v2.json --clearance 2 --out output/layout-v3.json --json
node sticker-cli.mjs check --config output/layout-v3.json --strict --json
```

检查默认图案 / Logo 间距、外轮廓间距、孔位间距各 2 mm，最低 DPI 为 300。间距可设 0–50 mm，最低 DPI 可设 0–2400（0 关闭 DPI 检查）。`check` 返回 `clear`、分类统计 `summary`、带对象 ID 的 `issues`、旋转后的画布范围（用于平台检查）、采样精度与 Logo 外框；重叠代码为 `overlap`，其余为 `object-clearance`、`logo-clearance`、`edge-clearance`、`hole-clearance`、`low-dpi`。负的边界 / 孔位距离表示进入裁切区；毫米值四舍五入至 0.001。

正常检查退出码 0（提醒不是执行错误）；加 `--strict` 且有提醒时退出码 2，报告仍是 `ok: true`，供 Agent 判断和调整。无效输入退出码 1。导出不自动阻断，允许有意重叠或铺满。图案重叠和图案之间的间距使用渲染后的 alpha 可见区域（`method: visible-alpha-mask`），透明留白和内部镂空不计入，白色背景计入；alpha 阈值为 16/255，通常按约 0.083 mm 网格采样，最长边最多 2048 px / 总计 100 万像素，各对象 `resolutionMm` 表示采样精度。图案与 Logo / 外轮廓 / 孔位的检查仍使用旋转后的画布矩形（`platformMethod: rotated-canvas-bounds`），Logo 避让仍按含叶片的外框保守处理，外轮廓按保留路径、孔位按标称圆形计算。报告中的 `footprint` 保留画布范围，并非图案可见轮廓。结果不验证独立图案刀线间距、材料公差或出血。

`avoid-logo` 默认检查全部对象，只有侵入 Logo / 间距的对象移动；可用 `--ids cat,coffee` 限定对象。寻找接近原位置、符合 Logo / 外轮廓 / 孔位间距且不与其他画布范围相碰的位置，保持素材、尺寸、角度、ID 和图层顺序。空间不足时报错而不缩小图案、不写出部分布局。无 Logo 的 iPhone 是不改位置的操作。支持 `--dry-run` 和批量操作：

```json
[{"op":"avoid-logo","ids":["cat"],"clearance":3,"edgeClearance":2,"holeClearance":2}]
```

Logo 避让不负责消除所有现有图案重叠，也不保证审美最优；Agent 应查看 `check` 与整机预览，再调整或交给用户微调。
