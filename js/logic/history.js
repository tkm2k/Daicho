const HISTORY_KEY = "daicho_recent_events";
const HISTORY_MAX = 10;

export function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch (e) {
    return [];
  }
}

function saveHistory(list) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
}

export function addToHistory(id, name) {
  let list = loadHistory().filter((h) => h.id !== id);
  list.unshift({ id, name, visited: new Date().toISOString() });
  if (list.length > HISTORY_MAX) list = list.slice(0, HISTORY_MAX);
  saveHistory(list);
}

export function removeFromHistory(id) {
  saveHistory(loadHistory().filter((h) => h.id !== id));
}
