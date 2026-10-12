"""Compose six Template Plus Air designs at 1:1 on a 99.9 mm square."""
from pathlib import Path
import io, json, re, hashlib, shutil, os
from pypdf import PdfReader, PdfWriter
from pypdf.generic import ContentStream, NameObject, DecodedStreamObject, DictionaryObject, ArrayObject, TextStringObject
from reportlab.pdfgen import canvas
from reportlab.lib.colors import CMYKColor

ROOT=Path(__file__).resolve().parents[1]
REVISION=os.environ.get('AIR_SHEET_REVISION')=='v2'
OUT=ROOT/('output/air-square-20261002-v2' if REVISION else 'output/air-square-20261002')
MM=72/25.4
SIZE=99.9
RECORD=json.loads((OUT/'design-verification.json').read_text())
PW,PH=RECORD['plateau_mm']
LEFT=RECORD['frame_left_mm']
FW=PW-LEFT
DEST=OUT/'output/pdf'/('iPhone-Air-镜头贴纸-9.99cm-6款-v2-避让核对.pdf' if REVISION else 'iPhone-Air-镜头贴纸-9.99cm-6款.pdf')
DEST.parent.mkdir(parents=True,exist_ok=True)
ICLOUD=Path('/Users/mayifan/Library/Mobile Documents/com~apple~CloudDocs')/DEST.name
assert not DEST.exists() and not ICLOUD.exists(), 'Choose a new output name to preserve previous PDFs'

def tag(pg,key):
    stream=DecodedStreamObject()
    stream.set_data(b'/OC /'+key.encode()+b' BDC\n'+pg.get_contents().get_data()+b'\nEMC\n')
    pg[NameObject('/Contents')]=stream

def art_only(source):
    reader=PdfReader(source);pg=reader.pages[0]
    stream=ContentStream(pg.get_contents(),reader)
    kept=[];skip=False
    for args,op in stream.operations:
        if op==b'BDC' and args[0]=='/OC':
            skip='CutContour' in str(args[1]);continue
        if op==b'EMC':skip=False;continue
        if not skip:kept.append((args,op))
    stream.operations=kept
    pg[NameObject('/Contents')]=stream
    pg['/Resources'].pop(NameObject('/Properties'),None)
    return reader,pg

# Trace the actual Air perimeter to the right of the camera, closing at LEFT.
svg=(ROOT/'assets/iphone-air/iphone-air-plateau-cutout.svg').read_text()
outline=re.search(r'<path[^>]+d="([^"]+)"',svg).group(1).split(' Z')[0]
points=[(float(x),float(y)) for x,y in re.findall(r'[ML]\s+([\d.]+),([\d.]+)',outline)]
run=[]
for a,b in zip(points,points[1:]+points[:1]):
    ina,inb=a[0]>=LEFT,b[0]>=LEFT
    if not ina and not inb:continue
    if ina!=inb:
        t=(LEFT-a[0])/(b[0]-a[0]);cross=(LEFT,a[1]+t*(b[1]-a[1]))
        aa,bb=(a,cross) if ina else (cross,b)
    else:aa,bb=a,b
    if not run:run.append(aa)
    assert abs(run[-1][0]-aa[0])+abs(run[-1][1]-aa[1])<1e-5
    run.append(bb)
assert len(run)>30 and abs(run[0][0]-LEFT)<1e-6 and abs(run[-1][0]-LEFT)<1e-6
dim=json.loads((ROOT/'assets/iphone-air/dimensions.json').read_text())
camera=dim['local_holes_name_x_y_diameter_mm'][0]
camera_right=camera[1]+camera[3]/2
max_length=PW-camera_right
# Include the printed outline stroke in the horizontal extent.
assert FW+.12<=max_length
assert LEFT-.06>camera_right

