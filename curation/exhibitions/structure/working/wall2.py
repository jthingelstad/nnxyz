import json,sys
from PIL import Image,ImageDraw,ImageFont
R='/private/tmp/claude-502/-Users-otto-Projects/38dc4115-9628-5c90-9ca9-a87bf7784fc8/scratchpad/'
d=sys.argv[1]; idx=json.load(open(R+d+'/index.json')); W={w['inkId']:w for w in json.load(open('data/gallery.json'))}
f=ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc',14)
for grp in json.load(open(R+d+'/groups.json'))['groups']:
  C=206;cols=6;rows=(len(grp['refs'])+5)//6;im=Image.new('RGB',(cols*C,rows*(C+18)),'white');dr=ImageDraw.Draw(im)
  for i,r in enumerate(grp['refs']):
    e=idx[r-1]; p=e.get('imagePath') or W[e['inkId']]['imagePath']; p=Image.open(p); p.draft('RGB',(C,C)); p=p.convert('RGB').resize((C-6,C-6))
    x,y=(i%cols)*C,(i//cols)*(C+18); im.paste(p,(x+3,y+3)); dr.text((x+3,y+C),f"{e['ref']} {e['title'][-14:]}",fill='black',font=f)
  im.save(R+d+f"/wall-{grp['key']}.png")
