# Makes assets/vendor/three-gltf.js: three.js r159's GLTFLoader (with the two helper files it needs) as a plain
# script for the app, using the THREE the app already loads. three.js is MIT licensed (commercial use allowed).
# Usage: python3 tools/vendor/make-gltf.py <three.js r159 checkout> assets/vendor/three-gltf.js
import re, sys
src, out = sys.argv[1], sys.argv[2]
def module(path, exports):
    s = open(src + '/' + path, encoding='utf-8').read()
    # import { a, b } from 'three';  ->  const { a, b } = THREE;
    s = re.sub(r"import\s*\{([^}]*)\}\s*from\s*'three';", lambda m: 'const {' + m.group(1) + '} = THREE;', s)
    s = re.sub(r"import\s*\{([^}]*)\}\s*from\s*'\.\./utils/BufferGeometryUtils\.js';", lambda m: 'const {' + m.group(1) + '} = __BGU;', s)
    s = re.sub(r"^export\s*\{[^}]*\};?\s*$", '', s, flags=re.M)
    s = re.sub(r"^export\s+(function|class|const|let)\s", r"\1 ", s, flags=re.M)
    return '(function () {\n' + s + '\nreturn { ' + ', '.join(exports) + ' };\n})()'
bgu = module('examples/jsm/utils/BufferGeometryUtils.js', ['toTrianglesDrawMode', 'mergeGeometries', 'mergeVertices'])
sku = module('examples/jsm/utils/SkeletonUtils.js', ['clone'])
gltf = module('examples/jsm/loaders/GLTFLoader.js', ['GLTFLoader'])
open(out, 'w', encoding='utf-8').write('/* three.js r159 GLTFLoader, BufferGeometryUtils and SkeletonUtils (MIT licence, (c) 2010-2023 three.js authors), made into a plain script. */\n'
  + '(function () {\nconst __BGU = ' + bgu + ';\nconst __SKU = ' + sku + ';\nconst __GL = ' + gltf + ';\n'
  + 'window.GLTFLoader = __GL.GLTFLoader; window.SkeletonUtils = __SKU; window.BufferGeometryUtils = __BGU;\n})();\n')
print('written', out)
