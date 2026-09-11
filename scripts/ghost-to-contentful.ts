/* eslint-disable no-comments/disallowComments */
import { FileSystem } from '@effect/platform'
import { NodeFileSystem } from '@effect/platform-node'
import { Effect, pipe, Schema } from 'effect'
import { type HTMLElement as HtmlElement, type Node as HtmlNode, NodeType, parse as parseHtml } from 'node-html-parser'
import path from 'path'
import { buttonKey, normalizeButtonUrl } from './cta-button.ts'
import { type Inline, makeText, toInlines, type Warn } from './rich-text-inline.ts'

interface Paragraph {
  nodeType: 'paragraph'
  data: Record<string, never>
  content: Array<Inline>
}

interface Heading1 {
  nodeType: 'heading-1'
  data: Record<string, never>
  content: Array<Inline>
}

interface Heading2 {
  nodeType: 'heading-2'
  data: Record<string, never>
  content: Array<Inline>
}

interface Heading3 {
  nodeType: 'heading-3'
  data: Record<string, never>
  content: Array<Inline>
}

interface Hr {
  nodeType: 'hr'
  data: Record<string, never>
  content: []
}

interface Blockquote {
  nodeType: 'blockquote'
  data: Record<string, never>
  content: Array<Paragraph>
}

interface ListItem {
  nodeType: 'list-item'
  data: Record<string, never>
  content: Array<Paragraph>
}

interface UnorderedList {
  nodeType: 'unordered-list'
  data: Record<string, never>
  content: Array<ListItem>
}

interface OrderedList {
  nodeType: 'ordered-list'
  data: Record<string, never>
  content: Array<ListItem>
}

interface EmbeddedEntryBlock {
  nodeType: 'embedded-entry-block'
  data: { target: { sys: { id: string; type: 'Link'; linkType: 'Entry' } } }
  content: []
}

type Block =
  Paragraph | Heading1 | Heading2 | Heading3 | Hr | Blockquote | UnorderedList | OrderedList | EmbeddedEntryBlock

interface ImageRecord {
  slug: string
  src: string
  entryId?: string
}

interface ButtonRecord {
  text: string
  target: string
  entryId?: string
}

interface RichText {
  nodeType: 'document'
  data: Record<string, never>
  content: Array<Block>
}

const makeParagraph = (inlines: Array<Inline>): Paragraph => ({
  nodeType: 'paragraph',
  data: {},
  content: inlines.length ? inlines : [makeText('')],
})

function getClass(node: HtmlNode): string {
  return (node as HtmlElement).getAttribute('class') ?? ''
}

function getTag(node: HtmlNode): string {
  return (node as HtmlElement).tagName.toLowerCase()
}

type BoilerplateBlock =
  | { kind: 'class'; name: string; cssClass: string }
  | { kind: 'section'; name: string; ids?: ReadonlyArray<string>; idPrefixes?: ReadonlyArray<string> }
  | { kind: 'button'; name: string; hrefPatterns: ReadonlyArray<string> }

// Each entry defines one named block to strip from Ghost posts.
// - 'class'   : any element whose class contains cssClass
// - 'section' : a heading whose id matches ids/idPrefixes, plus everything until the next heading
// - 'button'  : a kg-button-card whose href matches any hrefPattern
const BOILERPLATE_BLOCKS: ReadonlyArray<BoilerplateBlock> = [
  { kind: 'class', name: 'Donate CTA header', cssClass: 'kg-header-card' },
  { kind: 'section', name: 'Stay connected', ids: ['stay-connected'] },
  {
    kind: 'section',
    name: 'Donation CTA',
    ids: ['consider-supporting-us'],
    idPrefixes: ['interested-in-supporting'],
  },
  { kind: 'section', name: 'Let us know what you think', ids: ['let-us-know-what-you-think'] },
  { kind: 'section', name: 'Help us CTA', ids: ['help-us-out', 'help-us-help-you'] },
]

function matchesSectionStart(block: Extract<BoilerplateBlock, { kind: 'section' }>, id: string): boolean {
  return (block.ids?.includes(id) ?? false) || (block.idPrefixes?.some(prefix => id.startsWith(prefix)) ?? false)
}

