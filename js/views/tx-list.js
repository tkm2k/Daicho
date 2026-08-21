import { $, esc, yen, fmtCreatedAt, CAT_LABEL } from "../utils.js";
import { state, memberName } from "../state.js";

let app;

export function setup(appRef) {
  app = appRef;

  $("filter-chips").addEventListener("click", (e) => {
    const b = e.target.closest(".chip");
    if (!b) return;
    state.currentFilter = b.dataset.f;
    [...$("filter-chips").children].forEach((c) => c.classList.toggle("active", c === b));
    render();
  });

  $("sort-select").onchange = (e) => {
    state.currentSort = e.target.value;
    render();
  };

  $("tx-list").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action='edit-tx']");
    if (btn) app.editTx(btn.dataset.id);
  });
}

function txSummary(tx) {
  if (tx.category === "tatekae") {
    const targets = tx.lines.filter((l) => l.delta < 0).map((l) => memberName(l.member_id));
    return `${memberName(tx.payer_id)} が立替 → ${targets.join("、")}`;
  }
  if (tx.category === "loan") {
    const from = tx.lines.find((l) => l.delta > 0);
    const to = tx.lines.find((l) => l.delta < 0);
    return `${memberName(from.member_id)} が ${memberName(to.member_id)} に貸し`;
  }
  return tx.lines
    .map((l) => `${memberName(l.member_id)} ${l.delta > 0 ? "+" : ""}${l.delta.toLocaleString()}`)
    .join(" / ");
}

export function render() {
  let list = state.transactions.filter(
    (t) => state.currentFilter === "all" || t.category === state.currentFilter
  );
  if (state.currentSort === "new") list = [...list].reverse();
  else if (state.currentSort === "amount") list = [...list].sort((a, b) => b.amount - a.amount);

  const el = $("tx-list");
  if (list.length === 0) {
    el.innerHTML =
      '<div class="empty">まだ記録がありません。<br>「追加」タブから記録しましょう。</div>';
    return;
  }
  el.innerHTML = list
    .map(
      (tx) => `
    <div class="tx-item">
      <div style="flex:1;min-width:0">
        <span class="badge ${tx.category}">${CAT_LABEL[tx.category]}</span>
        <div class="tx-title">${esc(tx.title || "（内容なし）")}</div>
        <div class="tx-sub">${esc(txSummary(tx))}　${fmtCreatedAt(tx.created_at, true)}</div>
      </div>
      <div>
        <div class="tx-amount">${yen(tx.amount)}</div>
        <div style="text-align:right;margin-top:6px">
          <button class="btn-small" data-action="edit-tx" data-id="${tx.id}"><svg class="ic-edit" viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg> 編集</button>
        </div>
      </div>
    </div>`
    )
    .join("");
}
