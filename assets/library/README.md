# 内置素材库

`catalog.json` 包含 30 个独立素材，供 Plus 本地服务器按白名单提供。

- `muse-png/`：相邻 `muse/png/` 的 8 张透明 PNG（默认系列）。
- `muse-svg/`：相邻 `muse/` 的 9 个独立 SVG，包括其渐变和柔和滤镜。
- `ai-logos-svg/`：用户提供的 Gemini、GLM、Kimi、Qwen、Grok、DeepSeek、Claude、OpenAI 图片轮廓转成的 8 个 SVG；透明外部背景，沿 Logo 外轮廓增加最长边 3% 的白色等距边框，内侧负形保留白色。GLM、Kimi、Grok 为黑色主体，Kimi 蓝点保留；Claude 为橙色主体，其他保留原配色。Gemini 使用拟合原图的平滑矢量渐变。
- `dots-svg/`：相邻 `dots/` 的 5 个独立 SVG，保留渐变矢量。

仅复制独立素材，没有导入总览、参考图片或 originals 的重复原图；没有改写来源。可从 Plus 目录运行 `node scripts/import-library.mjs` 更新独立副本及目录。

PNG 按原像素、透明度内嵌进布局。SVG 保留经共享安全导入器验证的内部渐变和滤镜。PDF 中滤镜 SVG 在该对象的实际排版尺寸下以 600 DPI 栅格化；Dots 等没有滤镜的 SVG 保持矢量。图片不影响独立矢量刀线。

AI Logo 原图独立保存在 `references/ai-logos/`，不依赖 Downloads 中的文件。维护转换：先运行 `python3 scripts/prepare-ai-logos.py`（需要 numpy、OpenCV、scipy），再运行 `node scripts/trace-ai-logos.mjs` 和 `node scripts/import-library.mjs`；中间蒙版保存在 `output/ai-logos/`。最终 SVG 无内嵌位图、滤镜或外部资源，PDF 导出保持矢量。
