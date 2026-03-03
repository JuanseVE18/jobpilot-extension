(() => {
  const normalize = (value) => (value || "").toLowerCase().trim();
  const normalizeCompact = (value) => normalize(value).replace(/\s+/g, " ");
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

  const emitEvents = (element) => {
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  };

  const setSelectValue = (element, value) => {
    const desired = normalizeCompact(value);
    if (!desired) {
      return false;
    }

    const options = Array.from(element.options);
    const matchingOption =
      options.find((option) => normalizeCompact(option.value) === desired || normalizeCompact(option.textContent) === desired)
      || options.find((option) => normalizeCompact(option.value).includes(desired) || normalizeCompact(option.textContent).includes(desired));

    if (!matchingOption || element.value === matchingOption.value) {
      return false;
    }

    element.value = matchingOption.value;
    emitEvents(element);
    return true;
  };

  const setInputValue = (element, value) => {
    const text = (value || "").toString();
    if (!nonEmpty(text) || element.value === text) {
      return false;
    }

    element.value = text;
    emitEvents(element);
    return true;
  };

  const setCheckable = (element, value) => {
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
    emitEvents(element);
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
        return setCheckable(element, value);
      }

      return setInputValue(element, value);
    }

    return false;
  };

  window.ApplySmartWriters = {
    nonEmpty,
    canFillElement,
    hasUserValue,
    applyValue
  };
})();
