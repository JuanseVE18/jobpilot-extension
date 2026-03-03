(() => {
  const createStore = (initialState) => {
    let state = initialState;
    const listeners = new Set();

    return {
      get: () => state,
      replace: (nextState) => {
        state = nextState;
        listeners.forEach((listener) => listener(state));
      },
      update: (updater) => {
        state = updater(state);
        listeners.forEach((listener) => listener(state));
      },
      subscribe: (listener) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      }
    };
  };

  window.ApplySmartPopupStore = {
    createStore
  };
})();
