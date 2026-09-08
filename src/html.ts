import {
  Array,
  Data,
  Effect,
  Equal,
  Hash,
  HashSet,
  Match,
  Option,
  Order,
  pipe,
  Predicate,
  Record,
  Struct,
  Tuple,
} from 'effect'
import { decode, encode } from 'html-entities'
import { Parser } from 'htmlparser2'
import * as C from 'io-ts/lib/Codec.js'
import * as D from 'io-ts/lib/Decoder.js'
import katex from 'katex'
import processMjml from 'mjml'
import sanitize from 'sanitize-html'
import stripTags from 'striptags'

export class Html extends Data.TaggedClass('Html')<{
  value: string
}> {
  toString() {
    return this.value
  }

  [Equal.symbol](that: unknown) {
    return that instanceof Html && canonicalize(this.value) === canonicalize(that.value)
  }

  [Hash.symbol]() {
    return Hash.string(canonicalize(this.value))
  }
}

export class PlainText extends Data.TaggedClass('PlainText')<{
  value: string
}> {
  toString() {
    return this.value
  }
}

type Placeholder = ReadonlyArray<Html | PlainText> | Html | PlainText | string | number

const encodePlaceholder = (placeholder: Exclude<Placeholder, ReadonlyArray<unknown>>) =>
  encode(placeholder.toString(), { mode: 'specialChars' })

const handlePlaceholder = pipe(
  Match.type<Exclude<Placeholder, ReadonlyArray<unknown>>>(),
  Match.tag('Html', html => html.value),
  Match.tag('PlainText', plainText => plainText.value),
  Match.orElse(encodePlaceholder),
)

export function html(literals: TemplateStringsArray, ...placeholders: ReadonlyArray<Placeholder>): Html {
  const value = literals.raw.reduce((string, literal, i) => {
    const placeholder = Array.unsafeGet(placeholders, i - 1)

    if (isTextAreaString(string)) {
      const value =
        typeof placeholder === 'string' || typeof placeholder === 'number' || '_tag' in placeholder
          ? encodePlaceholder(placeholder)
          : placeholder.map(encodePlaceholder).join('')

      return `${string}${value}${literal}`
    }

    const value =
      typeof placeholder === 'string' || typeof placeholder === 'number' || '_tag' in placeholder
        ? handlePlaceholder(placeholder)
        : placeholder.map(handlePlaceholder).join('')

    if (stringEndsWithAttribute(string)) {
      return `${string}${stripTags(value)}${literal}`
    }

    if (stringEndsWithUnescapedAttribute(string)) {
      return `${string}"${stripTags(value)}"${literal}`
    }

    return `${string}${value}${literal}`
  })

  return new Html({ value })
}

export function rawHtml(html: string): Html {
  const value = texToMathml(html)

  return new Html({ value })
}

export const mjmlToHtml: (mjml: Html) => Effect.Effect<Html> = Effect.fnUntraced(function* (mjml) {
  const processed = yield* Effect.promise(() => processMjml(mjml.toString()))

  return new Html({ value: processed.html })
})

