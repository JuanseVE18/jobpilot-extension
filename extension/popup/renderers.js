(() => {
  const SECTION_CONFIG = {
    experience: {
      title: "Experience",
      fields: ["company", "title", "startDate", "endDate", "location", "description"],
      makeItem: () => ({ company: "", title: "", startDate: "", endDate: "", location: "", description: "" })
    },
    projects: {
      title: "Project",
      fields: ["name", "role", "description", "link"],
      makeItem: () => ({ name: "", role: "", description: "", link: "" })
    },
    education: {
      title: "Education",
      fields: ["school", "degree", "field", "startYear", "endYear"],
      makeItem: () => ({ school: "", degree: "", field: "", startYear: "", endYear: "" })
    },
    organizations: {
      title: "Organization",
      fields: ["name", "role", "description"],
      makeItem: () => ({ name: "", role: "", description: "" })
    }
  };

  const formatFieldLabel = (fieldName) =>
    fieldName
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (char) => char.toUpperCase());

  const fieldInputType = (fieldName) => {
    if (fieldName.includes("Date")) {
      return "month";
    }
    if (fieldName === "link") {
      return "url";
    }
    return "text";
  };

  const renderRepeatSection = (container, sectionName, items) => {
    const config = SECTION_CONFIG[sectionName];
    if (!container || !config) {
      return;
    }

    if (!items.length) {
      container.innerHTML = `<div class="repeat-card"><span class="repeat-card-title">No entries yet.</span></div>`;
      return;
    }

    const markup = items
      .map((_, index) => {
        const fieldsMarkup = config.fields
          .map((fieldName) => {
            if (fieldName === "description") {
              return `<label class="field"><span>${formatFieldLabel(fieldName)}</span><textarea data-repeat="${sectionName}" data-index="${index}" data-field="${fieldName}" rows="3"></textarea></label>`;
            }

            return `<label class="field"><span>${formatFieldLabel(fieldName)}</span><input type="${fieldInputType(fieldName)}" data-repeat="${sectionName}" data-index="${index}" data-field="${fieldName}"></label>`;
          })
          .join("");

        return `
          <article class="repeat-card" data-card="${sectionName}" data-card-index="${index}">
            <div class="repeat-card-head">
              <span class="repeat-card-title">${config.title} #${index + 1}</span>
              <button class="remove" type="button" data-action="remove" data-section="${sectionName}" data-index="${index}">Remove</button>
            </div>
            ${fieldsMarkup}
          </article>
        `;
      })
      .join("");

    container.innerHTML = markup;

    items.forEach((item, index) => {
      config.fields.forEach((fieldName) => {
        const selector = `[data-repeat="${sectionName}"][data-index="${index}"][data-field="${fieldName}"]`;
        const input = container.querySelector(selector);
        if (input) {
          input.value = item[fieldName] || "";
        }
      });
    });
  };

  window.ApplySmartPopupRenderers = {
    SECTION_CONFIG,
    renderRepeatSection
  };
})();
