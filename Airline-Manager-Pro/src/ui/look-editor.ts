// Look editor: create or change a crew member's appearance, identity and clothing.
// Clothing options only swap complete garments, so an avatar is always fully dressed.

interface LookEditOpts {
  title: string; role: CrewRole; look: Look; identity?: { name: string; dob: string; nat: string };
  sexOnly?: boolean; onAccept: (look: Look, identity?: { name: string; dob: string; nat: string }) => void;
}

let _le: { o: LookEditOpts; look: Look; id: { name: string; dob: string; nat: string }; tab: string } = null;

const LE_TABS = [['person', 'Person'], ['face', 'Face'], ['hair', 'Hair'], ['outfit', 'Outfit']];

function openLookEditor(o: LookEditOpts) {
  _le = { o, look: JSON.parse(JSON.stringify(dressed(o.look, o.role))), id: o.identity ? Object.assign({}, o.identity) : null, tab: o.identity ? 'person' : 'face' };
  if (o.sexOnly) _le.tab = 'person';
  openLayer('modal', lookEditorHtml(), { cls: 'full look-pop' });
}

function leChoice(key: string, opts: string[][], cur: any): string {
  return `<div class="le-opts">${opts.map(op => `<button class="le-opt ${String(cur) === op[0] ? 'on' : ''}" data-act="le-set" data-k="${key}" data-v="${op[0]}">${op[1]}</button>`).join('')}</div>`;
}
function leSwatches(key: string, colors: string[], cur: number): string {
  return `<div class="le-sw">${colors.map((c, i) => `<button class="sw ${cur === i ? 'on' : ''}" style="--c:${c}" data-act="le-set" data-k="${key}" data-v="${i}" aria-label="Colour ${i + 1}"></button>`).join('')}</div>`;
}

