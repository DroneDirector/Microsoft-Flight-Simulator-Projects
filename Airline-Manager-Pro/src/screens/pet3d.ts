// Your pet: a dog or a cat, chosen and made your own with your pilot (Settings → Your pilot → Pet), asleep in its
// bed on the floor of your office by the bookshelf. Our own model, built from simple rounded shapes: curled up,
// breathing slowly, an ear that twitches now and then, a tail tip that flicks (a cat) or paws that twitch in a
// dream (a dog). Tap it and it stirs a little, and goes on sleeping.

type PetKind = 'dog' | 'cat' | 'none';
interface Pet { kind: PetKind; name: string; coat: number; white: boolean; size: 's' | 'm' | 'l'; ears: 'floppy' | 'pointy'; bed: number }

const PET_COATS: { [k: string]: [string, string][] } = {
  dog: [['#C8913E', 'Golden'], ['#2A2420', 'Black'], ['#6B4226', 'Brown'], ['#E6D3AE', 'Cream'], ['#F2EFE8', 'White'], ['#8A8783', 'Grey'], ['#A0522D', 'Red'], ['#4A3B30', 'Dark brown']],
  cat: [['#E08A3C', 'Ginger'], ['#2A2624', 'Black'], ['#9A9590', 'Grey'], ['#F1EEE8', 'White'], ['#7A6450', 'Tabby'], ['#D9C3A0', 'Cream'], ['#5E6670', 'Blue-grey'], ['#B07A4A', 'Cinnamon']],
};
const PET_BEDS: [string, string][] = [['#7A2E2E', 'Red'], ['#2E4A7A', 'Blue'], ['#5A6B3A', 'Green'], ['#8C8FA0', 'Grey'], ['#C9A46A', 'Sand'], ['#5B3A6B', 'Plum']];

/** Your pet as saved (a dog until you choose otherwise). */
function petData(): Pet {
  const S: any = State; if (!S.pet) S.pet = { kind: 'dog', name: 'Buddy', coat: 0, white: true, size: 'm', ears: 'floppy', bed: 0 };
  return S.pet as Pet;
}