writer=PdfWriter();page=writer.add_blank_page(SIZE*MM,SIZE*MM)
buf=io.BytesIO();lines=canvas.Canvas(buf,pagesize=(SIZE*MM,SIZE*MM),pageCompression=1)
lines.setStrokeColor(CMYKColor(0,0,0,.55));lines.setLineWidth(.12*MM)
lines.setLineJoin(1);lines.setLineCap(1)
mx=(SIZE-2*FW-3)/2
my=(SIZE-3*PH-2*5)/2
items=[];readers=[]
for i,record in enumerate(RECORD['items']):
    x=mx+(i%2)*(FW+3)
    top=my+(i//2)*(PH+5)
    bottom=SIZE-top-PH
    reader,art=art_only(OUT/'sources'/f"{record['stem']}.pdf");readers.append(reader)
    tag(art,f'Art{i}')
    page.merge_translated_page(art,(x-LEFT-2)*MM,(bottom-2)*MM)
    p=lines.beginPath()
    for k,(px,py) in enumerate(run):
        (p.moveTo if k==0 else p.lineTo)((x+px-LEFT)*MM,(SIZE-top-py)*MM)
    p.close();lines.drawPath(p,stroke=1,fill=0)
    assert x-.06>0 and x+FW+.06<SIZE and top-.06>0 and top+PH+.06<SIZE
    items.append({'theme':record['name'],'objects':record['object_count'],'model':'iphone-air','source':record['stem']+'.json','frame_top_left_on_page_mm':[x,top],'frame_width_height_mm':[FW,PH],'scale':1,'rotation':0})
lines.showPage();lines.save()
reader=PdfReader(io.BytesIO(buf.getvalue()));readers.append(reader)
linepage=reader.pages[0];tag(linepage,'LocatorLine');page.merge_page(linepage)

def layer(name):
    return writer._add_object(DictionaryObject({NameObject('/Type'):NameObject('/OCG'),NameObject('/Name'):TextStringObject(name),NameObject('/Usage'):DictionaryObject({NameObject('/View'):DictionaryObject({NameObject('/ViewState'):NameObject('/ON')}),NameObject('/Print'):DictionaryObject({NameObject('/PrintState'):NameObject('/ON')})})}))
artlayer=layer('Artwork - PRINT');linelayer=layer('LocatorLine - PRINT - 0.12 mm gray')
props=DictionaryObject({NameObject(f'/Art{i}'):artlayer for i in range(6)})
props[NameObject('/LocatorLine')]=linelayer
page['/Resources'][NameObject('/Properties')]=props
layers=ArrayObject([artlayer,linelayer])
writer._root_object[NameObject('/OCProperties')]=DictionaryObject({NameObject('/OCGs'):layers,NameObject('/D'):DictionaryObject({NameObject('/BaseState'):NameObject('/ON'),NameObject('/Order'):layers})})
writer.add_metadata({'/Title':'iPhone Air - Muse, Dots, Grok Bot - 99.9 mm square','/Author':'Template Plus','/Subject':'6 designs; actual size 1:1; 99.9 x 99.9 mm; closed left and original Air rounded right; printable gray 0.12 mm outline; transparent background; no hole lines; no mirror.'})
writer.write(DEST)

verified=PdfReader(DEST)
assert len(verified.pages)==1
page=verified.pages[0]
assert all(abs(float(v)/MM-SIZE)<1e-5 for v in (page.mediabox.width,page.mediabox.height))
assert len(verified.trailer['/Root']['/OCProperties']['/OCGs'])==2
assert all(layer['/Usage']['/Print']['/PrintState']=='/ON' for layer in verified.trailer['/Root']['/OCProperties']['/OCGs'])
content=page.get_contents().get_data()
assert b'/CutContourLayer BDC' not in content and b'/LocatorLine BDC' in content
assert len(re.findall(rb'/OC /Art[0-5] BDC',content))==6
assert [v['theme'] for v in items[:2]]==['Muse','Dots']
assert all('Grok Bot' in v['theme'] for v in items[2:])

layout={'page_mm':[SIZE,SIZE],'rows':3,'columns':2,'frame_mm':[FW,PH],'outline_stroke_mm':.12,'background':'transparent','closed_left':True,'hole_lines':False,'items':items}
(OUT/'sheet-layout.json').write_text(json.dumps(layout,ensure_ascii=False,indent=2))
(OUT/'README.md').write_text(f'''# iPhone Air 镜头贴纸 · 9.99 cm 正方形合版

单页 PDF，页面严格为 99.9 × 99.9 mm，2 列 × 3 行，共 6 款。
从左到右、从上到下：Muse（5 个）、Dots（5 个）、Grok Bot（4 个）、Grok Bot（5 个）、Grok Bot（6 个）、Grok Bot（7 个）。Grok Bot 为用户确认的 Template 可选 88 种彩色几何公仔。

每个定位轮廓为 {FW:.7f} × {PH:.7f} mm，左边位于 Air 台面 x={LEFT} mm，采用参考照片中的封闭直边和 Air 原台面的右侧圆角。沿用 Air 官方工程图推导的台面标称几何和三个器件避让位置，未镜像。不是 Pro Max 的形状或高度。

两层均需印刷：Artwork（彩色公仔和白色细节）与 LocatorLine（0.12 mm、55% K 灰色定位细线）。透明背景，无灰色填充、文字、孔位线或裁切专色。定位细线按参考图需印出来；它不是完整的三孔裁切刀模。

图案在 30 px/mm 下检查：距台面外沿、左直边及三个器件孔至少约 {RECORD['clearance_mm']} mm，图案之间至少约 0.7 mm。没有图案被孔位裁断；绘制源保留在 sources/，可导入 Template Plus 继续编辑。物理贴合未实机验证。

摄像头外圈右边界位于台面 x={camera_right:.7f} mm，可用长度为 {max_length:.7f} mm。定位轮廓中心线长 {FW:.7f} mm，含 0.12 mm 灰线笔画的总长 {FW+.12:.7f} mm，小于可用长度。

按 **100% / 实际尺寸** 输出，关闭适合页面和自动缩放；整张纸必须为 9.99 cm 正方形。页面输出到 iCloud Drive 根目录。
''')
shutil.copy2(DEST,ICLOUD)
digest=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert digest(DEST)==digest(ICLOUD)
(OUT/'pdf-verification.json').write_text(json.dumps({'pages':1,'page_mm':[float(page.mediabox.width)/MM,float(page.mediabox.height)/MM],'design_count':6,'model':'iphone-air','theme_counts':{'muse':1,'dots':1,'grok_bot':4},'scale':1,'layers_printing':True,'hole_lines':False,'icloud_path':str(ICLOUD),'sha256':digest(DEST),'icloud_copy_identical':True},ensure_ascii=False,indent=2))
print(json.dumps({'pdf':str(DEST),'icloud':str(ICLOUD),'size_mm':[SIZE,SIZE],'stickers':6},ensure_ascii=False))
