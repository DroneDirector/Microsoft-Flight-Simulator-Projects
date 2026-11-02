// Taking a member of staff to court. When a conduct report is about something that endangered an aircraft or
// people, or broke the law (a skipped safety check, an aircraft hit with a vehicle, maintenance signed off
// without the paperwork, checklist shortcuts, reckless driving on the apron…), or the person was part of an
// accident, you can report it to the police: from your office (after talking to them, or straight from the list
// of reports) or from the report itself. The prosecutor charges them and you take part in the trial in the
// courtroom (court3d.ts):
//  - Day one: you are the prosecution's witness. The report and the person's record are shown as exhibits;
//    the prosecutor, the defence and the judge question you. Telling it as it is helps the case; exaggerating
//    can be found out, and it costs the case and your company rating.
//  - Day two: the defendant takes the stand and you put your own questions (open, confronting them with the
//    evidence, or pressing hard); how they answer depends on the kind of person they are (honest, defensive,
//    dismissive or lying, the same as in your office). A colleague is heard, both sides close, and you make
//    your statement as the injured party: leniency, a fair hearing or the full penalty, and damages.
//  - Then the verdict and the sentence, read out in court. They are suspended while the case runs. Found guilty,
//    prison or a lost licence ends the job, otherwise you decide; acquitted, they come back to work.

/** The reports that can go to court: what the charge is and the range of sentences. */
const COURT_REPORTABLE: { [title: string]: { charge: string; months: number[]; fine: number[]; licence?: boolean; damage?: number } } = {
  'Skipped a safety check': { charge: 'Endangering the safety of an aircraft by not carrying out the cabin safety checks', months: [0, 6], fine: [2000, 12000] },
  'Hit an aircraft with a vehicle': { charge: 'Damaging an aircraft through negligence and endangering its safety', months: [0, 6], fine: [3000, 20000], damage: 60000 },
  'Tools left on the apron': { charge: 'Endangering the safety of aircraft by leaving objects on the apron', months: [0, 4], fine: [1000, 8000] },
  'Paperwork not signed': { charge: 'Returning an aircraft to service without valid certification', months: [0, 12], fine: [5000, 30000], licence: true },
  'Checklist shortcuts': { charge: 'Endangering the safety of a flight by not following the required procedures', months: [0, 12], fine: [3000, 25000], licence: true },
  'Drove too fast on the apron': { charge: 'Reckless driving airside, endangering aircraft and people', months: [0, 3], fine: [800, 5000] },
  'Threw passengers\' bags': { charge: 'Criminal damage to passengers\' property', months: [0, 3], fine: [500, 4000], damage: 4000 },
};
const COURT_ACCIDENT = { charge: 'Endangering the safety of aviation, contributing to an accident', months: [0, 24], fine: [5000, 40000], licence: true };

/** Can this report be taken to court? */
function courtReportable(inc: any): boolean { return !!inc && inc.status === 'open' && (!!COURT_REPORTABLE[inc.title] || !!inc.accident) && !!staffById(inc.staffId); }

/** Report it to the police: the case opens with its hearings, the person is suspended, the report is closed. */
function courtBringCase(inc: any): any {
  const p: any = staffById(inc.staffId); if (!p) return null;
  const r0: string = personRole(p), role = r0 === 'captain' ? 'pilot' : r0, def: any = COURT_REPORTABLE[inc.title] || COURT_ACCIDENT;
  const list = (OFFENCES as any)[role] || ((OFFENCES as any)[role] = []);
  let idx = list.findIndex((o: any) => o.title === inc.title);
  if (idx < 0) { list.push({ w: 0, title: inc.title, charge: def.charge, text: inc.text, months: def.months, fine: def.fine, licence: def.licence }); idx = list.length - 1; }
  const n0 = ((State as any).cases || []).length;
  openCourtCase(p, role, idx);
  const c: any = ((State as any).cases || [])[0]; if (!c || ((State as any).cases || []).length === n0) return null;
  c.brought = true; c.incId = inc.id; c.summary = inc.text; c.guiltyP = 0.55;
  c.offDef = { w: 0, title: inc.title, charge: def.charge, text: inc.text, months: def.months, fine: def.fine, licence: def.licence };   // kept with the case (the sentence range)
  c.ch.stance = 'evidence';   // you hand the police everything you have
  const iv: any = inc.interview || {};
  c.hear = { kind: 'staff', pAdj: 0, sevK: 1, lies: 0, honest: 0, absent: 0, rating: 0, standIn: null, log: [] as string[], appealAdj: 0,
    att: iv.attitude || ofAttitude(p), talked: !!inc.interview, warnings: p.warnings || 0, damage: def.damage || 0, claim: false, plea: 'lenient' };
  const st = c.stages, i1 = st.findIndex((s: any) => s.key === 'trial1'), i2 = st.findIndex((s: any) => s.key === 'trial2');
  if (i1 >= 0) Object.assign(st[i1], { key: 'hear1', title: 'Trial, day one: the charge and your evidence', text: '' });
  if (i2 >= 0) Object.assign(st[i2], { key: 'hear2', title: 'Trial, day two: the defendant, the witnesses and the closing', text: '' });
  st[0].text = `You reported ${p.name} to the police: ${inc.title.toLowerCase()}. ${inc.text} The police and ${c.authority} have opened an investigation, and ${p.name} is suspended from all duties.`;
  inc.status = 'court'; inc.caseId = c.id;
  try { Sound.chime(); } catch (e) { /* quiet */ }
  Store.save();
  return c;
}

