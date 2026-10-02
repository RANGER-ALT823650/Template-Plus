"""Prepare masks from retained references. Requires numpy, OpenCV and scipy.

Run from Template-Plus, then run `node scripts/trace-ai-logos.mjs`.
Intermediate masks stay in output/ai-logos; source images are never modified.
"""
import json
from pathlib import Path

import cv2
import numpy as np
from scipy.optimize import least_squares

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'output/ai-logos'
OUT.mkdir(parents=True, exist_ok=True)
SOURCES = [
    ('gemini', 'Gemini.png', 'Gemini', '#3285ff'),
    ('glm', 'glm.jpg', 'GLM', '#000000'),
    ('kimi', 'Kimi.jpg', 'Kimi', '#000000'),
    ('qwen', 'qwen.jpg', 'Qwen', '#002bff'),
    ('grok', 'grok.jpg', 'Grok', '#000000'),
    ('deepseek', 'Deepseek.jpg', 'DeepSeek', '#4d65fa'),
    ('claude', 'Claude.jpg', 'Claude', '#d97757'),
    ('openai', 'OpenAI.jpg', 'OpenAI', '#000000'),
]


def clean(mask):
    count, labels, stats, _ = cv2.connectedComponentsWithStats(mask.astype('uint8'), 8)
    return np.isin(labels, [i for i in range(1, count) if stats[i, cv2.CC_STAT_AREA] >= 8])


def save_mask(name, mask):
    # Potrace treats black pixels as foreground.
    cv2.imwrite(str(OUT / f'{name}.png'), np.where(mask, 0, 255).astype('uint8'))


def gemini_gradients(rgb, mask):
    """Fit smooth vector radial overlays to the reference's multicolor field."""
    yy, xx = np.indices(mask.shape)
    inside = cv2.erode(mask.astype('uint8'), np.ones((5, 5), 'uint8')).astype(bool)
    sample = inside & (xx % 4 == 0) & (yy % 4 == 0)
    x, y, target = xx[sample], yy[sample], rgb[sample] / 255
    # Yellow left, green bottom, red top, over a blue foundation.
    colors = np.array([[1, .76, 0], [0, .75, .35], [1, .26, .27]])
    initial = [60, 200, 100, 85, 1, 200, 340, 65, 115, 1, 180, 60, 80, 85, 1]
    lower = [-100, -100, 20, 20, .1] * 3
    upper = [500, 500, 400, 400, 1.4] * 3

    def model(params):
        result = np.tile(np.array([.196, .525, 1]), (len(x), 1))
        for color, (cx, cy, sx, sy, strength) in zip(colors, np.reshape(params, (3, 5))):
            alpha = np.minimum(1, strength * np.exp(-.5 * (((x-cx)/sx)**2 + ((y-cy)/sy)**2)))
            result = result * (1-alpha[:, None]) + color * alpha[:, None]
        return result

    fit = least_squares(lambda p: (model(p)-target).ravel(), initial,
                        bounds=(lower, upper), max_nfev=180)
    print(f'Gemini vector gradient mean channel error: {np.mean(abs(model(fit.x)-target))*255:.2f}/255')
    return [dict(color='#%02x%02x%02x' % tuple(np.round(c*255).astype(int)),
                 cx=float(p[0]), cy=float(p[1]), sx=float(p[2]), sy=float(p[3]), strength=float(p[4]))
            for c, p in zip(colors, fit.x.reshape(3, 5))]


manifest = []
for index, (key, filename, name, color) in enumerate(SOURCES, 1):
    rgb = cv2.cvtColor(cv2.imread(str(ROOT / 'references/ai-logos' / filename)), cv2.COLOR_BGR2RGB)
    r, g, b = np.moveaxis(rgb.astype(float), -1, 0)
    if key == 'gemini':
        mask = np.min(rgb, axis=2) < 240
    elif key in ('glm', 'grok'):
        mask = (r+g+b)/3 > 128
    elif key == 'kimi':
        mask = ((r+g+b)/3 > 128) | ((b-r > 60) & (b > 110))
    elif key in ('qwen', 'deepseek'):
        mask = b-r > 55
    elif key == 'claude':
        mask = (r > 200) & (g > 190) & (b > 170)
    else:
        mask = (r+g+b)/3 < 128
    mask = clean(mask)
    layers = []
    if key == 'kimi':
        blue = clean(mask & (b-r > 60))
        layers = [('body', mask & ~blue, color), ('dot', blue, '#1683ff')]
    else:
        if key in ('qwen', 'deepseek'):
            core = cv2.erode(mask.astype('uint8'), np.ones((7, 7), 'uint8')).astype(bool)
            median = np.median(rgb[core], axis=0).astype(int)
            color = '#%02x%02x%02x' % tuple(median)
        if key == 'claude':
            color = '#%02x%02x%02x' % tuple(rgb[5, 5])
        layers = [('body', mask, color)]
    # The white sticker backing follows only external silhouettes. Original
    # negative details remain white; no square source background is retained.
    outer = np.zeros(mask.shape, 'uint8')
    contours, _ = cv2.findContours(mask.astype('uint8'), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    cv2.drawContours(outer, contours, -1, 1, cv2.FILLED)
    save_mask(f'{key}-backing', outer)
    for suffix, layer_mask, _ in layers:
        save_mask(f'{key}-{suffix}', layer_mask)
    ys, xs = np.where(mask)
    border = float(max(xs.max()-xs.min()+1, ys.max()-ys.min()+1) * .03)
    margin = border + 2
    item = dict(key=key, name=name, file=f'{index:02d}-{key}.svg', border=border,
                viewBox=[float(xs.min()-margin), float(ys.min()-margin),
                         float(xs.max()-xs.min()+1+2*margin), float(ys.max()-ys.min()+1+2*margin)],
                layers=[dict(mask=f'{key}-{suffix}.png', color=c) for suffix, _, c in layers])
    if key == 'gemini':
        item['gradients'] = gemini_gradients(rgb, mask)
    manifest.append(item)
(OUT / 'manifest.json').write_text(json.dumps(manifest, indent=2)+'\n')
print(f'Prepared {len(manifest)} logo masks')
