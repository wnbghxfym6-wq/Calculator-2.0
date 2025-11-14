// --- Elements ---
const display = document.getElementById("display");
display.value = display.value?.trim() || "0";

// --- Helpers ---
const OPS = new Set(["+", "-", "*", "/"]);
const isOp = ch => OPS.has(ch);
const lastChar = () => display.value.at(-1);
const normalize = s =>
  s.replace(/÷/g, "/").replace(/×/g, "*").trim();

function setDisplay(v) {
  // handle NaN / Infinity cleanly
  if (v === undefined || v === null || Number.isNaN(v)) {
    display.value = "Error";
    return;
  }
  display.value = String(v);
}

// --- Input actions ---
function append(value) {
  // reset from Error state
  if (display.value === "Error") display.value = "0";

  // digits
  if (/^[0-9]$/.test(value)) {
    if (display.value === "0") {
      display.value = value;   // replace leading 0
    } else {
      display.value += value;
    }
    return;
  }

  // decimal point
  if (value === ".") {
    // prevent multiple dots in the current number segment
    const parts = display.value.split(/([+\-*/])/);
    const cur = parts[parts.length - 1];
    if (cur.includes(".")) return;
    display.value += ".";
    return;
  }

  // fallback: just append whatever it is
  display.value += value;
}

function appendOp(op) {
  // replace trailing operator or error with the new operator
  if (display.value === "Error") display.value = "0";
  const last = lastChar();
  if (!display.value || last === ".") return; // don't place op after nothing or dot
  if (isOp(last)) {
    display.value = display.value.slice(0, -1) + op;
  } else {
    display.value += op;
  }
}

function clearAll() {
  display.value = "0";
}

function clearEntry() {
  // CE: clear the current number segment only
  const parts = display.value.split(/([+\-*/])/);
  if (parts.length <= 1) {
    display.value = "0";
    return;
  }
  parts[parts.length - 1] = "";
  const out = parts.join("");
  display.value = out || "0";
}

function deleteChar() {
  if (display.value === "Error") { display.value = "0"; return; }
  if (display.value.length <= 1) { display.value = "0"; return; }
  display.value = display.value.slice(0, -1);
}

function percent() {
  // Simple percent: divide current number segment by 100
  const parts = display.value.split(/([+\-*/])/);
  const cur = parts.pop();
  const op = parts.pop(); // operator (or undefined)
  const left = parts.join("") || "0";
  const curNum = parseFloat(cur || "0");
  if (op && left) {
    // Windows-like behavior: percent of the left operand
    const leftVal = Number(Function(`return ${normalize(left)}`)());
    const val = (leftVal * curNum) / 100;
    display.value = `${left}${op}${val}`;
  } else {
    display.value = String(curNum / 100);
  }
}

function invert() { // 1/x
  const v = Number(Function(`return ${normalize(display.value)}`)());
  if (v === 0) return setDisplay("Error");
  setDisplay(1 / v);
}

function square() {
  const v = Number(Function(`return ${normalize(display.value)}`)());
  setDisplay(v * v);
}

function sqrt() {
  const v = Number(Function(`return ${normalize(display.value)}`)());
  if (v < 0) return setDisplay("Error");
  setDisplay(Math.sqrt(v));
}

// --- Calculate ---
function calculate() {
  let expr = normalize(display.value);
  if (!expr) return;                          // empty: do nothing
  const last = expr.at(-1);
  if (isOp(last) || last === ".") return;     // incomplete: do nothing
  try {
    const result = Function(`"use strict"; return (${expr});`)();
    setDisplay(result);
  } catch {
    setDisplay("Error");
  }
}

// --- Expose functions for button onclick=... ---
window.append = append;          // digits & "."
window.appendOp = appendOp;      // + - * /
window.clearAll = clearAll;      // C
window.clearEntry = clearEntry;  // CE
window.deleteChar = deleteChar;  // ⌫
window.percent = percent;        // %
window.invert = invert;          // 1/x
window.square = square;          // x²
window.sqrt = sqrt;              // ²√x
window.calculate = calculate;    // =

// --- Keyboard support ---
document.addEventListener("keydown", function (event) {
  const key = event.key;

  // Numbers 0–9
  if (/^[0-9]$/.test(key)) {
    append(key);
    return;
  }

  // Decimal
  if (key === ".") {
    append(".");
    return;
  }

  // Operators
  if (key === "+" || key === "-" || key === "*" || key === "/") {
    appendOp(key);
    return;
  }

  // Enter or = → calculate
  if (key === "Enter" || key === "=") {
    event.preventDefault();
    calculate();
    return;
  }

  // Backspace → delete one char
  if (key === "Backspace") {
    event.preventDefault();
    deleteChar();
    return;
  }

  // Escape → clear all
  if (key === "Escape") {
    clearAll();
    return;
  }

  // % key
  if (key === "%") {
    percent();
    return;
  }
    // delete key
  if (key === "Delete") {
    clearAll();
    return;
  }
});