/** What the defendant says, by the kind of person they are. */
const CS_SAY: { [k: string]: { [att: string]: string[] } } = {
  facts: {
    honest: ['I did it. {did_cap}. I knew it was wrong while I was doing it, and I am sorry.'],
    defensive: ['Yes, I {did}. But you have to understand the situation: {excuse}'],
    dismissive: ['It happens every day at every airline. I {did}, fine. Nobody got hurt.'],
    lying: ['That is not what happened. I {claim}.'],
  },
  evidence: {
    honest: ['That is my signature, and that is what happened. I won\'t pretend otherwise.'],
    defensive: ['…Yes. The report is right. I {did}. I should have stopped and said something.'],
    dismissive: ['If that\'s what it says. I {did}. I still don\'t see why this is a court matter.'],
    lying: ['I… That must be a mistake in the report. I {claim}.', 'I don\'t remember that. I {claim}.'],
  },
  pressure: {
    honest: ['You don\'t need to shout. Yes, I did it, and I regret it.'],
    defensive: ['All right! Yes! I {did}. Are you happy now?'],
    dismissive: ['I\'m not answering that.'],
    lying: ['I {claim}, and I won\'t be bullied into saying anything else.'],
  },
  last: {
    honest: ['I let my colleagues and the passengers down. Whatever the court decides, I accept it.'],
    defensive: ['I made a mistake on a bad day. I hope the court sees the whole picture.'],
    dismissive: ['I have nothing more to say.'],
    lying: ['I have done nothing wrong, and I hope the court sees that.'],
  },
};

function csFill(c: any, t: string): string {
  const ad = (typeof OF_ADMIT !== 'undefined' && OF_ADMIT[c.offence]) || ['did what the report says', 'It was a difficult day, and we were short of people.', 'did my job properly'];
  return t.replace('{did_cap}', ad[0].charAt(0).toUpperCase() + ad[0].slice(1)).replace(/\{did\}/g, ad[0]).replace('{excuse}', ad[1]).replace('{claim}', ad[2]);
}

/** Your question to the defendant: their answer, what follows, and what it does to the case. */
function courtStaffAsk(c: any, kind: string): { answer: string; note: string; d: number } {
  const h = c.hear, att: string = h.att || 'defensive', L = CS_SAY[kind] && CS_SAY[kind][att] || CS_SAY.facts.defensive;
  const answer = csFill(c, L[Math.floor(Math.random() * L.length)]);
  let note = '', d = 0;
  if (kind === 'facts') { h.pAdj += att === 'honest' ? 0.08 : att === 'defensive' ? 0.04 : att === 'dismissive' ? 0.03 : -0.02; if (att === 'defensive') h.sevK *= 0.95; }
  else if (kind === 'evidence') {
    if (att === 'lying') { h.pAdj += 0.12; h.caught = (h.caught || 0) + 1; note = 'The court notes that the defendant\'s answer does not agree with the report or the records.'; d = 0.4; }
    else { h.pAdj += 0.06; d = 0.2; }
  } else if (kind === 'pressure') {
    if (att === 'defensive') { h.pAdj += 0.06; }
    else if (att === 'honest') { h.pAdj += 0.03; note = 'There is no need to raise your voice. The witness is answering.'; d = -0.3; }
    else { h.pAdj -= 0.03; note = 'Objection sustained. The injured party will put proper questions to the defendant.'; d = -0.5; }
  }
  if (d) hearRate(c, d, kind === 'evidence' && att === 'lying' ? 'Caught the defendant out with the evidence' : kind === 'pressure' ? 'Bullying a witness' : 'A good question');
  h.log.push('ask:' + kind + ':' + att);
  return { answer, note, d };
}

