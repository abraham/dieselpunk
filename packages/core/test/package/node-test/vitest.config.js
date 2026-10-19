// Node's `node` condition loads Lit's server build, where `isServer` is true and components render
// as on a server. `browser` first gives the package and Lit their browser builds.
export default {
  ssr: { resolve: { conditions: ['browser'] } },
  test: {
    environment: 'happy-dom',
    setupFiles: ['./setup.js'],
  },
};
