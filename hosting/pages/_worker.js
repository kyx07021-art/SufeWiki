// Service binding keeps every browser request on pages.dev, including edits and assets.
export default {
  fetch(request, env) {
    return env.WIKI.fetch(request);
  },
};
