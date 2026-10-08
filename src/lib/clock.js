let offset = 0;
export function setClockOffset(value) { offset = Number(value) || 0; }
export function now() { return Date.now() + offset; }
