import json,sys,datetime
from zoneinfo import ZoneInfo
from PIL import Image,ImageDraw,ImageFont
coll,prefix,outdir=sys.argv[1],sys.argv[2],sys.argv[3]
G=[w for w in json.load(open('data/gallery.json')) if w['collectionId']==coll]
G.sort(key=lambda w:(int(w['createdAt']),w['name']))
f=ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc',13)
idx=[];C=248
for n,w in enumerate(G,1):
  d=datetime.datetime.fromtimestamp(int(w['createdAt']),ZoneInfo('America/Chicago')).date().isoformat()
  idx.append({'ref':f'{prefix}{n:03d}','title':w['name'],'inkId':w['inkId'],'date':d,'strokes':w['strokes']})
for s in range(0,len(G),25):
  im=Image.new('RGB',(5*C,5*(C+20)),'white');dr=ImageDraw.Draw(im)
  for i,(w,e) in enumerate(zip(G[s:s+25],idx[s:s+25])):
    p=Image.open(w['imagePath']).convert('RGB').resize((C-8,C-8));x,y=(i%5)*C,(i//5)*(C+20);im.paste(p,(x+4,y+4))
    short=w['name'].replace('nnxyz ','')
    dr.text((x+4,y+C-2),f"{e['ref']} {short[:20]}  {e['date']}",fill='black',font=f)
  im.save(f'{outdir}/sheet-{s//25+1:02d}.png')
json.dump(idx,open(f'{outdir}/index.json','w'),indent=0)
print(len(G),'works',idx[0]['date'],idx[-1]['date'])
