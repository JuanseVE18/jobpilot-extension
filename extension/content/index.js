(() => {
  const PROFILE_KEY = "profile";
  const LAST_SUMMARY_KEY = "autofillLastRun";

  const normalize = (value) => (value || "").toLowerCase().trim();
  const normalizeCompact = (value) => normalize(value).replace(/\s+/g, " ");
  const nonEmpty = (value) => Boolean((value || "").toString().trim());

  const FIELD_DEFINITIONS = {
    firstName: {
      tokens: ["first_name", "firstname", "first-name", "fname"],
      strong: ["first name", "given name"],
      weak: ["first", "given"],
      types: ["text", "search"],
      autocomplete: ["given-name"]
    },
    lastName: {
      tokens: ["last_name", "lastname", "last-name", "lname", "surname"],
      strong: ["last name", "family name", "surname"],
      weak: ["last", "family"],
      types: ["text", "search"],
      autocomplete: ["family-name"]
    },
    email: {
      tokens: ["email", "email_address", "e-mail"],
      strong: ["email", "email address"],
      weak: ["mail"],
      types: ["email", "text"],
      autocomplete: ["email"]
    },
    phone: {
      tokens: ["phone", "mobile", "telephone", "cell"],
      strong: ["phone", "mobile", "telephone"],
      weak: ["contact", "tel"],
      types: ["tel", "text"],
      autocomplete: ["tel", "tel-national"]
    },
    linkedin: {
      tokens: ["linkedin", "linkedin_url", "linkedin_profile"],
      strong: ["linkedin", "linkedin profile"],
      weak: ["linkedin", "profile"],
      types: ["url", "text"],
      autocomplete: []
    },
    summary: {
      tokens: ["summary", "professional_summary"],
      strong: ["professional summary", "summary", "about you"],
      weak: ["summary", "about"],
      types: ["textarea", "text"],
      autocomplete: []
    },
    skills: {
      tokens: ["skills", "skill_set"],
      strong: ["skills", "technical skills"],
      weak: ["skill"],
      types: ["text", "textarea"],
      autocomplete: []
    },
    certifications: {
      tokens: ["certifications", "certificates"],
      strong: ["certifications", "certificates"],
      weak: ["cert"],
      types: ["text", "textarea"],
      autocomplete: []
    },
    languages: {
      tokens: ["languages", "spoken_languages"],
      strong: ["languages", "languages spoken"],
      weak: ["language"],
      types: ["text", "textarea"],
      autocomplete: []
    }
  };

  const normalizeProfile = (raw = {}) => ({
    personal: {
      firstName: raw.personal?.firstName || "",
      lastName: raw.personal?.lastName || "",
      email: raw.personal?.email || "",
      phone: raw.personal?.phone || "",
      linkedin: raw.personal?.linkedin || ""
    },
    summary: raw.summary || "",
    skills: Array.isArray(raw.skills) ? raw.skills : [],
    certifications: Array.isArray(raw.certifications) ? raw.certifications : [],
    languages: Array.isArray(raw.languages) ? raw.languages : []
  });

  const flattenProfile = (profile) => ({
    firstName: profile.personal.firstName,
    lastName: profile.personal.lastName,
    email: profile.personal.email,
    phone: profile.personal.phone,
    linkedin: profile.personal.linkedin,
    summary: profile.summary,
    skills: profile.skills.join(", "),
    certifications: profile.certifications.join(", "),
    languages: profile.languages.join(", ")
  });

  const getFieldMeta = (element) => {
    const name = normalizeCompact(element.getAttribute("name"));
    const id = normalizeCompact(element.getAttribute("id"));
    const placeholder = normalizeCompact(element.getAttribute("placeholder"));
    const ariaLabel = normalizeCompact(element.getAttribute("aria-label"));
    const autoComplete = normalizeCompact(element.getAttribute("autocomplete"));

    let labelText = "";
    if (element.labels && element.labels.length > 0) {
      labelText = Array.from(element.labels)
        .map((label) => normalizeCompact(label.textContent))
        .filter(Boolean)
        .join(" ");
    }

    const type = element instanceof HTMLSelectElement
      ? "select-one"
      : element instanceof HTMLTextAreaElement
        ? "textarea"
        : normalize(element.type || element.tagName);

    return {
      type,
      autoComplete,
      haystack: [name, id, placeholder, ariaLabel, labelText].filter(Boolean).join(" "),
      descriptor: `${name} ${id}`
    };
  };

  const countHits = (text, tokens, weight) =>
    tokens.reduce((score, token) => score + (text.includes(token) ? weight : 0), 0);

  const scoreKey = (key, meta) => {
    const def = FIELD_DEFINITIONS[key];
    if (!def) {
      return 0;
    }

    let score = 0;
    score += countHits(meta.descriptor, def.tokens, 7);
    score += countHits(meta.haystack, def.strong, 4);
    score += countHits(meta.haystack, def.weak, 2);
    score += countHits(meta.autoComplete, def.autocomplete, 8);

    if (def.types.includes(meta.type)) {
      score += 3;
    }

    return score;
  };

  const pickBestKey = (meta) => {
    let best = null;

    Object.keys(FIELD_DEFINITIONS).forEach((key) => {
      const score = scoreKey(key, meta);
      if (!best || score > best.score) {
        best = { key, score };
      }
    });

    return best;
  };

  const isFillable = (element) => {
    if (!element || element.disabled || element.readOnly) {
      return false;
    }

    if (element instanceof HTMLInputElement) {
      const type = normalize(element.type);
      if (["hidden", "submit", "button", "file", "password"].includes(type)) {
        return false;
      }
    }

    return true;
  };

  const hasUserValue = (element) => {
    if (element instanceof HTMLInputElement && ["checkbox", "radio"].includes(normalize(element.type))) {
      return element.checked;
    }

    return nonEmpty(element.value);
  };

  const dispatchFieldEvents = (element) => {
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  };

  const applyValue = (element, value) => {
    if (!nonEmpty(value)) {
      return false;
    }

    if (element instanceof HTMLSelectElement) {
      const desired = normalizeCompact(value);
      const option = Array.from(element.options).find((opt) =>
        normalizeCompact(opt.value) === desired || normalizeCompact(opt.textContent) === desired
      );

      if (!option || element.value === option.value) {
        return false;
      }

      element.value = option.value;
      dispatchFieldEvents(element);
      return true;
    }

    if (element.value === value) {
      return false;
    }

    element.value = value;
    dispatchFieldEvents(element);
    return true;
  };

  const runAutofill = async () => {
    const data = await chrome.storage.local.get([PROFILE_KEY]);
    const profile = normalizeProfile(data[PROFILE_KEY] || {});
    const values = flattenProfile(profile);

    const fields = Array.from(document.querySelectorAll("input, textarea, select"));

    let filled = 0;
    let skipped = 0;

    fields.forEach((field) => {
      if (!isFillable(field) || hasUserValue(field)) {
        skipped += 1;
        return;
      }

      const meta = getFieldMeta(field);
      const best = pickBestKey(meta);

      if (!best || best.score < 5) {
        skipped += 1;
        return;
      }

      const value = values[best.key];
      if (!nonEmpty(value)) {
        skipped += 1;
        return;
      }

      if (applyValue(field, value)) {
        filled += 1;
      } else {
        skipped += 1;
      }
    });

    const summary = {
      filled,
      skipped,
      scanned: fields.length
    };

    window.__jobPilotLastSummary = summary;
    await chrome.storage.local.set({ [LAST_SUMMARY_KEY]: summary });

    return summary;
  };

  window.__jobPilotRunPromise = runAutofill().catch((error) => {
    console.error("[JobPilot] Autofill failed:", error);
    const fallbackSummary = { filled: 0, skipped: 0, scanned: 0 };
    window.__jobPilotLastSummary = fallbackSummary;
    return fallbackSummary;
  });
})();
