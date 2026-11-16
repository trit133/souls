# The skill tree's side art (Jonah's, in public/tree: "<who> left.png" / "<who> right.png") made web-sized: trimmed to
# the painted part (the transparent margin cut off), saved as WebP in public/tree/web, and where each was trimmed from
# written to src/treeart.json (the light positions in treebg.js are in the original images' pixels).
# python3 scripts/tree-art.py
from PIL import Image
import json, os
SRC = 'public/tree'; OUT = 'public/tree/web'; os.makedirs(OUT, exist_ok=True)
FILES = {'knight-left': 'knight left.png', 'knight-right': 'knight right.png', 'rogue-left': 'shrike left.png', 'rogue-right': 'shrike right.png', 'mage-left': 'Adept Left.png', 'mage-right': 'adept right.png'}
meta = {}
for key, name in FILES.items():
    im = Image.open(os.path.join(SRC, name)).convert('RGBA')
    a = im.getchannel('A').point(lambda v: 255 if v > 140 else 0)
    box = a.getbbox()
    crop = im.crop(box)
    crop.save(os.path.join(OUT, key + '.webp'), 'WEBP', quality=90, method=6)
    meta[key] = {'w': crop.width, 'h': crop.height, 'ox': box[0], 'oy': box[1], 'W': im.width, 'H': im.height}
    print(key, box, os.path.getsize(os.path.join(OUT, key + '.webp')) // 1024, 'KB')
json.dump(meta, open('src/treeart.json', 'w'), indent=1)
