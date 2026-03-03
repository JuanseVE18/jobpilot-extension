(() => {

  const PROFILE_KEY = "profile";
  const byId = (id) => document.getElementById(id);

  // -------------------------
  // STATE
  // -------------------------

  let state = {
    personal: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      linkedin: ""
    },
    summary: "",
    experience: [],
    projects: [],
    education: [],
    organizations: [],
    skills: [],
    certifications: [],
    languages: []
  };

  // -------------------------
  // HELPERS
  // -------------------------

  const parseList = (value) =>
    (value || "")
      .split(",")
      .map(v => v.trim())
      .filter(Boolean);

  const listToString = (arr) =>
    Array.isArray(arr) ? arr.join(", ") : "";

  const setStatus = (msg, error = false) => {
    const el = byId("status");
    if (!el) return;
    el.textContent = msg;
    el.style.color = error ? "red" : "green";
    setTimeout(() => el.textContent = "", 2500);
  };

  // -------------------------
  // LOAD / SAVE
  // -------------------------

  const loadProfile = async () => {
    const data = await chrome.storage.local.get([PROFILE_KEY]);
    if (data[PROFILE_KEY]) {
      state = { ...state, ...data[PROFILE_KEY] };
    }
    renderAll();
  };

  const saveProfile = async () => {
    state.personal.firstName = byId("firstName")?.value.trim() || "";
    state.personal.lastName = byId("lastName")?.value.trim() || "";
    state.personal.email = byId("email")?.value.trim() || "";
    state.personal.phone = byId("phone")?.value.trim() || "";
    state.personal.linkedin = byId("linkedin")?.value.trim() || "";
    state.summary = byId("summary")?.value.trim() || "";

    state.skills = parseList(byId("skills")?.value);
    state.languages = parseList(byId("languages")?.value);

    await chrome.storage.local.set({ [PROFILE_KEY]: state });
    setStatus("Profile saved.");
  };

  // -------------------------
  // RENDERERS
  // -------------------------

  const renderRepeatSection = (section, containerId, templateFn) => {
    const container = byId(containerId);
    if (!container) return;

    container.innerHTML = "";

    state[section].forEach((item, index) => {
      const wrapper = document.createElement("div");
      wrapper.className = "repeat-item";
      wrapper.innerHTML = templateFn(item, index);
      container.appendChild(wrapper);
    });
  };

  const renderAll = () => {

    // Static fields
    if (byId("firstName")) byId("firstName").value = state.personal.firstName;
    if (byId("lastName")) byId("lastName").value = state.personal.lastName;
    if (byId("email")) byId("email").value = state.personal.email;
    if (byId("phone")) byId("phone").value = state.personal.phone;
    if (byId("linkedin")) byId("linkedin").value = state.personal.linkedin;
    if (byId("summary")) byId("summary").value = state.summary;
    if (byId("skills")) byId("skills").value = listToString(state.skills);
    if (byId("languages")) byId("languages").value = listToString(state.languages);

    // EXPERIENCE
    renderRepeatSection("experience", "experience-list", (item, i) => `
      <div class="field">
        <span>Job Title</span>
        <input placeholder="Job Title" data-section="experience" data-field="title" data-i="${i}" value="${item.title || ""}">
      </div>

      <div class="field">
        <span>Company</span>
        <input placeholder="Company" data-section="experience" data-field="company" data-i="${i}" value="${item.company || ""}">
      </div>

      <div class="grid two-col">
        <div class="field">
          <span>Start Date</span>
          <input type="month" data-section="experience" data-field="startDate" data-i="${i}" value="${item.startDate || ""}">
        </div>

        <div class="field">
          <span>End Date</span>
          <input type="month" data-section="experience" data-field="endDate" data-i="${i}" value="${item.endDate || ""}">
        </div>
      </div>

      <div class="field">
        <span>Description</span>
        <textarea data-section="experience" data-field="description" data-i="${i}">${item.description || ""}</textarea>
      </div>

      <button type="button" data-remove="experience" data-i="${i}">Remove</button>
    `);

    // PROJECTS
    renderRepeatSection("projects", "projects-list", (item, i) => `
      <input placeholder="Project Name" data-section="projects" data-field="name" data-i="${i}" value="${item.name || ""}">
      <textarea placeholder="Description" data-section="projects" data-field="description" data-i="${i}">${item.description || ""}</textarea>
      <button type="button" data-remove="projects" data-i="${i}">Remove</button>
      <hr>
    `);

    // EDUCATION
    renderRepeatSection("education", "education-list", (item, i) => `
      <div class="field">
        <span>School</span>
        <input placeholder="School" data-section="education" data-field="school" data-i="${i}" value="${item.school || ""}">
      </div>

      <div class="field">
        <span>Degree</span>
        <input placeholder="Degree" data-section="education" data-field="degree" data-i="${i}" value="${item.degree || ""}">
      </div>

      <div class="grid two-col">
        <div class="field">
          <span>Start Date</span>
          <input type="month" data-section="education" data-field="startDate" data-i="${i}" value="${item.startDate || ""}">
        </div>

        <div class="field">
          <span>End Date</span>
          <input type="month" data-section="education" data-field="endDate" data-i="${i}" value="${item.endDate || ""}">
        </div>
      </div>

      <button type="button" data-remove="education" data-i="${i}">Remove</button>
    `);

    // ORGANIZATIONS
    renderRepeatSection("organizations", "organizations-list", (item, i) => `
      <input placeholder="Organization Name" data-section="organizations" data-field="name" data-i="${i}" value="${item.name || ""}">
      <textarea placeholder="Role / Description" data-section="organizations" data-field="description" data-i="${i}">${item.description || ""}</textarea>
      <button type="button" data-remove="organizations" data-i="${i}">Remove</button>
      <hr>
    `);

    // CERTIFICATIONS
    renderRepeatSection("certifications", "certifications-list", (item, i) => `
      <input placeholder="Certification Name" data-section="certifications" data-field="name" data-i="${i}" value="${item.name || ""}">
      
      <label>Issued</label>
      <input type="month" data-section="certifications" data-field="issuedDate" data-i="${i}" value="${item.issuedDate || ""}">
      
      <button type="button" data-remove="certifications" data-i="${i}">Remove</button>
      <hr>
    `);
  };

  // -------------------------
  // EVENTS
  // -------------------------

  document.addEventListener("click", (e) => {

    const addBtn = e.target.closest("button[data-action='add']");
    if (addBtn) {
      const section = addBtn.dataset.section;
      if (!state[section]) state[section] = [];
      state[section].push({});
      renderAll();
      return;
    }

    if (e.target.dataset.remove) {
      const section = e.target.dataset.remove;
      const index = Number(e.target.dataset.i);
      state[section].splice(index, 1);
      renderAll();
      return;
    }
  });

  document.addEventListener("input", (e) => {
    const el = e.target;
    const section = el.dataset.section;
    const field = el.dataset.field;
    const index = Number(el.dataset.i);

    if (section && field !== undefined && !isNaN(index)) {
      state[section][index][field] = el.value;
    }
  });

  byId("save")?.addEventListener("click", saveProfile);

  byId("fill")?.addEventListener("click", async () => {
    await saveProfile();

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content/index.js"]
    });

    setStatus("Autofill triggered.");
  });

  document.addEventListener("DOMContentLoaded", loadProfile);

})();