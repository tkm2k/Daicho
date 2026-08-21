import { $, esc, toast, normalizeNumStr, setupAmountInput, fmtCreatedAt } from "../utils.js";
import { state, memberName } from "../state.js";
import { store } from "../db/index.js";
import { splitTatekae } from "../logic/settlement.js";
import { openCalc } from "./calc-modal.js";

let app;
let tatekaeMode = "simple";

export function setup(appRef) {
  app = appRef;

  $("tatekae-mode-seg").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    tatekaeMode = b.dataset.mode;
    [...$("tatekae-mode-seg").children].forEach((c) => c.classList.toggle("active", c === b));
    $("tatekae-simple").classList.toggle("hidden", tatekaeMode !== "simple");
    $("tatekae-custom").classList.toggle("hidden", tatekaeMode !== "custom");
  });

  $("cat-seg").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    state.currentCat = b.dataset.cat;
    [...$("cat-seg").children].forEach((c) => c.classList.toggle("active", c === b));
    $("form-tatekae").classList.toggle("hidden", state.currentCat !== "tatekae");
    $("form-loan").classList.toggle("hidden", state.currentCat !== "loan");
    $("form-gamble").classList.toggle("hidden", state.currentCat !== "gamble");
  });

  $("btn-save-tx").onclick = handleSave;
  $("btn-cancel-edit").onclick = () => {
    exitEditMode();
    app.switchTab("list");
  };
  $("btn-delete-edit").onclick = handleDelete;

  setupAmountInput($("t-amount"));
  setupAmountInput($("l-amount"));

  attachCalc($("t-amount").parentElement.querySelector(".btn-calc"), $("t-amount"));
  attachCalc($("l-amount").parentElement.querySelector(".btn-calc"), $("l-amount"));
}

function attachCalc(btn, input) {
  if (!btn || !input) return;
  btn.onclick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    document.activeElement?.blur();
    const cur = parseInt(normalizeNumStr(input.value)) || 0;
    const result = await openCalc(cur);
    if (result === null) return;
    input.value = String(result);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("blur", { bubbles: true }));
  };
}

function updateCustomTotal() {
  const total = [...document.querySelectorAll(".custom-input")]
    .reduce((s, i) => s + (parseInt(normalizeNumStr(i.value)) || 0), 0);
  $("t-custom-total").textContent = "合計：¥" + total.toLocaleString();
}

function customLines() {
  const entries = [...document.querySelectorAll(".custom-input")]
    .map((i) => ({ member_id: i.dataset.mid, amount: parseInt(normalizeNumStr(i.value)) || 0 }))
    .filter((e) => e.amount > 0);
  const total = entries.reduce((s, e) => s + e.amount, 0);
  const payer = $("t-payer").value;
  const lines = entries.map((e) => ({ member_id: e.member_id, delta: -e.amount }));
  lines.push({ member_id: payer, delta: total });
  return { lines, total };
}

function gambleLines() {
  return [...document.querySelectorAll(".gamble-row")]
    .map((row) => {
      const input = row.querySelector(".g-input");
      const sign = parseInt(row.querySelector(".sign-toggle .active").dataset.s);
      return { member_id: input.dataset.mid, delta: sign * (parseInt(input.value) || 0) };
    })
    .filter((l) => l.delta !== 0);
}

function updateGambleSum() {
  const sum = gambleLines().reduce((s, l) => s + l.delta, 0);
  const el = $("g-sum");
  el.textContent =
    "合計：" + sum.toLocaleString() + "円" + (sum === 0 ? " ✅" : " （0にしてください）");
  el.style.color = sum === 0 ? "var(--plus)" : "var(--minus)";
}

