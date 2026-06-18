import postcssGlobalData from '@csstools/postcss-global-data'
import postcssPurgecss from '@fullhuman/postcss-purgecss'
import { globSync, mkdirSync, writeFileSync } from 'fs'
import path from 'path'
import postcssFontDisplay from 'postcss-font-display'
import postcssPresetEnv from 'postcss-preset-env'
import postcssRtlCss from 'postcss-rtlcss'
import { defineConfig, type Plugin } from 'vite'

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
        postcssRtlCss({
          ltrPrefix: ':where([dir="ltr"])',
          rtlPrefix: ':where([dir="rtl"])',
          runOnExit: true,
        }),
        // eslint-disable-next-line no-comments/disallowComments
        // @ts-expect-error https://github.com/FullHuman/purgecss/issues/1263
        postcssPurgecss({
          content: [...globSync('assets/**/*.ts'), ...globSync('src/**/*.ts')],
          safelist: ['contenteditable', /^crowdin_/, 'dir', /^jipt-/, /^:/],
          variables: true,
        }),
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
      const manifest: Record<
        string,
        { path: string; preload: Array<string> } | { path: string; width: number; height: number } | string
      > = {}

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
          const entryName = item.names[0]
          const assetPath = `/${item.fileName}`

          if (isImageEntry(entryName)) {
            manifest[entryName] = { path: assetPath, ...getImageDimensions(entryName, item.source) }
          } else {
            manifest[entryName] = assetPath
          }

          continue
        }
      }

      for (const [name, value] of Object.entries(manifest)) {
        if (typeof value === 'object' && 'preload' in value) {
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

function isImageEntry(fileName: string): boolean {
  return /\.(png|svg)$/i.test(fileName)
}

function getImageDimensions(fileName: string, source: string | Uint8Array): { width: number; height: number } {
  const dimensions = /\.png$/i.test(fileName)
    ? getPngDimensions(source)
    : /\.svg$/i.test(fileName)
      ? getSvgDimensions(source)
      : undefined

  if (!dimensions) {
    throw new Error(`Unsupported image format for file: ${fileName}`)
  }

  return dimensions
}

function getPngDimensions(source: string | Uint8Array): { width: number; height: number } {
  if (!(source instanceof Uint8Array) || source.length < 24) {
    throw new Error('Invalid PNG file')
  }

  if (
    source[0] !== 0x89 ||
    source[1] !== 0x50 ||
    source[2] !== 0x4e ||
    source[3] !== 0x47 ||
    source[4] !== 0x0d ||
    source[5] !== 0x0a ||
    source[6] !== 0x1a ||
    source[7] !== 0x0a
  ) {
    throw new Error('Invalid PNG file')
  }

  const view = new DataView(source.buffer, source.byteOffset, source.byteLength)

  return { width: view.getUint32(16), height: view.getUint32(20) }
}

function getSvgDimensions(source: string | Uint8Array): { width: number; height: number } {
  const svg = typeof source === 'string' ? source : Buffer.from(source).toString('utf8')

  const widthMatch = /\bwidth=["']\s*([0-9]*\.?[0-9]+)\s*(px)?\s*["']/i.exec(svg)
  const heightMatch = /\bheight=["']\s*([0-9]*\.?[0-9]+)\s*(px)?\s*["']/i.exec(svg)

  if (widthMatch && heightMatch) {
    return { width: Math.round(Number(widthMatch[1])), height: Math.round(Number(heightMatch[1])) }
  }

  const viewBoxMatch =
    /\bviewBox=["']\s*[-+]?[0-9]*\.?[0-9]+(?:\s+|,)\s*[-+]?[0-9]*\.?[0-9]+(?:\s+|,)\s*([-+]?[0-9]*\.?[0-9]+)(?:\s+|,)\s*([-+]?[0-9]*\.?[0-9]+)\s*["']/i.exec(
      svg,
    )

  if (!viewBoxMatch) {
    throw new Error('SVG is missing width/height attributes and viewBox attribute')
  }

  return { width: Math.round(Number(viewBoxMatch[1])), height: Math.round(Number(viewBoxMatch[2])) }
}
