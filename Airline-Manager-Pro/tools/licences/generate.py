"""Registration keys and reactivation codes.

Makes N registration keys and N reactivation codes: 15 characters each, capital letters and digits
(without 0, O, 1, I and L, which are easy to mix up), shown in groups of five: ABCDE-23456-FGHJK.

The plain lists are written to the folder given with --out, which must be outside the repository:
they are what customers receive and are never committed. The app only carries a fingerprint of each
(the first 12 hex characters of SHA-256), in src/data/licence-hashes.ts, and so does the online
register (supabase/licences-seed.sql). A key can't be worked out from its fingerprint.

Run once. Running it again makes completely new keys and codes, and the old ones stop working.

    python3 tools/licences/generate.py --out ~/Desktop/amp-keys [--count 10000]
"""
import argparse, hashlib, os, secrets, sys

ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
SALT_KEY, SALT_CODE = 'AMP-KEY|', 'AMP-REACT|'
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))


def make(taken):
    while True:
        s = ''.join(secrets.choice(ALPHABET) for _ in range(15))
        if s in taken or not any(c.isdigit() for c in s) or not any(c.isalpha() for c in s):
            continue
        taken.add(s)
        return s


def fp(salt, s):
    return hashlib.sha256((salt + s).encode()).hexdigest()[:12]


def show(s):
    return '-'.join(s[i:i + 5] for i in range(0, 15, 5))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', required=True)
    ap.add_argument('--count', type=int, default=10000)
    a = ap.parse_args()
    out = os.path.abspath(os.path.expanduser(a.out))
    if out.startswith(ROOT):
        sys.exit('Choose a folder outside the repository: the plain keys must never be committed.')
    os.makedirs(out, exist_ok=True)
    taken = set()
    keys = [make(taken) for _ in range(a.count)]
    codes = [make(taken) for _ in range(a.count)]

    head = ('Airline Manager Pro - {}\n{} {}, one per customer{}.\n'
            'Keep this file private. Customers can type it with or without the dashes.\n\n')
    with open(os.path.join(out, 'registration-keys.txt'), 'w', newline='\r\n') as f:
        f.write(head.format('registration keys', a.count, 'keys', ''))
        f.write('\n'.join('{:>5}  {}'.format(i + 1, show(k)) for i, k in enumerate(keys)) + '\n')
    with open(os.path.join(out, 'reactivation-codes.txt'), 'w', newline='\r\n') as f:
        f.write(head.format('reactivation codes', a.count, 'codes', ' when they move to a new device '
                            '(each code works once, with any registration key)'))
        f.write('\n'.join('{:>5}  {}'.format(i + 1, show(c)) for i, c in enumerate(codes)) + '\n')

    kf = [fp(SALT_KEY, k) for k in keys]
    cf = [fp(SALT_CODE, c) for c in codes]
    with open(os.path.join(ROOT, 'src', 'data', 'licence-hashes.ts'), 'w') as f:
        f.write('// Fingerprints of the registration keys and reactivation codes (tools/licences/generate.py).\n'
                '// Only fingerprints: the keys themselves are not in the app or the repository.\n')
        f.write("const LICENCE_KEY_FP = '{}';\n".format(''.join(kf)))
        f.write("const LICENCE_CODE_FP = '{}';\n".format(''.join(cf)))
    os.makedirs(os.path.join(ROOT, 'supabase'), exist_ok=True)
    with open(os.path.join(ROOT, 'supabase', 'licences-seed.sql'), 'w') as f:
        f.write('-- Fingerprints of the registration keys and reactivation codes (tools/licences/generate.py).\n'
                '-- Run after licences.sql. Safe to run again.\n')
        for name, rows in (('amp_licence_keys', kf), ('amp_reactivation_codes', cf)):
            for i in range(0, len(rows), 1000):
                f.write('insert into {} (fp) values {} on conflict do nothing;\n'.format(
                    name, ','.join("('{}')".format(r) for r in rows[i:i + 1000])))
    print('Wrote', a.count, 'keys and', a.count, 'codes to', out)


if __name__ == '__main__':
    main()