export function render() {
  const opts = state.members
    .map((m) => `<option value="${m.id}">${esc(m.name)}</option>`)
    .join("");
  $("t-payer").innerHTML = opts;
  $("l-from").innerHTML = opts;
  $("l-to").innerHTML = opts;
  if (state.members.length > 1) $("l-to").selectedIndex = 1;

  $("t-targets").innerHTML = state.members
    .map((m) => `<label><input type="checkbox" value="${m.id}" checked>${esc(m.name)}</label>`)
    .join("");

  $("t-custom-rows").innerHTML = state.members
    .map(
      (m) => `
    <div class="custom-row">
      <div class="custom-name">${esc(m.name)}</div>
      <input type="text" data-mid="${m.id}" placeholder="0" inputmode="numeric" class="custom-input">
      <button type="button" class="btn-calc-sm" data-action="calc"><svg class="ic-calc" viewBox="0 0 24 24"><rect x="3" y="2" width="18" height="20" rx="3"/><rect x="6" y="5" width="12" height="4" rx="1" fill="#fff"/><circle cx="7.5" cy="13" r="1.2" fill="#fff"/><circle cx="12" cy="13" r="1.2" fill="#fff"/><circle cx="16.5" cy="13" r="1.2" fill="#fff"/><circle cx="7.5" cy="17.5" r="1.2" fill="#fff"/><circle cx="12" cy="17.5" r="1.2" fill="#fff"/><circle cx="16.5" cy="17.5" r="1.2" fill="#fff"/></svg></button>
    </div>`
    )
    .join("");

  [...document.querySelectorAll(".custom-input")].forEach((i) => {
    setupAmountInput(i);
    i.addEventListener("input", updateCustomTotal);
    i.addEventListener("blur", updateCustomTotal);
  });
  [...document.querySelectorAll(".custom-row .btn-calc-sm")].forEach((btn) => {
    const input = btn.closest(".custom-row").querySelector(".custom-input");
    attachCalc(btn, input);
  });
  updateCustomTotal();

  $("g-rows").innerHTML = state.members
    .map(
      (m) => `
    <div class="gamble-row">
      <div class="gname">${esc(m.name)}</div>
      <div class="sign-toggle">
        <button type="button" data-s="1" class="active">＋</button>
        <button type="button" data-s="-1">−</button>
      </div>
      <input type="text" data-mid="${m.id}" placeholder="0" inputmode="numeric" class="g-input">
      <button type="button" class="btn-calc-sm" data-action="calc"><svg class="ic-calc" viewBox="0 0 24 24"><rect x="3" y="2" width="18" height="20" rx="3"/><rect x="6" y="5" width="12" height="4" rx="1" fill="#fff"/><circle cx="7.5" cy="13" r="1.2" fill="#fff"/><circle cx="12" cy="13" r="1.2" fill="#fff"/><circle cx="16.5" cy="13" r="1.2" fill="#fff"/><circle cx="7.5" cy="17.5" r="1.2" fill="#fff"/><circle cx="12" cy="17.5" r="1.2" fill="#fff"/><circle cx="16.5" cy="17.5" r="1.2" fill="#fff"/></svg></button>
    </div>`
    )
    .join("");

  [...document.querySelectorAll(".g-input")].forEach(
    (i) =>
      (i.oninput = () => {
        i.value = i.value
          .replace(/[^0-9０-９]/g, "")
          .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
        updateGambleSum();
      })
  );

  [...document.querySelectorAll(".sign-toggle button")].forEach(
    (b) =>
      (b.onclick = () => {
        [...b.parentElement.children].forEach((c) => c.classList.toggle("active", c === b));
        updateGambleSum();
      })
  );
  [...document.querySelectorAll(".gamble-row .btn-calc-sm")].forEach((btn) => {
    const input = btn.closest(".gamble-row").querySelector(".g-input");
    attachCalc(btn, input);
  });

  updateGambleSum();
}

export function editTx(id) {
  const tx = state.transactions.find((t) => t.id === id);
  if (!tx) return;
  state.editingTxId = id;
  state.currentCat = tx.category;

  [...$("cat-seg").children].forEach((c) => {
    c.classList.toggle("active", c.dataset.cat === tx.category);
    c.disabled = c.dataset.cat !== tx.category;
    c.style.opacity = c.dataset.cat === tx.category ? "1" : ".35";
  });

  $("form-tatekae").classList.toggle("hidden", tx.category !== "tatekae");
  $("form-loan").classList.toggle("hidden", tx.category !== "loan");
  $("form-gamble").classList.toggle("hidden", tx.category !== "gamble");

  if (tx.category === "tatekae") {
    $("t-title").value = tx.title || "";
    if (tx.payer_id) $("t-payer").value = tx.payer_id;

    const negatives = tx.lines.filter((l) => l.delta < 0);
    const amounts = negatives.map((l) => Math.abs(l.delta));
    const isEqualSplit = amounts.length > 0 && amounts.every((a) => Math.abs(a - amounts[0]) <= 1);

    if (isEqualSplit) {
      tatekaeMode = "simple";
      $("t-amount").value = tx.amount.toLocaleString();
      const targets = new Set(negatives.map((l) => l.member_id));
      [...$("t-targets").querySelectorAll("input")].forEach(
        (i) => (i.checked = targets.has(i.value))
      );
    } else {
      tatekaeMode = "custom";
      const deltaMap = {};
      negatives.forEach((l) => (deltaMap[l.member_id] = Math.abs(l.delta)));
      [...document.querySelectorAll(".custom-input")].forEach((i) => {
        const v = deltaMap[i.dataset.mid];
        i.value = v ? v.toLocaleString() : "";
      });
      updateCustomTotal();
    }
    [...$("tatekae-mode-seg").children].forEach((c) =>
      c.classList.toggle("active", c.dataset.mode === tatekaeMode)
    );
    $("tatekae-simple").classList.toggle("hidden", tatekaeMode !== "simple");
    $("tatekae-custom").classList.toggle("hidden", tatekaeMode !== "custom");
  } else if (tx.category === "loan") {
    $("l-title").value = tx.title || "";
    const from = tx.lines.find((l) => l.delta > 0);
    const to = tx.lines.find((l) => l.delta < 0);
    if (from) $("l-from").value = from.member_id;
    if (to) $("l-to").value = to.member_id;
    $("l-amount").value = tx.amount.toLocaleString();
  } else {
    $("g-title").value = tx.title || "";
    const map = {};
    tx.lines.forEach((l) => (map[l.member_id] = l.delta));
    [...document.querySelectorAll(".gamble-row")].forEach((row) => {
      const input = row.querySelector(".g-input");
      const delta = map[input.dataset.mid] || 0;
      input.value = delta ? String(Math.abs(delta)) : "";
      const sign = delta < 0 ? -1 : 1;
      [...row.querySelectorAll(".sign-toggle button")].forEach((b) =>
        b.classList.toggle("active", parseInt(b.dataset.s) === sign)
      );
    });
    updateGambleSum();
  }

  $("btn-save-tx").textContent = "更新する";
  const cAt = fmtCreatedAt(tx.created_at, false);
  if (cAt) {
    $("edit-created-at").textContent = cAt;
    $("edit-created-at").classList.remove("hidden");
  }
  $("edit-actions").classList.remove("hidden");
  app.switchTab("add");
}

