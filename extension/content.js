(() => {
  const STORAGE_KEYS = {
    profile: "profile",
    lastRun: "autofillLastRun"
  };

  const BASE_THRESHOLD = 6;
  const HIGH_CONFIDENCE_THRESHOLD = 10;
  const ENGINE_KEY = "__applySmartAutofillEngine";

  const normalize = (v) => (v || "").toLowerCase().trim();
  const normalizeCompact = (v) => normalize(v).replace(/\s+/g, " ");

  const countHits = (text, tokens, weight) =>
    tokens.reduce((sum, t) => sum + (text.includes(t) ? weight : 0), 0);

  const typeOfField = (el) => {
    if (el instanceof HTMLSelectElement) return "select-one";
    if (el instanceof HTMLTextAreaElement) return "textarea";
    if (el instanceof HTMLInputElement) return normalize(el.type || "text");
    return normalize(el.tagName);
  };

  const labelTextFor = (el) => {
    const chunks = [];
    if (el.labels) {
      el.labels.forEach((l) => {
        const text = normalizeCompact(l.textContent);
        if (text) chunks.push(text);
      });
    }
    if (el.id) {
      const fallback = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (fallback) {
        const text = normalizeCompact(fallback.textContent);
        if (text) chunks.push(text);
      }
    }
    return chunks.join(" ");
  };

  const extractMeta = (el) => {
    const name = normalizeCompact(el.getAttribute("name"));
    const id = normalizeCompact(el.getAttribute("id"));
    const placeholder = normalizeCompact(el.getAttribute("placeholder"));
    const aria = normalizeCompact(el.getAttribute("aria-label"));
    const autoComplete = normalizeCompact(el.getAttribute("autocomplete"));
    const label = labelTextFor(el);

    return {
      name,
      id,
      placeholder,
      aria,
      autoComplete,
      type: typeOfField(el),
      haystack: [name, id, placeholder, aria, label].filter(Boolean).join(" ")
    };
  };

  const FIELD_DEFINITIONS = {
    firstName: {
      tokens: ["first_name", "firstname", "fname"],
      strong: ["first name", "given name"],
      weak: ["first", "given"],
      types: ["text", "search"],
      value: (p) => p.personal.firstName
    },
    lastName: {
      tokens: ["last_name", "lastname", "lname"],
      strong: ["last name", "surname", "family name"],
      weak: ["last", "surname"],
      types: ["text", "search"],
      value: (p) => p.personal.lastName
    },
    email: {
      tokens: ["email", "email_address"],
      strong: ["email address"],
      weak: ["email"],
      types: ["email", "text"],
      value: (p) => p.personal.email
    },
    phone: {
      tokens: ["phone", "mobile", "telephone"],
      strong: ["phone number", "mobile number"],
      weak: ["phone", "contact"],
      types: ["tel", "text"],
      value: (p) => p.personal.phone
    },
    linkedin: {
      tokens: ["linkedin", "linkedin_url"],
      strong: ["linkedin profile"],
      weak: ["linkedin"],
      types: ["url", "text"],
      value: (p) => p.personal.linkedin
    },
    address: {
      tokens: ["address", "street", "address_line"],
      strong: ["street address"],
      weak: ["address", "street"],
      types: ["text", "textarea"],
      value: (p) => p.personal.address
    },
    city: {
      tokens: ["city", "town"],
      strong: ["city"],
      weak: ["city"],
      types: ["text"],
      value: (p) => p.personal.city
    },
    state: {
      tokens: ["state", "province"],
      strong: ["state", "province"],
      weak: ["state"],
      types: ["text", "select-one"],
      value: (p) => p.personal.state
    },
    zip: {
      tokens: ["zip", "postal", "postal_code"],
      strong: ["zip code", "postal code"],
      weak: ["zip", "postal"],
      types: ["text"],
      value: (p) => p.personal.zip
    },
    summary: {
      tokens: ["summary", "about", "professional_summary"],
      strong: ["professional summary", "about you"],
      weak: ["summary"],
      types: ["textarea", "text"],
      value: (p) => p.summary
    },
    skills: {
      tokens: ["skills", "skill_set"],
      strong: ["technical skills"],
      weak: ["skills"],
      types: ["textarea", "text"],
      value: (p) => (Array.isArray(p.skills) ? p.skills.join(", ") : "")
    }
  };

  const scoreField = (def, meta) => {
    const descriptor = `${meta.name} ${meta.id}`;
    let score = 0;
    score += countHits(descriptor, def.tokens, 7);
    score += countHits(meta.haystack, def.strong, 4);
    score += countHits(meta.haystack, def.weak, 2);
    if (def.types.includes(meta.type)) score += 3;
    return score;
  };

  const chooseBestDefinition = (meta) => {
    let best = null;
    Object.values(FIELD_DEFINITIONS).forEach((def) => {
      const score = scoreField(def, meta);
      if (!best || score > best.score) best = { def, score };
    });
    return best;
  };

  const canFill = (el) => {
    if (el.disabled || el.readOnly) return false;
    if (el instanceof HTMLInputElement) {
      const t = normalize(el.type);
      if (["hidden", "submit", "button", "file", "password"].includes(t)) return false;
    }
    return true;
  };

  const hasUserValue = (el) => {
    if (el instanceof HTMLInputElement && ["checkbox", "radio"].includes(normalize(el.type))) return el.checked;
    return Boolean((el.value || "").trim());
  };

  const emitEvents = (el) => {
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  };

  const setValue = (el, value) => {
    if (!value) return false;

    if (el instanceof HTMLSelectElement) {
      const desired = normalizeCompact(value);
      const option = Array.from(el.options).find(
        (o) => normalizeCompact(o.value) === desired || normalizeCompact(o.textContent) === desired
      );
      if (!option) return false;
      el.value = option.value;
      emitEvents(el);
      return true;
    }

    if (el.value === value) return false;
    el.value = value;
    emitEvents(el);
    return true;
  };

  const emptyProfile = () => ({
    settings: { highConfidenceOnly: false },
    personal: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      linkedin: "",
      address: "",
      city: "",
      state: "",
      zip: ""
    },
    summary: "",
    skills: []
  });

  const normalizeProfile = (profile) => {
    if (!profile) return emptyProfile();
    const base = emptyProfile();
    return {
      ...base,
      ...profile,
      personal: { ...base.personal, ...(profile.personal || {}) }
    };
  };

  const runAutofill = async () => {
    const storage = await chrome.storage.local.get([STORAGE_KEYS.profile]);
    const profile = normalizeProfile(storage.profile);

    const threshold = profile.settings.highConfidenceOnly ? HIGH_CONFIDENCE_THRESHOLD : BASE_THRESHOLD;

    const elements = Array.from(document.querySelectorAll("input, textarea, select"));
    let filled = 0;

    elements.forEach((el) => {
      if (!canFill(el) || hasUserValue(el)) return;

      const meta = extractMeta(el);
      const best = chooseBestDefinition(meta);
      if (!best || best.score < threshold) return;

      const value = best.def.value(profile);
      if (setValue(el, value)) filled++;
    });

    const summary = {
      filled,
      scanned: elements.length,
      ranAt: new Date().toISOString()
    };

    await chrome.storage.local.set({ [STORAGE_KEYS.lastRun]: summary });

    chrome.runtime.sendMessage({ type: "APPLYSMART_AUTOFILL_RESULT", payload: summary });

    return summary;
  };

  if (window[ENGINE_KEY]) {
    window[ENGINE_KEY].run();
    return;
  }

  window[ENGINE_KEY] = { run: runAutofill };

  runAutofill();
})();
