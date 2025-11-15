// ================== SIMPLE LOCAL AUTH & ELEMENTS ==================

// LocalStorage keys
const STORAGE_USER_KEY = "calculatorUsername";
const STORAGE_PASS_KEY = "calculatorPassword";
const STORAGE_LOGGED_IN_KEY = "calculatorLoggedIn";
const STORAGE_LOG_KEY = "calculatorCalcLog";
const STORAGE_SESSION_INFO_KEY = "calculatorLastSessionInfo"; // NEW


// DOM elements
const loginScreen = document.getElementById("login-screen");
const calculatorWrapper = document.getElementById("calculator-wrapper");

const loginUsername = document.getElementById("login-username");
const loginPassword = document.getElementById("login-password");
const loginError = document.getElementById("login-error");
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const exportBtn = document.getElementById("export-csv-btn");
const loginTitle = loginScreen ? loginScreen.querySelector("h1") : null;

// "register" on first run, "login" afterwards
let authMode = "login";

// small helper: animate a screen when it becomes visible
function animateIn(el) {
  if (!el) return;
  el.classList.remove("screen-animate-in");
  void el.offsetWidth; // force reflow so animation restarts
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
    localStorage.removeItem(STORAGE_LOGGED_IN_KEY);
    showLogin();
  });
}

if (exportBtn) {
  exportBtn.addEventListener("click", downloadCSV);
}

function initAuth() {
  const storedUser = localStorage.getItem(STORAGE_USER_KEY);
  const storedPass = localStorage.getItem(STORAGE_PASS_KEY);

    // load last session info (for auto-login sessions)
  try {
    const savedSession = localStorage.getItem(STORAGE_SESSION_INFO_KEY);
    if (savedSession) {
      const parsed = JSON.parse(savedSession);
      if (parsed && typeof parsed === "object") {
        currentSessionInfo = {
          username: parsed.username || storedUser || null,
          loginTime: parsed.loginTime || null,
          ip: parsed.ip || null,
        };
      }
    } else if (storedUser) {
      currentSessionInfo.username = storedUser;
    }
  } catch (e) {
    // ignore parse errors, fall back to storedUser only
    if (storedUser) currentSessionInfo.username = storedUser;
  }

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

  if (!user || !pass) {
    loginError.textContent = "Username and password are required.";
    return;
  }

  if (authMode === "register") {
    // first-time setup: save username + password locally
    localStorage.setItem(STORAGE_USER_KEY, user);
    localStorage.setItem(STORAGE_PASS_KEY, pass);
    localStorage.setItem(STORAGE_LOGGED_IN_KEY, "true");

    // record this login session
const loginTime = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Denver",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false
}).format(new Date());
    currentSessionInfo = {
      username: user,
      loginTime,
      ip: cachedIP || null,
    };
    localStorage.setItem(
      STORAGE_SESSION_INFO_KEY,
      JSON.stringify(currentSessionInfo)
    );

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
      // record this login session
      const loginTime = new Date().toISOString();
      currentSessionInfo = {
        username: user,
        loginTime,
        ip: cachedIP || null,
      };
      localStorage.setItem(
        STORAGE_SESSION_INFO_KEY,
        JSON.stringify(currentSessionInfo)
      );

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
    animateIn(loginScreen);
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
    animateIn(calculatorWrapper);
  }

  if (document.activeElement && document.activeElement.blur) {
    document.activeElement.blur();
  }
  window.scrollTo(0, 0);
}

// ================== CALCULATOR STATE & LOGGING ==================

let expression = "";
let justEvaluated = false;
let history = [];
let calcLog = [];

// current login session info
let currentSessionInfo = {
  username: null,
  loginTime: null,
  ip: null,
};
// best-effort public IP detection (requires internet access)
let cachedIP = null;
(function initIP() {
  try {
    fetch("https://api.ipify.org?format=json")
      .then((r) => r.json())
      .then((data) => {
        cachedIP = data && data.ip ? data.ip : null;
      })
      .catch(() => {
        cachedIP = null;
      });
  } catch (e) {
    cachedIP = null;
  }
})();

// load existing calc log from localStorage (if any)
(function initCalcLog() {
  try {
    const raw = localStorage.getItem(STORAGE_LOG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        calcLog = parsed;
      }
    }
  } catch (e) {
    calcLog = [];
  }
})();

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

// add one calculation to the log and persist
function addToCalcLog(expr, result) {
  const entry = {
time: new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Denver",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false
}).format(new Date()),
    expression: expr,
    result: result,
    loginTime: currentSessionInfo.loginTime,     // when user logged in
    username: currentSessionInfo.username,       // "user id"
    ip: currentSessionInfo.ip,                   // best-effort IP
  };

  calcLog.push(entry);

  try {
    localStorage.setItem(STORAGE_LOG_KEY, JSON.stringify(calcLog));
  } catch (e) {
    // ignore storage errors
  }
}


function calculate() {
  if (!expression) return;

  try {
    const { resultEl } = getEls();
    const originalExpression = expression;

    let value = Function('"use strict";return (' + expression + ')')();

    // TRUNCATE TO 4 DECIMALS
    value = Math.trunc(value * 10000) / 10000;

    // REMOVE TRAILING ZEROS
    const formatted = value.toString().replace(/\.?0+$/, "");

    resultEl.textContent = formatted;
    justEvaluated = true;

    // log this calc
    addToCalcLog(originalExpression, formatted);
  } catch (e) {
    getEls().resultEl.textContent = "Error";
    justEvaluated = false;
  }
}

// ================== KEYBOARD SUPPORT ==================

function handleKey(e) {
  // don't hijack typing in login inputs
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

  // Escape / Delete → clear all
  if (key === "Escape" || key === "Delete") {
    clearAll();
    e.preventDefault();
    return;
  }

  if (key === "%") {
    percent();
    e.preventDefault();
    return;
  }
}

window.addEventListener("keydown", handleKey);

// ================== CSV EXPORT ==================

function downloadCSV() {
  if (!calcLog.length) {
    alert("No calculations to export yet.");
    return;
  }

  const header =
    "CalcTimestamp,UserId,UserIP,LoginTimestamp,Expression,Result\n";

  const rows = calcLog.map((entry) => {
    const calcTime = entry.time || "";
    const loginTime = entry.loginTime || "";
    const userId = entry.username || "";
    const ip = entry.ip || "";

    const expr = (entry.expression || "").replace(/"/g, '""');
    const result =
      entry.result != null ? String(entry.result).replace(/"/g, '""') : "";

    return `"${calcTime}","${userId}","${ip}","${loginTime}","${expr}","${result}"`;
  });

  const csvContent = header + rows.join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "calculator-history.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  URL.revokeObjectURL(url);
}


// ================== SCALING LOGIC ==================

(function () {
  const BASE_WIDTH = 420;
  const BASE_HEIGHT = 620;
  const MIN_SCALE = 0.6;

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
