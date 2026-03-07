(() => {
  const PROFILE_KEY = "profile";
  const LAST_SUMMARY_KEY = "autofillLastRun";

  const normalize = (value) => (value || "").toLowerCase().trim();
  const normalizeCompact = (value) => normalize(value).replace(/\s+/g, " ");
  const nonEmpty = (value) => Boolean((value || "").toString().trim());

  /* ---------------- FIELD DEFINITIONS ---------------- */

  const FIELD_DEFINITIONS = {
    firstName: {
      tokens: ["first_name", "firstname", "first-name", "fname", "givenname", "given_name"],
      strong: ["first name", "given name"],
      weak: ["first"],
      types: ["text"],
      autocomplete: ["given-name"]
    },
    lastName: {
      tokens: ["last_name", "lastname", "last-name", "lname", "surname", "familyname"],
      strong: ["last name", "surname", "family name"],
      weak: ["last"],
      types: ["text"],
      autocomplete: ["family-name"]
    },
    email: { tokens: ["email"], strong: ["email address"], weak: ["mail"], types: ["email", "text"], autocomplete: ["email"] },
    phone: { tokens: ["phone", "mobile"], strong: ["phone number"], weak: ["contact"], types: ["tel", "text"], autocomplete: ["tel"] },
    linkedin: { tokens: ["linkedin"], strong: ["linkedin profile"], weak: ["profile"], types: ["url", "text"], autocomplete: [] },
    summary: {
      tokens: ["summary", "description", "role_description"],
      strong: ["professional summary", "role description", "job description"],
      weak: ["about", "description"],
      types: ["textarea", "text"],
      autocomplete: []
    },
    skills: { tokens: ["skills"], strong: ["technical skills"], weak: ["skill"], types: ["text", "textarea"], autocomplete: [] },
    certifications: { tokens: ["certifications"], strong: ["certificates"], weak: ["cert"], types: ["text", "textarea"], autocomplete: [] },
    languages: { tokens: ["languages"], strong: ["spoken languages"], weak: ["language"], types: ["text", "textarea"], autocomplete: [] },

    jobTitle: {
      tokens: ["job_title", "title", "position"],
      strong: ["job title", "position title"],
      weak: ["title"],
      types: ["text"],
      autocomplete: []
    },

    company: {
      tokens: ["company", "employer"],
      strong: ["company name", "employer"],
      weak: ["company"],
      types: ["text"],
      autocomplete: []
    },

    location: {
      tokens: [
        "location",
        "city",
        "address",
        "region",
        "state",
        "country",
        "job_location",
        "work_location"
      ],
      strong: [
        "job location",
        "work location",
        "city",
        "state",
        "country",
        "address"
      ],
      weak: ["location", "area"],
      types: ["text", "search"],
      autocomplete: ["address-level2", "address-level1", "country-name" ]
    },

    startDate: {
      tokens: ["start_date", "from"],
      strong: ["start date"],
      weak: ["start"],
      types: ["date", "month", "text"],
      autocomplete: []
    },

    endDate: {
      tokens: ["end_date", "to"],
      strong: ["end date"],
      weak: ["end"],
      types: ["date", "month", "text"],
      autocomplete: []
    }
  };

  /* ---------------- PROFILE NORMALIZATION ---------------- */

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
    languages: Array.isArray(raw.languages) ? raw.languages : [],
    experience: Array.isArray(raw.experience) ? raw.experience : []
  });

  const flattenProfile = (profile) => {
    const firstExperience = profile.experience?.[0] || {};

    return {
      firstName: profile.personal.firstName,
      lastName: profile.personal.lastName,
      email: profile.personal.email,
      phone: profile.personal.phone,
      linkedin: profile.personal.linkedin,
      summary: profile.summary,
      skills: profile.skills.join(", "),
      certifications: profile.certifications.join(", "),
      languages: profile.languages.join(", ")
    };
  };

  /* ---------------- FIELD META ---------------- */

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

    const type =
      element instanceof HTMLSelectElement
        ? "select-one"
        : element instanceof HTMLTextAreaElement
        ? "textarea"
        : normalize(element.type || element.tagName);

    return {
      type,
      autoComplete,
      haystack: [name, id, placeholder, ariaLabel, labelText]
        .filter(Boolean)
        .join(" "),
      descriptor: `${name} ${id}`
    };
  };

  const countHits = (text, tokens, weight) =>
    tokens.reduce((score, token) => score + (text.includes(token) ? weight : 0), 0);

  const scoreKey = (key, meta) => {
    const def = FIELD_DEFINITIONS[key];
    if (!def) return 0;

    let score = 0;
    score += countHits(meta.descriptor, def.tokens, 7);
    score += countHits(meta.haystack, def.strong, 4);
    score += countHits(meta.haystack, def.weak, 2);
    score += countHits(meta.autoComplete, def.autocomplete, 8);

    if (def.types.includes(meta.type)) score += 3;

    return score;
  };

  const pickBestKey = (meta) => {
    let best = null;

    Object.keys(FIELD_DEFINITIONS).forEach((key) => {
      const score = scoreKey(key, meta);
      if (!best || score > best.score) best = { key, score };
    });

    return best;
  };

  const isFillable = (element) => {
    if (!element || element.disabled || element.readOnly) return false;

    if (element instanceof HTMLInputElement) {
      const type = normalize(element.type);
      if (["hidden", "submit", "button", "file", "password"].includes(type))
        return false;
    }

    return true;
  };

  const hasUserValue = (element) => nonEmpty(element.value);

  const dispatchFieldEvents = (element) => {
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  };

  /* ---------------- SMART EXPERIENCE BLOCK DETECTION ---------------- */

  const detectExperienceBlocks = () => {
    const blocks = [];

    const possibleGroups = document.querySelectorAll(
      "fieldset, .experience, .work, .job, [class*='experience'], [class*='work'], [class*='employment']"
    );

    possibleGroups.forEach(group => {
      const inputs = group.querySelectorAll("input, textarea");
      if (inputs.length >= 2) {
        blocks.push(group);
      }
    });

    return blocks;
  };

  const fillExperienceBlocks = (profile) => {
    if (!profile.experience || !profile.experience.length) return;

    const blocks = detectExperienceBlocks();

    blocks.forEach((block, index) => {
      const exp = profile.experience[index];
      if (!exp) return;

      const fields = block.querySelectorAll("input, textarea");

      fields.forEach(field => {
        if (!isFillable(field) || hasUserValue(field)) return;

        const name = (field.name || field.id || "").toLowerCase();

        if (name.includes("title") && exp.title) {
          applyValue(field, exp.title, 10);
        }

        if (name.includes("company") && exp.company) {
          applyValue(field, exp.company, 10);
        }

        if (
          (name.includes("location") ||
           name.includes("city") ||
           name.includes("address") ||
           name.includes("region") ||
           name.includes("state")) &&
          exp.location
        ) {
          applyValue(field, exp.location, 9);
        }

        if (name.includes("start") && exp.startDate) {
          applyValue(field, exp.startDate, 8);
        }

        if (name.includes("end") && exp.endDate) {
          applyValue(field, exp.endDate, 8);
        }

        if ((name.includes("description") || name.includes("responsibilities")) && exp.description) {
          applyValue(field, exp.description, 7);
        }
      });
    });
  };

  /* ---------------- MAIN AUTOFILL ---------------- */

  const applyValue = (element, value, confidence) => {
    if (!nonEmpty(value)) return false;

    const highlightField = (el, score) => {
      el.style.transition = "all 0.25s ease";
      el.style.borderRadius = "6px";

      let borderColor = "#16a34a";
      let label = "High confidence";

      if (score < 8) {
        borderColor = "#f59e0b";
        label = "Medium confidence";
      }

      if (score < 5) {
        borderColor = "#ef4444";
        label = "Low confidence";
      }

      el.style.border = `2px solid ${borderColor}`;
      el.style.boxShadow = `0 0 0 2px ${borderColor}22`;

      const tooltip = document.createElement("div");
      tooltip.textContent = `✔ Filled by JobPilot (${label})`;
      tooltip.style.position = "absolute";
      tooltip.style.background = "#0f172a";
      tooltip.style.color = "#ffffff";
      tooltip.style.fontSize = "11px";
      tooltip.style.padding = "4px 8px";
      tooltip.style.borderRadius = "6px";
      tooltip.style.zIndex = "999999";
      tooltip.style.transform = "translateY(-120%)";
      tooltip.style.pointerEvents = "none";

      const wrapper = document.createElement("div");
      wrapper.style.position = "relative";

      if (el.parentNode && !el.parentNode.classList.contains("jobpilot-wrapper")) {
        wrapper.classList.add("jobpilot-wrapper");
        el.parentNode.insertBefore(wrapper, el);
        wrapper.appendChild(el);
        wrapper.appendChild(tooltip);
      }

      setTimeout(() => tooltip.remove(), 2500);
    };

    // --- React/Workday safe value setter ---
    const setNativeValue = (el, val) => {
      const valueSetter = Object.getOwnPropertyDescriptor(el.__proto__, "value")?.set;
      const prototype = Object.getPrototypeOf(el);
      const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;

      if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
        prototypeValueSetter.call(el, val);
      } else if (valueSetter) {
        valueSetter.call(el, val);
      } else {
        el.value = val;
      }
    };

    if (element instanceof HTMLSelectElement) {
      const desired = normalizeCompact(value);
      const option = Array.from(element.options).find(
        (opt) =>
          normalizeCompact(opt.value) === desired ||
          normalizeCompact(opt.textContent) === desired
      );

      if (!option) return false;

      setNativeValue(element, option.value);
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
      element.dispatchEvent(new Event("blur", { bubbles: true }));
      highlightField(element, confidence);
      return true;
    }

    setNativeValue(element, value);

    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
    element.dispatchEvent(new Event("blur", { bubbles: true }));

    highlightField(element, confidence);
    return true;
  };

  const runAutofill = async () => {
    const data = await chrome.storage.local.get([PROFILE_KEY]);
    const profile = normalizeProfile(data[PROFILE_KEY] || {});
    const values = flattenProfile(profile);

    fillExperienceBlocks(profile);

    const fields = Array.from(
      document.querySelectorAll("input, textarea, select")
    );

    let filled = 0;
    let skipped = 0;

    fields.forEach((field) => {
      if (!isFillable(field) || hasUserValue(field)) {
        skipped++;
        return;
      }

      const meta = getFieldMeta(field);
      const best = pickBestKey(meta);

      if (!best || best.score < 5) {
        skipped++;
        return;
      }

      if (["jobTitle", "company", "location", "startDate", "endDate", "description"].includes(best.key)) {
        skipped++;
        return;
      }

      const value = values[best.key];
      if (!nonEmpty(value)) {
        skipped++;
        return;
      }

      if (applyValue(field, value, best.score)) filled++;
      else skipped++;
    });

    const summary = { filled, skipped, scanned: fields.length };

    window.__jobPilotLastSummary = summary;
    await chrome.storage.local.set({ [LAST_SUMMARY_KEY]: summary });

    return summary;
  };

  window.__jobPilotRunPromise = runAutofill().catch((error) => {
    console.error("[JobPilot] Autofill failed:", error);
    const fallback = { filled: 0, skipped: 0, scanned: 0 };
    window.__jobPilotLastSummary = fallback;
    return fallback;
  });
})();