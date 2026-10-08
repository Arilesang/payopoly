// Demo seats are per tab, so two local test players can share one browser.
export const identityStorage = import.meta.env.MODE === 'demo' ? sessionStorage : localStorage;
