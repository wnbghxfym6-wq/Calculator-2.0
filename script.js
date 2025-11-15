// ================== STORAGE KEYS ==================
const STORAGE_USER_KEY = "calculatorUsername";
const STORAGE_PASS_KEY = "calculatorPassword";
const STORAGE_LOGGED_IN_KEY = "calculatorLoggedIn";
const STORAGE_LOG_KEY = "calculatorCalcLog";
const STORAGE_SESSION_INFO_KEY = "calculatorLastSessionInfo";

// ================== DOM ELEMENTS ==================
const loginScreen = document.getElementById("login-screen");
const calculatorWrapper = document.getElementById("calculator-wrapper");

const loginUsername = document.getElementById("login-username");
const loginPassword = document.getElementById("login-password");
const loginError = document.getElementById("login-error");
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const exportBtn = document.getElementById("export-csv-btn");
const loginTitle = loginScreen ? loginScreen.querySelector("h1") : null;

// CSV preview modal elements (will be created if missing)
let csvModal = document.getElementById("csv-modal");
let csvPreviewTable = document.getElementById("csv-preview-table");
let modalCancel = document.getElementById("modal-cancel");
let modalDownload = document.getElementById("modal-download");
let csvModalWired = false;

// ================== SESSION INFO & IP ==================

let currentSessionInfo = {
  username: null,
  loginTime: null,
  ip: null,
};

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

// helper: MST timestamp (America/Denver)
function getLocalTimestamp() {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Denver",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date());
}

// ================== ANIMATION ==================

function animateIn(el) {
  if (!el) return;
  el.classList.remove("screen-animate-in");
  void el.offsetWidth; // restart animation
  el.classList.add("screen-animate-in");
}

// ================== AUTH FLOW ==================

let authMode = "login"; // "register" on first run

initAuth();

// button wiring (guarded so they can't crash)
if (loginBtn) {
  loginBtn.addEventListener("click", handleAuth);
}
if (loginPassword) {
  loginPassword.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleAuth();
  });
}
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem(STORAGE_LOGGED_IN_KEY);
    showLogin();
  });
}
if (exportBtn) {
  exportBtn.addEventListener("click", openCSVPreview);
}