function filterBoilerplate(nodes: Array<HtmlNode>, skipped: Array<string>): Array<HtmlNode> {
  const result: Array<HtmlNode> = []
  let activeSectionName: string | null = null

  for (const node of nodes) {
    if (node.nodeType !== NodeType.ELEMENT_NODE) {
      if (activeSectionName === null) result.push(node)
      continue
    }

    const el = node as HtmlElement
    const cls = getClass(node)
    const id = el.getAttribute('id') ?? ''
    const tag = getTag(node)

    const classBlock = BOILERPLATE_BLOCKS.find(b => b.kind === 'class' && cls.includes(b.cssClass))
    if (classBlock) {
      skipped.push(classBlock.name)
      continue
    }

    if (cls.includes('kg-button-card') && activeSectionName === null) {
      const href = (el.querySelector('a')?.getAttribute('href') ?? '').toLowerCase()
      const buttonBlock = BOILERPLATE_BLOCKS.find(
        b => b.kind === 'button' && b.hrefPatterns.some(p => href.includes(p)),
      )
      if (buttonBlock) {
        skipped.push(buttonBlock.name)
        continue
      }
    }

    if (tag === 'h1' || tag === 'h2' || tag === 'h3') {
      const sectionBlock = BOILERPLATE_BLOCKS.filter(
        (b): b is Extract<BoilerplateBlock, { kind: 'section' }> => b.kind === 'section',
      ).find(b => matchesSectionStart(b, id))
      if (sectionBlock) {
        const last = result[result.length - 1]
        if (last?.nodeType === NodeType.ELEMENT_NODE && getTag(last) === 'hr') result.pop()
        activeSectionName = sectionBlock.name
        skipped.push(sectionBlock.name)
        continue
      }
      activeSectionName = null
      result.push(node)
      continue
    }

    if (activeSectionName !== null) continue

    result.push(node)
  }

  return result
}

