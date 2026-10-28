(function () {
  const root = document.documentElement;
  const FONTS = {
    bn: "Noto+Sans+Bengali", as: "Noto+Sans+Bengali", ta: "Noto+Sans+Tamil", te: "Noto+Sans+Telugu",
    kn: "Noto+Sans+Kannada", ml: "Noto+Sans+Malayalam", gu: "Noto+Sans+Gujarati", pa: "Noto+Sans+Gurmukhi", od: "Noto+Sans+Oriya",
  };
  const LINKS = {
    tel1930: '<a href="tel:1930"><strong>1930</strong></a>',
    cyber: '<a href="https://cybercrime.gov.in">cybercrime.gov.in</a>',
    github: '<a href="https://github.com/Deveshu04/Asli-Hai-">GitHub</a>',
  };
  const cache = {};
  const listeners = [];
  let strings = {};
  let fallback = {};
  let loaded = false;
  let pending = 0;

  function save(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (err) {}
  }

  function escapeHtml(text) {
    return text.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  }

  function load(lang) {
    if (!root.hasAttribute("data-i18n-page")) return Promise.resolve({});
    if (!cache[lang]) {
      cache[lang] = fetch(`i18n/${lang}.json?v=3`).then((res) => (res.ok ? res.json() : {})).catch(() => ({}));
    }
    return cache[lang];
  }

  function t(key, vars) {
    let text = strings[key] ?? fallback[key] ?? key;
    if (vars) text = text.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? vars[name] : match));
    return text;
  }

  function loadFont(lang) {
    if (!FONTS[lang] || document.getElementById("font-" + lang)) return;
    const link = document.createElement("link");
    link.id = "font-" + lang;
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${FONTS[lang]}:wght@400;600;700&display=swap`;
    document.head.appendChild(link);
  }

  async function applyLang(lang) {
    const ticket = ++pending;
    root.dataset.lang = lang;
    root.lang = lang === "od" ? "or" : lang;
    loadFont(lang);
    const [dict, english] = await Promise.all([load(lang), load("en")]);
    if (ticket !== pending) return;
    strings = dict;
    fallback = english;

    if (root.dataset.i18nTitle) document.title = t(root.dataset.i18nTitle);
    document.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll("[data-i18n-html]").forEach((el) => {
      el.innerHTML = escapeHtml(t(el.dataset.i18nHtml)).replace(/\{(\w+)\}/g, (match, name) => LINKS[name] || match);
    });
    document.querySelectorAll("[data-i18n-ph]").forEach((el) => { el.placeholder = t(el.dataset.i18nPh); });
    document.querySelectorAll("[data-i18n-label]").forEach((el) => { el.setAttribute("aria-label", t(el.dataset.i18nLabel)); });
    document.querySelectorAll("[data-lang-select]").forEach((select) => { select.value = lang; });

    loaded = true;
    root.classList.remove("i18n-pending");
    listeners.forEach((fn) => fn(lang));
  }

  function applySize(large) {
    root.classList.toggle("large-text", large);
    document.querySelectorAll("[data-text-size]").forEach((btn) => btn.setAttribute("aria-pressed", String(large)));
  }

  document.addEventListener("click", (event) => {
    if (event.target.closest("[data-text-size]")) {
      const large = !root.classList.contains("large-text");
      save("asli-text", large ? "large" : "normal");
      applySize(large);
    }
  });

  document.addEventListener("change", (event) => {
    if (event.target.matches("[data-lang-select]")) {
      save(root.dataset.langKey || "asli-lang", event.target.value);
      applyLang(event.target.value);
    }
  });

  window.asli = {
    lang: () => root.dataset.lang,
    t,
    load,
    onLang: (fn) => {
      listeners.push(fn);
      if (loaded) fn(root.dataset.lang);
    },
  };

  applySize(root.classList.contains("large-text"));
  applyLang(root.dataset.lang || "en");
})();
