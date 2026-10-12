"""Calibrate preview geometry from retained Apple top views and Neo CAD vectors.

Requires Pillow, numpy, scipy, opencv-python and pdfplumber. No network calls.
Image-derived measurements are estimates, not manufacturer dimension callouts.
"""
from pathlib import Path
import json
import math
import cv2
import numpy as np
import argparse
import subprocess
import sys
from PIL import Image
from scipy.optimize import least_squares

ROOT = Path(__file__).resolve().parents[1]
SOURCES = ROOT / 'assets/macbooks/sources'
MANIFEST = json.loads((SOURCES / 'manifest.json').read_text())
SIZES = {
    'macbook-air-13': (304.1, 215), 'macbook-air-15': (340.4, 237.6),
    'macbook-pro-14': (312.6, 221.2), 'macbook-pro-16': (355.7, 248.1),
    'macbook-neo': (297.5, 206.4),
}


def path(points, close=True):
    return 'M ' + ' L '.join(f'{x:.5f} {y:.5f}' for x, y in points) + (' Z' if close else '')


def simplify(points, tolerance):
    return cv2.approxPolyDP(np.array(points, np.float32), tolerance, True).reshape(-1, 2)


def rounded_profile(width, height, span, exponent):
    # A fitted continuous corner profile; span is NOT a circular radius.
    q = [(span - span * math.cos(t)**(2/exponent),
          span - span * math.sin(t)**(2/exponent)) for t in np.linspace(math.pi/2, 0, 101)]
    points = [(span, 0), (width-span, 0)]
    points += [(width-x, y) for x, y in q[1:]]
    points += [(width, height-span)] + [(width-x, height-y) for x, y in reversed(q[:-1])]
    points += [(span, height)] + [(x, height-y) for x, y in q[1:]]
    points += [(0, span)] + list(reversed(q[:-1]))
    return path(simplify(points, .01))


measurements = {}
for model, (width, height) in SIZES.items():
    image = np.array(Image.open(ROOT / MANIFEST[model]['local_file']).convert('RGB'))
    gray = image.mean(2)
    mask = (gray > 45) if 'pro' in model else (gray < 248)
    _, labels, stats, _ = cv2.connectedComponentsWithStats(mask.astype('uint8'), 8)
    component = 1 + np.argmax(stats[1:, 4])
    x, y, bw, bh, _ = map(int, stats[component])
    sx, sy = width/(bw-1), height/(bh-1)
    left = int(x+bw/2-bw*.15)
    top = int(y+bh/2-bh*.18)
    roi = image[top:int(y+bh/2+bh*.18), left:int(x+bw/2+bw*.15)]
    if 'air' in model:
        logo_mask = roi.mean(2) > 225
    elif 'pro' in model:
        logo_mask = roi.mean(2) < 70
    else:
        logo_mask = (roi[:, :, 2] < 120) & (roi[:, :, 0] < 220)
    _, _, parts, _ = cv2.connectedComponentsWithStats(logo_mask.astype('uint8'), 8)
    parts = parts[1:][parts[1:, 4] > 200]  # Apple body and detached leaf.
    assert len(parts) == 2, (model, parts.tolist())
    lx, ly = parts[:, :2].min(0) + [left, top]
    right, bottom = (parts[:, :2] + parts[:, 2:4]).max(0) + [left, top]
    logo = {'x': round((lx-x)*sx, 3), 'y': round((ly-y)*sy, 3),
            'width': round((right-lx)*sx, 3), 'height': round((bottom-ly)*sy, 3)}

    contour = max(cv2.findContours((labels == component).astype('uint8'),
                                  cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)[0], key=cv2.contourArea)
    points = (contour.squeeze().astype(float)-[x, y]) * [sx, sy]
    corners = np.minimum(points, [width, height]-points)
    diagonal = corners[(corners[:, 0] > 1) & (corners[:, 1] > 1)
                       & (corners[:, 0]/(corners[:, 1]+.0001) > .5)
                       & (corners[:, 0]/(corners[:, 1]+.0001) < 2)]
    equivalent_radius = np.median(diagonal.sum(1)+np.sqrt(2*diagonal[:, 0]*diagonal[:, 1]))
    q = corners[(corners[:, 0] < 25) & (corners[:, 1] < 25)
                & (corners[:, 0] > .05) & (corners[:, 1] > .05)]

    def residual(params):
        span, exponent = params
        z = np.maximum(0, 1-q/span)
        f = z[:, 0]**exponent + z[:, 1]**exponent - 1
        gradient = exponent/span * np.sqrt(z[:, 0]**(2*exponent-2)+z[:, 1]**(2*exponent-2))
        return f/np.maximum(.01, gradient)

    fit = least_squares(residual, [12, 2.5], bounds=([3, 1.8], [35, 6]),
                        loss='soft_l1', f_scale=.15)
    span, exponent = map(float, fit.x)
    measurements[model] = {
        'logo': logo, 'outer': rounded_profile(width, height, span, exponent),
        'corner': {'kind': 'photo-fitted-continuous-profile',
                   'equivalentRadiusMm': round(float(equivalent_radius), 2),
                   'spanMm': round(span, 3), 'exponent': round(exponent, 4),
                   'fitRmsMm': round(float(np.sqrt(np.mean(residual(fit.x)**2))), 3)},
        'source': {**MANIFEST[model], 'body_bbox_px': [x, y, bw, bh],
                   'logo_bbox_px': list(map(int, [lx, ly, right-lx, bottom-ly])),
                   'method': 'Top-view image segmentation; scale X/Y by published enclosure width/depth. Outline fits four corners symmetrically. Logo includes leaf. About 0.5-1 mm image estimation uncertainty; not official logo/radius dimensions.'},
    }

