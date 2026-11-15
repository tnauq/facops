// The cost and triage order now live in the rules (src/core/cost.js, pass 4 M23); the screen keeps
// importing them from here.
export { alarmCost, triageOrder } from '../core/cost.js';
