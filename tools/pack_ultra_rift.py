"""Pack the supplied UltraWormhole frames losslessly; requires Pillow."""
from pathlib import Path
import argparse
from PIL import Image

parser = argparse.ArgumentParser()
parser.add_argument('source', type=Path, help='Folder containing row-N-column-N.png')
args = parser.parse_args()
frames = sorted(args.source.glob('row-*-column-*.png'), key=lambda p: tuple(map(int, (p.stem.split('-')[1], p.stem.split('-')[3]))))
if len(frames) != 9:
    raise SystemExit('Expected exactly nine frames')
sheet = Image.new('RGBA', (132 * 9, 132))
for index, path in enumerate(frames):
    frame = Image.open(path).convert('RGBA')
    if frame.size != (132, 132):
        raise SystemExit(f'Unexpected frame size: {path}')
    sheet.paste(frame, (132 * index, 0))
out = Path(__file__).resolve().parents[1] / 'assets/effects/ultra-rift.png'
out.parent.mkdir(parents=True, exist_ok=True)
sheet.save(out, optimize=True)
print(out)
