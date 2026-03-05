const STORAGE_KEYS = {
  profile: "profile",
  lastRun: "autofillLastRun"
};

const SECTION_FIELDS = {
  experience: ["company", "title", "startDate", "endDate", "location", "description"],
  projects: ["name", "role", "description", "link"],
  education: ["school", "degree", "field", "startYear", "endYear"],
  organizations: ["name", "role", "description"]
};
const SECTION_TITLES = {
  experience: "Experience",
  projects: "Project",
  education: "Education",
  organizations: "Organization"
};

const PERSONAL_FIELDS = ["firstName", "lastName", "email", "phone", "linkedin", "address", "city", "state", "zip"];

const emptyProfile = () => ({
  version: 2,
  settings: {
    highConfidenceOnly: false
  },
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

const DEFAULT_ITEM_FACTORIES = {
  experience: () => ({ company: "", title: "", startDate: "", endDate: "", location: "", description: "" }),
  projects: () => ({ name: "", role: "", description: "", link: "" }),
  education: () => ({ school: "", degree: "", field: "", startYear: "", endYear: "" }),
  organizations: () => ({ name: "", role: "", description: "" })
};

const byId = (id) => document.getElementById(id);

const getStorage = (keys) =>
  new Promise((resolve) => {
    chrome.storage.local.get(keys, (result) => resolve(result));
  });

const setStorage = (data) =>
  new Promise((resolve, reject) => {
    chrome.storage.local.set(data, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve();
    });
  });

const createStore = (initialState) => {
  let state = initialState;
  const listeners = new Set();

  return {
    get: () => state,
    update: (updater) => {
      state = updater(state);
      listeners.forEach((listener) => listener(state));
    },
    replace: (nextState) => {
      state = nextState;
      listeners.forEach((listener) => listener(state));
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }
  };
};

const store = createStore(emptyProfile());

const parseName = (fullName) => {
  const parts = (fullName || "").trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || "",
    lastName: parts.length > 1 ? parts.slice(1).join(" ") : ""
  };
};

const normalizeLegacyProfile = (legacy = {}) => {
  const profile = emptyProfile();
  const parsed = parseName(legacy.name || "");

  profile.personal.firstName = parsed.firstName;
  profile.personal.lastName = parsed.lastName;
  profile.personal.email = legacy.email || "";
  profile.personal.phone = legacy.phone || "";
  profile.personal.linkedin = legacy.linkedin || "";

  return profile;
};

const normalizeProfile = (raw) => {
  if (!raw || typeof raw !== "object") {
    return emptyProfile();
  }

  const base = emptyProfile();
  return {
    ...base,
    ...raw,
    settings: { ...base.settings, ...(raw.settings || {}) },
    personal: { ...base.personal, ...(raw.personal || {}) },
    experience: Array.isArray(raw.experience) ? raw.experience : base.experience,
    projects: Array.isArray(raw.projects) ? raw.projects : base.projects,
    education: Array.isArray(raw.education) ? raw.education : base.education,
    organizations: Array.isArray(raw.organizations) ? raw.organizations : base.organizations,
    skills: Array.isArray(raw.skills) ? raw.skills : base.skills,
    certifications: Array.isArray(raw.certifications) ? raw.certifications : base.certifications,
    languages: Array.isArray(raw.languages) ? raw.languages : base.languages
  };
};

const setStatus = (message, isError = false) => {
  const status = byId("status");
  if (!status) {
    return;
  }

  status.textContent = message;
  status.classList.toggle("error", isError);

  if (message) {
    setTimeout(() => {
      if (status.textContent === message) {
        status.textContent = "";
        status.classList.remove("error");
      }
    }, 2800);
  }
};

