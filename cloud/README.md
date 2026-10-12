# Template Plus 云端版

此目录保留独立的 ChatGPT Sites 源码和部署配置。原 Template Plus 本地 Node.js 服务保持不变。

网页、素材导入和 PDF/SVG/PNG 导出都在浏览器执行。形象编辑器支持 14 种轮廓 × 11 种颜色；新增轮廓来自保留的 2026-10-08 形状截图。支持 Air、17 / 18 Pro 与 Pro Max 五款机型、34 款素材、图片按比例铺满平台和 Agent / CLI 布局交换。PDF 使用所选机型的毫米尺寸、完整孔位、Artwork 和 CutContour 图层及专色；含滤镜 SVG 使用浏览器以 600 DPI 栅格化，外观可能与本地 Sharp 有细微差异。PNG 按所选机型尺寸生成，写入 600 DPI 元数据。布局保存在当前浏览器，不跨设备同步，旧布局默认 Air。

图片导入支持 PNG、JPG / JPEG、WebP、静态 GIF、单页 TIFF，统一保留为内嵌 PNG。浏览器解码 JPEG 方向，TIFF 使用 UTIF 解码及方向校正；沿用 5 MB、8192 px、3200 万像素限制。

构建：`npm ci && npm run build`。静态产物位于 dist，源端适配位于 src。dist 中的界面和素材是上层项目的独立副本，后续修改需要同步。

界面支持中文 / English 切换，选择保存在浏览器，并在工作站与形象编辑器间共享。ⓘ 说明可悬停、键盘聚焦或点击查看。`npm run build` 自动同步上层项目的网页、共享模块和素材，再生成浏览器 API；不再需要手工同步 dist。
