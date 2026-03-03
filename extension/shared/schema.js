(() => {
  const PROFILE_VERSION = 2;

  const createEmptyProfile = () => ({
    version: PROFILE_VERSION,
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

  const normalizeProfile = (rawProfile) => {
    const base = createEmptyProfile();
    if (!rawProfile || typeof rawProfile !== "object") {
      return base;
    }

    return {
      ...base,
      ...rawProfile,
      settings: {
        ...base.settings,
        ...(rawProfile.settings || {})
      },
      personal: {
        ...base.personal,
        ...(rawProfile.personal || {})
      },
      experience: Array.isArray(rawProfile.experience) ? rawProfile.experience : [],
      projects: Array.isArray(rawProfile.projects) ? rawProfile.projects : [],
      education: Array.isArray(rawProfile.education) ? rawProfile.education : [],
      skills: Array.isArray(rawProfile.skills) ? rawProfile.skills : [],
      certifications: Array.isArray(rawProfile.certifications) ? rawProfile.certifications : [],
      languages: Array.isArray(rawProfile.languages) ? rawProfile.languages : [],
      organizations: Array.isArray(rawProfile.organizations) ? rawProfile.organizations : []
    };
  };

  const legacyToProfile = (legacyData = {}) => {
    const profile = createEmptyProfile();
    const fullName = (legacyData.name || "").trim();
    const parts = fullName.split(/\s+/).filter(Boolean);

    profile.personal.firstName = parts[0] || "";
    profile.personal.lastName = parts.length > 1 ? parts.slice(1).join(" ") : "";
    profile.personal.email = (legacyData.email || "").trim();
    profile.personal.phone = (legacyData.phone || "").trim();
    profile.personal.linkedin = (legacyData.linkedin || "").trim();

    return profile;
  };

  window.ApplySmartSchema = {
    PROFILE_VERSION,
    createEmptyProfile,
    normalizeProfile,
    legacyToProfile
  };
})();
