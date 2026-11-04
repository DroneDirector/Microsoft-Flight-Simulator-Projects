# Security: how it works and how to extend it

Your airline's own security officers (Crew → Security). Everything is behind one switch,
Settings → Staff → Security officers (`secOn()`); switching it off pauses the feature without losing anyone hired.

## Files

| File | What is in it |
|---|---|
| `src/core/security.ts` | Hiring (`makeSecurity`), coverage (`secQuality`), sending Security for a drunk passenger (`secEscort`), the outcome and the officer's record (`secOutcome`), overnight reports and conduct reports (`secAdvance`), the way out of each place (`SEC_EXIT`). |
| `src/screens/sec-incident.ts` | The incident you see in the lounge: the plan (`secPlan`), the lines (`SEC_LINES`), the steps (`SEC_STEPS`), speaking, the taser, the fall, the cuffs, the escort, the rules (`secRule`). |
| `src/core/lounge-drunk.ts` | Drunk passengers: how drunk, the decision (let them board, send Security, deny boarding). |
| `src/graphics/avatar.ts`, `src/graphics/human.ts` | The officers' clothes (`garmentOptions(sex, role, true)`), hats (peaked cap, baseball cap, beret), the print on the chest and back. |
| `www/models/security-props/` | `taser.glb`, `handcuffs.glb`: replace them with your own (see `www/models/README.md`). |

## The incident

1. **The plan** (`secPlan`): worked out once, so the notice and what you see agree. The guest's temper (sorry, confused,
   angry), how many times they refuse, and whether the lead officer breaks a rule. Very drunk or heavy drinkers are
   likelier to be angry and to refuse many times. Only a guest who refuses seven warnings is tased.
2. **The steps** (`SEC_STEPS`): `arrive`, `talk`, `gaveIn`, `radio`, `tase`, `run`, `cuff`, `lift`, `cuffStanding`,
   `escort`, `gone`. Each step is `{ id, run(I, dt, now) }` and returns true when done; a step may jump to another by id.
   To add a step, add an entry and send to it by id from the step before.
3. **Speaking**: one voice at a time, the lead officer first. The words also show at the bottom of the screen.
   An angry guest may cut in during a long instruction (`cut`); short commands usually get through.
   Voices are the game's own (`pax|sex|mood|name`). If the voice pack isn't ready, the device's voice speaks, with one small note.
4. **Escalation**: warnings 1 to 3 get firmer, the 4th draws the taser with a warning, 5 and 6 are firmer, the 7th is
   shouted. Still refusing: tased, fall, run, cuffs behind the back, lifted, walked out (one officer behind holding
   them, the other alongside) to the way out (`secExit('lounge')`).
5. **Police**: with tasers forbidden (Crew → Security → Your rules), after the 3rd refusal the second officer radios the
   police. Two city police officers come in (same uniform, random hat, shoes and pair) and take over from warning 4.

## The lines

`SEC_LINES` is plain data: each list is a set of ways to say one thing. `{sir}` / `{Sir}` become sir or madam.
Add lines to any list; add a new list and use it from a step with `secLine(SEC_LINES.yourList, I.sex)`.

## The rules and the officers' record

`State.secRules` holds the airline's rules (`taser`: on unless switched off). `secRule(key)` reads one.
Kept to the rules: the officer's rating rises a little. A taser used against the rules, or too early: the rating drops
and a conduct report opens (`State.incidents`). To add a rule: a key in `secRules`, a switch in the Security tab
(`data-act="sec-rule"`), and a check in `secPlan`/`secOutcome`.

## Other places

The incident runs in the lounge. For another room, give it a way out in `SEC_EXIT`, a guest object with
`x, z, yaw, pivot, holder, m, P.name`, and call `secIncident` and `secIncStep` from that room (the room's own object
plays the part of `LoungeRoom`: `A.root`, `A.door`, `root`, `q`).
