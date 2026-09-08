import { $ } from "../utils.js";

let tokens = [];
let current = "";

const OP_LABEL = { "+": " ＋ ", "-": " − ", "*": " × ", "/": " ÷ " };

function evaluate() {
  const all = [...tokens];
  if (current) all.push(current);
  if (all.length === 0) return 0;

  const nums = [];
  const ops = [];
  for (const t of all) {
    if ("+-*/".includes(t)) ops.push(t);
    else nums.push(Number(t) || 0);
  }

  for (let i = 0; i < ops.length; ) {
    if (ops[i] === "*" || ops[i] === "/") {
      const r =
        ops[i] === "/" && nums[i + 1] === 0
          ? 0
          : ops[i] === "*"
            ? nums[i] * nums[i + 1]
            : nums[i] / nums[i + 1];
      nums.splice(i, 2, r);
      ops.splice(i, 1);
    } else i++;
  }

  let result = nums[0] || 0;
  for (let i = 0; i < ops.length; i++) {
    result = ops[i] === "+" ? result + nums[i + 1] : result - nums[i + 1];
  }
  return result;
}

function formatExpr() {
  let s = "";
  for (let i = 0; i < tokens.length; i++) {
    if (i % 2 === 0) {
      const n = parseInt(tokens[i]);
      s += isNaN(n) ? "0" : n.toLocaleString();
    } else {
      s += OP_LABEL[tokens[i]] || tokens[i];
    }
  }
  if (current) {
    const n = parseInt(current);
    s += !current || isNaN(n) ? current || "0" : n.toLocaleString();
  }
  return s || "0";
}

function update() {
  $("calc-expr").textContent = formatExpr();
  const raw = evaluate();
  const result = Math.floor(raw);
  const hasOp = tokens.length > 1;
  $("calc-result").textContent = hasOp ? "= " + result.toLocaleString() : "";
  $("calc-done").textContent = result ? "完了（" + result.toLocaleString() + "円）" : "完了";
}

function onGrid(e) {
  const btn = e.target.closest("button");
  if (!btn) return;

  if (btn.dataset.v !== undefined) {
    current += btn.dataset.v;
  } else if (btn.dataset.op) {
    if (current) {
      tokens.push(current, btn.dataset.op);
      current = "";
    } else if (tokens.length >= 2) {
      tokens[tokens.length - 1] = btn.dataset.op;
    }
  } else if (btn.dataset.act === "clear") {
    tokens = [];
    current = "";
  } else if (btn.dataset.act === "back") {
    if (current) {
      current = current.slice(0, -1);
    } else if (tokens.length >= 2) {
      tokens.pop();
      current = tokens.pop();
    }
  }
  update();
}

export function openCalc(initialValue) {
  return new Promise((resolve) => {
    tokens = [];
    current = initialValue ? String(initialValue) : "";

    const overlay = $("modal-calc");
    const grid = $("calc-grid");
    overlay.classList.remove("hidden");
    update();

    function cleanup() {
      overlay.classList.add("hidden");
      grid.removeEventListener("click", onGrid);
      $("calc-done").onclick = null;
      $("calc-cancel").onclick = null;
      overlay.removeEventListener("click", onBg);
    }
    function onBg(e) {
      if (e.target === overlay) {
        cleanup();
        resolve(null);
      }
    }

    grid.addEventListener("click", onGrid);
    $("calc-done").onclick = () => { cleanup(); resolve(Math.floor(evaluate())); };
    $("calc-cancel").onclick = () => { cleanup(); resolve(null); };
    overlay.addEventListener("click", onBg);
  });
}
