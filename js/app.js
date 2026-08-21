import { $, toast } from "./utils.js";
import { state } from "./state.js";
import { store } from "./db/index.js";
import { addToHistory } from "./logic/history.js";
import { showRenameModal } from "./views/rename-modal.js";

import { setup as setupHome, show as showHome } from "./views/home.js";
import { setup as setupTxList, render as renderTxList } from "./views/tx-list.js";
import {
  setup as setupTxForm,
  render as renderTxForm,
  editTx,
  exitEditMode,
} from "./views/tx-form.js";
import { setup as setupSettle, render as renderSettle } from "./views/settle-view.js";
import { setup as setupSummary, render as renderSummary } from "./views/summary-view.js";
import { setup as setupMembers, render as renderMembers } from "./views/members.js";

const appController = {
  refresh,
  switchTab,
  renderAll,
  editTx,
};

setupHome(appController);
setupTxList(appController);
setupTxForm(appController);
setupSettle(appController);
setupSummary(appController);
setupMembers(appController);

document.querySelector(".tabs").addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  if (b.dataset.tab === "add" && state.editingTxId) exitEditMode();
  switchTab(b.dataset.tab);
});

$("btn-open-summary").onclick = () => switchTab("summary");

$("header-event").onclick = async () => {
  if (!state.eventId) return;
  const name = await showRenameModal($("header-event").textContent, "イベント名を変更");
  if (name === null) return;
  const trimmed = name.trim();
  if (!trimmed) return toast("イベント名を入力してください");
  if (trimmed === $("header-event").textContent) return;
  try {
    await store.renameEvent(state.eventId, trimmed);
    $("header-event").textContent = trimmed;
    addToHistory(state.eventId, trimmed);
    toast("イベント名を変更しました");
  } catch (err) {
    console.error(err);
    toast("変更に失敗しました: " + err.message);
  }
};

$("btn-copy").onclick = async () => {
  try {
    await navigator.clipboard.writeText($("share-url").value);
    toast("URLをコピーしました");
  } catch (e) {
    $("share-url").select();
    document.execCommand("copy");
    toast("URLをコピーしました");
  }
};

document.addEventListener("visibilitychange", () => {
  if (!document.hidden && state.eventId) refresh();
});

function switchTab(tab) {
  ["list", "add", "settle", "members", "summary"].forEach((t) => {
    $("tab-" + t).classList.toggle("hidden", t !== tab);
  });
  [...document.querySelectorAll(".tabs button")].forEach((b) =>
    b.classList.toggle("active", b.dataset.tab === (tab === "summary" ? "settle" : tab))
  );
  if (tab === "settle") renderSettle();
  if (tab === "summary") renderSummary();
}

async function refresh() {
  [state.members, state.transactions] = await Promise.all([
    store.listMembers(state.eventId),
    store.listTransactions(state.eventId),
  ]);
  renderAll();
}

function renderAll() {
  renderTxList();
  renderTxForm();
  renderSettle();
  renderMembers();
}

async function init() {
  const params = new URLSearchParams(location.search);
  state.eventId = params.get("e");
  if (state.eventId) {
    const ev = await store.getEvent(state.eventId);
    if (!ev) {
      toast("イベントが見つかりません");
      state.eventId = null;
      showHome();
      return;
    }
    addToHistory(state.eventId, ev.name);
    $("header-event").textContent = ev.name;
    $("header-event").classList.remove("hidden");
    $("view-event").classList.remove("hidden");
    $("share-url").value = location.href;
    await refresh();
  } else {
    showHome();
  }
}

init();
