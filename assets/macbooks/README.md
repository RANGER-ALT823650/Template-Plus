# MacBook 上盖机模

包含 Air 13 / 15 英寸、Pro 14 / 16 英寸和 Neo 13 英寸，16 个配色 SVG。

- `src/macbooks.js` 是 GUI、CLI、印刷导出和机模的共享尺寸 / 配色定义。`src/macbook-geometry.js` 保存各款校准轮廓与 Logo 外框。
- 每款目录内 `dimensions.json` 保存来源 URL、官方机身宽 / 深 / 厚、示意轮廓和配色。
- `plateau-cutout.svg` 是标称上盖画布；`mockups/*-rear.svg` 是合盖上盖俯视配色预览。
- `node scripts/build-macbook-mockups.mjs` 重建本目录的派生 SVG 和元数据，保留原有 iPhone 素材。

来源（2026-10-10 核对）：[Air](https://www.apple.com.cn/macbook-air/specs/)、[Pro](https://www.apple.com.cn/macbook-pro/specs/)、[Neo](https://www.apple.com.cn/macbook-neo/specs/)。官方公开机身宽深用作上盖标称范围，Logo 外框（含叶片）和圆角按各款官方俯视图校准；Neo 优先使用工程图矢量。官方图与 PDF 原件、SHA-256、像素框和推算过程位于 `sources/manifest.json` 和 `sources/calibration.json`。图片推算几何有约 0.5–1 mm 误差，等效 R 不是固定圆弧半径或官方尺寸标注；RGB 色泽与边缘光泽仍为示意。画布无开孔，Apple 标志不进入印刷；印切 PDF 仅含一条外轮廓刀线，实际裁切前应核对纸样。

这些资源仅添加至本地工作站，本次没有更新或发布 ChatGPT Sites。

使用 `python3 scripts/calibrate-macbook-geometry.py` 重建校准几何，需要 Pillow / numpy / scipy / opencv-python / pdfplumber；若 PDF 库在另一个解释器中，使用 `--pdf-python <解释器路径>`。之后运行机模构建脚本。画布虚线 Logo 占位与机模使用同一形状和毫米位置，默认显示、可关闭、不拦截指针，也不进入印刷输出。
