(() => {
  const STORAGE_KEYS = {
    profile: "profile",
    lastRun: "autofillLastRun"
  };

  const BASE_THRESHOLD = 7;
  const HIGH_CONFIDENCE_THRESHOLD = 11;
  const MAX_PASSES = 6;
  const OBSERVER_DEBOUNCE_MS = 280;

  const ENGINE_KEY = "__applySmartAutofillEngine";

  const normalize = (value) => (value || "").toLowerCase().trim();
  const normalizeCompact = (value) => normalize(value).replace(/\s+/g, " ");

  const FIELD_DEFINITIONS = {
    "personal.firstName": {
      section: "personal",
      field: "firstName",
      exactTokens: ["first_name", "firstname", "first-name", "fname"],
      strongKeywords: ["first name", "given name"],
      weakKeywords: ["first", "given"],
      autocomplete: ["given-name"],
      types: ["text", "search"]
    },
    "personal.lastName": {
      section: "personal",
      field: "lastName",
      exactTokens: ["last_name", "lastname", "last-name", "lname", "surname"],
      strongKeywords: ["last name", "family name", "surname"],
      weakKeywords: ["last", "family"],
      autocomplete: ["family-name"],
      types: ["text", "search"]
    },
    "personal.email": {
      section: "personal",
      field: "email",
      exactTokens: ["email", "email_address", "e-mail"],
      strongKeywords: ["email", "email address"],
      weakKeywords: ["mail"],
      autocomplete: ["email"],
      types: ["email", "text"]
    },
    "personal.phone": {
      section: "personal",
      field: "phone",
      exactTokens: ["phone", "mobile", "telephone", "cell"],
      strongKeywords: ["phone", "mobile", "telephone", "contact number"],
      weakKeywords: ["contact", "tel"],
      autocomplete: ["tel", "tel-national"],
      types: ["tel", "text"]
    },
    "personal.linkedin": {
      section: "personal",
      field: "linkedin",
      exactTokens: ["linkedin", "linkedin_url", "linkedin_profile"],
      strongKeywords: ["linkedin", "linkedin profile"],
      weakKeywords: ["profile"],
      autocomplete: [],
      types: ["url", "text"]
    },
    "personal.address": {
      section: "personal",
      field: "address",
      exactTokens: ["address", "street", "address_line_1"],
      strongKeywords: ["street address", "mailing address"],
      weakKeywords: ["address", "street"],
      autocomplete: ["street-address", "address-line1"],
      types: ["text", "textarea"]
    },
    "personal.city": {
      section: "personal",
      field: "city",
      exactTokens: ["city", "town"],
      strongKeywords: ["city", "current city"],
      weakKeywords: ["city"],
      autocomplete: ["address-level2"],
      types: ["text"]
    },
    "personal.state": {
      section: "personal",
      field: "state",
      exactTokens: ["state", "province", "region"],
      strongKeywords: ["state", "province"],
      weakKeywords: ["state", "region"],
      autocomplete: ["address-level1"],
      types: ["text", "select-one"]
    },
    "personal.zip": {
      section: "personal",
      field: "zip",
      exactTokens: ["zip", "zipcode", "postal", "postal_code"],
      strongKeywords: ["zip code", "postal code"],
      weakKeywords: ["zip", "postal"],
      autocomplete: ["postal-code"],
      types: ["text"]
    },
    summary: {
      section: "summary",
      field: "summary",
      exactTokens: ["summary", "professional_summary"],
      strongKeywords: ["professional summary", "summary", "about you"],
      weakKeywords: ["summary", "about"],
      autocomplete: [],
      types: ["textarea", "text"]
    },
    skills: {
      section: "skills",
      field: "skills",
      exactTokens: ["skills", "skill_set"],
      strongKeywords: ["skills", "technical skills", "key skills"],
      weakKeywords: ["skill"],
      autocomplete: [],
      types: ["text", "textarea"]
    },
    certifications: {
      section: "certifications",
      field: "certifications",
      exactTokens: ["certifications", "certificates"],
      strongKeywords: ["certifications", "certificates"],
      weakKeywords: ["cert"],
      autocomplete: [],
      types: ["text", "textarea"]
    },
    languages: {
      section: "languages",
      field: "languages",
      exactTokens: ["languages", "spoken_languages"],
      strongKeywords: ["languages spoken", "languages"],
      weakKeywords: ["language"],
      autocomplete: [],
      types: ["text", "textarea"]
    },
    "experience.company": {
      section: "experience",
      repeatable: true,
      field: "company",
      exactTokens: ["company", "employer", "company_name"],
      strongKeywords: ["company", "employer", "organization"],
      weakKeywords: ["company", "employer"],
      autocomplete: [],
      types: ["text", "textarea"]
    },
    "experience.title": {
      section: "experience",
      repeatable: true,
      field: "title",
      exactTokens: ["job_title", "title", "position"],
      strongKeywords: ["job title", "position title", "role"],
      weakKeywords: ["title", "position", "role"],
      autocomplete: [],
      types: ["text", "textarea"]
    },
    "experience.startDate": {
      section: "experience",
      repeatable: true,
      field: "startDate",
      exactTokens: ["start_date", "from_date"],
      strongKeywords: ["start date", "from date"],
      weakKeywords: ["start", "from"],
      autocomplete: [],
      types: ["date", "month", "text"]
    },
    "experience.endDate": {
      section: "experience",
      repeatable: true,
      field: "endDate",
      exactTokens: ["end_date", "to_date"],
      strongKeywords: ["end date", "to date"],
      weakKeywords: ["end", "to"],
      autocomplete: [],
      types: ["date", "month", "text"]
    },
    "experience.location": {
      section: "experience",
      repeatable: true,
      field: "location",
      exactTokens: ["location", "work_location"],
      strongKeywords: ["work location", "location"],
      weakKeywords: ["location"],
      autocomplete: [],
      types: ["text", "textarea"]
    },
    "experience.description": {
      section: "experience",
      repeatable: true,
      field: "description",
      exactTokens: ["description", "responsibilities"],
      strongKeywords: ["job description", "responsibilities", "achievements"],
      weakKeywords: ["description", "responsibilities"],
      autocomplete: [],
      types: ["textarea", "text"]
    },
    "projects.name": {
      section: "projects",
      repeatable: true,
      field: "name",
      exactTokens: ["project_name", "project"],
      strongKeywords: ["project name", "project"],
      weakKeywords: ["project"],
      autocomplete: [],
      types: ["text", "textarea"]
    },
    "projects.role": {
      section: "projects",
      repeatable: true,
      field: "role",
      exactTokens: ["project_role", "role"],
      strongKeywords: ["role", "project role"],
      weakKeywords: ["role"],
      autocomplete: [],
      types: ["text", "textarea"]
    },
    "projects.description": {
      section: "projects",
      repeatable: true,
      field: "description",
      exactTokens: ["project_description", "description"],
      strongKeywords: ["project description", "description"],
      weakKeywords: ["description"],
      autocomplete: [],
      types: ["textarea", "text"]
    },
    "projects.link": {
      section: "projects",
      repeatable: true,
      field: "link",
      exactTokens: ["project_link", "portfolio", "github"],
      strongKeywords: ["project link", "project url", "portfolio link"],
      weakKeywords: ["link", "url", "portfolio"],
      autocomplete: [],
      types: ["url", "text"]
    },
    "education.school": {
      section: "education",
      repeatable: true,
      field: "school",
      exactTokens: ["school", "university", "college", "institution"],
      strongKeywords: ["school name", "university", "institution"],
      weakKeywords: ["school", "university"],
      autocomplete: [],
      types: ["text"]
    },
    "education.degree": {
      section: "education",
      repeatable: true,
      field: "degree",
      exactTokens: ["degree", "qualification"],
      strongKeywords: ["degree", "qualification"],
      weakKeywords: ["degree"],
      autocomplete: [],
      types: ["text", "select-one"]
    },
    "education.field": {
      section: "education",
      repeatable: true,
      field: "field",
      exactTokens: ["field_of_study", "major", "specialization"],
      strongKeywords: ["field of study", "major"],
      weakKeywords: ["field", "major"],
      autocomplete: [],
      types: ["text"]
    },
    "education.startYear": {
      section: "education",
      repeatable: true,
      field: "startYear",
      exactTokens: ["start_year", "from_year"],
      strongKeywords: ["start year", "from year"],
      weakKeywords: ["start", "from"],
      autocomplete: [],
      types: ["text", "number", "date", "month"]
    },
    "education.endYear": {
      section: "education",
      repeatable: true,
      field: "endYear",
      exactTokens: ["end_year", "to_year", "graduation_year"],
      strongKeywords: ["end year", "graduation year", "to year"],
      weakKeywords: ["end", "graduation"],
      autocomplete: [],
      types: ["text", "number", "date", "month"]
    },
    "organizations.name": {
      section: "organizations",
      repeatable: true,
      field: "name",
      exactTokens: ["organization", "org_name", "association"],
      strongKeywords: ["organization name", "association"],
      weakKeywords: ["organization", "association"],
      autocomplete: [],
      types: ["text"]
    },
    "organizations.role": {
      section: "organizations",
      repeatable: true,
      field: "role",
      exactTokens: ["role", "position"],
      strongKeywords: ["role", "position held"],
      weakKeywords: ["role", "position"],
      autocomplete: [],
      types: ["text"]
    },
    "organizations.description": {
      section: "organizations",
      repeatable: true,
      field: "description",
      exactTokens: ["description", "details"],
      strongKeywords: ["organization description", "details"],
      weakKeywords: ["description", "details"],
      autocomplete: [],
      types: ["textarea", "text"]
    }
  };

  const countHits = (text, list, weight) => list.reduce((sum, token) => sum + (text.includes(token) ? weight : 0), 0);

  const typeOfField = (element) => {
    if (element instanceof HTMLSelectElement) {
      return "select-one";
    }
    if (element instanceof HTMLTextAreaElement) {
      return "textarea";
    }
    if (element instanceof HTMLInputElement) {
      return normalize(element.type || "text");
    }
    return normalize(element.tagName);
  };

  const labelTextFor = (element) => {
    const chunks = [];

    if (element.labels && element.labels.length > 0) {
      element.labels.forEach((label) => {
        const text = normalizeCompact(label.textContent);
        if (text) {
          chunks.push(text);
        }
      });
    }

    if (element.id) {
      const fallbackLabel = document.querySelector(`label[for="${CSS.escape(element.id)}"]`);
      if (fallbackLabel) {
        const text = normalizeCompact(fallbackLabel.textContent);
        if (text) {
          chunks.push(text);
        }
      }
    }

    return chunks.join(" ");
  };

  const extractMeta = (element) => {
    const name = normalizeCompact(element.getAttribute("name"));
    const id = normalizeCompact(element.getAttribute("id"));
    const placeholder = normalizeCompact(element.getAttribute("placeholder"));
    const ariaLabel = normalizeCompact(element.getAttribute("aria-label"));
    const autoComplete = normalizeCompact(element.getAttribute("autocomplete"));
    const label = labelTextFor(element);

    return {
      name,
      id,
      placeholder,
      ariaLabel,
      autoComplete,
      type: typeOfField(element),
      haystack: [name, id, placeholder, ariaLabel, label].filter(Boolean).join(" ")
    };
  };

  const scoreField = (definition, meta) => {
    const descriptor = `${meta.name} ${meta.id}`;
    let score = 0;

    score += countHits(descriptor, definition.exactTokens, 7);
    score += countHits(meta.haystack, definition.strongKeywords, 4);
    score += countHits(meta.haystack, definition.weakKeywords, 2);
    score += countHits(meta.autoComplete, definition.autocomplete, 8);

    if (definition.types.includes(meta.type)) {
      score += 3;
    }

    return score;
  };

  const chooseDefinition = (meta) => {
    let best = null;

    Object.entries(FIELD_DEFINITIONS).forEach(([key, definition]) => {
      const score = scoreField(definition, meta);
      if (!best || score > best.score) {
        best = { key, definition, score };
      }
    });

    return best;
  };

  const nonEmpty = (value) => Boolean((value || "").toString().trim());

  const canFillElement = (element) => {
    if (element.disabled || element.readOnly) {
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

  const emitFieldEvents = (element) => {
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  };

  const setSelectValue = (element, value) => {
    const desired = normalizeCompact(value);
    if (!desired) {
      return false;
    }

    const options = Array.from(element.options);
    const candidate = options.find((opt) => normalizeCompact(opt.value) === desired || normalizeCompact(opt.textContent) === desired)
      || options.find((opt) => normalizeCompact(opt.value).includes(desired) || normalizeCompact(opt.textContent).includes(desired));

    if (!candidate || element.value === candidate.value) {
      return false;
    }

    element.value = candidate.value;
    emitFieldEvents(element);
    return true;
  };

  const setInputValue = (element, value) => {
    const raw = (value || "").toString();
    if (!nonEmpty(raw) || element.value === raw) {
      return false;
    }

    element.value = raw;
    emitFieldEvents(element);
    return true;
  };

  const setCheckboxRadio = (element, value) => {
    const desired = normalizeCompact(value);
    const own = normalizeCompact(element.value);

    if (!desired || !own || element.checked) {
      return false;
    }

    const shouldCheck = desired === own || desired.includes(own) || own.includes(desired);
    if (!shouldCheck) {
      return false;
    }

    element.checked = true;
    emitFieldEvents(element);
    return true;
  };

  const applyValue = (element, value) => {
    if (!nonEmpty(value)) {
      return false;
    }

    if (element instanceof HTMLSelectElement) {
      return setSelectValue(element, value);
    }

    if (element instanceof HTMLTextAreaElement) {
      return setInputValue(element, value);
    }

    if (element instanceof HTMLInputElement) {
      const type = normalize(element.type || "text");
      if (type === "checkbox" || type === "radio") {
        return setCheckboxRadio(element, value);
      }
      return setInputValue(element, value);
    }

    return false;
  };

  const toTextList = (values) => (Array.isArray(values) ? values.filter(Boolean).join(", ") : "");

  const emptyProfile = () => ({
    version: 2,
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
    experience: [],
    projects: [],
    education: [],
    skills: [],
    certifications: [],
    languages: [],
    organizations: []
  });

  const legacyToProfile = (data) => {
    const profile = emptyProfile();
    const nameParts = (data.name || "").trim().split(/\s+/).filter(Boolean);
    profile.personal.firstName = nameParts[0] || "";
    profile.personal.lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";
    profile.personal.email = data.email || "";
    profile.personal.phone = data.phone || "";
    profile.personal.linkedin = data.linkedin || "";
    return profile;
  };

  const normalizeProfile = (profile) => {
    if (!profile || typeof profile !== "object") {
      return emptyProfile();
    }

    const base = emptyProfile();
    return {
      ...base,
      ...profile,
      settings: { ...base.settings, ...(profile.settings || {}) },
      personal: { ...base.personal, ...(profile.personal || {}) },
      experience: Array.isArray(profile.experience) ? profile.experience : [],
      projects: Array.isArray(profile.projects) ? profile.projects : [],
      education: Array.isArray(profile.education) ? profile.education : [],
      organizations: Array.isArray(profile.organizations) ? profile.organizations : [],
      skills: Array.isArray(profile.skills) ? profile.skills : [],
      certifications: Array.isArray(profile.certifications) ? profile.certifications : [],
      languages: Array.isArray(profile.languages) ? profile.languages : []
    };
  };

  const valueForDefinition = (profile, definition, index = 0) => {
    if (definition.repeatable) {
      const group = profile[definition.section];
      if (!Array.isArray(group) || !group[index]) {
        return "";
      }
      return group[index][definition.field] || "";
    }

    if (definition.section === "summary") {
      return profile.summary || "";
    }

    if (definition.section === "skills") {
      return toTextList(profile.skills);
    }

    if (definition.section === "certifications") {
      return toTextList(profile.certifications);
    }

    if (definition.section === "languages") {
      return toTextList(profile.languages);
    }

    if (definition.section === "personal") {
      return profile.personal[definition.field] || "";
    }

    return "";
  };

  const likelyContainer = (element) => {
    const maxDepth = 4;
    let current = element.parentElement;
    let depth = 0;

    while (current && depth < maxDepth) {
      const siblings = current.parentElement ? Array.from(current.parentElement.children) : [];
      const similar = siblings.filter((s) => s.tagName === current.tagName && s.className === current.className);
      const descendants = current.querySelectorAll("input, textarea, select").length;

      if (similar.length > 1 && descendants >= 2) {
        return current;
      }

      current = current.parentElement;
      depth += 1;
    }

    return null;
  };

  const groupKeyForElement = (element, section) => {
    const container = likelyContainer(element);
    if (!container) {
      return `${section}::default`;
    }

    const parent = container.parentElement;
    if (!parent) {
      return `${section}::default`;
    }

    const siblings = Array.from(parent.children).filter(
      (child) => child.tagName === container.tagName && child.className === container.className
    );

    const index = siblings.indexOf(container);
    return `${section}::${container.tagName}.${container.className || "none"}::${index}`;
  };

  const assignGroupIndexes = (candidates) => {
    const sectionMaps = new Map();

    candidates.forEach((candidate) => {
      if (!candidate.definition.repeatable) {
        candidate.groupIndex = 0;
        return;
      }

      const section = candidate.definition.section;
      if (!sectionMaps.has(section)) {
        sectionMaps.set(section, new Map());
      }

      const keyMap = sectionMaps.get(section);
      if (!keyMap.has(candidate.groupKey)) {
        keyMap.set(candidate.groupKey, keyMap.size);
      }

      candidate.groupIndex = keyMap.get(candidate.groupKey);
    });
  };

  const runAutofill = async ({ fromObserver = false } = {}) => {
    const storage = await chrome.storage.local.get([STORAGE_KEYS.profile, STORAGE_KEYS.lastRun, "name", "email", "phone", "linkedin"]);

    let profile = storage[STORAGE_KEYS.profile];
    if (!profile) {
      profile = legacyToProfile(storage);
      await chrome.storage.local.set({ [STORAGE_KEYS.profile]: profile });
    }

    profile = normalizeProfile(profile);

    const threshold = profile.settings.highConfidenceOnly ? HIGH_CONFIDENCE_THRESHOLD : BASE_THRESHOLD;
    const elements = Array.from(document.querySelectorAll("input, textarea, select"));

    const candidates = [];
    elements.forEach((element) => {
      if (!canFillElement(element) || hasUserValue(element)) {
        return;
      }

      const meta = extractMeta(element);
      const best = chooseDefinition(meta);
      if (!best || best.score < threshold) {
        return;
      }

      candidates.push({
        element,
        definition: best.definition,
        score: best.score,
        groupKey: groupKeyForElement(element, best.definition.section)
      });
    });

    assignGroupIndexes(candidates);

    let filled = 0;
    let skipped = 0;
    let blocked = 0;

    candidates.forEach((candidate) => {
      const value = valueForDefinition(profile, candidate.definition, candidate.groupIndex);
      if (!nonEmpty(value)) {
        skipped += 1;
        return;
      }

      if (hasUserValue(candidate.element)) {
        blocked += 1;
        return;
      }

      const didFill = applyValue(candidate.element, value);
      if (didFill) {
        filled += 1;
      } else {
        skipped += 1;
      }
    });

    const summary = {
      filled,
      skipped,
      blocked,
      scanned: elements.length,
      considered: candidates.length,
      threshold,
      highConfidenceOnly: Boolean(profile.settings.highConfidenceOnly),
      fromObserver,
      ranAt: new Date().toISOString()
    };

    await chrome.storage.local.set({ [STORAGE_KEYS.lastRun]: summary });

    chrome.runtime.sendMessage({
      type: "APPLYSMART_AUTOFILL_RESULT",
      payload: summary
    });

    return summary;
  };

  const createEngine = () => {
    let running = false;
    let observer = null;
    let debounceTimer = null;
    let passCount = 0;

    const schedule = () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      debounceTimer = setTimeout(async () => {
        if (running || passCount >= MAX_PASSES) {
          return;
        }

        running = true;
        try {
          passCount += 1;
          await runAutofill({ fromObserver: true });
        } catch {
          // intentionally ignore observer errors
        } finally {
          running = false;
        }
      }, OBSERVER_DEBOUNCE_MS);
    };

    const startObserver = () => {
      if (observer) {
        observer.disconnect();
      }

      observer = new MutationObserver((mutations) => {
        const hasAddedNodes = mutations.some((mutation) => mutation.addedNodes && mutation.addedNodes.length > 0);
        if (hasAddedNodes) {
          schedule();
        }
      });

      observer.observe(document.documentElement, {
        childList: true,
        subtree: true
      });
    };

    return {
      run: async (options = {}) => {
        if (running) {
          return null;
        }

        running = true;
        try {
          const summary = await runAutofill(options);
          return summary;
        } finally {
          running = false;
        }
      },
      boot: async () => {
        await runAutofill({ fromObserver: false });
        startObserver();
      }
    };
  };

  if (window[ENGINE_KEY]) {
    window[ENGINE_KEY].run({ fromObserver: false });
    return;
  }

  const engine = createEngine();
  window[ENGINE_KEY] = engine;
  engine.boot();
})();
