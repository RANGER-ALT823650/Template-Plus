"""Extract silhouettes without modifying the retained source screenshots.

Run with Pillow + numpy; then run node scripts/trace-reference.mjs.
The masks use the source ICC values, while colors are converted to sRGB.
"""
from pathlib import Path
from collections import Counter
from io import BytesIO
import json
import numpy as np
from PIL import Image, ImageCms

root = Path(__file__).resolve().parent.parent
out = root / 'references' / 'masks'
out.mkdir(exist_ok=True)
palette = Image.open(root / 'references/palette.png').convert('RGB')
body_rgb = np.array([140, 102, 64])
def silhouette_alpha(image):
    arr = np.asarray(image).astype(float)
    bg = np.array([242, 242, 241])
    # Project antialias pixels onto the foreground/background color line.
    delta = body_rgb - bg
    alpha = ((arr-bg)*delta).sum(axis=2) / (delta*delta).sum()
    return np.clip(alpha,0,1)
def save_mask(id,alpha):
    image=Image.fromarray(np.round((1-alpha)*255).astype('uint8'))
    image.save(out / (id+'.png'))
    # Use the original antialias information to get smooth subpixel contours.
    image.resize((image.width*4,image.height*4),Image.Resampling.BICUBIC).save(out / (id+'-trace.png'))
centers = [(174,77),(283,77),(392,77),(501,77),(174,186),(283,186),(392,186)]
ids = ['circle','oval','square','capsule','triangle','hexagon','cloud']
manifest = []
for id, (x,y) in zip(ids,centers):
    alpha = silhouette_alpha(palette.crop((x-40,y-40,x+40,y+40)))
    save_mask(id,alpha)
    manifest.append({'id':id, 'transform':'translate(0 0) scale(2.5) scale(.25)', 'height':80})
character = Image.open(root / 'references/character.png').convert('RGB')
alpha = silhouette_alpha(character)
mask = alpha > .5
# The body silhouette is solid; preserve the eye silhouettes separately.
for row in mask:
    indices = np.where(row)[0]
    if len(indices): row[indices[0]:indices[-1]+1] = True
alpha[mask] = np.maximum(alpha[mask], .501)
# Fill only the eye holes, keeping the body's antialias boundary untouched.
alpha[75:114,90:141][mask[75:114,90:141]] = 1
save_mask('drop',alpha)
manifest.append({'id':'drop','transform':'translate(4.416 -12.208) scale(1.038961) scale(.25)', 'height':224})
arr = np.asarray(character)
eyes = np.zeros(mask.shape, dtype=float)
white_delta=np.array([255,255,255])-body_rgb
eye_alpha=np.clip(((arr.astype(float)-body_rgb)*white_delta).sum(axis=2)/(white_delta*white_delta).sum(),0,1)
eyes[75:114,90:141] = eye_alpha[75:114,90:141] * mask[75:114,90:141]
save_mask('eyes',eyes)
(out / 'manifest.json').write_text(json.dumps(manifest,indent=2))
icc = Image.open(root / 'references/palette.png').info.get('icc_profile')
srgb = ImageCms.profileToProfile(palette,ImageCms.ImageCmsProfile(BytesIO(icc)),ImageCms.createProfile('sRGB'),outputMode='RGB') if icc else palette
swatches = [(84,309),(185,309),(287,309),(388,309),(490,309),(592,309),(135,389),(236,389),(338,389),(439,389),(541,389)]
colors = []
for x,y in swatches:
    rgb=Counter(srgb.crop((x-10,y-10,x+10,y+10)).getdata()).most_common(1)[0][0]
    colors.append('#'+''.join(f'{n:02X}' for n in rgb))
(out / 'colors.json').write_text(json.dumps(colors))
print('Extracted 8 bodies, fixed eyes, and 11 ICC-corrected sRGB colors.')
