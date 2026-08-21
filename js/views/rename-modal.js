import { $ } from "../utils.js";

export function showRenameModal(currentName, title) {
  return new Promise((resolve) => {
    const overlay = $("modal-rename");
    const input = $("modal-rename-input");
    const okBtn = $("modal-rename-ok");
    const cancelBtn = $("modal-rename-cancel");
    const titleEl = overlay.querySelector(".modal-title");

    if (title) titleEl.textContent = title;
    else titleEl.textContent = "名前を変更";

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