# Neo: prefer the engineering drawing's nominal top outline and logo vectors.
parser = argparse.ArgumentParser()
parser.add_argument('--pdf-python', default=sys.executable, help='Python interpreter with pdfplumber installed')
args = parser.parse_args()
extract = """import json,sys,pdfplumber
p=pdfplumber.open(sys.argv[1]).pages[1]
indices=[2451,2453,2456,2476,2477,2486,2510,2511]
print(json.dumps({'count':len(p.curves),'curves':{i:p.curves[i]['pts'] for i in indices}}))
"""
extracted = json.loads(subprocess.run([args.pdf_python, '-c', extract, str(SOURCES/'macbook-neo.pdf')], check=True, capture_output=True, text=True).stdout)
assert extracted['count'] == 3535, 'Re-audit curve indices if the retained PDF changes'
curves = {int(i): {'pts': pts} for i,pts in extracted['curves'].items()}
outline = curves[2451]['pts'] + list(reversed(curves[2486]['pts'])) + curves[2456]['pts'] + curves[2453]['pts']
outline = np.array(outline)
origin, end = outline.min(0), outline.max(0)
scale = np.array(SIZES['macbook-neo'])/(end-origin)
outline_mm = (outline-origin)*scale
body = np.array(curves[2510]['pts'] + curves[2511]['pts'])
leaf = np.array(curves[2476]['pts'] + curves[2477]['pts'])
all_logo = np.concatenate([body, leaf])
logo_min, logo_max = all_logo.min(0), all_logo.max(0)
logo_size = logo_max-logo_min
logo_path = path(simplify((body-logo_min)/logo_size, .0003)) + ' ' + path(simplify((leaf-logo_min)/logo_size, .0003))
logo_pos_mm = (logo_min-origin)*scale
logo_size_mm = logo_size*scale
neo = measurements['macbook-neo']
neo['logo'] = dict(zip(['x', 'y', 'width', 'height'], map(lambda n: round(float(n), 3), [*logo_pos_mm, *logo_size_mm])))
neo['outer'] = path(simplify(outline_mm, .01))
corner = (np.array(curves[2453]['pts'])-origin)*scale
corner = corner[(corner[:, 0] > 1) & (corner[:, 1] > 1)
                & (corner[:, 0]/(corner[:, 1]+.0001) > .5)
                & (corner[:, 0]/(corner[:, 1]+.0001) < 2)]
neo['corner'] = {'kind': 'engineering-vector-outline',
                 'equivalentRadiusMm': round(float(np.median(corner.sum(1)+np.sqrt(2*corner[:, 0]*corner[:, 1]))), 2)}
neo['source']['drawing'] = MANIFEST['neo_drawing']
neo['source']['method'] = 'Neo top-view vector paths and Apple logo extracted from engineering PDF page 2; mapped to published enclosure envelope. Derived logo bounds and equivalent corner radius, not explicit manufacturer dimension callouts.'

report = {'checked_on': '2026-10-10', 'logo_path_unit_bbox': logo_path, 'models': measurements}
(SOURCES / 'calibration.json').write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n')
runtime = {model: {key: data[key] for key in ['outer', 'logo', 'corner']} for model, data in measurements.items()}
(ROOT / 'src/macbook-geometry.js').write_text(
    '// Generated by scripts/calibrate-macbook-geometry.py from retained Apple sources.\n'
    '// Photo estimates / vector-derived nominal geometry; see sources/calibration.json.\n'
    'export const MACBOOK_LOGO_PATH=' + json.dumps(logo_path) + ';\n'
    'export const MACBOOK_GEOMETRY=' + json.dumps(runtime, ensure_ascii=False, indent=2) + ';\n')
print(json.dumps({model: {key: data[key] for key in ['logo', 'corner']} for model, data in measurements.items()}, indent=2))
