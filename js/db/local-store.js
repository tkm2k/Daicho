import { uuid } from "../utils.js";

function load() {
  try {
    return JSON.parse(localStorage.getItem("warikan_db") || "{}");
  } catch (e) {
    return {};
  }
}

function save(db) {
  localStorage.setItem("warikan_db", JSON.stringify(db));
}

export const LocalStore = {
  async createEvent(name, memberNames) {
    const db = load();
    const id = uuid();
    db[id] = {
      event: { id, name },
      members: memberNames.map((n) => ({ id: uuid(), name: n })),
      transactions: [],
    };
    save(db);
    return id;
  },

  async getEvent(id) {
    const db = load();
    return db[id] ? db[id].event : null;
  },

  async renameEvent(eid, name) {
    const db = load();
    if (db[eid]) {
      db[eid].event.name = name.trim();
      save(db);
    }
  },

  async listMembers(eid) {
    const db = load();
    return db[eid] ? db[eid].members : [];
  },

  async addMember(eid, name) {
    const db = load();
    const m = { id: uuid(), name };
    db[eid].members.push(m);
    save(db);
    return m;
  },

  async renameMember(eid, mid, name) {
    const db = load();
    const m = db[eid].members.find((m) => m.id === mid);
    if (m) m.name = name;
    save(db);
  },

  async listTransactions(eid) {
    const db = load();
    return db[eid] ? db[eid].transactions : [];
  },

  async addTransaction(eid, tx) {
    const db = load();
    tx.id = uuid();
    tx.created_at = new Date().toISOString();
    db[eid].transactions.push(tx);
    save(db);
    return tx;
  },

  async updateTransaction(eid, txId, tx) {
    const db = load();
    const i = db[eid].transactions.findIndex((t) => t.id === txId);
    if (i >= 0) db[eid].transactions[i] = { ...db[eid].transactions[i], ...tx };
    save(db);
  },

  async deleteTransaction(eid, txId) {
    const db = load();
    db[eid].transactions = db[eid].transactions.filter((t) => t.id !== txId);
    save(db);
  },
};
