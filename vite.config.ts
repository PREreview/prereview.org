import postcssGlobalData from '@csstools/postcss-global-data'
import { globSync, mkdirSync, writeFileSync } from 'fs'
import path from 'path'
import postcssFontDisplay from 'postcss-font-display'
import postcssPresetEnv from 'postcss-preset-env'
import { defineConfig, type Plugin } from 'vite'
import purgeCssPlugin from 'vite-plugin-purgecss'

const imageEntries = globSync('assets/{illustrations,logos}/**/*.{png,svg}').reduce<Record<string, string>>(
  (files, file) => {
    files[path.basename(file)] = file
    return files
  },
  {},
)

const entries = {
  'conditional-inputs': path.resolve('assets', 'conditional-inputs.ts'),
  'crowdin.css': path.resolve('assets', 'crowdin.css'),
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
  'spotlight-banner': path.resolve('assets', 'spotlight-banner.ts'),
  'style.css': path.resolve('assets', 'style.css'),
  ...imageEntries,
}

export default defineConfig(({ mode }) => ({
  cacheDir: path.resolve('.cache/vite'),
  css: {
    postcss: {
      plugins: [
        postcssGlobalData({
          files: [
            path.resolve('assets', 'color.css'),
            path.resolve('assets', 'grid.css'),
            path.resolve('assets', 'space.css'),
            path.resolve('assets', 'step.css'),
          ],
        }),
        postcssPresetEnv({
          features: {
            'custom-properties': false,
            'custom-selectors': true,
            'nesting-rules': true,
          },
          preserve: false,
        }),
        postcssFontDisplay({ display: 'fallback', replace: true }),
      ],
    },
  },
  build: {
    assetsInlineLimit: 0,
    assetsDir: path.resolve('dist', 'assets'),
    outDir: path.resolve('dist', 'assets'),
    emptyOutDir: mode === 'development',
    sourcemap: mode === 'development',
    rollupOptions: {
      input: entries,
      output: {
        entryFileNames: '[name].[hash].js',
        chunkFileNames: '[name].[hash].js',
        assetFileNames: assetInfo => {
          if (typeof assetInfo.name === 'string' && assetInfo.name.endsWith('.ico')) {
            return '[name][extname]'
          }
          return '[name].[hash][extname]'
        },
      },
    },
  },
  plugins: [
    cssCharsetPlugin(),
    purgeCssPlugin({
      content: [...globSync('assets/**/*.ts'), ...globSync('src/**/*.ts')],
      safelist: ['contenteditable', /^crowdin_/, /^:/],
      variables: true,
    }),
    prereviewManifestPlugin({
      outputPath: path.resolve('src', 'manifest.json'),
      entries,
    }),
  ],
}))

// https://github.com/vitejs/vite/issues/22381#issuecomment-4368183658
function cssCharsetPlugin(): Plugin {
  return {
    name: 'css-charset-plugin',
    enforce: 'post',
    generateBundle(_, bundle) {
      for (const chunk of Object.values(bundle)) {
        if (chunk.type === 'asset' && chunk.fileName.endsWith('.css')) {
          const source = chunk.source.toString()
          if (!source.startsWith('@charset')) {
            chunk.source = '@charset "utf-8";\n' + source
          }
        }
      }
    },
  }
}

function prereviewManifestPlugin({
  outputPath,
  entries,
}: {
  outputPath: string
  entries: Record<string, string>
}): Plugin<unknown> {
  return {
    name: 'prereview-manifest-plugin',
    apply: 'build',
    writeBundle(_, bundle) {
      const entryNames = new Set(Object.keys(entries))
      const manifest: Record<string, { path: string; preload: Array<string> } | string> = {}

      const chunksByFile = new Map(
        Object.values(bundle)
          .filter(item => item.type === 'chunk')
          .map(chunk => [chunk.fileName, chunk]),
      )

      for (const item of Object.values(bundle)) {
        if (item.type === 'chunk' && item.isEntry && entryNames.has(item.name)) {
          manifest[`${item.name}.js`] = {
            path: `/${item.fileName}`,
            preload: Array.from(new Set([...item.imports, ...item.dynamicImports])).map(fileName => `/${fileName}`),
          }
          continue
        }

        if (item.type === 'asset' && typeof item.names[0] === 'string' && entryNames.has(item.names[0])) {
          manifest[item.names[0]] = `/${item.fileName}`
          continue
        }
      }

      for (const [name, value] of Object.entries(manifest)) {
        if (typeof value === 'object') {
          const chunkFile = value.path.replace('/assets/', '')
          const chunk = chunksByFile.get(chunkFile)
          if (typeof chunk?.viteMetadata?.importedCss.size === 'number') {
            const [cssFile] = Array.from(chunk.viteMetadata.importedCss.values())
            manifest[`${name}.css`] = `/assets/${cssFile}`
          }
        }
      }

      const orderedManifest = Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)))

      mkdirSync(path.dirname(outputPath), { recursive: true })
      writeFileSync(outputPath, JSON.stringify(orderedManifest, null, 2))
    },
  }
}
