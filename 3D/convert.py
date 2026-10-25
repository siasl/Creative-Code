# Converts assets/monarch.csv into a compact Float32 binary: x y z r g b a per point.
import csv, math, struct
src, dst, min_alpha = 'assets/monarch.csv', 'assets/monarch.bin', 0.3
total = kept = 0
with open(src) as f, open(dst, 'wb') as out:
    for row in csv.DictReader(f):
        total += 1
        a = 1 / (1 + math.exp(-float(row['opacity'])))
        if a < min_alpha:
            continue
        rgb = [min(1, max(0, 0.5 + 0.28209479 * float(row[k]))) for k in ('f_dc_0', 'f_dc_1', 'f_dc_2')]
        out.write(struct.pack('<7f', float(row['x']), float(row['y']), float(row['z']), *rgb, a))
        kept += 1
print(f'{total} -> {kept} points, {kept*28/1e6:.1f} MB')
