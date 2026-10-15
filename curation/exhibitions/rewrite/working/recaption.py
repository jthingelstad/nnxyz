"""Replace captions in a content file: python3 recaption.py CONTENT.py JSONFILE  (JSON maps short title -> new caption)."""
import re, sys, json
p, j = sys.argv[1], sys.argv[2]
s = open(p).read(); m = json.load(open(j))
for short, cap in m.items():
    pat = re.compile(r"(dict\(short='" + re.escape(short) + r"'.*?caption=\")(.*?)(\")", re.S)
    s, n = pat.subn(lambda mo: mo.group(1) + cap.replace('"', '\\"') + mo.group(3), s, count=1)
    assert n == 1, short
open(p, 'w').write(s)
print('recaptioned', len(m))