function toBlocks(
  nodes: Array<HtmlNode>,
  warn: Warn,
  imageLookup: ReadonlyMap<string, ImageRecord>,
  buttonLookup: ReadonlyMap<string, ButtonRecord>,
): Array<Block> {
  const blocks: Array<Block> = []

  for (const node of nodes) {
    if (node.nodeType === NodeType.TEXT_NODE) {
      const value = node.text.trim()
      if (value) blocks.push(makeParagraph([makeText(value)]))
      continue
    }
    if (node.nodeType !== NodeType.ELEMENT_NODE) continue

    const el = node as HtmlElement
    const cls = getClass(node)

    switch (getTag(node)) {
      case 'p': {
        const inlines = el.childNodes.flatMap(child => toInlines(child, [], warn))
        if (inlines.length) blocks.push(makeParagraph(inlines))
        break
      }
      case 'h1':
        blocks.push({
          nodeType: 'heading-1',
          data: {},
          content: el.childNodes.flatMap(child => toInlines(child, [], warn)),
        })
        break
      case 'h2':
        blocks.push({
          nodeType: 'heading-2',
          data: {},
          content: el.childNodes.flatMap(child => toInlines(child, [], warn)),
        })
        break
      case 'h3':
        blocks.push({
          nodeType: 'heading-3',
          data: {},
          content: el.childNodes.flatMap(child => toInlines(child, [], warn)),
        })
        break
      case 'hr':
        blocks.push({ nodeType: 'hr', data: {}, content: [] })
        break
      case 'blockquote': {
        const inlines = el.childNodes.flatMap(child => toInlines(child, [], warn))
        const paragraphs: Array<Paragraph> = inlines.length ? [makeParagraph(inlines)] : []
        if (paragraphs.length) blocks.push({ nodeType: 'blockquote', data: {}, content: paragraphs })
        break
      }
      case 'ul': {
        const items: Array<ListItem> = el.childNodes
          .filter(child => child.nodeType === NodeType.ELEMENT_NODE && getTag(child) === 'li')
          .map(li => ({
            nodeType: 'list-item' as const,
            data: {},
            content: [makeParagraph((li as HtmlElement).childNodes.flatMap(child => toInlines(child, [], warn)))],
          }))
        if (items.length) blocks.push({ nodeType: 'unordered-list', data: {}, content: items })
        break
      }
      case 'ol': {
        const items: Array<ListItem> = el.childNodes
          .filter(child => child.nodeType === NodeType.ELEMENT_NODE && getTag(child) === 'li')
          .map(li => ({
            nodeType: 'list-item' as const,
            data: {},
            content: [makeParagraph((li as HtmlElement).childNodes.flatMap(child => toInlines(child, [], warn)))],
          }))
        if (items.length) blocks.push({ nodeType: 'ordered-list', data: {}, content: items })
        break
      }
      case 'div': {
        if (cls.includes('kg-button-card')) {
          const link = el.querySelector('a')
          const text = link?.text.trim() ?? ''
          if (!link || !text) break

          const href = link.getAttribute('href') ?? ''
          const target = normalizeButtonUrl(href)
          if (target !== null && target !== href) {
            warn(`Normalized CTA button url "${href}" -> "${target}" (text: "${text}")`)
          }
          const record = target !== null ? buttonLookup.get(buttonKey(text, target)) : undefined

          if (record?.entryId !== undefined) {
            blocks.push({
              nodeType: 'embedded-entry-block',
              data: { target: { sys: { id: record.entryId, type: 'Link', linkType: 'Entry' } } },
              content: [],
            })
          } else {
            warn(`CTA button not found or not yet uploaded to Contentful (text: "${text}", href: "${href}")`)
            blocks.push(makeParagraph([makeText(text)]))
          }
          break
        }
        if (cls.includes('kg-callout-card')) {
          const textEl = el.querySelector('.kg-callout-text')
          if (textEl) {
            const inlines = textEl.childNodes.flatMap(child => toInlines(child, [], warn))
            if (inlines.length) blocks.push(makeParagraph(inlines))
          }
          break
        }
        blocks.push(...toBlocks([...el.childNodes], warn, imageLookup, buttonLookup))
        break
      }
      case 'figure': {
        const imgs = el.querySelectorAll('img')
        if (imgs.length > 1) {
          warn(`Skipping gallery figure with ${imgs.length} images`)
          break
        }
        if (imgs.length === 0) {
          warn('Skipping figure without an image')
          break
        }
        for (const img of imgs) {
          const src = img.getAttribute('src')
          if (src === undefined || src === '') {
            warn('Figure contains <img> with no src')
            continue
          }
          if (src.startsWith('data:')) {
            warn(`Ignoring base64 data URI image (footer image): ${src.slice(0, 64)}…`)
            continue
          }
          const record = imageLookup.get(src)
          if (!record) {
            warn(`No image record found for ${src}`)
            continue
          }
          if (record.entryId !== undefined) {
            blocks.push({
              nodeType: 'embedded-entry-block',
              data: { target: { sys: { id: record.entryId, type: 'Link', linkType: 'Entry' } } },
              content: [],
            })
          } else {
            warn(`Image found but not yet uploaded to Contentful as a media entry: ${src}`)
          }
        }
        break
      }
      case 'figcaption':
      case 'img':
      case 'iframe':
      case 'table':
      case 'tbody':
      case 'tr':
      case 'td':
      case 'col':
      case 'colgroup':
        warn(`stripping ${getTag(node)}`)
        break
      default:
        blocks.push(...toBlocks([...el.childNodes], warn, imageLookup, buttonLookup))
    }
  }

  return blocks
}

function htmlToRichText(
  html: string,
  skipped: Array<string>,
  slug: string,
  imageLookup: ReadonlyMap<string, ImageRecord>,
  buttonLookup: ReadonlyMap<string, ButtonRecord>,
): RichText {
  const warn = (msg: string) => console.log(`[warn] ${msg} — https://content.prereview.org/${slug}`)
  const root = parseHtml(html)
  const filtered = filterBoilerplate([...root.childNodes], skipped)
  return { nodeType: 'document', data: {}, content: toBlocks(filtered, warn, imageLookup, buttonLookup) }
}

