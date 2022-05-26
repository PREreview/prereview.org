const path = require('path')
const { WebpackManifestPlugin } = require('webpack-manifest-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')

module.exports = {
  mode: process.env.NODE_ENV,
  entry: path.resolve('assets', 'main.ts'),
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader'],
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
  plugins: [
    new MiniCssExtractPlugin(),
    new WebpackManifestPlugin({
      fileName: path.resolve('src', 'manifest.json'),
    }),
  ],
}