/** Your answers as a witness (day one) and your statement (day two). */
function hearingScoreStaff(c: any, q: HearQ, kind: string, quiet?: boolean): { say: string; d: number } {
  const h = c.hear; let d = 0, say = (q.after && q.after[kind]) || '';
  switch (kind) {
    case 'honest': h.honest++; h.pAdj += q.truth ? 0.03 : 0.02; d = 0.6; break;
    case 'lie':   // an exaggeration or a denial the records contradict: found out more often than not
      h.lies++; if (Math.random() < 0.65) { h.pAdj -= 0.12; d = -2; say = (q.after && q.after.caught) || 'That is not what the records show. The court will weigh your evidence accordingly.'; } else { h.pAdj += 0.02; d = -0.3; } break;
    case 'deflect': h.pAdj -= 0.03; d = -0.3; break;
    case 'silent': d = 0; break;
    case 'sorry': h.plea = 'lenient'; h.sevK *= 0.8; d = 1; break;      // ask for leniency
    case 'defend': h.plea = 'fair'; d = 0.8; break;                        // a fair hearing, nothing more
    case 'act': h.plea = 'full'; h.sevK *= 1.15; d = -0.4; break;          // the full penalty
    case 'settle': h.claim = true; d = 0; break;                           // claim the damage back
    case 'nosettle': h.claim = false; d = 0.3; break;
  }
  if (!quiet && d) hearRate(c, d, kind === 'lie' ? 'An answer in court the records contradicted' : kind === 'honest' ? 'Honest evidence in court' : kind === 'sorry' ? 'Asked the court for leniency' : kind === 'act' ? 'Asked for the full penalty' : 'In court');
  h.log.push(q.id + ':' + kind);
  return { say, d };
}