export function sanitizeHtml(html: string, { allowBlockLevel = true, trusted = false } = {}): Html {
  const sanitized = sanitize(html, {
    allowedTags: [
      ...(allowBlockLevel ? ['dd', 'dl', 'dt', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'ol', 'p', 'ul'] : []),
      'a',
      'b',
      'i',
      'sub',
      'sup',
      'math',
      'mi',
      'mn',
      'mo',
      'ms',
      'mspace',
      'mtext',
      'merror',
      'mfrac',
      'mpadded',
      'mphantom',
      'mroot',
      'mrow',
      'msqrt',
      'mmultiscripts',
      'mover',
      'mprescripts',
      'msub',
      'msubsup',
      'msup',
      'munder',
      'munderover',
      'mtable',
      'mtd',
      'mtr',
      'annotation',
      'semantics',
      ...(trusted ? ['img', 'span', 'table', 'colgroup', 'col', 'thead', 'tbody', 'tr', 'th', 'td'] : []),
    ],
    allowedAttributes: {
      '*': ['dir', 'displaystyle', 'lang', 'mathvariant', ...(trusted ? ['id'] : [])],
      a: ['href'],
      annotation: ['encoding'],
      col: ['span'],
      img: ['alt', 'height', 'src', 'width'],
      math: allowBlockLevel ? ['display'] : [],
      mo: [
        'fence',
        'largeop',
        'lspace',
        'maxsize',
        'minsize',
        'movablelimits',
        'rspace',
        'separator',
        'stretchy',
        'symmetric',
      ],
      mover: ['accent'],
      mfrac: ['linethickness'],
      mpadded: ['depth', 'height', 'lspace', 'voffset', 'width'],
      munder: ['accentunder'],
      munderover: ['accent', 'accentunder'],
      mspace: ['depth', 'height', 'width'],
      mtd: ['columnspan', 'rowspan'],
      td: ['colspan', 'rowspan'],
      th: ['colspan', 'rowspan'],
    },
    allowedClasses: {
      a: trusted ? ['button'] : [],
      td: trusted ? ['numeric'] : [],
    },
    transformTags: {
      a: (tagName, attribs) => {
        if (typeof attribs['href'] === 'string' && !/^[A-z][A-z0-9+\-.]*:/.test(attribs['href'])) {
          attribs['href'] = ''
        }

        if (trusted && typeof attribs['class'] === 'string' && attribs['class'].includes('kg-btn')) {
          attribs['class'] = 'button'
        }

        return {
          tagName,
          attribs,
        }
      },
      em: 'i',
      strong: 'b',
    },
    exclusiveFilter: frame =>
      ['a', 'b', 'em', 'i', 'strong', 'sub', 'sup'].includes(frame.tag) && frame.text.trim() === ''
        ? 'excludeTag'
        : ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'ol', 'p', 'ul'].includes(frame.tag) && frame.text.trim() === '',
    nonTextTags: ['style', 'script', 'textarea', 'option', 'annotation-xml'],
  })

  return rawHtml(
    sanitized
      .replaceAll(/\s*\u00a0\s*/g, '\u00a0')
      .replaceAll(/[^\S\u00a0]+/g, ' ')
      .replaceAll(/(?<=<(h[1-6]|ol|p|ul)>)\s+|\s+(?=<\/(h[1-6]|ol|p|ul)>)/g, '')
      .replaceAll(/(?<=<\/(h[1-6]|ol|p|ul)>)\s+|\s+(?=<(h[1-6]|ol|p|ul)[\s>])/g, '')
      .replaceAll(/<\/(h[1-6]|ol|p|ul)><(h[1-6]|ol|p|ul)([\s>])/g, '</$1>\n\n<$2$3'),
  )
}

export function fixHeadingLevels(currentLevel: 1 | 2 | 3, input: Html): Html {
  const levels = input.toString().match(/(?<=<h)([1-6])(?=\s|>)/gi)

  if (!levels) {
    return input
  }

  const highestLevel = Math.min(...levels.map(level => parseInt(level, 10)))
  const offset = currentLevel + 1 - highestLevel

  if (offset === 0) {
    return input
  }

  return rawHtml(
    input.toString().replaceAll(/(?<=<\/?h)([1-6])(?=\s|>)/gi, level => String(parseInt(level, 10) + offset)),
  )
}

export function plainText(literals: TemplateStringsArray, ...placeholders: ReadonlyArray<Placeholder>): PlainText
export function plainText(string: Html | string): PlainText
export function plainText(
  input: TemplateStringsArray | Html | string,
  ...placeholders: ReadonlyArray<Placeholder>
): PlainText {
  const isTemplateStringsArray: Predicate.Refinement<unknown, TemplateStringsArray> = Array.isArray

  const value = decode(
    stripTags(mathmlToTex((isTemplateStringsArray(input) ? html(input, ...placeholders) : input).toString())),
  )

  return new PlainText({ value })
}

export const RawHtmlC = C.make(
  pipe(
    D.union(
      pipe(
        D.string,
        D.map(html => rawHtml(html)),
      ),
      pipe(
        D.id(),
        D.parse(s => (s instanceof Html ? D.success(s) : D.failure(s, 'Html'))),
      ),
    ),
  ),
  { encode: String },
)

