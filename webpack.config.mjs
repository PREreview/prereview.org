import CssMinimizerPlugin from 'css-minimizer-webpack-plugin'
import { globSync } from 'fs'
import ImageMinimizerPlugin from 'image-minimizer-webpack-plugin'
import MiniCssExtractPlugin from 'mini-css-extract-plugin'
import path from 'path'
import { PurgeCSSPlugin } from 'purgecss-webpack-plugin'
import URL from 'url'
import { WebpackManifestPlugin } from 'webpack-manifest-plugin'
import RemoveEmptyScriptsPlugin from 'webpack-remove-empty-scripts'

const __filename = URL.fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default (env, argv) => ({
  cache: {
    buildDependencies: { config: [__filename] },
    cacheDirectory: path.resolve(__dirname, '.cache/webpack'),
    compression: false,
    type: 'filesystem',
  },
  devtool: argv.mode === 'development' ? 'source-map' : false,
  entry: {
    'conditional-inputs': path.resolve('assets', 'conditional-inputs.ts'),
    crowdin: path.resolve('assets', 'crowdin.css'),
    'editor-toolbar': path.resolve('assets', 'editor-toolbar.ts'),
    'error-summary': path.resolve('assets', 'error-summary.ts'),
    'expander-button': path.resolve('assets', 'expander-button.ts'),
    'favicon.ico': path.resolve('assets', 'favicon.ico'),
    'favicon.svg': path.resolve('assets', 'favicon.svg'),
    'html-editor': path.resolve('assets', 'html-editor.ts'),
    'notification-banner': path.resolve('assets', 'notification-banner.ts'),
    'poll-redirect': path.resolve('assets', 'poll-redirect.ts'),
    'single-use-form': path.resolve('assets', 'single-use-form.ts'),
    'skip-link': path.resolve('assets', 'skip-link.ts'),
    style: path.resolve('assets', 'style.css'),
    ...globSync(`assets/{illustrations,logos}/**/*.{png,svg}`).reduce(
      (files, file) => ({
        ...files,
        [path.basename(file)]: path.resolve(__dirname, file),
      }),
      {},
    ),
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
                        path.resolve('assets', 'color.css'),
                        path.resolve('assets', 'grid.css'),
                        path.resolve('assets', 'space.css'),
                        path.resolve('assets', 'step.css'),
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
        test: /\.(png|svg)$/,
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
    extensionAlias: {
      '.js': ['.ts', '.js'],
    },
  },
  output: {
    assetModuleFilename: '[name].[contenthash][ext]',
    clean: argv.mode === 'development',
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
          options: {
            plugins: [
              ['svgo', { plugins: [{ name: 'preset-default', params: { overrides: { inlineStyles: false } } }] }],
            ],
          },
        },
      }),
    ],
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: '[name].[contenthash].css',
    }),
    new PurgeCSSPlugin({
      paths: [...globSync(`assets/**/*.ts`), ...globSync(`src/**/*.ts`)],
      safelist: ['contenteditable', /^crowdin_/, /^:/],
      variables: true,
    }),
    new RemoveEmptyScriptsPlugin({
      extensions: ['css', 'ico', 'png', 'svg'],
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
})
