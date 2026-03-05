(() => {
  const normalize = (value) => (value || "").toLowerCase().trim();
  const normalizeCompact = (value) => normalize(value).replace(/\s+/g, " ");

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
    return normalize(element?.tagName);
  };

  const labelTextFor = (element) => {
    const textChunks = [];

    if (element?.labels && element.labels.length > 0) {
      element.labels.forEach((label) => {
        const text = normalizeCompact(label.textContent);
        if (text) {
          textChunks.push(text);
        }
      });
    }

    if (element?.id) {
      try {
        const fallbackLabel = document.querySelector(`label[for="${CSS.escape(element.id)}"]`);
        if (fallbackLabel) {
          const text = normalizeCompact(fallbackLabel.textContent);
          if (text) {
            textChunks.push(text);
          }
        }
      } catch {
        // ignore invalid selector/id edge cases
      }
    }

    return textChunks.join(" ");
  };

  const extractMeta = (element) => {
    const name = normalizeCompact(element?.getAttribute?.("name"));
    const id = normalizeCompact(element?.getAttribute?.("id"));
    const placeholder = normalizeCompact(element?.getAttribute?.("placeholder"));
    const ariaLabel = normalizeCompact(element?.getAttribute?.("aria-label"));
    const autoComplete = normalizeCompact(element?.getAttribute?.("autocomplete"));

    return {
      name,
      id,
      placeholder,
      ariaLabel,
      autoComplete,
      type: typeOfField(element),
      haystack: [name, id, placeholder, ariaLabel, labelTextFor(element)].filter(Boolean).join(" ")
    };
  };

  const asArray = (value) => (Array.isArray(value) ? value : []);

  const normalizeDefinition = (definition) => ({
    section: definition?.section || "",
    field: definition?.field || "",
    repeatable: Boolean(definition?.repeatable),
    exactTokens: asArray(definition?.exactTokens),
    strongKeywords: asArray(definition?.strongKeywords),
    weakKeywords: asArray(definition?.weakKeywords),
    autocomplete: asArray(definition?.autocomplete),
    types: asArray(definition?.types)
  });

  const normalizeDefinitions = (fieldDefinitions) => {
    if (!fieldDefinitions || typeof fieldDefinitions !== "object") {
      return [];
    }

    return Object.entries(fieldDefinitions)
      .filter(([, definition]) => definition && typeof definition === "object")
      .map(([definitionKey, definition]) => ({
        definitionKey,
        definition: normalizeDefinition(definition)
      }));
  };

  const countHits = (source, tokens, weight) => {
    if (!source || !Array.isArray(tokens)) return 0;
    const normalizedSource = normalizeCompact(source);
    return tokens.reduce((score, token) => {
      const normalizedToken = normalizeCompact(token);
      return score + (normalizedSource.includes(normalizedToken) ? weight : 0);
    }, 0);
  };

  const scoreDefinition = (definition, meta) => {
    if (!definition || !meta) return 0;

    const descriptor = normalizeCompact(`${meta.name} ${meta.id}`);
    const haystack = normalizeCompact(meta.haystack || "");
    const autoComplete = normalizeCompact(meta.autoComplete || "");

    let score = 0;

    score += countHits(descriptor, definition.exactTokens, 8);
    score += countHits(haystack, definition.strongKeywords, 5);
    score += countHits(haystack, definition.weakKeywords, 2);
    score += countHits(autoComplete, definition.autocomplete, 10);

    if (Array.isArray(definition.types) && definition.types.includes(meta.type)) {
      score += 4;
    }

    return score;
  };

  const chooseBestDefinition = (element, fieldDefinitions) => {
    const definitions = normalizeDefinitions(fieldDefinitions);
    if (!definitions.length) {
      return null;
    }

    const meta = extractMeta(element);
    let best = null;

    definitions.forEach(({ definitionKey, definition }) => {
      const score = scoreDefinition(definition, meta);
      if (!best || score > best.score) {
        best = {
          definitionKey,
          definition,
          score,
          meta
        };
      }
    });

    return best;
  };

  window.ApplySmartScorer = {
    normalize,
    normalizeCompact,
    extractMeta,
    chooseBestDefinition
  };
})();
