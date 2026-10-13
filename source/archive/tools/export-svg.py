#!/usr/bin/env python3
"""Convert archived react-canvas-draw strokes to native vector SVG paths."""
import argparse
import base64
import hashlib
import html
import json
import pathlib
import re
import xml.etree.ElementTree as ET

ROOT=pathlib.Path(__file__).resolve().parent.parent


def num(n):
    if not isinstance(n,(int,float)) or not __import__('math').isfinite(n):raise ValueError('Nonfinite coordinate')
    return str(n)


def attributes(color):
    rgba=re.fullmatch(r'rgba\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)',color)
    if rgba:
        r,g,b,a=rgba.groups()
        return f'stroke="rgb({r},{g},{b})" stroke-opacity="{a}"'
    if not re.fullmatch(r'#[0-9a-fA-F]{3,8}|[a-zA-Z]+|rgb\([\d.,% ]+\)',color):raise ValueError('Unsupported color: '+color)
    return 'stroke="'+html.escape(color,quote=True)+'"'


def svg(drawing,title):
    width= num(drawing['width']);height=num(drawing['height'])
    out=[f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" width="{width}" height="{height}" role="img" aria-label="{html.escape(title,quote=True)}">',f'<title>{html.escape(title)}</title>','<desc>Native vector paths reconstructed from the original brush strokes. No embedded raster artwork.</desc>','<g fill="none" stroke-linecap="round" stroke-linejoin="round">']
    for index,line in enumerate(drawing['lines']):
        points=line['points']
        if not points:continue
        # Canvas beginPath resets the preceding moveTo in react-canvas-draw 1.2.1;
        # its first quadraticCurveTo starts the subpath at the first control point.
        p=points[0];commands=[f'M {num(p["x"])} {num(p["y"])}']
        for a,b in zip(points,points[1:]):
            commands.append(f'Q {num(a["x"])} {num(a["y"])} {num((a["x"]+b["x"])/2)} {num((a["y"]+b["y"])/2)}')
        p=points[-1];commands.append(f'L {num(p["x"])} {num(p["y"])}')
        out.append(f'<path data-stroke="{index+1}" data-points="{len(points)}" {attributes(line["brushColor"])} stroke-width="{num(line["brushRadius"]*2)}" d="'+ ' '.join(commands)+'"/>')
    out.extend(['</g>','</svg>'])
    result='\n'.join(out)+'\n';ET.fromstring(result)
    return result


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('strokes',nargs='?',help='A strokes.json file; omit to build the three spot-check exports')
    parser.add_argument('--output');parser.add_argument('--title',default='Archived Nifty Ink drawing')
    args=parser.parse_args()
    if args.strokes:
        source=pathlib.Path(args.strokes);target=pathlib.Path(args.output) if args.output else source.with_suffix('.svg')
        target.parent.mkdir(parents=True,exist_ok=True);target.write_text(svg(json.loads(source.read_text()),args.title));print(target);return
    names=['nnxyz nifty faces #113','nnxyz nnotb #62','nnxyz rawblocks #39']
    catalog=json.loads((ROOT/'catalog.json').read_text());samples=[];images=[]
    for name in names:
        item=next(i for i in catalog if i['name']==name)
        drawing=json.loads((ROOT/item['strokesPath']).read_text());vector=svg(drawing,name)
        destination=ROOT/'previews/svg'/f'{item["inkId"]}.svg';destination.write_text(vector)
        raw=(ROOT/item['imagePath']).read_bytes();encoded=base64.b64encode(raw).decode()
        images.append(f'<figure><img src="data:image/png;base64,{encoded}" alt="{html.escape(name,quote=True)}"><figcaption class="source-label text-small">{html.escape(name)}</figcaption></figure>')
        samples.append({'name':name,'inkId':item['inkId'],'originalPNG':item['imagePath'],'sourceStrokes':item['strokesPath'],'sourceSHA256':hashlib.sha256((ROOT/item['strokesPath']).read_bytes()).hexdigest(),'svgPath':str(destination.relative_to(ROOT)),'svgSHA256':hashlib.sha256(destination.read_bytes()).hexdigest(),'strokes':len(drawing['lines']),'points':sum(len(l['points']) for l in drawing['lines'])})
        if name==names[0]:face_svg=vector
    fragment=ROOT/'previews/spot-check/nnxyz-strokes.html'
    text=fragment.read_text().replace('SAMPLE_IMAGES','\n'.join(images)).replace('STROKE_SVG',face_svg)
    fragment.write_text(text)
    assert fragment.stat().st_size<1_000_000
    (ROOT/'previews/spot-check/sources.json').write_text(json.dumps(samples,indent=2)+'\n')
    print('Spot-check fragment bytes:',fragment.stat().st_size)
    print(json.dumps(samples,indent=2))


if __name__=='__main__':main()
