(() => {
  const createAutofillObserver = (run, options = {}) => {
    const maxPasses = options.maxPasses || 6;
    const debounceMs = options.debounceMs || 280;
    const shouldSkip = options.shouldSkip || (() => false);

    let passCount = 0;
    let timer = null;
    let observer = null;

    const schedule = () => {
      if (timer) {
        clearTimeout(timer);
      }

      timer = setTimeout(async () => {
        if (shouldSkip() || passCount >= maxPasses) {
          return;
        }

        passCount += 1;
        await run({ fromObserver: true });
      }, debounceMs);
    };

    const start = () => {
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

    const stop = () => {
      if (observer) {
        observer.disconnect();
      }
      if (timer) {
        clearTimeout(timer);
      }
    };

    return {
      start,
      stop
    };
  };

  window.ApplySmartObserver = {
    createAutofillObserver
  };
})();