function texToMathml(input: string) {
  return input.replace(
    /(?<!\d(?:\s|&nbsp;|&#160;|&#xA0;|\u00a0)+?)(\${1,2}(?!(?:\s|&nbsp;|&#160;|&#xA0;|\u00a0)*\d+(?:[\s,.<$]|$)))([\s\S]+?)\1/g,
    (original, mode: string, match: string) => {
      try {
        return sanitizeHtml(
          katex
            .renderToString(decode(match), { displayMode: mode === '$$', output: 'mathml', strict: false })
            .replace(/^<span class="katex">([\s\S]*)<\/span>$/, '$1'),
        ).toString()
      } catch {
        return original
      }
    },
  )
}

function mathmlToTex(input: string) {
  return input.replaceAll(
    /<math[\s\S]*?(?:display="(block)")?>[\s\S]*?<annotation encoding="application\/x-tex">([\s\S]+?)<\/annotation>[\s\S]*?<\/math>/gi,
    (_, display: string, tex: string) => (display === 'block' ? `$$${tex}$$` : `$${tex}$`),
  )
}

function isTextAreaString(string: string): boolean {
  return /<textarea\b[^>]*>\s*$/i.test(string)
}

function stringEndsWithUnescapedAttribute(string: string): boolean {
  return string.endsWith('=') && !/(?:="|&)[^"]*=$/.test(string)
}

function stringEndsWithAttribute(string: string): boolean {
  return string.endsWith('="')
}

interface CanonicalNode {
  readonly tag: string
  readonly attrs: ReadonlyArray<readonly [string, string]>
  children: ReadonlyArray<CanonicalNode | string>
}

const attrOrder: Order.Order<readonly [string, string]> = Order.mapInput(Order.string, Tuple.getFirst)

function parseToCanonical(input: string): ReadonlyArray<CanonicalNode | string> {
  const root = Array.empty<CanonicalNode | string>()
  const stack = Array.empty<{ node: CanonicalNode; children: Array<CanonicalNode | string> }>()

  const currentChildren = () => Option.match(Array.last(stack), { onNone: () => root, onSome: Struct.get('children') })

  const parser = new Parser(
    {
      onopentag(name, attribs) {
        const node: CanonicalNode = {
          tag: name.toLowerCase(),
          attrs: pipe(Record.toEntries(attribs), Array.sort(attrOrder)),
          children: [],
        }
        currentChildren().push(node)
        stack.push({ node, children: [] })
      },
      ontext(text) {
        if (text !== '') {
          currentChildren().push(decode(text))
        }
      },
      onclosetag() {
        const finished = stack.pop()
        if (finished) {
          finished.node.children = finished.children
        }
      },
    },
    { decodeEntities: false },
  )

  parser.write(input)
  parser.end()

  return root
}

type CanonicalChild = CanonicalNode | string

const isTextNode: (node: CanonicalChild) => node is string = Predicate.isString

const isElementNode = (node: CanonicalChild): node is CanonicalNode => !isTextNode(node)

const isBlockLevel = (node: CanonicalChild) => isElementNode(node) && HashSet.has(blockElements, node.tag)

const whitespaceSensitiveElements = HashSet.make('pre', 'textarea')

const blockElements = HashSet.make(
  'address',
  'article',
  'aside',
  'blockquote',
  'dd',
  'div',
  'dl',
  'dt',
  'fieldset',
  'figcaption',
  'figure',
  'footer',
  'form',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'header',
  'hr',
  'li',
  'main',
  'nav',
  'ol',
  'p',
  'pre',
  'section',
  'table',
  'tbody',
  'td',
  'tfoot',
  'th',
  'thead',
  'tr',
  'ul',
)

function normalizeText(text: string): string {
  return text.replace(/[ \t\n\f\r]+/g, ' ')
}

function normalize(nodes: ReadonlyArray<CanonicalChild>, preserveWhitespace = false): ReadonlyArray<CanonicalChild> {
  const normalizedNodes = Array.reduce(nodes, Array.empty<CanonicalChild>(), (result, node) => {
    if (isElementNode(node)) {
      result.push({
        ...node,
        children: normalize(node.children, preserveWhitespace || HashSet.has(whitespaceSensitiveElements, node.tag)),
      })
      return result
    }

    const previous = Array.last(result)
    const text = preserveWhitespace ? node : normalizeText(node)

    if (Option.isSome(previous) && isTextNode(previous.value)) {
      result[result.length - 1] = previous.value + text
    } else {
      result.push(text)
    }

    return result
  })

  if (preserveWhitespace) {
    return normalizedNodes
  }

  return pipe(
    normalizedNodes,
    Array.filterMap((node, index) => {
      if (isElementNode(node)) {
        return Option.some(node)
      }

      const trimStart = index === 0 || pipe(Array.get(normalizedNodes, index - 1), Option.exists(isBlockLevel))
      const trimEnd =
        index === normalizedNodes.length - 1 || pipe(Array.get(normalizedNodes, index + 1), Option.exists(isBlockLevel))

      const text = node.replace(trimStart ? /^ / : /$^/, '').replace(trimEnd ? / $/ : /$^/, '')

      return text === '' ? Option.none() : Option.some(text)
    }),
  )
}

function canonicalize(input: string): string {
  return JSON.stringify(normalize(parseToCanonical(input)))
}
