// Combo holds. A combo hit (a combo's second move on) that lands while an enemy is "weak" holds it in a light
// stagger: its attack is cancelled and it can't act, without being knocked down. Each combo hit keeps the hold
// going for HOLD_REFRESH, so it lasts until the combo is over.
// Weak: anything but a dangerous attack: idle, walking, chasing, recovering, staggered, a parryable attack, or the
// recovery after an unparryable attack has landed. Never weak: on its knees for a crit, parried, being riposted,
// dormant, dead, Varek's roar, Vael's sidestep.
// No stun-lock: time held adds up (across players; gaps under a second don't reset it, 2 s fully free does). Past
// LOCK_MAX a regular enemy shrugs free and can't be held for a few seconds; a boss or a brute breaks out with a
// burst of energy that pushes every player near it away (and hurts a little), then can't be held for 8 s.
// Runs on the host (or solo); teammates' combo hits reach it flagged in their hit message.
export const HOLD_REFRESH = 0.9, LOCK_MAX = 4, LOCK_RESET = 2;
const IMMUNE_REGULAR = 3, IMMUNE_BURST = 8;

// the boss / brute breakout: a ring of force from the body (8% of each player's max health; rolls dodge it)
export const HOLD_BURST = {
  dur: 1.0, unparryable: true, noHold: true,
  keys: [[0.2, { torso: [-0.35, 0, 0], armL: [-2.6, 0, 0.6], armR: [-2.6, 0, -0.6], foreL: [-0.4, 0, 0], foreR: [-0.4, 0, 0], head: [-0.4, 0, 0] }],
    [0.32, { torso: [0.3, 0, 0], armL: [-0.6, 0, 1.4], armR: [-0.6, 0, -1.4], legL: [-0.5, 0, 0.2], legR: [0.4, 0, -0.2], by: -0.25 }], [0.8, { torso: [0.15, 0, 0] }]],
  hits: [{ t0: 0.3, t1: 0.36, shape: 'circle', offset: 0, radius: 5, pctHp: 0.08, poise: 60, knockback: 15 }],
  onTime: [{ t: 0.3, fn: (e, g) => g.vfx('holdBurst', e.pos.clone().setY(0.2), 5) }],
};

const now = (e) => e.game.time;
const bursts = (e) => e.isBoss || e.type === 'brute';

// can a combo hold it right now?
export function isWeak(e) {
  const s = e.state;
  if (!e.alive || ['dead', 'dormant', 'rise', 'broken', 'parried', 'riposted', 'sit'].includes(s)) return false;
  if (s !== 'attack') return true;
  const d = e.atk?.def;
  if (!d || d.noHold || d.evade || e.atkKey === 'roar') return false;
  const parryable = !!d.parry || (d.hits || []).some((h) => h.parry);
  if (parryable) return true;
  // an unparryable attack is only weak once its last hit is over (the recovery)
  const end = Math.max(0, ...(d.hits || []).map((h) => h.t1));
  return (d.hits?.length ?? 0) > 0 && e.atk.t > end;
}

// a combo hit landed on `e` (host side): hold it, or keep holding it
export function comboHold(e) {
  if (e.puppet || !isWeak(e) || now(e) < (e.holdImmune || 0)) return false;
  if (e.state === 'attack') {
    // cut the attack off
    e.releaseToken?.();
    if (e.tele) { e.tele.dead = true; e.tele = null; }
    e.atk = null; e.y = 0; e.leapTo = null;
  }
  if (e.state !== 'held') e.setState('held');
  e.holdUntil = now(e) + HOLD_REFRESH;
  return true;
}

// every frame (host side): count the time held, end holds, break out of a lock
export function tickHold(e, dt) {
  if (e.state === 'held') { e.lockT = (e.lockT || 0) + dt; e.freeT = 0; }
  else { e.freeT = (e.freeT || 0) + dt; if (e.freeT > LOCK_RESET) e.lockT = 0; }
  if (e.state !== 'held') return;
  if ((e.lockT || 0) > LOCK_MAX) {
    e.lockT = 0;
    if (bursts(e)) { e.holdImmune = now(e) + IMMUNE_BURST; e.startAttack(e.moves.holdBurst); e.atkKey = 'holdBurst'; }
    else { e.holdImmune = now(e) + IMMUNE_REGULAR; e.endHold(); }
    return;
  }
  if (now(e) > e.holdUntil) e.endHold();
}
