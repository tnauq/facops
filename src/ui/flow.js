// Which screen the game is on (spec section 6.7): the main menu, playing, paused, round over,
// the tuning drawer, or (pass 2) the Delivery card. Pure reducer. The rules only run while the
// mode is 'playing'. Pass 6 (M37): the start card is the main menu ('menu'), and a Settings card
// opens from the menu and the pause menu.

export const MODES = ['menu', 'playing', 'paused', 'over', 'tuning', 'settings', 'delivery', 'shop', 'sell', 'commissioned', 'bundles', 'startOver', 'ledger'];

// The tuning drawer opens from the start, pause and round-over cards, and from the HUD's settings
// button during play. Done goes back to the card it came from; from play it goes to the pause card
// rather than straight back into the action, since changes only apply from the next round anyway.
const TUNING_BACK = { menu: 'menu', paused: 'paused', over: 'over', playing: 'paused', settings: 'settings' };
// Settings (pass 6 spec 2.2) opens from the main menu and the pause menu; its Back returns there.
const SETTINGS_BACK = { menu: 'menu', paused: 'paused' };

// mode -> action -> { mode, newRound }. Anything not listed leaves the mode alone.
const TABLE = {
  // The main menu: New run, or Tutorial (a run with the lessons on, pass 6 spec 2.2).
  // Pass 7 (M44): Resume run carries a saved run on (the screen loads it; no new round), and with a
  // run saved, New run and Tutorial ask first (startAsk) on the Start over card.
  menu: {
    start: { mode: 'playing', newRound: true },
    tutorial: { mode: 'playing', newRound: true },
    resume: { mode: 'playing', newRound: false },
    startAsk: { mode: 'startOver', newRound: false },
  },
  startOver: { start: { mode: 'playing', newRound: true }, tutorial: { mode: 'playing', newRound: true }, back: { mode: 'menu', newRound: false } },
  playing: {
    pause: { mode: 'paused', newRound: false },
    togglePause: { mode: 'paused', newRound: false },
    over: { mode: 'over', newRound: false },
    delivery: { mode: 'delivery', newRound: false }, // pass 2: a hall came online
    shop: { mode: 'shop', newRound: false }, // pass 4: the hire and upgrade card
    commissioned: { mode: 'commissioned', newRound: false }, // pass 5: the Commissioned card
    bundles: { mode: 'bundles', newRound: false }, // pass 7 (M43): a hall's bundles
    ledger: { mode: 'ledger', newRound: false }, // pass 7 (M45): the ledger, from the cash
  },
  // Pass 7 (M45): the ledger holds the game, like the hire card; Close carries on.
  ledger: { continue: { mode: 'playing', newRound: false }, togglePause: { mode: 'playing', newRound: false } },
  // Pass 7 (M43): the bundles card holds the game, like the hire card; Close, or buying, carries on.
  bundles: { continue: { mode: 'playing', newRound: false }, togglePause: { mode: 'playing', newRound: false } },
  // Pass 5 (spec 5.2): the Commissioned card waits for the player: sell (the run ends) or keep running.
  commissioned: { keep: { mode: 'playing', newRound: false }, over: { mode: 'over', newRound: false } },
  // The menu's sale asks first: Back returns to the menu; selling ends the run.
  sell: { back: { mode: 'paused', newRound: false }, over: { mode: 'over', newRound: false } },
  // The hire and upgrade card closes with Close; the run carries on.
  shop: { continue: { mode: 'playing', newRound: false }, togglePause: { mode: 'playing', newRound: false } },
  // The Delivery card closes with Continue or by taking a card; the run carries on.
  delivery: { continue: { mode: 'playing', newRound: false } },
  paused: {
    resume: { mode: 'playing', newRound: false },
    togglePause: { mode: 'playing', newRound: false },
    restart: { mode: 'playing', newRound: true },
    sellAsk: { mode: 'sell', newRound: false }, // pass 5: Hand over the keys
  },
  over: { again: { mode: 'playing', newRound: true } },
};

/**
 * Returns { mode, newRound } (plus `back` when the tuning drawer opens, `settingsBack` when Settings
 * opens). newRound tells the caller to throw the old round away. `back` is the card to return to
 * when the drawer closes: pass it in again with the 'done' action. `settingsBack` likewise for
 * Settings' 'settingsBack' action.
 */
export function reduceFlow(mode, action, back = null, settingsBack = null) {
  if (action === 'settings' && SETTINGS_BACK[mode]) return { mode: 'settings', newRound: false, settingsBack: SETTINGS_BACK[mode] };
  if (mode === 'settings' && action === 'settingsBack') return { mode: settingsBack ?? 'menu', newRound: false };
  if (action === 'tuning' && TUNING_BACK[mode]) return { mode: 'tuning', newRound: false, back: TUNING_BACK[mode] };
  if (mode === 'tuning') return action === 'done' && back ? { mode: back, newRound: false } : { mode, newRound: false };
  return TABLE[mode]?.[action] ?? { mode, newRound: false };
}
