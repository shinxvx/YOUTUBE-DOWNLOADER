"""Generates the provisional pixel art into public/assets.

    python3 tools/gen_art.py

Every file keeps its final path and size, so real art can replace it 1:1
(see ASSETS.md)."""
import os
import random
import sys

sys.path.insert(0, os.path.dirname(__file__))
from PIL import Image  # noqa: E402
import creatures  # noqa: E402
import portraits  # noqa: E402
import scenes  # noqa: E402

ROOT = os.path.join(os.path.dirname(__file__), '..')
A = os.path.join(ROOT, 'public', 'assets')


def out(*p):
    path = os.path.join(A, *p)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    return path


def main():
    for name in creatures.ALL:
        creatures.build(name).save(out('creatures', f'{name}.png'))
    for name in portraits.CHARACTERS:
        for e in portraits.EXPRESSIONS:
            portraits.build(name, e).save(out('portraits', f'{name}_{e}.png'))
    for name, fn in scenes.SCENES.items():
        fn(random.Random(name)).save(out('locations', f'{name}.png'))
    scenes.island_map(random.Random('isle')).save(out('map', 'island.png'))
    scenes.island_map(random.Random('isle'), silenced=True).save(out('map', 'island_silenced.png'))
    icon = scenes.app_icon()
    os.makedirs(os.path.join(ROOT, 'build'), exist_ok=True)
    big = icon.resize((256, 256), Image.NEAREST)
    big.save(os.path.join(ROOT, 'build', 'icon.png'))
    big.save(os.path.join(ROOT, 'build', 'icon.ico'), sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
    big.save(out('icon.png'))
    print('art generated in public/assets')


if __name__ == '__main__':
    main()
