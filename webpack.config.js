const path = require('path')
const glob = require('glob')
const { WebpackManifestPlugin } = require('webpack-manifest-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const PurgeCssPlugin = require('purgecss-webpack-plugin')
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin')
const ImageMinimizerPlugin = require('image-minimizer-webpack-plugin')
const RemoveEmptyScriptsPlugin = require('webpack-remove-empty-scripts')

module.exports = {
  cache: {
    buildDependencies: { config: [__filename] },
    cacheDirectory: path.resolve(__dirname, '.webpack'),
    compression: false,
    type: 'filesystem',
  },
  mode: process.env.NODE_ENV,
  entry: {
    favicon: path.resolve('assets', 'favicon.ico'),
    'html-editor': path.resolve('assets', 'html-editor.ts'),
    prereview: path.resolve('assets', 'prereview.svg'),
    style: path.resolve('assets', 'style.css'),
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [
          MiniCssExtractPlugin.loader,
          {
            loader: 'css-loader',
            options: {
              importLoaders: 1,
            },
          },
          {
            loader: 'postcss-loader',
            options: {
              postcssOptions: {
                plugins: [
                  [
                    'postcss-preset-env',
                    {
                      features: {
                        'custom-properties': false,
                        'custom-selectors': true,
                        'focus-visible-pseudo-class': false,
                        'logical-properties-and-values': {
                          dir: 'ltr',
                        },
                        'nesting-rules': true,
                      },
                      preserve: false,
                    },
                  ],
                  ['postcss-font-display', { display: 'fallback', replace: true }],
                ],
              },
            },
          },
        ],
      },
      {
        test: /\.ico$/,
        type: 'asset/resource',
        generator: {
          filename: '[name][ext]',
        },
      },
      {
        test: /\.svg$/,
        type: 'asset/resource',
      },
      {
        test: /\.ts$/,
        loader: 'babel-loader',
        options: {
          presets: [['@babel/preset-env', { targets: { esmodules: true } }], '@babel/preset-typescript'],
        },
      },
    ],
  },
  resolve: {
    extensions: ['.ts'],
  },
  output: {
    assetModuleFilename: '[name].[contenthash][ext]',
    filename: '[name].[contenthash].js',
    path: path.resolve('dist', 'assets'),
    publicPath: '/',
  },
  optimization: {
    minimizer: [
      `...`,
      new CssMinimizerPlugin(),
      new ImageMinimizerPlugin({
        minimizer: {
          implementation: ImageMinimizerPlugin.imageminMinify,
          options: { plugins: [['svgo']] },
        },
      }),
    ],
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: '[name].[contenthash].css',
    }),
    new PurgeCssPlugin({
      paths: glob.sync(`src/**/*`, { nodir: true }),
      safelist: ['body', 'contenteditable', /^:/],
      variables: true,
    }),
    new RemoveEmptyScriptsPlugin({
      extensions: ['css', 'ico', 'svg'],
    }),
    new WebpackManifestPlugin({
      fileName: path.resolve('src', 'manifest.json'),
    }),
  ],
}
