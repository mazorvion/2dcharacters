# Dev only: tile .shots/<prefix>*.png into one contact sheet.
import sys, glob, os
from PIL import Image, ImageDraw
prefix, out = sys.argv[1], sys.argv[2]
cols = int(sys.argv[3]) if len(sys.argv) > 3 else 3
w = int(sys.argv[4]) if len(sys.argv) > 4 else 640
files = sorted(glob.glob(f'.shots/{prefix}*.png'), key=os.path.getmtime)
ims = [Image.open(f).convert('RGB') for f in files]
h = int(w * ims[0].height / ims[0].width)
rows = (len(ims) + cols - 1) // cols
sheet = Image.new('RGB', (cols * w, rows * (h + 18)), 'white')
d = ImageDraw.Draw(sheet)
for i, (f, im) in enumerate(zip(files, ims)):
    x, y = (i % cols) * w, (i // cols) * (h + 18)
    sheet.paste(im.resize((w, h)), (x, y + 18))
    d.text((x + 4, y + 3), os.path.basename(f), fill='black')
sheet.save(out)
print(out, len(ims))
