import sys, os, glob
from PIL import Image, ImageDraw
d, suf, out, cols = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4])
filt = sys.argv[5] if len(sys.argv)>5 else ''
fs = sorted(f for f in glob.glob(os.path.join(d, '*.'+suf+'.png')) if filt in f)
tw = 455 if suf=='d' else 195; th = 300 if suf=='d' else 422
rows = (len(fs)+cols-1)//cols
sheet = Image.new('RGB', (cols*tw, rows*(th+16)), 'white')
dr = ImageDraw.Draw(sheet)
for i,f in enumerate(fs):
    im = Image.open(f); im.thumbnail((tw, th))
    x, y = (i%cols)*tw, (i//cols)*(th+16)
    sheet.paste(im, (x, y+16)); dr.text((x+3, y+2), os.path.basename(f)[:70], fill='black')
sheet.save(out); print(len(fs), out)
