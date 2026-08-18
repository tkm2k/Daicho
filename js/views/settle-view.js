import { $, esc, yen, toast } from "../utils.js";
import { state } from "../state.js";
import { settle, calcBalances, calcMemberSummaries } from "../logic/settlement.js";

let app;

export function setup(appRef) {
  app = appRef;

  $("settle-chips").addEventListener("click", (e) => {
    const b = e.target.closest(".chip");
    if (!b) return;
    state.settleFilter = b.dataset.f;
    [...$("settle-chips").children].forEach((c) => c.classList.toggle("active", c === b));
    render();
  });

  $("balance-list").addEventListener("click", (e) => {
    const row = e.target.closest(".balance-row");
    if (!row) return;
    const mid = row.dataset.mid;
    const detail = row.nextElementSibling;
    if (!detail || !detail.classList.contains("balance-detail")) return;
    const isOpen = !detail.classList.contains("hidden");
    detail.classList.toggle("hidden", isOpen);
    row.querySelector(".expand-icon").textContent = isOpen ? "▽" : "△";
  });

  $("btn-copy-settle").onclick = () => {
    const text = buildSettleText();
    navigator.clipboard
      .writeText(text)
      .then(() => toast("コピーしました"))
      .catch(() => toast("コピーに失敗しました"));
  };

  if (navigator.share) $("btn-share-settle").classList.remove("hidden");
  $("btn-share-settle").onclick = () => {
    navigator.share({ text: buildSettleText() }).catch(() => {});
  };
}

function buildSettleText() {
  const evName = $("header-event").textContent;
  const balances = calcBalances(state.members, state.transactions);
  const plan = settle(balances);
  if (plan.length === 0) return `【${evName} - 精算】\n精算の必要はありません 🎉`;
  const lines = plan.map((p) => `${p.from} → ${p.to}：${yen(p.amount)}`);
  return `【${evName} - 精算】\n${lines.join("\n")}\n\n▼ 詳細はこちら\n${location.href}`;
}

function balHtml(val) {
  if (val === 0) return '<span>±0円</span>';
  const cls = val > 0 ? "plus" : "minus";
  const sign = val > 0 ? "+" : "";
  return `<span class="${cls}">${sign}${val.toLocaleString()}円</span>`;
}

function detailHtml(m, hasCategory) {
  let rows = "";

  if (hasCategory.tatekae) {
    rows += `<div class="summary-row"><span>📘 自分の支出</span>${balHtml(-m.tatekaeExpense)}</div>`;
  }
  if (hasCategory.loan) {
    rows += `<div class="summary-row"><span>🤝 貸し借り</span>${balHtml(m.loanBalance)}</div>`;
  }
  if (hasCategory.gamble) {
    rows += `<div class="summary-row"><span>🎲 勝ち負け</span>${balHtml(m.gambleBalance)}</div>`;
  }

  rows += `<div class="summary-divider"></div>`;
  rows += `<div class="summary-row total"><span>小計（実質負担額）</span>${balHtml(m.subtotal)}</div>`;

  if (m.tatekaePaid > 0) {
    rows += `<div class="summary-row"><span>📘 立替支払額</span>${balHtml(m.tatekaePaid)}</div>`;
  }

  rows += `<div class="summary-divider"></div>`;
  rows += `<div class="summary-row total"><span>💰 最終収支</span>${balHtml(m.totalBalance)}</div>`;

  return rows;
}

export function render() {
  const balances = calcBalances(state.members, state.transactions);
  const fBalances = calcBalances(state.members, state.transactions, state.settleFilter);
  fBalances.sort((a, b) => b.bal - a.bal);

  const { summaries, hasCategory } = calcMemberSummaries(state.members, state.transactions);
  const summaryMap = {};
  summaries.forEach((s) => (summaryMap[s.id] = s));

  $("balance-list").innerHTML = fBalances
    .map(
      (b) => `
    <div class="balance-row" data-mid="${b.id}">
      <span>${esc(b.name)} <span class="expand-icon">▽</span></span>
      <span class="${b.bal > 0 ? "plus" : b.bal < 0 ? "minus" : ""}">
        ${b.bal > 0 ? "+" : ""}${b.bal.toLocaleString()}円 ${b.bal > 0 ? "（受け取る）" : b.bal < 0 ? "（支払う）" : ""}
      </span>
    </div>
    <div class="balance-detail hidden" data-mid="${b.id}">
      ${summaryMap[b.id] ? detailHtml(summaryMap[b.id], hasCategory) : ""}
    </div>`
    )
    .join("");

  const plan = settle(balances);
  $("settle-list").innerHTML =
    plan.length === 0
      ? '<div class="empty">精算の必要はありません 🎉</div>'
      : plan
          .map(
            (p) => `
      <div class="settle-row">
        <span>${esc(p.from)}<span class="arrow">→</span>${esc(p.to)}</span>
        <span class="amt">${yen(p.amount)}</span>
      </div>`
          )
          .join("");
}