/** The bed and the sleeping pet, at pos (x, z on the floor), turned by yaw; its parts in A.pet for the animation. */
function petPlace(T: any, root: any, A: any, pos: number[], yaw: number) {
  const P = petData(); if (!P || P.kind === 'none') return;
  const cat = P.kind === 'cat', s = cat ? 0.95 : P.size === 's' ? 0.72 : P.size === 'l' ? 1.25 : 1;
  const coat = new T.Color((PET_COATS[P.kind][P.coat] || PET_COATS[P.kind][0])[0]), white = new T.Color('#F3EFE6');
  const furM = new T.MeshStandardMaterial({ color: coat, roughness: 0.92 }), lightM = new T.MeshStandardMaterial({ color: P.white ? white : coat.clone().offsetHSL(0, -0.05, 0.08), roughness: 0.92 });
  const darkM = new T.MeshStandardMaterial({ color: 0x14100E, roughness: 0.5 }), noseM = new T.MeshStandardMaterial({ color: cat ? 0xC97B7B : 0x1A1412, roughness: 0.35 });
  const earInM = new T.MeshStandardMaterial({ color: cat ? 0xD99A9A : coat.clone().multiplyScalar(0.8), roughness: 0.9 });
  const g = new T.Group(); g.position.set(pos[0], 0, pos[1]); g.rotation.y = yaw; root.add(g);
  const sph = (rx: number, ry: number, rz: number, m: any, x: number, y: number, z: number, par: any) => { const o = new T.Mesh(new T.SphereGeometry(1, 28, 20), m); o.scale.set(rx, ry, rz); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; par.add(o); return o; };
  // the bed: a round cushion in a soft rim (a cat's is smaller and deeper)
  const bedR = cat ? 0.34 : 0.45 * Math.max(0.8, s), bedM = new T.MeshStandardMaterial({ color: new T.Color((PET_BEDS[P.bed] || PET_BEDS[0])[0]), roughness: 0.97 });
  const cush = new T.Mesh(new T.CylinderGeometry(bedR * 0.86, bedR * 0.88, 0.06, 40), new T.MeshStandardMaterial({ color: new T.Color((PET_BEDS[P.bed] || PET_BEDS[0])[0]).offsetHSL(0, -0.1, 0.12), roughness: 0.98 }));
  cush.position.y = 0.03; cush.receiveShadow = true; g.add(cush);
  const rim = new T.Mesh(new T.TorusGeometry(bedR * 0.9, cat ? 0.065 : 0.075 * Math.max(0.9, s), 18, 48), bedM); rim.rotation.x = Math.PI / 2; rim.position.y = cat ? 0.07 : 0.075; rim.castShadow = true; rim.receiveShadow = true; g.add(rim);
  // the animal, curled up on the cushion
  const pet = new T.Group(); pet.position.y = 0.06; g.add(pet);
  const body = new T.Group(); pet.add(body);
  const head = new T.Group(); pet.add(head);
  let tail: any = null; const ears: any[] = [], paws: any[] = [];
  if (!cat) {
    sph(0.18 * s, 0.13 * s, 0.17 * s, furM, 0.1 * s, 0.13 * s, -0.02 * s, body);            // chest
    sph(0.19 * s, 0.13 * s, 0.18 * s, furM, -0.13 * s, 0.12 * s, 0.03 * s, body);          // hips
    sph(0.12 * s, 0.07 * s, 0.07 * s, furM, -0.1 * s, 0.07 * s, 0.17 * s, body);           // the folded hind leg
    sph(0.1 * s, 0.08 * s, 0.1 * s, lightM, 0.16 * s, 0.1 * s, 0.09 * s, body);            // the chest's light patch
    for (const z of [0.05, 0.14]) { const pw = new T.Group(); pw.position.set(0.18 * s, 0.035 * s, z * s); body.add(pw); sph(0.12 * s, 0.035 * s, 0.035 * s, furM, 0.08 * s, 0, 0, pw); sph(0.035 * s, 0.03 * s, 0.04 * s, lightM, 0.19 * s, 0, 0, pw); paws.push(pw); }
    head.position.set(0.3 * s, 0.1 * s, 0.1 * s); head.rotation.y = -0.35;
    sph(0.105 * s, 0.09 * s, 0.1 * s, furM, 0, 0, 0, head);                                  // skull
    const sn = sph(0.075 * s, 0.05 * s, 0.055 * s, lightM, 0.1 * s, -0.025 * s, 0, head);    // muzzle
    sph(0.02 * s, 0.016 * s, 0.022 * s, noseM, 0.17 * s, -0.012 * s, 0, head); void sn;
    for (const z of [-0.045, 0.045]) { const e = new T.Mesh(new T.BoxGeometry(0.004 * s, 0.003 * s, 0.026 * s), darkM); e.position.set(0.075 * s, 0.03 * s, z * s); e.rotation.y = z > 0 ? 0.3 : -0.3; head.add(e); }   // eyes, closed
    for (const z of [-1, 1]) {
      const ep = new T.Group(); ep.position.set(-0.01 * s, 0.06 * s, z * 0.075 * s); head.add(ep); ears.push(ep);
      if (P.ears === 'pointy') { const c = new T.Mesh(new T.ConeGeometry(0.035 * s, 0.08 * s, 16), furM); c.position.y = 0.035 * s; c.rotation.x = z * 0.25; c.castShadow = true; ep.add(c); }
      else { const f = sph(0.05 * s, 0.075 * s, 0.018 * s, furM, 0.01 * s, -0.05 * s, z * 0.01 * s, ep); f.rotation.x = z * 0.35; }
    }
    const curve = new T.CatmullRomCurve3([[-0.3, 0.1, 0.0], [-0.33, 0.06, 0.13], [-0.18, 0.045, 0.25], [0.02, 0.04, 0.27], [0.14, 0.04, 0.24]].map(p => new T.Vector3(p[0] * s, p[1] * s, p[2] * s)));
    tail = new T.Mesh(new T.TubeGeometry(curve, 24, 0.032 * s, 10, false), furM); tail.castShadow = true; body.add(tail);
  } else {
    sph(0.21 * s, 0.13 * s, 0.19 * s, furM, -0.02 * s, 0.12 * s, 0, body);                 // the curled body
    sph(0.12 * s, 0.09 * s, 0.1 * s, lightM, 0.08 * s, 0.09 * s, 0.07 * s, body);          // the chest
    for (const z of [0.07, 0.13]) { const pw = new T.Group(); pw.position.set(0.12 * s, 0.03 * s, z * s); body.add(pw); sph(0.05 * s, 0.025 * s, 0.025 * s, lightM, 0.03 * s, 0, 0, pw); paws.push(pw); }
    head.position.set(0.15 * s, 0.11 * s, 0.09 * s); head.rotation.set(0.25, -0.6, 0.2);
    sph(0.085 * s, 0.075 * s, 0.08 * s, furM, 0, 0, 0, head);
    sph(0.04 * s, 0.03 * s, 0.045 * s, lightM, 0.06 * s, -0.02 * s, 0, head);
    sph(0.012 * s, 0.009 * s, 0.014 * s, noseM, 0.095 * s, -0.012 * s, 0, head);
    for (const z of [-0.032, 0.032]) { const e = new T.Mesh(new T.BoxGeometry(0.003 * s, 0.003 * s, 0.022 * s), darkM); e.position.set(0.07 * s, 0.018 * s, z * s); e.rotation.y = z > 0 ? 0.35 : -0.35; head.add(e); }
    for (const z of [-1, 1]) {
      const ep = new T.Group(); ep.position.set(-0.01 * s, 0.06 * s, z * 0.045 * s); head.add(ep); ears.push(ep);
      const c = new T.Mesh(new T.ConeGeometry(0.03 * s, 0.07 * s, 3), furM); c.position.y = 0.025 * s; c.rotation.set(z * 0.3, 0, 0); c.castShadow = true; ep.add(c);
      const ci = new T.Mesh(new T.ConeGeometry(0.018 * s, 0.045 * s, 3), earInM); ci.position.set(0.006 * s, 0.022 * s, 0); ci.rotation.set(z * 0.3, 0, 0); ep.add(ci);
    }
    // the tail, round the front of the curl and over the paws
    const curve = new T.CatmullRomCurve3([[-0.2, 0.1, -0.06], [-0.18, 0.05, 0.14], [0.0, 0.04, 0.2], [0.16, 0.04, 0.16], [0.24, 0.05, 0.06]].map(p => new T.Vector3(p[0] * s, p[1] * s, p[2] * s)));
    tail = new T.Mesh(new T.TubeGeometry(curve, 28, 0.026 * s, 10, false), furM); tail.castShadow = true;
    const tg = new T.Group(); tg.add(tail); body.add(tg); tail = tg;
  }
  // tap it: it stirs
  const hit = new T.Mesh(new T.CylinderGeometry(bedR + 0.05, bedR + 0.05, 0.4, 16), new T.MeshBasicMaterial({ visible: false })); hit.position.y = 0.2; hit.userData.act = 'pet'; g.add(hit); A.hits = A.hits || []; A.hits.push(hit);
  A.pet = { g, body, head, ears, paws, tail, cat, s, nextEar: 4 + Math.random() * 6, nextTwitch: 8 + Math.random() * 10, ear: -1, earT: 0, tw: 0, stir: 0, h0: head.position.y, r0: head.rotation.z };
}

