// config-overrides.js
module.exports = function override(config, env) {
  config.resolve.fallback = {
    fs: false,
    crypto: require.resolve('crypto-browserify'),
    util: require.resolve('util/'),
    buffer: require.resolve('buffer/'),
    stream: require.resolve('stream-browserify'),
    vm: require.resolve('vm-browserify'), // Add this line
  };
  return config;
};