export function exitEditMode() {
  state.editingTxId = null;
  [...$("cat-seg").children].forEach((c) => {
    c.disabled = false;
    c.style.opacity = "1";
  });
  tatekaeMode = "simple";
  [...$("tatekae-mode-seg").children].forEach((c) =>
    c.classList.toggle("active", c.dataset.mode === "simple")
  );
  $("tatekae-simple").classList.remove("hidden");
  $("tatekae-custom").classList.add("hidden");
  $("btn-save-tx").textContent = "記録する";
  $("edit-created-at").textContent = "";
  $("edit-created-at").classList.add("hidden");
  $("edit-actions").classList.add("hidden");
  ["t-title", "t-amount", "l-title", "l-amount", "g-title"].forEach((id) => ($(id).value = ""));
  render();
}

async function handleSave() {
  let tx = null;
  try {
    if (state.currentCat === "tatekae") {
      const title = $("t-title").value.trim();
      const payer = $("t-payer").value;
      if (!title) return toast("内容を入力してください");

      if (tatekaeMode === "simple") {
        const amount = parseInt(normalizeNumStr($("t-amount").value));
        const targets = [...$("t-targets").querySelectorAll("input:checked")].map((i) => i.value);
        if (!amount || amount <= 0) return toast("金額を入力してください");
        if (targets.length === 0) return toast("対象者を選んでください");
        tx = {
          category: "tatekae",
          title,
          payer_id: payer,
          amount,
          lines: splitTatekae(amount, payer, targets),
        };
      } else {
        const { lines, total } = customLines();
        if (total <= 0) return toast("負担額を入力してください");
        tx = {
          category: "tatekae",
          title,
          payer_id: payer,
          amount: total,
          lines,
        };
      }
    } else if (state.currentCat === "loan") {
      const title = $("l-title").value.trim() || "貸し借り";
      const from = $("l-from").value;
      const to = $("l-to").value;
      const amount = parseInt(normalizeNumStr($("l-amount").value));
      if (from === to) return toast("貸した人と借りた人が同じです");
      if (!amount || amount <= 0) return toast("金額を入力してください");
      tx = {
        category: "loan",
        title,
        payer_id: from,
        amount,
        lines: [
          { member_id: from, delta: amount },
          { member_id: to, delta: -amount },
        ],
      };
    } else {
      const title = $("g-title").value.trim();
      if (!title) return toast("内容を入力してください");
      const lines = gambleLines();
      if (lines.length === 0) return toast("収支を入力してください");
      const sum = lines.reduce((s, l) => s + l.delta, 0);
      if (sum !== 0)
        return toast("合計が0になっていません（現在 " + sum.toLocaleString() + "円）");
      const amount = lines.filter((l) => l.delta > 0).reduce((s, l) => s + l.delta, 0);
      tx = { category: "gamble", title, payer_id: null, amount, lines };
    }
    $("btn-save-tx").disabled = true;
    if (state.editingTxId) await store.updateTransaction(state.eventId, state.editingTxId, tx);
    else await store.addTransaction(state.eventId, tx);
    toast(state.editingTxId ? "更新しました" : "記録しました");
    await app.refresh();
    exitEditMode();
    app.switchTab("list");
  } catch (err) {
    console.error(err);
    toast("保存に失敗しました: " + err.message);
  } finally {
    $("btn-save-tx").disabled = false;
  }
}

async function handleDelete() {
  if (!state.editingTxId) return;
  if (!confirm("この記録を削除しますか？")) return;
  try {
    await store.deleteTransaction(state.eventId, state.editingTxId);
    exitEditMode();
    await app.refresh();
    toast("削除しました");
    app.switchTab("list");
  } catch (err) {
    console.error(err);
    toast("削除に失敗しました: " + err.message);
  }
}
