(() => {
  const PROFILE_KEY = "profile";
  const LAST_RUN_KEY = "autofillLastRun";
  const LEGACY_KEYS = ["name", "email", "phone", "linkedin"];

  const get = (keys) =>
    new Promise((resolve) => {
      chrome.storage.local.get(keys, (data) => resolve(data));
    });

  const set = (payload) =>
    new Promise((resolve, reject) => {
      chrome.storage.local.set(payload, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve();
      });
    });

  const loadProfile = async () => {
    const schema = window.ApplySmartSchema;
    const data = await get([PROFILE_KEY, ...LEGACY_KEYS]);

    if (data[PROFILE_KEY]) {
      return schema.normalizeProfile(data[PROFILE_KEY]);
    }

    const hasLegacy = LEGACY_KEYS.some((key) => Boolean((data[key] || "").trim()));
    if (!hasLegacy) {
      return schema.createEmptyProfile();
    }

    const migrated = schema.legacyToProfile(data);
    await set({ [PROFILE_KEY]: migrated });
    return migrated;
  };

  const saveProfile = async (profile) => {
    await set({ [PROFILE_KEY]: profile });
  };

  const loadLastRun = async () => {
    const data = await get([LAST_RUN_KEY]);
    return data[LAST_RUN_KEY] || null;
  };

  const saveLastRun = async (summary) => {
    await set({ [LAST_RUN_KEY]: summary });
  };

  window.ApplySmartStorage = {
    PROFILE_KEY,
    LAST_RUN_KEY,
    get,
    set,
    loadProfile,
    saveProfile,
    loadLastRun,
    saveLastRun
  };
})();
