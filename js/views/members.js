import { $, esc, toast } from "../utils.js";
import { state } from "../state.js";
import { store } from "../db/index.js";
import { showRenameModal } from "./rename-modal.js";

let app;

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
      <button class="btn-small" data-action="edit-member" data-id="${m.id}"><svg class="ic-edit" viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg> 編集</button></div>`
    )
    .join("");
}
