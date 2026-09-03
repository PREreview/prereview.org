import { FileSystem } from '@effect/platform'
import { NodeFileSystem } from '@effect/platform-node'
import { Effect, Layer, Logger, pipe, Schema } from 'effect'
import { type HTMLElement as HtmlElement, type Node as HtmlNode, NodeType, parse as parseHtml } from 'node-html-parser'
import path from 'path'

interface Mark {
  type: 'bold' | 'italic'
}

interface RichTextText {
  nodeType: 'text'
  value: string
  marks: Array<Mark>
  data: Record<string, never>
}

type Inline = RichTextText

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

type Block = Paragraph | Heading1 | Heading2 | Heading3 | Hr | Blockquote | UnorderedList | OrderedList

interface RichText {
  nodeType: 'document'
  data: Record<string, never>
  content: Array<Block>
}

const makeText = (value: string, marks: Array<Mark> = []): RichTextText => ({
  nodeType: 'text',
  value,
  marks,
  data: {},
})

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

function toInlines(node: HtmlNode, marks: Array<Mark> = []): Array<Inline> {
  if (node.nodeType === NodeType.TEXT_NODE) {
    const value = node.text
    return value ? [makeText(value, marks)] : []
  }
  if (node.nodeType !== NodeType.ELEMENT_NODE) return []

  const el = node as HtmlElement
  switch (getTag(node)) {
    case 'strong':
    case 'b':
      return el.childNodes.flatMap(child => toInlines(child, [...marks, { type: 'bold' }]))
    case 'em':
    case 'i':
      return el.childNodes.flatMap(child => toInlines(child, [...marks, { type: 'italic' }]))
    case 'a':
      return el.childNodes.flatMap(child => toInlines(child, marks))
    case 'br':
      return []
    default:
      return el.childNodes.flatMap(child => toInlines(child, marks))
  }
}

function toBlocks(nodes: Array<HtmlNode>): Array<Block> {
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

    if (cls.includes('kg-header-card')) continue
    if (cls.includes('kg-image-card') || cls.includes('kg-gallery-card') || cls.includes('kg-embed-card')) continue

    switch (getTag(node)) {
      case 'p': {
        const inlines = el.childNodes.flatMap(child => toInlines(child))
        if (inlines.length) blocks.push(makeParagraph(inlines))
        break
      }
      case 'h1':
        blocks.push({ nodeType: 'heading-1', data: {}, content: el.childNodes.flatMap(child => toInlines(child)) })
        break
      case 'h2':
        blocks.push({ nodeType: 'heading-2', data: {}, content: el.childNodes.flatMap(child => toInlines(child)) })
        break
      case 'h3':
        blocks.push({ nodeType: 'heading-3', data: {}, content: el.childNodes.flatMap(child => toInlines(child)) })
        break
      case 'hr':
        blocks.push({ nodeType: 'hr', data: {}, content: [] })
        break
      case 'blockquote': {
        const inlines = el.childNodes.flatMap(child => toInlines(child))
        const paragraphs: Array<Paragraph> = inlines.length ? [makeParagraph(inlines)] : []
        if (paragraphs.length) blocks.push({ nodeType: 'blockquote', data: {}, content: paragraphs })
        break
      }
      case 'ul': {
        const items: Array<ListItem> = el.childNodes
          .filter(child => child.nodeType === NodeType.ELEMENT_NODE && getTag(child) === 'li')
          .map(li => ({
            nodeType: 'list-item' as const,
            data: {} as Record<string, never>,
            content: [makeParagraph((li as HtmlElement).childNodes.flatMap(child => toInlines(child)))],
          }))
        if (items.length) blocks.push({ nodeType: 'unordered-list', data: {}, content: items })
        break
      }
      case 'ol': {
        const items: Array<ListItem> = el.childNodes
          .filter(child => child.nodeType === NodeType.ELEMENT_NODE && getTag(child) === 'li')
          .map(li => ({
            nodeType: 'list-item' as const,
            data: {} as Record<string, never>,
            content: [makeParagraph((li as HtmlElement).childNodes.flatMap(child => toInlines(child)))],
          }))
        if (items.length) blocks.push({ nodeType: 'ordered-list', data: {}, content: items })
        break
      }
      case 'div': {
        if (cls.includes('kg-button-card')) {
          const link = el.querySelector('a')
          if (link) {
            const text = link.text.trim()
            if (text) blocks.push(makeParagraph([makeText(text)]))
          }
          break
        }
        if (cls.includes('kg-callout-card')) {
          const textEl = el.querySelector('.kg-callout-text')
          if (textEl) {
            const inlines = textEl.childNodes.flatMap(child => toInlines(child))
            if (inlines.length) blocks.push(makeParagraph(inlines))
          }
          break
        }
        blocks.push(...toBlocks([...el.childNodes]))
        break
      }
      case 'figure':
      case 'figcaption':
      case 'img':
      case 'iframe':
      case 'table':
      case 'tbody':
      case 'tr':
      case 'td':
      case 'col':
      case 'colgroup':
        break
      default:
        blocks.push(...toBlocks([...el.childNodes]))
    }
  }

  return blocks
}

function htmlToRichText(html: string): RichText {
  const root = parseHtml(html)
  return { nodeType: 'document', data: {}, content: toBlocks([...root.childNodes]) }
}

const GhostPost = Schema.Struct({
  title: Schema.NonEmptyTrimmedString,
  slug: Schema.NonEmptyTrimmedString,
  html: Schema.String,
})

const GhostPosts = Schema.Array(Schema.partial(GhostPost))

const contentfulEntry = (post: typeof GhostPost.Type) => ({
  fields: {
    title: { 'en-US': post.title },
    slug: { 'en-US': post.slug },
    content: { 'en-US': htmlToRichText(post.html) },
  },
})

const outputDir = path.resolve(import.meta.dirname, '..', 'contentful-import')
const inputFile = path.resolve(import.meta.dirname, '..', 'all-posts.json')

void pipe(
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem

    yield* fs.makeDirectory(outputDir, { recursive: true })

    const raw = yield* fs.readFileString(inputFile)
    const posts = yield* Schema.decodeUnknown(GhostPosts)(JSON.parse(raw))

    const valid = posts.filter(
      (p): p is typeof GhostPost.Type => p.title !== undefined && p.slug !== undefined && p.html !== undefined,
    )

    yield* Effect.logInfo(`Writing ${valid.length} entries to ${outputDir}`)

    yield* Effect.forEach(
      valid,
      post =>
        fs.writeFileString(path.join(outputDir, `${post.slug}.json`), JSON.stringify(contentfulEntry(post), null, 2)),
      { concurrency: 10 },
    )

    yield* Effect.logInfo('Done')
  }),
  Effect.provide(Layer.mergeAll(NodeFileSystem.layer, Logger.pretty)),
  Effect.runPromise,
)