/** The script of each day in court for a case you brought. */
function hearingScriptStaff(c: any, key: string): HearLine[] {
  const h = c.hear, co = company(c.companyId), me: any = myPilot(), p: any = staffById(c.staffId);
  const you = me ? me.name : 'the accountable manager', first = String(c.name).replace(/^Capt\.\s*/, '').split(/\s+/)[0];
  const court = c.court.replace(/^the /, 'The '), inc: any = ((State as any).incidents || []).filter((x: any) => x.id === c.incId)[0] || {};
  const role = p ? ROLE_NAMES[personRole(p)] : 'employee', when = (k: string) => { const s = c.stages.filter((x: any) => x.key === k)[0]; return s ? dateStr(new Date(s.at)) : 'the next sitting'; };
  const L: HearLine[] = [];
  let short = false; try { const r = personRole(p) as any, need = Math.max(1, Math.round(fleetOf(c.companyId).length * ({ fa: 4, mech: 1.5, ground: 1, fo: 1.2 } as any)[r] || 1)); short = staffOf(c.companyId, r).length < need * 0.8 || groupPayRatio(c.companyId, r).ratio < 0.9; } catch (e) { short = false; }
  if (key === 'hear1') {
    L.push({ who: 'clerk', text: `All rise. ${court} is now in session. The prosecution against ${c.name}, ${role.toLowerCase()} at ${co.name}.` });
    L.push({ who: 'judge', text: `Please be seated. ${c.name}, you are charged with ${c.charge.charAt(0).toLowerCase() + c.charge.slice(1)}. The prosecution calls its first witness: ${you}, who reported the matter for ${co.name}.` });
    L.push({ who: 'prosecutor', text: `Exhibit one: the conduct report.`, ex: { title: 'Exhibit 1 · Conduct report', rows: [['Date', inc.at ? atText(inc.at) : inc.date || ''], ['What happened', inc.title || c.offence], ['Report', inc.text || c.summary]], note: inc.interview ? `${you} spoke to ${first} about it in person before reporting it.` : undefined } });
    L.push({ who: 'prosecutor', text: `Exhibit two: ${first}'s record with the airline.`, ex: { title: `Exhibit 2 · Staff record, ${c.name}`, rows: [['Position', `${role}, based at ${p ? p.base : '—'}`], ['Rating', p && p.rating ? `${(+p.rating).toFixed(1)} of 5` : '—'], ['Earlier warnings', h.warnings ? String(h.warnings) : 'None']] } });
    L.push({ who: 'prosecutor', text: '', q: { id: 'tell', asker: 'prosecutor', truth: true, text: `${you}, please tell the court in your own words what happened.`,
      opts: [{ t: `Exactly what the report says: ${csFill(c, '{did}')}. That is what we know, nothing more.`, kind: 'honest' }, { t: `It was worse than the report says. ${first} has been careless for a long time, and everybody knew it.`, kind: 'lie' }, { t: 'I wasn\'t there myself. I only know what I was told.', kind: 'deflect' }],
      after: { honest: 'Thank you. That is clear.', caught: 'The report says nothing of the kind, and neither does the record. The court will weigh your evidence accordingly.', deflect: 'Then the court will rely on the report.' } } });
    L.push({ who: 'lawyer', text: '', q: { id: 'short', asker: 'prosecutor', truth: short, text: `${you}, isn't it true that your airline is short of people, and pays below the going rate, so that staff like ${first} are pushed to cut corners?`,
      opts: short ? [{ t: 'We are short of people, yes, and pay could be better. That does not make what happened right, but it is true.', kind: 'honest' }, { t: 'No. We are fully staffed and pay well.', kind: 'lie' }]
        : [{ t: 'No. The department is fully staffed and paid at the going rate, as the payroll shows.', kind: 'honest' }, { t: 'Every airline has its pressures.', kind: 'deflect' }],
      after: { honest: short ? 'Thank you for your frankness. No further questions.' : 'The payroll agrees. No further questions.', caught: 'Your own payroll and rosters say otherwise. No further questions.', deflect: 'That is not what I asked. No further questions.' } } });
    L.push({ who: 'judge', text: '', q: { id: 'talked', asker: 'judge', truth: !!h.talked, text: `Did you speak to ${first} about it yourself before you went to the police?`,
      opts: h.talked ? [{ t: `Yes. I had ${first} in my office and heard their side first.`, kind: 'honest' }, { t: 'There was no need. The report was clear.', kind: 'deflect' }]
        : [{ t: 'No, I went straight to the police. The matter was too serious.', kind: 'honest' }, { t: `Yes, we had a long talk about it.`, kind: 'lie' }],
      after: { honest: 'The court notes it.', caught: 'There is no record of any such meeting. The court notes it.', deflect: 'The court notes it.' } } });
    L.push({ who: 'judge', text: `Thank you, ${you}, you may step down. The court will hear the defendant on ${when('hear2')}. The court is adjourned.` });
  } else if (key === 'hear2') {
    const mates: any[] = p ? staffOf(c.companyId, personRole(p) as any).filter((x: any) => x.id !== p.id) : [], mate = mates[0];
    L.push({ who: 'clerk', text: `All rise. The court is in session. The trial of ${c.name} continues.` });
    L.push({ who: 'judge', text: `Please be seated. ${c.name}, please take the stand. ${co.name}, as the injured party, may put questions to the defendant.` });
    L.push({ who: 'defendantW', text: h.att === 'honest' ? 'I understand, your honour.' : h.att === 'lying' ? 'I have nothing to hide.' : 'Yes, your honour.' });
    const Q = (id: string): HearLine => ({ who: 'you', text: '', ask: { id, opts: [
      { t: id === 'a1' ? `${first}, tell the court what you did that day.` : id === 'a2' ? 'Why did you do it?' : 'Would you do the same again?', kind: 'facts' },
      { t: id === 'a1' ? `The report and your own signature say you ${csFill(c, '{did}')}. Is that right?` : id === 'a2' ? 'Exhibit one shows exactly what you did. How do you explain it?' : 'Look at your record. Do you accept what it says?', kind: 'evidence' },
      { t: id === 'a1' ? 'Just admit it. You know you did it.' : id === 'a2' ? 'You didn\'t care about anyone\'s safety, did you?' : 'You\'re lying to this court, aren\'t you?', kind: 'pressure' }] } } as any);
    L.push(Q('a1')); L.push(Q('a2')); L.push(Q('a3'));
    if (mate) L.push({ who: 'witness', text: h.att === 'honest' ? `${first} has always been a good colleague. What happened was out of character, and ${first} owned up to it straight away.` : h.att === 'lying' ? `I saw it happen. Afterwards ${first} told us to say nothing.` : `It happened as the report says. We were busy that day, but the rest of us still did things properly.` });
    L.push({ who: 'prosecutor', text: `Your honour, the evidence is clear. ${c.name} ${csFill(c, '{did}')}, and put aircraft and people at risk. The prosecution asks the court to find the defendant guilty.` });
    L.push({ who: 'lawyer', text: h.att === 'honest' ? `My client has admitted what happened and shown real remorse. We ask the court to take that into account.` : `My client was working under real pressure. We ask the court to weigh the whole picture before it decides.` });
    L.push({ who: 'judge', text: '', q: { id: 'statement', asker: 'judge', truth: true, decision: true, text: `${you}, as the injured party, what would you like to say to the court?`,
      opts: [{ t: `We want the court to decide fairly. Our concern is safety, not revenge.`, kind: 'defend' }, { t: `${first} has been a good colleague. We ask the court to be lenient.`, kind: 'sorry' }, { t: 'This put lives at risk. We ask for the full penalty.', kind: 'act' }],
      after: { defend: 'Thank you. The court notes it.', sorry: 'The court notes the airline\'s wish for leniency.', act: 'The court notes it. The sentence is a matter for the court.' } } });
    if (h.damage) L.push({ who: 'judge', text: '', q: { id: 'claim', asker: 'judge', truth: true, decision: true, text: `Does ${co.name} claim the cost of the damage, ${money(h.damage)}, from the defendant?`,
      opts: [{ t: 'Yes. We claim the cost of the damage.', kind: 'settle' }, { t: 'No. We won\'t claim it.', kind: 'nosettle' }], after: { settle: 'The claim is noted.', nosettle: 'Noted.' } } });
    L.push({ who: 'defendant', text: csFill(c, CS_SAY.last[h.att || 'defensive'][0]) });
    L.push({ who: 'judge', text: `The court has heard the evidence. It will give its verdict on ${when('verdict')}. The court is adjourned.` });
  } else if (key === 'verdict') {
    const guilty = c.status === 'guilty';
    L.push({ who: 'clerk', text: `All rise. ${court} is in session for the verdict in the case of ${c.name}.` });
    L.push({ who: 'judge', text: guilty ? `Please be seated. ${c.name}, the court finds you guilty of ${c.charge.charAt(0).toLowerCase() + c.charge.slice(1)}. The sentence is ${c.sentence}.${h.claim && h.damage ? ` You will also pay ${co.name} ${money(h.damage)} for the damage.` : ''}` : `Please be seated. ${c.name}, the court finds you not guilty. You are free to go.` });
    L.push({ who: 'defendant', text: guilty ? (h.att === 'honest' ? 'I understand. Thank you, your honour.' : h.att === 'lying' ? 'This is wrong. I will appeal.' : 'I see.') : 'Thank you, your honour.' });
    L.push({ who: 'judge', text: 'The case is closed. The court is adjourned.' });
  }
  return L;
}

/** After the verdict of a case you brought: the job, the damages, the person back at work if acquitted. */
function courtStaffAftermath(c: any, guilty: boolean) {
  const h = c.hear, co: any = company(c.companyId);   // the job itself is settled by courtAftermath
  if (guilty && h.claim && h.damage && co) payTxn(co.id, `Damages from ${c.name}: ${c.offence}`, h.damage, 'other', [[c.court, h.damage]]);
  State.notices.unshift({ id: uid(), kind: 'authority' as any, title: `Verdict: ${c.name}`, body: guilty ? `Guilty of ${c.charge.charAt(0).toLowerCase() + c.charge.slice(1)}. ${c.sentence}.` : `Not guilty. ${c.name} returns to work.`, time: 'Now', at: Date.now(), read: false, ref: c.id } as any);
  h.verdictReady = true;
  try { toast('The verdict is in', 'warn', { label: 'Hear it in court', act: 'court-verdict', data: c.id }); } catch (e) { /* not ready */ }
}
