(function () {
  const root = document.documentElement;
  const listeners = [];

  function save(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (err) {}
  }

  function applyLang(lang) {
    root.dataset.lang = lang;
    root.lang = lang === "od" ? "or" : lang;
    const suffix = lang === "hi" ? "Hi" : "En";
    if (root.dataset["title" + suffix]) document.title = root.dataset["title" + suffix];
    document.querySelectorAll("[data-ph-en]").forEach((el) => {
      el.placeholder = el.dataset["ph" + suffix];
    });
    document.querySelectorAll("[data-label-en]").forEach((el) => {
      el.setAttribute("aria-label", el.dataset["label" + suffix]);
    });
    document.querySelectorAll("[data-lang-select]").forEach((select) => {
      select.value = lang;
    });
    document.querySelectorAll("[data-set-lang]").forEach((btn) => {
      const other = lang === "hi" ? "en" : "hi";
      btn.textContent = other === "hi" ? "हिंदी" : "English";
      btn.lang = other;
    });
    listeners.forEach((fn) => fn(lang));
  }

  function applySize(large) {
    root.classList.toggle("large-text", large);
    document.querySelectorAll("[data-text-size]").forEach((btn) => btn.setAttribute("aria-pressed", String(large)));
  }

  document.addEventListener("click", (event) => {
    if (event.target.closest("[data-set-lang]")) {
      const next = root.dataset.lang === "hi" ? "en" : "hi";
      save(root.dataset.langKey || "asli-lang", next);
      applyLang(next);
    } else if (event.target.closest("[data-text-size]")) {
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
    pick: (copy) => copy[root.dataset.lang] || copy.en,
    onLang: (fn) => listeners.push(fn),
  };

  applyLang(root.dataset.lang || "en");
  applySize(root.classList.contains("large-text"));
})();
