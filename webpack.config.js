const path = require('path')
const glob = require('glob')
const { WebpackManifestPlugin } = require('webpack-manifest-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const PurgeCssPlugin = require('purgecss-webpack-plugin')
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin')

module.exports = {
  mode: process.env.NODE_ENV,
  entry: path.resolve('assets', 'main.ts'),
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [
          MiniCssExtractPlugin.loader,
          'css-loader',
          {
            loader: 'postcss-loader',
            options: {
              postcssOptions: {
                plugins: [
                  [
                    'postcss-preset-env',
                    {
                      features: {
                        'focus-visible-pseudo-class': false,
                        'logical-properties-and-values': {
                          dir: 'ltr',
                        },
                        'nesting-rules': true,
                      },
                      preserve: false,
                    },
                  ],
                ],
              },
            },
          },
        ],
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
  optimization: {
    minimizer: [`...`, new CssMinimizerPlugin()],
  },
  plugins: [
    new MiniCssExtractPlugin(),
    new PurgeCssPlugin({
      paths: glob.sync(`src/**/*`, { nodir: true }),
      safelist: ['body', /^:/],
      variables: true,
    }),
    new WebpackManifestPlugin({
      fileName: path.resolve('src', 'manifest.json'),
    }),
  ],
}
