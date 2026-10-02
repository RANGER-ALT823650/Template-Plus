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

`list` 返回命令、5 款机型及毫米平台尺寸 / 孔数 / 机身颜色、8 种形状、11 种形象颜色、30 个内置素材 ID、4 款示例与操作字段。`create` 默认空布局；`--preset 1` 至 `4` 可从 GUI 同款示例开始，中心按机型比例映射，毫米宽度保留。

工作站顶部 **Agent / CLI** 提供当前布局下载、当前选中形象 ID 对应的命令和契约链接。GUI 保存的布局可交给 CLI；CLI 的布局 JSON 通过 GUI **导入布局** 打开，继续拖拽修改。文件交换不会自动改动浏览器中的当前设计或自动保存。

## 命令与字段

|命令|输入 / 选项|行为|
|---|---|---|
|`list`|`--json`|查询全部能力、素材、机型与颜色|
|`create`|`--model`、`--name`、`--preset 1..4`、`--ops`|新建空布局或示例，随后可批量创作|
|`inspect`|`--config`|输出对象 ID、图层、中心、宽高、角度、形象配置、PNG 像素与 DPI，省略素材正文|
|`validate`|`--config`|校验完整布局及内嵌素材|
|`add`|`--id`、素材来源、位置与尺寸|添加对象，默认平台中心、宽 12 mm、旋转 0°；未指定 ID 时生成 UUID|
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

最多 100 个对象、1000 步操作、32 MB JSON；SVG 最大 200 KB，图片 5 MB、最长边 8192 px、最多 3200 万像素。宽 0.5–150 mm，X -100–165 mm，Y -100–124 mm，旋转 -360–360°。名称上限：布局 80 字符，对象 100 字符。PDF 保留毫米页面、独立 Artwork / CutContour、专色刀线及刀线默认不打印；CLI 不更改原有印切契约。