const toCsv = (items) => (Array.isArray(items) ? items.join(", ") : "");
const fromCsv = (value) =>
  (value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const fieldInputType = (field) => {
  if (field.includes("Date")) {
    return "month";
  }
  if (field.includes("Year")) {
    return "text";
  }
  if (field === "link") {
    return "url";
  }
  return "text";
};

const fieldLabel = (field) => field.replace(/([A-Z])/g, " $1").replace(/^./, (ch) => ch.toUpperCase());

const createItemFieldMarkup = (section, index, field) => {
  const type = fieldInputType(field);
  const isLong = field === "description";

  if (isLong) {
    return `<label class="field"><span>${fieldLabel(field)}</span><textarea data-section="${section}" data-index="${index}" data-field="${field}" rows="3"></textarea></label>`;
  }

  return `<label class="field"><span>${fieldLabel(field)}</span><input type="${type}" data-section="${section}" data-index="${index}" data-field="${field}"></label>`;
};

const renderRepeatSection = (section) => {
  const container = byId(`${section}-list`);
  const state = store.get();
  const items = state[section];
  const fields = SECTION_FIELDS[section];

  if (!container) {
    return;
  }

  if (!items.length) {
    container.innerHTML = `<div class="repeat-card"><span class="repeat-card-title">No entries yet.</span></div>`;
    return;
  }

  container.innerHTML = items
    .map((item, index) => {
      const fieldsMarkup = fields.map((field) => createItemFieldMarkup(section, index, field)).join("");
      return `
        <article class="repeat-card" data-card-section="${section}" data-card-index="${index}">
          <div class="repeat-card-head">
            <span class="repeat-card-title">${SECTION_TITLES[section] || "Item"} #${index + 1}</span>
            <button class="remove" type="button" data-action="remove" data-section="${section}" data-index="${index}">Remove</button>
          </div>
          ${fieldsMarkup}
        </article>
      `;
    })
    .join("");

  items.forEach((item, index) => {
    fields.forEach((field) => {
      const selector = `[data-section="${section}"][data-index="${index}"][data-field="${field}"]`;
      const input = container.querySelector(selector);
      if (input) {
        input.value = item[field] || "";
      }
    });
  });
};

const renderScalarFields = () => {
  const state = store.get();

  PERSONAL_FIELDS.forEach((field) => {
    const input = byId(field);
    if (input) {
      input.value = state.personal[field] || "";
    }
  });

  byId("summary").value = state.summary || "";
  byId("skills").value = toCsv(state.skills);
  byId("certifications").value = toCsv(state.certifications);
  byId("languages").value = toCsv(state.languages);
  byId("high-confidence-only").checked = Boolean(state.settings.highConfidenceOnly);
};

const render = () => {
  renderScalarFields();
  renderRepeatSection("experience");
  renderRepeatSection("projects");
  renderRepeatSection("education");
  renderRepeatSection("organizations");
};

const addSectionItem = (section) => {
  const factory = DEFAULT_ITEM_FACTORIES[section];
  if (!factory) {
    return;
  }

  store.update((state) => ({
    ...state,
    [section]: [...state[section], factory()]
  }));
  renderRepeatSection(section);
};

const removeSectionItem = (section, index) => {
  store.update((state) => ({
    ...state,
    [section]: state[section].filter((_, itemIndex) => itemIndex !== index)
  }));
  renderRepeatSection(section);
};

const updateRepeatField = (section, index, field, value) => {
  store.update((state) => ({
    ...state,
    [section]: state[section].map((item, itemIndex) =>
      itemIndex === index
        ? {
            ...item,
            [field]: value
          }
        : item
    )
  }));
};

const updateScalarFieldsFromDom = () => {
  store.update((state) => ({
    ...state,
    personal: {
      ...state.personal,
      firstName: byId("firstName")?.value.trim() || "",
      lastName: byId("lastName")?.value.trim() || "",
      email: byId("email")?.value.trim() || "",
      phone: byId("phone")?.value.trim() || "",
      linkedin: byId("linkedin")?.value.trim() || "",
      address: byId("address")?.value.trim() || "",
      city: byId("city")?.value.trim() || "",
      state: byId("state")?.value.trim() || "",
      zip: byId("zip")?.value.trim() || ""
    },
    summary: byId("summary")?.value.trim() || "",
    skills: fromCsv(byId("skills")?.value),
    certifications: fromCsv(byId("certifications")?.value),
    languages: fromCsv(byId("languages")?.value),
    settings: {
      ...state.settings,
      highConfidenceOnly: Boolean(byId("high-confidence-only")?.checked)
    }
  }));
};

const saveProfile = async () => {
  updateScalarFieldsFromDom();

  try {
    await setStorage({ [STORAGE_KEYS.profile]: store.get() });
    setStatus("Structured profile saved.");
  } catch {
    setStatus("Failed to save profile.", true);
  }
};

const formatRunSummary = (run) => {
  if (!run) {
    return "Autofill started.";
  }

  const mode = run.highConfidenceOnly ? "high-confidence" : "balanced";
  return `Filled ${run.filled}/${run.scanned}, skipped ${run.skipped} (${mode}).`;
};

const runAutofill = async () => {
  try {
    updateScalarFieldsFromDom();
    await setStorage({ [STORAGE_KEYS.profile]: store.get() });

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      setStatus("No active tab found.", true);
      return;
    }

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content/index.js"]
    });

    const data = await getStorage([STORAGE_KEYS.lastRun]);
    setStatus(formatRunSummary(data[STORAGE_KEYS.lastRun]));
  } catch {
    setStatus("Unable to run autofill on this page.", true);
  }
};

const attachEvents = () => {
  const form = byId("profile-form");

  form?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const action = target.dataset.action;
    if (!action) {
      return;
    }

    const section = target.dataset.section;
    if (!section) {
      return;
    }

    if (action === "add") {
      addSectionItem(section);
    }

    if (action === "remove") {
      const index = Number(target.dataset.index);
      if (!Number.isNaN(index)) {
        removeSectionItem(section, index);
      }
    }
  });

  form?.addEventListener("input", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
      if (target.dataset.section && target.dataset.field) {
        const section = target.dataset.section;
        const field = target.dataset.field;
        const index = Number(target.dataset.index);
        if (!Number.isNaN(index)) {
          updateRepeatField(section, index, field, target.value);
        }
      }
    }
  });

  byId("save")?.addEventListener("click", () => {
    saveProfile();
  });

  byId("fill")?.addEventListener("click", () => {
    runAutofill();
  });
};

const loadInitialProfile = async () => {
  const data = await getStorage([
    STORAGE_KEYS.profile,
    "name",
    "email",
    "phone",
    "linkedin"
  ]);

  const hasStructured = Boolean(data[STORAGE_KEYS.profile]);
  if (hasStructured) {
    store.replace(normalizeProfile(data[STORAGE_KEYS.profile]));
    return;
  }

  const hasLegacy = ["name", "email", "phone", "linkedin"].some((key) => Boolean((data[key] || "").trim()));
  if (hasLegacy) {
    const migrated = normalizeLegacyProfile(data);
    store.replace(migrated);
    await setStorage({ [STORAGE_KEYS.profile]: migrated });
    return;
  }

  store.replace(emptyProfile());
};

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "APPLYSMART_AUTOFILL_RESULT") {
    setStatus(formatRunSummary(message.payload));
  }
});

document.addEventListener("DOMContentLoaded", () => {
  attachEvents();

  loadInitialProfile()
    .then(() => render())
    .catch(() => setStatus("Could not load profile.", true));
});