/** Each frame: slow breathing, and now and then an ear, the tail or a paw. */
function petStep(A: any, t: number, dt: number) {
  const P = A && A.pet; if (!P) return;
  const per = P.cat ? 2.6 : 3.6, br = Math.sin(t * 2 * Math.PI / per), deep = P.stir > 0 ? 1.8 : 1;
  P.body.scale.set(1 + 0.012 * br * deep, 1 + 0.035 * br * deep, 1 + 0.02 * br * deep);
  P.head.position.y = P.h0 + 0.004 * P.s * br * deep;
  // an ear twitches
  if (t > P.nextEar) { P.ear = Math.random() < 0.5 ? 0 : 1; P.earT = 0; P.nextEar = t + 6 + Math.random() * 14; }
  if (P.ear >= 0) { P.earT += dt; const k = P.earT < 0.35 ? Math.sin(P.earT / 0.35 * Math.PI * 2) * (1 - P.earT / 0.35) : 0; P.ears[P.ear].rotation.x = 0.35 * k * (P.ear ? 1 : -1); if (P.earT > 0.35) { P.ears[P.ear].rotation.x = 0; P.ear = -1; } }
  // a cat's tail tip flicks; a dog's paws twitch in a dream
  if (t > P.nextTwitch) { P.tw = 1.2; P.nextTwitch = t + 10 + Math.random() * 18; }
  if (P.tw > 0) {
    P.tw = Math.max(0, P.tw - dt); const k = Math.sin(P.tw * 18) * Math.min(1, P.tw);
    if (P.cat && P.tail) P.tail.rotation.y = 0.08 * k;
    else for (const pw of P.paws) pw.rotation.z = 0.12 * k;
  }
  // tapped: it lifts its head a little, then settles again
  if (P.stir > 0) { P.stir = Math.max(0, P.stir - dt); const k = Math.sin(Math.min(1, (2.4 - P.stir) / 2.4) * Math.PI); P.head.rotation.z = P.r0 + 0.25 * k; }
}

