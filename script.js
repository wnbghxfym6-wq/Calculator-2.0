// --- CALCULATOR LOGIC ---

let expression = "";
let justEvaluated = false;
let history = [];


function getEls() {
  return {
    exprEl: document.getElementById("expression"),
    resultEl: document.getElementById("result"),
  };
}

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js");
}


function updateHistory() {
  const historyPanel = document.getElementById("history-panel");

  historyPanel.innerHTML = history
    .map(item => `<div>${item}</div>`)
    .join("");
}


function updateExpression() {
  const { exprEl } = getEls();
  exprEl.textContent = expression || "0";
}

function clearResult() {
  const { resultEl } = getEls();
  resultEl.textContent = "";
}

function appendChar(ch) {
  if (justEvaluated && /[0-9.]/.test(ch)) {
    // start new expression after evaluation if typing a number
    expression = "";
  }
  justEvaluated = false;
  expression += ch;
  clearResult();
  updateExpression();
}

function clearAll() {
  expression = "";
  justEvaluated = false;
  const { resultEl } = getEls();
  resultEl.textContent = "";
  updateExpression();
}

function clearEntry() {
  // simple version = same as clearAll
  clearAll();
}

function backspace() {
  if (!expression) return;
  expression = expression.slice(0, -1);
  updateExpression();
}

function percent() {
  if (!expression) return;
  try {
    const value = Function('"use strict";return (' + expression + ')')();
    const { resultEl } = getEls();
    const pct = value / 100;
    expression = String(pct);
    resultEl.textContent = "";
    updateExpression();
  } catch (e) {
    getEls().resultEl.textContent = "Error";
  }
}

function applyFunc(type) {
  if (!expression) return;
  try {
    const x = Function('"use strict";return (' + expression + ')')();
    let value;

    switch (type) {
      case "inv":
        value = 1 / x;
        break;
      case "square":
        value = x * x;
        break;
      case "sqrt":
        value = Math.sqrt(x);
        break;
      default:
        return;
    }

    expression = String(value);
    clearResult();
    updateExpression();
    justEvaluated = true;
  } catch (e) {
    getEls().resultEl.textContent = "Error";
  }
}

function calculate() {
  if (!expression) return;

  try {
    const { resultEl } = getEls();
    let value = Function('"use strict";return (' + expression + ')')();

    // ---- TRUNCATE TO 4 DECIMALS ----
    value = Math.trunc(value * 10000) / 10000;

    // ---- REMOVE TRAILING ZEROS ----
    const formatted = value.toString().replace(/\.?0+$/, "");

    resultEl.textContent = formatted;
    justEvaluated = true;

  } catch (e) {
    getEls().resultEl.textContent = "Error";
    justEvaluated = false;
  }
}


// --- KEYBOARD SUPPORT ---

function handleKey(e) {
  if (e.ctrlKey || e.metaKey || e.altKey) return;

  const key = e.key;

  // digits
  if (key >= "0" && key <= "9") {
    appendChar(key);
    e.preventDefault();
    return;
  }

  // decimal
  if (key === "." || key === ",") {
    appendChar(".");
    e.preventDefault();
    return;
  }

  // operators
  if (key === "+" || key === "-" || key === "*" || key === "/") {
    appendChar(key);
    e.preventDefault();
    return;
  }

  // Enter / =  → calculate
  if (key === "Enter" || key === "=") {
    calculate();
    e.preventDefault();
    return;
  }

  // Backspace → delete last char
  if (key === "Backspace") {
    backspace();
    e.preventDefault();
    return;
  }

  // Escape → clear all
  if (key === "Escape") {
    clearAll();
    e.preventDefault();
    return;
  }

  // Delete → clear all
  if (key === "Delete") {
    clearAll();
    e.preventDefault();
    return;
  }

  // % key
  if (key === "%") {
    percent();
    e.preventDefault();
    return;
  }
}

window.addEventListener("keydown", handleKey);

// --- SCALING LOGIC ---

(function () {
  const BASE_WIDTH = 420;
  const BASE_HEIGHT = 620;   // ↓ matches main.js & CSS


  function applyScale() {
    const root = document.getElementById("app-root");
    if (!root) return;

    const scaleX = window.innerWidth / BASE_WIDTH;
    const scaleY = window.innerHeight / BASE_HEIGHT;

    let scale = Math.min(scaleX, scaleY);
    if (scale > 1) scale = 1;
    if (scale < MIN_SCALE) scale = MIN_SCALE;

    root.style.transformOrigin = "center center";
    root.style.transform = `scale(${scale})`;
  }

  window.addEventListener("resize", applyScale);
  window.addEventListener("load", () => {
    updateExpression();
    applyScale();
  });

// --- uniform scaling of the calculator ---
})();

