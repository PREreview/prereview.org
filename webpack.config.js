const path = require('path')

module.exports = {
  mode: process.env.NODE_ENV,
  entry: path.resolve('assets', 'main.ts'),
  module: {
    rules: [
      {
        test: /\.css$/,
        type: 'asset/resource',
      },
      {
        test: /\.ico$/,
        type: 'asset/resource',
      },
      {
        test: /\.svg$/,
        type: 'asset/resource',
      },
      {
        test: /\.ts$/,
        loader: 'babel-loader',
        options: {
          presets: [['@babel/preset-env', { targets: { esmodules: true } }]],
        },
      },
    ],
  },
  output: {
    assetModuleFilename: '[name][ext]',
    path: path.resolve('dist', 'assets'),
    publicPath: '/',
  },
}
