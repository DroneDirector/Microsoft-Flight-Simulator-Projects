"""Builds the app's voice pack from public sources, all under licences that allow use in a paid app:
 - Kokoro-82M v1.0 voice model, quantised ONNX build (Apache License 2.0; ONNX build by kokoro-onnx, MIT)
 - the chosen voices from Kokoro's voice set (Apache License 2.0)
 - misaki's British and American pronunciation dictionaries (Apache License 2.0)
Usage: python3 build_pack.py <kokoro-v1.0.int8.onnx> <voices-v1.0.bin> <misaki/data dir> <out dir> [licence files...]
The licence files and NOTICE.txt (next to this script) go into the pack too."""
import gzip, json, os, shutil, sys
import numpy as np

VOICES = ['bm_george', 'bm_lewis', 'bm_daniel', 'bf_emma', 'bf_isabella', 'af_heart', 'af_bella', 'am_michael', 'am_fenrir', 'am_puck']

def grow(d):
    e = {}
    for k, v in d.items():
        if len(k) < 2: continue
        if k == k.lower():
            if k != k.capitalize(): e[k.capitalize()] = v
        elif k == k.lower().capitalize(): e[k.lower()] = v
    return {**e, **d}

def lexicon(data, acc):
    gold = grow(json.load(open(os.path.join(data, f'{acc}_gold.json'))))
    silver = grow(json.load(open(os.path.join(data, f'{acc}_silver.json'))))
    out = {}
    for d in (silver, gold):
        for k, v in d.items():
            if isinstance(v, dict): v = v.get('DEFAULT')
            if isinstance(v, str): out[k] = v
    return out

def main(model, voices, data, out, *licences):
    os.makedirs(out, exist_ok=True)
    for f in licences: shutil.copy(f, os.path.join(out, os.path.basename(f)))
    shutil.copy(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'NOTICE.txt'), os.path.join(out, 'NOTICE.txt'))
    shutil.copy(model, os.path.join(out, 'kokoro-v1.0-q8.onnx'))
    v = np.load(voices)
    for name in VOICES:
        v[name].astype('<f4').reshape(510, 256).tofile(os.path.join(out, f'voice-{name}.bin'))
    for acc in ('gb', 'us'):
        raw = json.dumps(lexicon(data, acc), ensure_ascii=False, separators=(',', ':')).encode('utf-8')
        with gzip.open(os.path.join(out, f'lexicon-{acc}.json.gz'), 'wb', 9) as f: f.write(raw)
    files = sorted(f for f in os.listdir(out) if f != 'pack.json')
    json.dump({'version': 1, 'files': {f: os.path.getsize(os.path.join(out, f)) for f in files}, 'voices': VOICES}, open(os.path.join(out, 'pack.json'), 'w'), indent=1)

if __name__ == '__main__':
    main(*sys.argv[1:])