/** Tapped in the office: it stirs, and sleeps on. */
function petStir(A: any) {
  const P = A && A.pet; if (!P || P.stir > 0) return;
  P.stir = 2.4; P.ear = 0; P.earT = 0;
  const p = petData(); try { toast(`${p.name || (P.cat ? 'Your cat' : 'Your dog')} stirs, and sleeps on`, 'info'); } catch (e) { /* no ui */ }
}

/* ---------- choosing and making your pet (with your pilot's look) ---------- */
function petEditorHtml(p: Pet): string {
  const k = p.kind === 'none' ? 'dog' : p.kind, coats = PET_COATS[k];
  const opt = (key: string, v: string, lab: string, cur: any) => `<button class="le-opt ${String(cur) === v ? 'on' : ''}" data-act="pet-set" data-k="${key}" data-v="${v}">${lab}</button>`;
  return `<div class="le-group"><b>Your pet</b><p class="muted">Asleep in its bed by the bookshelf in your office.</p><div class="le-opts">${opt('kind', 'dog', 'A dog', p.kind)}${opt('kind', 'cat', 'A cat', p.kind)}${opt('kind', 'none', 'No pet', p.kind)}</div></div>
    ${p.kind === 'none' ? '' : `
    <div class="le-group"><b>Name</b><input class="le-in" data-pet-name value="${esc(p.name || '')}" maxlength="24" autocomplete="off" placeholder="${p.kind === 'cat' ? 'Mittens' : 'Buddy'}"></div>
    <div class="le-group"><b>Coat</b><div class="le-sw">${coats.map((c, i) => `<button class="sw ${p.coat === i ? 'on' : ''}" style="--c:${c[0]}" data-act="pet-set" data-k="coat" data-v="${i}" aria-label="${c[1]}" title="${c[1]}"></button>`).join('')}</div></div>
    <div class="le-group"><b>Markings</b><div class="le-opts">${opt('white', '1', 'White chest and paws', p.white ? '1' : '0')}${opt('white', '0', 'All one colour', p.white ? '1' : '0')}</div></div>
    ${p.kind === 'dog' ? `<div class="le-group"><b>Size</b><div class="le-opts">${opt('size', 's', 'Small', p.size)}${opt('size', 'm', 'Medium', p.size)}${opt('size', 'l', 'Large', p.size)}</div></div>
    <div class="le-group"><b>Ears</b><div class="le-opts">${opt('ears', 'floppy', 'Floppy', p.ears)}${opt('ears', 'pointy', 'Pointed', p.ears)}</div></div>` : ''}
    <div class="le-group"><b>Bed</b><div class="le-sw">${PET_BEDS.map((c, i) => `<button class="sw ${p.bed === i ? 'on' : ''}" style="--c:${c[0]}" data-act="pet-set" data-k="bed" data-v="${i}" aria-label="${c[1]} bed" title="${c[1]}"></button>`).join('')}</div></div>
    <p class="fine-print">${icon('info')}Your ${p.kind} is there the next time you go into your office.</p>`}`;
}