function lookEditorBody(): string {
  const L = _le.look, role = _le.o.role, id = _le.id, t = _le.tab;
  if (_le.o.sexOnly) {
    return `<div class="le-group"><b>Male or female</b><p class="muted">The rest of the look and the uniform are chosen automatically.</p>${leChoice('sex', [['m', 'Male'], ['f', 'Female']], L.sex)}</div>
      ${role === 'captain' || role === 'fo' ? `<div class="le-group"><b>Pilot's cap</b>${leChoice('hat', [['none', 'No cap'], ['cap', 'Wear the cap']], L.hat)}</div>` : ''}
      <div class="le-group"><button class="btn ghost" data-act="le-shuffle">${icon('sync')}Another person</button></div>`;
  }
  if (t === 'person') return `
    ${id ? `<div class="le-group"><b>Name</b><input class="le-in" data-le-name value="${esc(id.name)}" maxlength="40" autocomplete="off"></div>
    <div class="le-row2">
      <div class="le-group"><b>Date of birth</b><input class="le-in" type="date" data-le-dob value="${esc(id.dob)}" min="1940-01-01" max="2008-12-31"></div>
      <div class="le-group"><b>Nationality</b><select class="le-in" data-le-nat>${countriesSorted().map(c => `<option value="${c[0]}" ${c[0] === id.nat ? 'selected' : ''}>${flag(c[0])} ${esc(c[1])}</option>`).join('')}</select></div>
    </div>` : ''}
    <div class="le-group"><b>Male or female</b>${leChoice('sex', [['m', 'Male'], ['f', 'Female']], L.sex)}</div>
    <div class="le-group"><b>Skin tone</b>${leSwatches('skin', SKIN_TONES, L.skin)}</div>`;
  if (t === 'face') return `
    <div class="le-group"><b>Face shape</b>${leChoice('face', [['oval', 'Oval'], ['round', 'Round'], ['square', 'Square'], ['long', 'Long']], L.face)}</div>
    <div class="le-group"><b>Eyes</b>${leChoice('eyes', [['almond', 'Almond'], ['round', 'Round'], ['mono', 'Monolid']], L.eyes)}</div>
    <div class="le-group"><b>Nose</b>${leChoice('nose', [['narrow', 'Narrow'], ['medium', 'Medium'], ['wide', 'Wide']], L.nose)}</div>
    <div class="le-group"><b>Lips</b>${leChoice('lips', [['thin', 'Thin'], ['medium', 'Medium'], ['full', 'Full']], L.lips)}</div>
    ${L.sex === 'm' ? `<div class="le-group"><b>Beard</b>${leChoice('facial', [['none', 'None'], ['stubble', 'Stubble'], ['short', 'Short beard'], ['full', 'Full beard'], ['goatee', 'Goatee'], ['vandyke', 'Van Dyke']], L.facial === 'beard' ? 'short' : L.facial)}</div>
    <div class="le-group"><b>Moustache</b>${leChoice('facial', [['pencil', 'Pencil'], ['chevron', 'Chevron'], ['walrus', 'Walrus'], ['handlebar', 'Handlebar'], ['horseshoe', 'Horseshoe']], L.facial === 'moustache' ? 'chevron' : L.facial)}</div>` : ''}
    <div class="le-group"><b>Glasses</b>${leChoice('glasses', [['none', 'No glasses'], ['rect', 'Rectangular'], ['round', 'Round'], ['aviator', 'Aviator'], ['sunglasses', 'Pilot sunglasses']], L.glasses)}</div>`;
  if (t === 'hair') return `
    <div class="le-group"><b>Hairstyle</b>${leChoice('hair', Object.keys(HAIR_STYLES).map(k => [k, HAIR_STYLES[k]]), L.hair)}</div>
    <div class="le-group"><b>Hair colour</b>${leSwatches('hairColor', HAIR_COLORS, L.hairColor)}</div>`;
  const mech = role === 'mech', G = garmentOptions(L.sex, role);
  return `
    ${mech ? `<p class="fine-print">${icon('info')}Mechanics always wear overalls with a high-visibility vest.</p>` : `
    <div class="le-group"><b>Top</b>${leChoice('top', G.top, L.top)}</div>
    <div class="le-group"><b>Bottom</b>${leChoice('bottom', G.bottom, L.bottom)}</div>
    <div class="le-group"><b>Neckwear</b>${leChoice('neck', G.neck, L.neck)}</div>`}
    <div class="le-group"><b>Shoes</b>${leChoice('shoes', G.shoes, L.shoes)}</div>
    <div class="le-group"><b>Hat</b>${leChoice('hat', G.hat, L.hat)}</div>
    <div class="le-group"><b>Uniform colour</b>${leSwatches('uniform', UNIFORM_COLORS, L.uniform)}</div>`;
}

function lookEditorHtml(): string {
  const c = company();
  return `
  <div class="le">
    <div class="le-stage">
      <div class="le-spot"></div>
      <div class="le-fig" data-le-fig>${avatarSvg(_le.look, _le.o.role, { accent: c.color })}</div>
      <button class="btn ghost sm le-rand" data-act="le-shuffle">${icon('sync')}Surprise me</button>
    </div>
    <div class="le-side">
      <div class="modal-head"><div><h2>${esc(_le.o.title)}</h2><small>${_le.o.sexOnly ? '' : 'Everyone is always in uniform: you can swap any garment, never remove it.'}</small></div>
        <button class="icon-btn" data-act="close-layer" aria-label="Close without saving">${icon('close')}</button></div>
      ${_le.o.sexOnly ? '' : `<div class="tabs">${LE_TABS.filter(x => x[0] !== 'person' || true).map(x => `<button class="tab ${_le.tab === x[0] ? 'on' : ''}" data-act="le-tab" data-t="${x[0]}">${x[1]}</button>`).join('')}</div>`}
      <div class="le-body" data-le-body>${lookEditorBody()}</div>
      <div class="modal-actions"><button class="btn ghost" data-act="close-layer">Cancel</button><button class="btn primary" data-act="le-accept">${icon('check')}Accept</button></div>
    </div>
  </div>`;
}

function leRefresh(body?: boolean) {
  const fig = $('[data-le-fig]'); if (fig) fig.innerHTML = avatarSvg(_le.look, _le.o.role, { accent: company().color });
  if (body) { const b = $('[data-le-body]'); if (b) b.innerHTML = lookEditorBody(); }
}
function leReadIdentity() {
  if (!_le.id) return;
  const n = $('[data-le-name]') as HTMLInputElement, d = $('[data-le-dob]') as HTMLInputElement, nt = $('[data-le-nat]') as HTMLSelectElement;
  if (n) _le.id.name = n.value.trim() || _le.id.name;
  if (d && d.value) _le.id.dob = d.value;
  if (nt) _le.id.nat = nt.value;
}

ACTIONS['le-tab'] = el => {
  leReadIdentity(); _le.tab = el.getAttribute('data-t'); Sound.tick();
  $all('.look-pop .tab').forEach(t => t.classList.toggle('on', t.getAttribute('data-t') === _le.tab));
  leRefresh(true);
};
ACTIONS['le-set'] = el => {
  leReadIdentity();
  const k = el.getAttribute('data-k'), v = el.getAttribute('data-v');
  (_le.look as any)[k] = /^(skin|hairColor|uniform)$/.test(k) ? +v : v;
  if (k === 'sex' && _le.o.sexOnly) { const hat = _le.look.hat; _le.look = randomLook('cp' + Math.random(), v as any, _le.o.role); _le.look.hat = hat; }
  if (k === 'top' && v === 'overalls') _le.look.bottom = 'trousers';
  _le.look = dressed(_le.look, _le.o.role);
  Sound.tick(); leRefresh(true);
};
ACTIONS['le-shuffle'] = () => {
  leReadIdentity();
  const keep = _le.look.sex, hat = _le.look.hat;
  _le.look = randomLook('shuffle' + Math.random(), keep, _le.o.role);
  if (_le.o.sexOnly) _le.look.hat = hat;
  if (!_le.o.sexOnly) _le.look.top = dressed(_le.look, _le.o.role).top;
  Sound.tick(); leRefresh(true);
};
ACTIONS['le-accept'] = () => {
  leReadIdentity();
  const o = _le.o, look = dressed(_le.look, o.role), id = _le.id;
  closeTop();
  Haptics.success();
  o.onAccept(look, id);
};
