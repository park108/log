const babelJest = require('babel-jest').default;

module.exports = babelJest.createTransformer({
  presets: [
    [require.resolve('babel-preset-react-app'), { runtime: 'automatic' }],
  ],
  plugins: [require.resolve('@babel/plugin-proposal-class-static-block')],
  babelrc: false,
  configFile: false,
});
