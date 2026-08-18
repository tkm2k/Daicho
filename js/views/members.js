import { $, esc, toast } from "../utils.js";
import { state } from "../state.js";
import { store } from "../db/index.js";

let app;

function showRenameModal(currentName) {
  return new Promise((resolve) => {
    const overlay = $("modal-rename");
    const input = $("modal-rename-input");
    const okBtn = $("modal-rename-ok");
    const cancelBtn = $("modal-rename-cancel");

    input.value = currentName;
    overlay.classList.remove("hidden");
    setTimeout(() => { input.focus(); input.select(); }, 50);

    function cleanup() {
      overlay.classList.add("hidden");
      okBtn.removeEventListener("click", onOk);
      cancelBtn.removeEventListener("click", onCancel);
      input.removeEventListener("keydown", onKey);
    }
    function onOk() { cleanup(); resolve(input.value); }
    function onCancel() { cleanup(); resolve(null); }
    function onKey(e) {
      if (e.key === "Enter") onOk();
      if (e.key === "Escape") onCancel();
    }

    okBtn.addEventListener("click", onOk);
    cancelBtn.addEventListener("click", onCancel);
    input.addEventListener("keydown", onKey);
  });
}

export function setup(appRef) {
  app = appRef;

  $("member-list").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action='edit-member']");
    if (btn) handleEditMember(btn.dataset.id);
  });

  $("btn-add-member").onclick = async () => {
    const name = $("new-member-name").value.trim();
    if (!name) return toast("名前を入力してください");
    if (state.members.some((m) => m.name === name)) return toast("同じ名前のメンバーがいます");
    await store.addMember(state.eventId, name);
    $("new-member-name").value = "";
    await app.refresh();
    toast("メンバーを追加しました");
  };
}

async function handleEditMember(id) {
  const m = state.members.find((m) => String(m.id) === String(id));
  if (!m) return;
  const name = await showRenameModal(m.name);
  if (name === null) return;
  const trimmed = name.trim();
  if (!trimmed) return toast("名前を入力してください");
  if (trimmed === m.name) return;
  if (state.members.some((x) => x.name === trimmed)) return toast("同じ名前のメンバーがいます");
  try {
    await store.renameMember(state.eventId, m.id, trimmed);
    await app.refresh();
    toast("名前を変更しました");
  } catch (err) {
    console.error(err);
    toast("変更に失敗しました: " + err.message);
  }
}

export function render() {
  $("member-list").innerHTML = state.members
    .map(
      (m) =>
        `<div class="member-list-item"><span>${esc(m.name)}</span>
      <button class="btn-small" data-action="edit-member" data-id="${m.id}">✏️ 編集</button></div>`
    )
    .join("");
}