function initAuth() {
  const storedUser = localStorage.getItem(STORAGE_USER_KEY);
  const storedPass = localStorage.getItem(STORAGE_PASS_KEY);

  // load last session info if present
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
    if (storedUser) currentSessionInfo.username = storedUser;
  }

  if (storedUser && storedPass) {
    authMode = "login";
    if (loginTitle) loginTitle.textContent = "Sign In";
    if (loginBtn) loginBtn.textContent = "Sign in";

    if (localStorage.getItem(STORAGE_LOGGED_IN_KEY) === "true") {
      showCalculator();
      return;
    }

    showLogin();
  } else {
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
    localStorage.setItem(STORAGE_USER_KEY, user);
    localStorage.setItem(STORAGE_PASS_KEY, pass);
    localStorage.setItem(STORAGE_LOGGED_IN_KEY, "true");

    const loginTime = getLocalTimestamp();
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

    authMode = "login";
    if (loginTitle) loginTitle.textContent = "Sign In";
    if (loginBtn) loginBtn.textContent = "Sign in";
  } else {
    const storedUser = localStorage.getItem(STORAGE_USER_KEY);
    const storedPass = localStorage.getItem(STORAGE_PASS_KEY);

    if (user === storedUser && pass === storedPass) {
      const loginTime = getLocalTimestamp();
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

// ================== CALCULATOR + LOGGING ==================

let expression = "";
let justEvaluated = false;
let history = [];
let calcLog = [];

// load existing calculations
(function initCalcLog() {
  try {
    const raw = localStorage.getItem(STORAGE_LOG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) calcLog = parsed;
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
    const value = Function('"use strict";return (' + expression + ")")();
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
    const x = Function('"use strict";return (' + expression + ")")();
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

function addToCalcLog(expr, result) {
  const entry = {
    time: getLocalTimestamp(), // MST calc time
    expression: expr,
    result: result,
    loginTime: currentSessionInfo.loginTime,
    username: currentSessionInfo.username,
    ip: currentSessionInfo.ip,
  };

  calcLog.push(entry);
  try {
    localStorage.setItem(STORAGE_LOG_KEY, JSON.stringify(calcLog));
  } catch (e) {
    // ignore
  }
}

function calculate() {
  if (!expression) return;

  try {
    const { resultEl } = getEls();
    const originalExpression = expression;

    let value = Function('"use strict";return (' + expression + ")")();

    value = Math.trunc(value * 10000) / 10000;
    const formatted = value.toString().replace(/\.?0+$/, "");

    resultEl.textContent = formatted;
    justEvaluated = true;

    addToCalcLog(originalExpression, formatted);
  } catch (e) {
    getEls().resultEl.textContent = "Error";
    justEvaluated = false;
  }
}

// ================== KEYBOARD SUPPORT ==================

function handleKey(e) {
  const active = document.activeElement;
  if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA")) {
    return;
  }
  if (e.ctrlKey || e.metaKey || e.altKey) return;

  const key = e.key;

  if (key >= "0" && key <= "9") {
    appendChar(key);
    e.preventDefault();
    return;
  }
  if (key === "." || key === ",") {
    appendChar(".");
    e.preventDefault();
    return;
  }
  if (key === "+" || key === "-" || key === "*" || key === "/") {
    appendChar(key);
    e.preventDefault();
    return;
  }
  if (key === "Enter" || key === "=") {
    calculate();
    e.preventDefault();
    return;
  }
  if (key === "Backspace") {
    backspace();
    e.preventDefault();
    return;
  }
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

// ================== CSV MODAL CREATION & EXPORT ==================

function ensureCsvModal() {
  if (csvModalWired) return;

  // if it doesn't exist in HTML, create it
  if (!csvModal) {
    const wrapper = document.createElement("div");
    wrapper.id = "csv-modal";
    wrapper.className = "modal hidden";
    wrapper.innerHTML = `
      <div class="modal-content">
        <h2>CSV Preview</h2>
        <div id="csv-preview-table" class="modal-table"></div>
        <div class="modal-buttons">
          <button id="modal-cancel" class="btn secondary">Cancel</button>
          <button id="modal-download" class="btn primary">Download CSV</button>
        </div>
      </div>
    `;
    document.body.appendChild(wrapper);
  }

  // reselect elements
  csvModal = document.getElementById("csv-modal");
  csvPreviewTable = document.getElementById("csv-preview-table");
  modalCancel = document.getElementById("modal-cancel");
  modalDownload = document.getElementById("modal-download");

  if (modalCancel) {
    modalCancel.addEventListener("click", () => {
      csvModal.classList.add("hidden");
    });
  }

  if (modalDownload) {
    modalDownload.addEventListener("click", () => {
      csvModal.classList.add("hidden");
      downloadCSV();
    });
  }

  csvModalWired = true;
}

function openCSVPreview() {
  if (!calcLog.length) {
    alert("No calculations to export.");
    return;
  }

  ensureCsvModal();
  if (!csvModal || !csvPreviewTable) {
    // last resort: just export
    downloadCSV();
    return;
  }

  let html = "<table><thead><tr>";
  html +=
    "<th>Calc Time</th><th>User</th><th>IP</th><th>Login</th><th>Expr</th><th>Result</th>";
  html += "</tr></thead><tbody>";

  const previewRows = calcLog.slice(-20); // last 20

  previewRows.forEach((entry) => {
    html += `
      <tr>
        <td>${entry.time || ""}</td>
        <td>${entry.username || ""}</td>
        <td>${entry.ip || ""}</td>
        <td>${entry.loginTime || ""}</td>
        <td>${entry.expression || ""}</td>
        <td>${entry.result || ""}</td>
      </tr>
    `;
  });

  html += "</tbody></table>";
  csvPreviewTable.innerHTML = html;

  csvModal.classList.remove("hidden");
}

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
  const blob = new Blob([csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "calculator-history.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  URL.revokeObjectURL(url);
}

// ================== SCALING ==================

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
