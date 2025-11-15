// ================== SIMPLE LOCAL AUTH ==================
// LocalStorage keys
const STORAGE_USER_KEY = "calculatorUsername";
const STORAGE_PASS_KEY = "calculatorPassword";
const STORAGE_LOGGED_IN_KEY = "calculatorLoggedIn";

// DOM elements
const loginScreen = document.getElementById("login-screen");
const calculatorWrapper = document.getElementById("calculator-wrapper");

const loginUsername = document.getElementById("login-username");
const loginPassword = document.getElementById("login-password");
const loginError = document.getElementById("login-error");
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const loginTitle = loginScreen ? loginScreen.querySelector("h1") : null;


// "register" on first run, "login" afterwards
let authMode = "login";

function animateIn(el) {
  if (!el) return;
  // reset animation if it was just used
  el.classList.remove("screen-animate-in");
  // force reflow so the animation restarts
  void el.offsetWidth;
  el.classList.add("screen-animate-in");
}


// Initialize auth state on load
initAuth();

// Wire up events
if (loginBtn) {
  loginBtn.addEventListener("click", handleAuth);
}

if (loginPassword) {
  loginPassword.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      handleAuth();
    }
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    // end the current session but keep the account
    localStorage.removeItem(STORAGE_LOGGED_IN_KEY);
    showLogin();
  });
};

function initAuth() {
  const storedUser = localStorage.getItem(STORAGE_USER_KEY);
  const storedPass = localStorage.getItem(STORAGE_PASS_KEY);

  if (storedUser && storedPass) {
    // account already exists → normal login mode
    authMode = "login";
    if (loginTitle) loginTitle.textContent = "Sign In";
    if (loginBtn) loginBtn.textContent = "Sign in";

    // if we were logged in previously, go straight to calculator
    if (localStorage.getItem(STORAGE_LOGGED_IN_KEY) === "true") {
      showCalculator();
      return;
    }

    showLogin();
  } else {
    // first time → create account mode
    authMode = "register";
    if (loginTitle) loginTitle.textContent = "Create Account";
    if (loginBtn) loginBtn.textContent = "Create account";
    showLogin();
  }
}

function handleAuth() {
  const user = (loginUsername.value || "").trim();
  const pass = loginPassword.value || "";

  // simple input validation
  if (!user || !pass) {
    loginError.textContent = "Username and password are required.";
    return;
  }

  if (authMode === "register") {
    // first-time setup: save username + password locally
    localStorage.setItem(STORAGE_USER_KEY, user);
    localStorage.setItem(STORAGE_PASS_KEY, pass);
    localStorage.setItem(STORAGE_LOGGED_IN_KEY, "true");

    loginError.textContent = "";
    loginPassword.value = "";
    showCalculator();

    // switch future visits to login mode
    authMode = "login";
    if (loginTitle) loginTitle.textContent = "Sign In";
    if (loginBtn) loginBtn.textContent = "Sign in";
  } else {
    // normal login
    const storedUser = localStorage.getItem(STORAGE_USER_KEY);
    const storedPass = localStorage.getItem(STORAGE_PASS_KEY);

    if (user === storedUser && pass === storedPass) {
      loginError.textContent = "";
      loginPassword.value = "";
      localStorage.setItem(STORAGE_LOGGED_IN_KEY, "true");
      showCalculator();
    } else {
      loginError.textContent = "Invalid username or password.";
    }
  }
}

function showLogin() {
  if (loginScreen) {
    loginScreen.classList.remove("hidden");
    animateIn(loginScreen);          // ✨ animate login appearing
  }
  if (calculatorWrapper) {
    calculatorWrapper.classList.add("hidden");
  }
  if (document.activeElement && document.activeElement.blur) {
    document.activeElement.blur();
  }
  window.scrollTo(0, 0);
}




function showCalculator() {
  if (loginScreen) {
    loginScreen.classList.add("hidden");
  }
  if (calculatorWrapper) {
    calculatorWrapper.classList.remove("hidden");
    animateIn(calculatorWrapper);    // ✨ animate calculator appearing
  }

  if (document.activeElement && document.activeElement.blur) {
    document.activeElement.blur();
  }
  window.scrollTo(0, 0);
}
// ================== END SIMPLE LOCAL AUTH ==================

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
  if (!historyPanel) return;

  historyPanel.innerHTML = history
    .map((item) => `<div>${item}</div>`)
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
  // 🔒 Don't hijack keyboard if user is typing in an input (like login fields)
  const active = document.activeElement;
  if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA")) {
    return;
  }

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
  const BASE_HEIGHT = 620;
  const MIN_SCALE = 0.6; // 👈 added so it doesn't error

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
})();
