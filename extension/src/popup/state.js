const state = {
  report: null,
  analysis: null,
  domainIntel: [],
  memory: null
};

export function getState() {
  return state;
}

export function setState(next) {
  Object.assign(state, next);
  return state;
}

export function resetAnalysis() {
  state.analysis = null;
  state.domainIntel = [];
}
