const path = require('path')
const glob = require('glob')
const { WebpackManifestPlugin } = require('webpack-manifest-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const { PurgeCSSPlugin } = require('purgecss-webpack-plugin')
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
    'conditional-inputs': path.resolve('assets', 'conditional-inputs.ts'),
    'editor-toolbar': path.resolve('assets', 'editor-toolbar.ts'),
    'error-summary': path.resolve('assets', 'error-summary.ts'),
    'favicon.ico': path.resolve('assets', 'favicon.ico'),
    'favicon.svg': path.resolve('assets', 'favicon.svg'),
    'html-editor': path.resolve('assets', 'html-editor.ts'),
    'prereview.svg': path.resolve('assets', 'prereview.svg'),
    'prereview-footer.svg': path.resolve('assets', 'prereview-footer.svg'),
    'single-use-form': path.resolve('assets', 'single-use-form.ts'),
    'skip-link': path.resolve('assets', 'skip-link.ts'),
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
                    '@csstools/postcss-global-data',
                    {
                      files: [
                        path.resolve('assets', 'space.css'),
                        path.resolve('assets', 'step.css'),
                        path.resolve('node_modules', 'open-color', 'open-color.css'),
                      ],
                    },
                  ],
                  [
                    'postcss-preset-env',
                    {
                      features: {
                        'custom-properties': false,
                        'custom-selectors': true,
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
    new PurgeCSSPlugin({
      paths: [...glob.sync(`assets/**/*.ts`, { nodir: true }), ...glob.sync(`src/**/*`, { nodir: true })],
      safelist: ['contenteditable', /^:/],
      variables: true,
    }),
    new RemoveEmptyScriptsPlugin({
      extensions: ['css', 'ico', 'svg'],
    }),
    new WebpackManifestPlugin({
      fileName: path.resolve('src', 'manifest.json'),
      generate: (_, files, entries) =>
        files.reduce((carry, file) => {
          if (!(file.name in entries) && !file.isInitial) {
            return carry
          }

          if (!file.chunk || !file.path.endsWith('js')) {
            return { ...carry, [file.name]: file.path }
          }

          return {
            ...carry,
            [file.name]: {
              path: file.path,
              preload: Array.from(file.chunk.getAllAsyncChunks().values()).flatMap(chunk =>
                Array.from(chunk.files).map(name => files.find(file => file.path.endsWith(name)).path),
              ),
            },
          }
        }, {}),
    }),
  ],
}