const GhostPost = Schema.Struct({
  title: Schema.NonEmptyTrimmedString,
  slug: Schema.NonEmptyTrimmedString,
  html: Schema.String,
})

const GhostPosts = Schema.Array(Schema.partial(GhostPost))

interface SkipReport {
  slug: string
  skipped: Array<string>
}

const outputDir = path.resolve(import.meta.dirname, '..', 'contentful-import', 'entries')
const inputFile = path.resolve(import.meta.dirname, '..', 'contentful-import', 'all-posts.json')
const imagesFile = path.resolve(import.meta.dirname, '..', 'contentful-import', 'blog-post-images.json')
const buttonsFile = path.resolve(import.meta.dirname, '..', 'contentful-import', 'blog-post-buttons.json')

const ImageRecordsSchema = Schema.Array(
  Schema.Struct({
    slug: Schema.String,
    src: Schema.String,
    entryId: Schema.optional(Schema.String),
  }),
)

const ButtonRecordsSchema = Schema.Array(
  Schema.Struct({
    text: Schema.String,
    target: Schema.String,
    entryId: Schema.optional(Schema.String),
  }),
)

void pipe(
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem

    yield* fs.makeDirectory(outputDir, { recursive: true })

    const imagesRaw = yield* fs.readFileString(imagesFile)
    const imageRecords = Array.from(yield* Schema.decodeUnknown(ImageRecordsSchema)(JSON.parse(imagesRaw)))

    const imagesBySlug = new Map<string, Map<string, ImageRecord>>()
    for (const record of imageRecords) {
      let bySlug = imagesBySlug.get(record.slug)
      if (!bySlug) {
        bySlug = new Map()
        imagesBySlug.set(record.slug, bySlug)
      }
      bySlug.set(record.src, record)
    }

    const buttonsRaw = yield* fs.readFileString(buttonsFile)
    const buttonRecords = Array.from(yield* Schema.decodeUnknown(ButtonRecordsSchema)(JSON.parse(buttonsRaw)))

    const buttonLookup = new Map<string, ButtonRecord>()
    for (const record of buttonRecords) {
      buttonLookup.set(buttonKey(record.text, record.target), record)
    }

    const raw = yield* fs.readFileString(inputFile)
    const posts = yield* Schema.decodeUnknown(GhostPosts)(JSON.parse(raw))

    const valid = posts.filter(
      (p): p is typeof GhostPost.Type => p.title !== undefined && p.slug !== undefined && p.html !== undefined,
    )

    console.log(`Writing ${valid.length} entries to ${outputDir}`)

    const reports = yield* Effect.forEach(
      valid,
      post =>
        Effect.gen(function* () {
          const skipped: Array<string> = []
          const imageLookup = imagesBySlug.get(post.slug) ?? new Map<string, ImageRecord>()
          const entry = {
            fields: {
              title: { 'en-US': post.title },
              slug: { 'en-US': post.slug },
              content: { 'en-US': htmlToRichText(post.html, skipped, post.slug, imageLookup, buttonLookup) },
            },
          }
          yield* fs.writeFileString(path.join(outputDir, `${post.slug}.json`), JSON.stringify(entry, null, 2))
          return { slug: post.slug, skipped } satisfies SkipReport
        }),
      { concurrency: 10 },
    )

    const withSkips = reports.filter(r => r.skipped.length > 0)

    const blockNames = BOILERPLATE_BLOCKS.map(b => b.name)
    const csvEscape = (v: string | number) => (typeof v === 'string' && v.includes(',') ? `"${v}"` : String(v))
    const csvHeader = ['url', ...blockNames].map(csvEscape).join(',')
    const csvRows = withSkips.map(({ slug, skipped }) => {
      const counts = blockNames.map(name => skipped.filter(s => s === name).length)
      return [csvEscape(`https://content.prereview.org/${slug}`), ...counts].join(',')
    })

    const csvPath = './skipped-blocks.csv'
    yield* fs.writeFileString(csvPath, [csvHeader, ...csvRows].join('\n'))
  }),
  Effect.provide(NodeFileSystem.layer),
  Effect.runPromise,
)
