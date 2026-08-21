import { $, esc, yen } from "../utils.js";
import { state } from "../state.js";
import { calcMemberSummaries } from "../logic/settlement.js";

let app;

export function setup(appRef) {
  app = appRef;
  $("btn-back-summary").onclick = () => app.switchTab("settle");
}

function balanceHtml(val) {
  if (val === 0) return '<span>±0円</span>';
  const cls = val > 0 ? "plus" : "minus";
  const sign = val > 0 ? "+" : "";
  return `<span class="${cls}">${sign}${val.toLocaleString()}円</span>`;
}

function totalLabel(val) {
  if (val > 0) return "（受け取る）";
  if (val < 0) return "（支払う）";
  return "";
}

export function render() {
  const { summaries, groupExpense, hasCategory } = calcMemberSummaries(state.members, state.transactions);

  if (state.transactions.length === 0) {
    $("summary-content").innerHTML =
      '<div class="empty">まだ記録がありません。</div>';
    return;
  }

  const memberCards = summaries
    .map((m) => {
      let rows = "";

      if (hasCategory.tatekae) {
        rows += `
        <div class="summary-row">
          <span>📘 自分の支出</span>
          ${balanceHtml(-m.tatekaeExpense)}
        </div>`;
      }

      if (hasCategory.loan) {
        rows += `
        <div class="summary-row">
          <span>🤝 貸し借り</span>
          ${balanceHtml(m.loanBalance)}
        </div>`;
      }

      if (hasCategory.gamble) {
        rows += `
        <div class="summary-row">
          <span>🎲 勝ち負け</span>
          ${balanceHtml(m.gambleBalance)}
        </div>`;
      }

      const calcSection = m.tatekaePaid > 0
        ? `<div class="summary-calc-group">
            ${rows}
            <div class="summary-calc-line"></div>
            <div class="summary-row subtotal">
              <span>小計（実質負担額）</span>
              ${balanceHtml(m.subtotal)}
            </div>
          </div>
          <div class="summary-row summary-addition">
            <span><span class="summary-op">＋</span> 📘 立替支払額</span>
            ${balanceHtml(m.tatekaePaid)}
          </div>`
        : rows;

      return `
      <div class="summary-member">
        <div class="summary-member-name">${esc(m.name)}</div>
        ${calcSection}
        <div class="summary-final-line"></div>
        <div class="summary-row summary-final">
          <span>💰 最終収支</span>
          <span>
            ${balanceHtml(m.totalBalance)}
            <span class="summary-total-label">${totalLabel(m.totalBalance)}</span>
          </span>
        </div>
      </div>`;
    })
    .join("");

  const groupRow = hasCategory.tatekae
    ? `<div class="summary-group">
        <span>グループ支出合計</span>
        <span class="summary-group-amount">${yen(groupExpense)}</span>
      </div>`
    : "";

  $("summary-content").innerHTML = memberCards + groupRow;
}
