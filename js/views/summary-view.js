import { $, esc, yen } from "../utils.js";
import { state } from "../state.js";

let app;

export function setup(appRef) {
  app = appRef;
  $("btn-back-summary").onclick = () => app.switchTab("settle");
}

function calcMemberSummaries() {
  const txs = state.transactions;
  const hasCategory = {
    tatekae: txs.some((t) => t.category === "tatekae"),
    loan: txs.some((t) => t.category === "loan"),
    gamble: txs.some((t) => t.category === "gamble"),
  };

  const summaries = state.members.map((m) => {
    let tatekaeExpense = 0;
    let tatekaePaid = 0;
    let loanBalance = 0;
    let gambleBalance = 0;

    txs.forEach((tx) => {
      tx.lines.forEach((l) => {
        if (l.member_id !== m.id) return;
        if (tx.category === "tatekae") {
          if (l.delta < 0) tatekaeExpense += Math.abs(l.delta);
          if (l.delta > 0) tatekaePaid += l.delta;
        } else if (tx.category === "loan") {
          loanBalance += l.delta;
        } else if (tx.category === "gamble") {
          gambleBalance += l.delta;
        }
      });
    });

    const subtotal = -tatekaeExpense + loanBalance + gambleBalance;
    const totalBalance = subtotal + tatekaePaid;

    return {
      id: m.id,
      name: m.name,
      tatekaeExpense,
      tatekaePaid,
      loanBalance,
      gambleBalance,
      subtotal,
      totalBalance,
    };
  });

  const groupExpense = summaries.reduce((s, m) => s + m.tatekaeExpense, 0);

  return { summaries, groupExpense, hasCategory };
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
  const { summaries, groupExpense, hasCategory } = calcMemberSummaries();

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

      return `
      <div class="summary-member">
        <div class="summary-member-name">${esc(m.name)}</div>
        ${rows}
        <div class="summary-divider"></div>
        <div class="summary-row total">
          <span>小計（実質負担額）</span>
          ${balanceHtml(m.subtotal)}
        </div>
        ${m.tatekaePaid > 0 ? `
        <div class="summary-row">
          <span>📘 立替支払額</span>
          ${balanceHtml(m.tatekaePaid)}
        </div>` : ""}
        <div class="summary-divider"></div>
        <div class="summary-row total">
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
