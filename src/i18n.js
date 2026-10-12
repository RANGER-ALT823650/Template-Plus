// Interface translations only. Saved recipes, user names and geometry stay intact.
const EN = {
  'AI 图案':'AI artwork','＋ AI 图案':'+ AI artwork','图案描述':'Describe the artwork','要求透明背景':'Require a transparent background','下载生成请求':'Download generation request','复制给 Agent':'Copy for agent','导入生成图片':'Import generated image','新增时避让 Logo':'Avoid logo when adding',
  '描述想要的图案，将请求交给支持生图的 Agent。生成后导入图片，可继续排版。':'Describe your artwork and give the request to an agent with image generation. Import the result to continue editing.',
  '生图能力由 Agent 或 CLI 生成器提供；不支持时会明确告知。':'Image generation comes from your agent or CLI generator; unavailable capabilities are reported explicitly.',
  '请使用你的生图工具生成以下图案，保留透明背景（如要求），保存到本地并通过 Template Plus CLI 导入。若不支持生图请告知。':'Use your image generation tool for the following artwork. Preserve transparency if requested, save it locally and import it with the Template Plus CLI. Report if image generation is unavailable.',
  '生成请求已复制。':'Generation request copied.','已导入生成图片，提示词随布局保存。':'Generated image imported; its prompt is saved with the layout.',
  '排版检查':'Layout checks','排版检查说明':'Layout check help','间距 / mm':'Clearance / mm','最低 DPI':'Minimum DPI','检查排版':'Check layout','避让 Logo':'Avoid logo','检查通过':'Checks passed','{count} 项提醒':'{count} warnings',
  '图案重叠':'Artwork overlaps','图案间距不足':'Artwork clearance','Logo 间距不足':'Logo clearance','外轮廓间距不足':'Edge clearance','孔位间距不足':'Hole clearance','图片分辨率偏低':'Low image resolution','更多提醒请用 CLI check 查看。':'Use CLI check for the remaining warnings.',
  '已移动 {count} 个图案，{unresolved} 个未找到位置。':'Moved {count} objects; {unresolved} could not be placed.',
  '图案重叠与图案间距按可见部分检查，忽略透明留白和镂空；白色背景计入。Logo、外轮廓和孔位仍按画布范围保守检查。':'Artwork overlap and spacing use visible regions, ignoring transparent padding and holes; white backgrounds count. Logo, edge and hole checks still use conservative canvas bounds.',
  'Logo 占位':'Logo guide','上盖 Apple Logo 的位置与大小参考，仅用于排版，不进入导出。':'Apple logo position and size reference for layout only; excluded from exports.',
  '设备机型':'Device model','不支持的机型':'Unsupported model','上盖 · 合盖俯视':'Lid · closed, top view',
  '{model} {color}上盖贴纸预览':'{model} {color} lid sticker preview',
  'MacBook 上盖按官方宽深及官方图轮廓校准；Logo 占位仅供排版参考，不进入导出。图片推算尺寸，实裁前请核对纸样。':'The MacBook lid uses official dimensions and calibrated top-view outlines. The logo guide is excluded from exports. Image-derived geometry; check a paper template before cutting.',
  '星光色':'Starlight','午夜色':'Midnight','桃粉色':'Blush','柑橘黄色':'Citrus','靛蓝色':'Indigo',
  '我的贴纸':'My sticker','贴纸':'Stickers','形象':'Avatars','贴纸工作站':'Sticker studio','形象编辑器':'Avatar studio','机型':'Model','iPhone 机型':'iPhone model','平台尺寸':'Panel dimensions','形象说明':'Avatar help','图案':'Shape','颜色':'Color','＋ 添加形象':'+ Add avatar','↑ SVG':'↑ SVG','↑ 图片':'↑ Image','素材':'Assets','素材说明':'Asset help','素材系列':'Asset collection','素材库':'Asset library','AI 标志':'AI logos','全部':'All','点击素材即可添加。':'Click an asset to add it.','示例':'Presets','示例说明':'Preset help','画布':'Canvas','贴纸排版画布':'Sticker canvas','撤销':'Undo','重做':'Redo','撤销 Ctrl / ⌘ Z':'Undo · Ctrl / ⌘ Z','重做 Ctrl / ⌘ Shift Z':'Redo · Ctrl / ⌘ Shift Z','底色':'Base','刀线':'Cut line','画布说明':'Canvas help','背面 · 镜头在左':'Rear · camera on left','缩放':'Zoom','画布缩放':'Canvas zoom','操作说明':'Controls','图层':'Layers','图层说明':'Layer help','复制':'Duplicate','置顶':'Bring to front','置底':'Send to back','删除':'Delete','整机预览':'Device preview','机模说明':'Preview help','机身颜色':'Device color','查看官方颜色与尺寸':'Official colors and dimensions','收起机模':'Hide preview','展开机模':'Show preview','调整':'Adjust','坐标说明':'Position help','选择一个形象':'Select an avatar','名称':'Name','X / mm':'X / mm','Y / mm':'Y / mm','宽 / mm':'Width / mm','旋转 / °':'Rotation / °','尺寸说明':'Size details','铺满':'Cover','居中':'Center','导出':'Export','印刷说明':'Print help','设计名称':'Design name','↓ 印切 PDF':'↓ Print & cut PDF','↓ SVG':'↓ SVG','↓ PNG':'↓ PNG','↓ 保存':'↓ Save','↑ 打开':'↑ Open','清空':'Clear','命令行':'Command line','关闭':'Close','↓ 下载布局':'↓ Download layout','复制命令':'Copy commands','使用说明 ↗':'CLI guide ↗','布局契约 ↗':'Layout schema ↗','操作契约 ↗':'Operation schema ↗','预览':'Preview','形象预览':'Avatar preview','预览底色':'Preview background','浅色预览':'Light preview','棋盘格预览':'Checkerboard preview','随机组合':'Random combination','其他组合推荐':'More combinations','全部组合 ↗':'All combinations ↗','全部组合':'All combinations','导出说明':'Export help','尺寸':'Size','背景':'Background','透明':'Transparent','白色':'White','留白':'Padding','＋ 添加到贴纸':'+ Add to sticker','重置':'Reset','更多命令':'More commands','点击形象继续编辑。':'Click an avatar to edit it.',
  '使用命令行继续编辑布局':'Continue editing this layout with the CLI','使用命令行继续编辑形象':'Continue editing this avatar with the CLI',
  '图片支持 PNG、JPG、WebP、静态 GIF 和单页 TIFF，最大 5 MB。':'PNG, JPG, WebP, static GIF and single-page TIFF. Maximum 5 MB.',
  '载入示例会替换当前排版，可撤销。':'Loading a preset replaces this layout. You can undo it.',
  '上方图层显示在最前。':'The top layer appears in front.',
  '拖动移动 · 角点缩放 · 顶部圆点旋转。方向键移动 0.1 mm，Shift + 方向键移动 1 mm。':'Drag to move. Drag the corner to resize or the top dot to rotate. Arrow keys move 0.1 mm; Shift + arrows move 1 mm.',
  '贴纸实时套用到机模。机模按官方尺寸绘制，色泽近似，不参与印刷导出。':'Your sticker updates live on the device. The mockup uses official dimensions and approximate colors; it is excluded from print exports.',
  '坐标以平台左上角为原点，单位为毫米。':'Coordinates are in millimeters from the top-left corner of the panel.',
  '保持宽高比例，覆盖整个平台并裁剪边界和孔位。':'Keep the aspect ratio, cover the panel and clip its edges and holes.',
  'PDF 含独立印刷层与 CutContour 专色刀线，四边留 2 mm，刀线打印默认关闭。请按 100% 实际尺寸输出，实裁前核对纸样。':'PDF includes separate artwork and CutContour spot-color layers, with 2 mm margins. Cut-line printing is off by default. Print at 100% actual size and check a paper sample before cutting.',
  '透明图案，600 DPI，不含底色、刀线与机模。':'Transparent artwork at 600 DPI. Base, cut lines and phone mockup are excluded.',
  '下载布局，在 Template-Plus 目录运行命令；修改后打开 JSON 继续编辑。':'Download the layout and run these commands in Template-Plus. Open the edited JSON to continue here.',
  '纯色轮廓与固定白色眼睛。SVG 可无限缩放，PNG 与 WebP 按所选像素尺寸导出。':'Solid shapes with fixed white eyes. SVG scales freely; PNG and WebP use the selected pixel size.',
  '在 Template-Plus 目录运行命令，导出当前形象。':'Run this command in Template-Plus to export the current avatar.',
  '图案与颜色会应用于选中的形象。':'Shape and color changes apply to the selected avatar.',
  '选图案与颜色，再添加到画布。':'Choose a shape and color, then add it to the canvas.',
  '{count} 个形象':'{count} objects','选择 {name}':'Select {name}','添加 {name} {type}':'Add {name} {type}',
  '画布高 {height} mm · 宽高比例锁定':'Height {height} mm · aspect ratio locked',' · 此形象带白色画布':' · white avatar background',' · 原图 {w} × {h} px · {dpi} DPI':' · source {w} × {h} px · {dpi} DPI',
  '灰底仅供预览。成品透明；外边界与 {count} 个孔位自动挖空。':'The base is for preview only. Exports are transparent, with the outline and all {count} holes clipped.',
  '{model} 贴纸，拖动形象调整位置':'{model} sticker. Drag objects to position them.',
  '{model} {color}整机背面贴纸预览':'{model} {color} rear sticker preview','示例 {n}':'Preset {n}',
  '白色眼睛':'White eyes','正在自动保存…':'Saving…','已自动保存于此浏览器':'Saved locally','自动保存于此浏览器':'Saved in this browser','自动保存不可用，请下载布局文件':'Save unavailable — download your layout',
  '已载入排版 {n}':'Preset {n} loaded','已导入 SVG，保持矢量与宽高比例。':'SVG imported. Vector data and aspect ratio preserved.',
  '已导入图片，保持比例与透明度；可点击“铺满平台”。':'Image imported. Use Cover to fill the panel.',
  '已添加 {name}':'Added {name}','布局已保存，包含形象素材和位置。':'Layout saved with assets and positions.','已保存布局，交给 Agent 后可重新导入。':'Layout saved. Open the edited JSON to continue.',
  '命令已复制。':'Commands copied.','复制不可用，请手动选取命令。':'Select and copy the commands manually.','复制不可用，请手动选取上方命令。':'Select and copy the command manually.',
  '已恢复布局。':'Layout restored.','已导出 {format}。':'{format} exported.','已导出 {format}，含独立印刷层和刀线层。':'{format} exported with separate artwork and cut-line layers.',
  '导入失败：{error}':'Import failed: {error}','导出失败：{error}':'Export failed: {error}','自动保存的布局无法读取：{error}':'Saved layout could not be read: {error}',
  '已将形象编辑器中的小伙伴添加到排版。':'Avatar added to the layout.','已使用默认配置：保存的配置无法读取。':'Saved settings could not be read. Defaults loaded.',
  '已导出 {name}':'Exported {name}','已保存配置，可在 GUI 和 CLI 中重复使用。':'Settings saved for the editor and CLI.','已恢复形象配置。':'Avatar settings restored.','已恢复参考图的棕色水滴。':'Default brown drop restored.',
  '圆形':'Circle','椭圆':'Oval','圆角方形':'Rounded square','胶囊':'Capsule','圆角三角':'Rounded triangle','六边形':'Hexagon','云朵':'Cloud','水滴':'Drop','四角星':'Sparkle','四叶花':'Clover','爱心':'Heart','六瓣花':'Flower','五边形':'Pentagon','六角星':'Star',
  '黑色':'Black','棕色':'Brown','红色':'Red','橙色':'Orange','黄色':'Yellow','绿色':'Green','青色':'Teal','蓝色':'Blue','紫色':'Purple','粉色':'Pink','灰色':'Gray',
  '天蓝色':'Sky blue','深空黑色':'Space black','云白色':'Cloud white','浅金色':'Light gold','银色':'Silver','星宇橙色':'Cosmic orange','深蓝色':'Deep blue','冰川蓝色':'Glacier blue','勃艮第酒红色':'Burgundy',
  'SVG 必须小于 200 KB':'SVG must be smaller than 200 KB','图片最大 5 MB':'Images must be no larger than 5 MB','布局文件超过 32 MB':'Layout exceeds 32 MB','配置文件超过 16 KB':'Settings file exceeds 16 KB','请求失败':'Request failed','读取图片失败':'Could not read the image','素材读取失败':'Could not read the asset','素材目录加载失败':'Could not load the asset library','浏览器无法创建画布':'Could not create a canvas','此浏览器不支持 {format} 导出':'This browser cannot export {format}',
  '配置必须是 JSON 对象':'Settings must be a JSON object','不支持的配置版本':'Unsupported settings version','尺寸必须是 64–4096 的整数':'Size must be an integer from 64 to 4096','留白必须是 0–40 的百分比':'Padding must be from 0 to 40 percent','背景必须是 transparent 或 white':'Background must be transparent or white','不支持的 iPhone 机型':'Unsupported iPhone model',
  '布局须为 version 1，最多 100 个形象':'Use layout version 1 with up to 100 objects','布局名称须小于 80 字符':'Layout name must be under 80 characters','形象 ID 无效或重复':'Invalid or duplicate object ID','形象类型或名称无效':'Invalid object type or name',
  '图片最大边长 8192，最多 3200 万像素':'Images are limited to 8192 pixels per side and 32 megapixels','请导入静态单帧图片':'Use a static, single-frame image','请导入单页 TIFF':'Use a single-page TIFF','支持 PNG、JPG / JPEG、WebP、静态 GIF 和 TIFF':'Use PNG, JPG, WebP, static GIF or TIFF','图片转为 PNG 后超过 5 MB，请缩小原图再导入':'Converted PNG exceeds 5 MB. Reduce the source image size.',
  'PNG 须为内嵌图片，最大 5 MB':'Use an embedded PNG up to 5 MB','PNG 编码无效':'Invalid PNG encoding','无效的 PNG 文件':'Invalid PNG file','PNG 最大边长 8192，最多 3200 万像素':'PNG is limited to 8192 pixels per side and 32 megapixels','PNG 数据不完整':'Incomplete PNG data','PNG 文件头无效':'Invalid PNG header','PNG 文件尾无效':'Invalid PNG ending','请导入静态 PNG':'Use a static PNG','GIF 数据不完整':'Incomplete GIF data','GIF 数据无效':'Invalid GIF data',
  'SVG 不支持 XML 指令或外部实体':'SVG directives and external entities are unsupported','SVG XML 格式无效':'Invalid SVG XML','无效的 SVG 文件':'Invalid SVG file','SVG 节点过多':'Too many SVG nodes','SVG ID 无效或重复':'Invalid or duplicate SVG ID','SVG 命名空间无效':'Invalid SVG namespace','SVG 只支持内部渐变与滤镜引用':'SVG supports internal gradient and filter references only','SVG 滤镜须为内部引用':'SVG filters must use internal references','请将 SVG 颜色转为纯色':'Convert SVG colors to solid fills','SVG 包含不支持的节点':'Unsupported SVG node','SVG 渐变或滤镜引用无效':'Invalid SVG gradient or filter reference','SVG 需要有效的 viewBox 或像素宽高':'SVG needs a valid viewBox or pixel dimensions',
};
const ASSET_EN = {'主形象':'Main character','跑步机':'Treadmill','戴耳机敲电脑':'Headphones & laptop','喝咖啡':'Coffee','读书':'Reading','浇花':'Watering','气球':'Balloon','打游戏':'Gaming','犯困':'Sleepy','画画':'Painting','粉色耳机公仔':'Pink headphones','蓝色贝雷帽公仔':'Blue beret','黄色圆框眼镜公仔':'Yellow glasses','绿色大眼公仔':'Green eyes','玫红爱心墨镜公仔':'Magenta heart sunglasses','打招呼':'Hello','跑步机':'Treadmill','耳机办公':'Headphones & laptop','喝咖啡':'Coffee','阅读':'Reading','园艺':'Gardening','绘画':'Painting','睡觉':'Sleeping','办公':'Laptop','浇花':'Watering','气球':'Balloon','游戏':'Gaming','粉色耳机':'Pink headphones','蓝色贝雷帽':'Blue beret','黄色眼镜':'Yellow glasses','绿色大眼睛':'Green eyes','洋红爱心':'Magenta heart'};
let language='zh';
try { language=localStorage.getItem('template-plus-language')==='en'?'en':'zh'; } catch {}
export const getLanguage=()=>language;
export function t(key,values={}) { return (language==='en'?(EN[key]??key):key).replace(/\{(\w+)\}/g,(_,name)=>String(values[name]??'')); }
export function displayName(name) {
  if(language!=='en')return name;
  if(EN[name]||ASSET_EN[name])return EN[name]??ASSET_EN[name];
  for(const [zh,en] of Object.entries(ASSET_EN))if(name.endsWith(' · '+zh))return name.slice(0,-zh.length)+en;
  const colors=['黑色','棕色','红色','橙色','黄色','绿色','青色','蓝色','紫色','粉色','灰色'];
  const shapes=['圆形','椭圆','圆角方形','胶囊','圆角三角','六边形','云朵','水滴','四角星','四叶花','爱心','六瓣花','五边形','六角星'];
  for(const color of colors)for(const shape of shapes)if(name===color+shape)return EN[color]+' '+EN[shape];
  if(name.endsWith(' 副本'))return displayName(name.slice(0,-3))+' copy';
  return name.replace(/排版 (0[1-4])$/,'Preset $1');
}
export function errorText(error) {
  const message=error.message??String(error);
  if(language!=='en')return message;
  if(EN[message])return EN[message];
  const range=message.match(/^(.+)须在 (.+) 之间$/);if(range)return `${({'中心 X':'Center X','中心 Y':'Center Y','画布宽':'Width','旋转角度':'Rotation','SVG 比例':'SVG ratio'}[range[1]]??'Value')} must be between ${range[2]}`;
  const unknown=message.match(/^未知(配置项|图案|颜色)：(.+)$/);if(unknown)return `Unknown ${({'配置项':'setting','图案':'shape','颜色':'color'}[unknown[1]])}: ${unknown[2]}`;
  const svg=message.match(/^不支持 SVG (元素|属性) (\S+)[；;]/);if(svg)return `Unsupported SVG ${svg[1]==='元素'?'element':'attribute'}: ${svg[2]}`;
  // Browser/platform errors are already localized by the browser. Prevent a Chinese
  // backend message from leaking into English UI while retaining details in console.
  if(/[\u3400-\u9fff]/.test(message)){console.warn(message);return 'Check the file or values and try again.';}
  return message;
}
export function initI18n(onChange) {
  const bubble=document.createElement('div');bubble.id='ui-tooltip';bubble.className='ui-tooltip';bubble.setAttribute('role','tooltip');bubble.setAttribute('popover','manual');bubble.hidden=true;document.body.append(bubble);
  let active=null;
  const helpText=el=>el.dataset.helpTarget?document.getElementById(el.dataset.helpTarget)?.textContent:el.dataset.helpText??t(el.dataset.help);
  function hide(){if(active){active.removeAttribute('aria-describedby');delete active.dataset.tipPinned;}active=null;if(bubble.matches(':popover-open'))bubble.hidePopover();bubble.hidden=true;}
  function show(el){const text=helpText(el);if(!text)return;hide();active=el;bubble.textContent=text;bubble.hidden=false;if(bubble.showPopover)bubble.showPopover();el.setAttribute('aria-describedby',bubble.id);const r=el.getBoundingClientRect(),w=bubble.offsetWidth,h=bubble.offsetHeight;bubble.style.left=`${Math.max(8,Math.min(r.left+r.width/2-w/2,innerWidth-w-8))}px`;bubble.style.top=`${Math.max(8,r.bottom+h+16<innerHeight?r.bottom+8:r.top-h-8)}px`;}
  const selector='[data-help],[data-help-target],[data-help-text]';
  document.addEventListener('pointerover',e=>{const el=e.target.closest(selector);if(el&&active!==el)show(el);});
  document.addEventListener('pointerout',e=>{if(active?.contains(e.target)&&!active.contains(e.relatedTarget)&&!bubble.contains(e.relatedTarget))hide();});
  bubble.addEventListener('pointerleave',hide);
  document.addEventListener('focusin',e=>{const el=e.target.closest(selector);if(el)show(el);else hide();});
  document.addEventListener('focusout',e=>{if(active?.contains(e.target))hide();});
  document.addEventListener('click',e=>{const el=e.target.closest('.help');if(el){e.stopPropagation();if(active===el&&el.dataset.tipPinned){delete el.dataset.tipPinned;hide();}else{show(el);el.dataset.tipPinned='true';}}else if(!bubble.contains(e.target))hide();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')hide();});
  window.addEventListener('resize',hide);window.addEventListener('scroll',hide,true);
  function apply(){hide();document.documentElement.lang=language==='en'?'en':'zh-CN';document.title='Template Plus · '+t(document.getElementById('canvas')?'贴纸工作站':'形象编辑器');document.querySelectorAll('[data-i18n]').forEach(el=>{el.textContent=t(el.dataset.i18n);});document.querySelectorAll('[data-i18n-aria]').forEach(el=>el.setAttribute('aria-label',t(el.dataset.i18nAria)));const toggle=document.getElementById('language-toggle');toggle.textContent=language==='en'?'中文':'EN';toggle.setAttribute('aria-label',language==='en'?'切换到中文':'Switch to English');toggle.lang=language==='en'?'zh-CN':'en';}
  apply();
  document.getElementById('language-toggle').onclick=()=>{language=language==='en'?'zh':'en';try{localStorage.setItem('template-plus-language',language);}catch{}apply();onChange();};
  window.addEventListener('storage',e=>{if(e.key==='template-plus-language'){language=e.newValue==='en'?'en':'zh';apply();onChange();}});
}
export function localizeSVG(root){
  // Keep original metadata so labels can switch back without re-rendering artwork.
  root.querySelectorAll('svg[aria-label],svg title').forEach(el=>{
    const original=el.dataset.originalLabel??(el.tagName==='title'?el.textContent:el.getAttribute('aria-label'));
    el.dataset.originalLabel=original;
    const label=original.split(' · ').map(displayName).join(' · ');
    if(el.tagName==='title')el.textContent=label;else el.setAttribute('aria-label',label);
  });
}
