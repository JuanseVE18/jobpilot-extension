(() => {
  const likelyContainer = (element) => {
    const maxDepth = 4;
    let current = element.parentElement;
    let depth = 0;

    while (current && depth < maxDepth) {
      const parent = current.parentElement;
      if (!parent) {
        return null;
      }

      const siblings = Array.from(parent.children);
      const similarSiblings = siblings.filter(
        (sibling) => sibling.tagName === current.tagName && sibling.className === current.className
      );

      const fieldCount = current.querySelectorAll("input, textarea, select").length;
      if (similarSiblings.length > 1 && fieldCount >= 2) {
        return current;
      }

      current = parent;
      depth += 1;
    }

    return null;
  };

  const groupKeyFor = (element, sectionName) => {
    const container = likelyContainer(element);
    if (!container) {
      return `${sectionName}::default`;
    }

    const parent = container.parentElement;
    if (!parent) {
      return `${sectionName}::default`;
    }

    const peerContainers = Array.from(parent.children).filter(
      (child) => child.tagName === container.tagName && child.className === container.className
    );

    const index = peerContainers.indexOf(container);
    return `${sectionName}::${container.tagName}.${container.className || "none"}::${index}`;
  };

  const assignRepeatIndexes = (candidates) => {
    const sectionMap = new Map();

    candidates.forEach((candidate) => {
      if (!candidate.definition.repeatable) {
        candidate.repeatIndex = 0;
        return;
      }

      const sectionName = candidate.definition.section;
      if (!sectionMap.has(sectionName)) {
        sectionMap.set(sectionName, new Map());
      }

      const keyToIndexMap = sectionMap.get(sectionName);
      if (!keyToIndexMap.has(candidate.groupKey)) {
        keyToIndexMap.set(candidate.groupKey, keyToIndexMap.size);
      }

      candidate.repeatIndex = keyToIndexMap.get(candidate.groupKey);
    });
  };

  window.ApplySmartGroupDetector = {
    groupKeyFor,
    assignRepeatIndexes
  };
})();
