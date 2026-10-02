# Template Plus 云端版

此目录保留独立的 ChatGPT Sites 源码和部署配置。原 Template Plus 本地 Node.js 服务保持不变。

网页、素材导入和 PDF/SVG/PNG 导出都在浏览器执行。PDF 保留毫米尺寸、Artwork 和 CutContour 图层及专色；含滤镜 SVG 使用浏览器以 600 DPI 栅格化，外观可能与本地 Sharp 有细微差异。PNG 写入 600 DPI 元数据。布局保存在当前浏览器，不跨设备同步。

构建：`npm ci && npm run build`。静态产物位于 dist，源端适配位于 src。dist 中的界面和素材是上层项目的独立副本，后续修改需要同步。
