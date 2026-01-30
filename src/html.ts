import { Array, Data, Match, pipe, type Predicate } from 'effect'
import { decode } from 'html-entities'
import * as C from 'io-ts/lib/Codec.js'
import * as D from 'io-ts/lib/Decoder.js'
import katex from 'katex'
import processMjml from 'mjml'
import nanohtml from 'nanohtml'
import raw from 'nanohtml/raw.js'
import sanitize from 'sanitize-html'
import stripTags from 'striptags'

export class Html extends Data.TaggedClass('Html')<{
  value: string
}> {
  toString() {
    return this.value
  }
}

export class PlainText extends Data.TaggedClass('PlainText')<{
  value: string
}> {
  toString() {
    return this.value
  }
}

const nanohtmlPlaceholder = pipe(
  Match.type<Html | PlainText | string | number>(),
  Match.tag('Html', html => raw(html.value)),
  Match.tag('PlainText', plainText => plainText.value),
  Match.orElse(value => value),
)

export function html(
  literals: TemplateStringsArray,
  ...placeholders: ReadonlyArray<ReadonlyArray<Html | PlainText> | Html | PlainText | string | number>
): Html {
  const value = ensureString(
    nanohtml(
      literals,
      ...placeholders.map(placeholder => {
        if (typeof placeholder === 'string' || typeof placeholder === 'number' || '_tag' in placeholder) {
          return nanohtmlPlaceholder(placeholder)
        }

        return placeholder.map(nanohtmlPlaceholder)
      }),
    ),
  )

  return new Html({ value })
}

export function rawHtml(html: string): Html {
  const value = ensureString(raw(texToMathml(html)))

  return new Html({ value })
}

export function mjmlToHtml(mjml: Html): Html {
  const value = ensureString(raw(processMjml(mjml.toString()).html))

  return new Html({ value })
}

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
      ...(trusted ? ['img', 'table', 'colgroup', 'col', 'thead', 'tbody', 'tr', 'th', 'td'] : []),
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

export function plainText(
  literals: TemplateStringsArray,
  ...placeholders: ReadonlyArray<ReadonlyArray<Html | PlainText> | Html | PlainText | string | number>
): PlainText
export function plainText(string: Html | string): PlainText
export function plainText(
  input: TemplateStringsArray | Html | string,
  ...placeholders: ReadonlyArray<ReadonlyArray<Html | PlainText> | Html | PlainText | string | number>
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
  return input.replace(/(\${1,2}(?!\s*\d+[\s,.]))([\s\S]+?)\1/g, (original, mode: string, match: string) => {
    try {
      return sanitizeHtml(
        katex
          .renderToString(decode(match), { displayMode: mode === '$$', output: 'mathml', strict: false })
          .replace(/^<span class="katex">([\s\S]*)<\/span>$/, '$1'),
      ).toString()
    } catch {
      return original
    }
  })
}

function mathmlToTex(input: string) {
  return input.replaceAll(
    /<math[\s\S]*?(?:display="(block)")?>[\s\S]*?<annotation encoding="application\/x-tex">([\s\S]+?)<\/annotation>[\s\S]*?<\/math>/gi,
    (_, display: string, tex: string) => (display === 'block' ? `$$${tex}$$` : `$${tex}$`),
  )
}

function ensureString(value: unknown): string {
  if (value instanceof Html || value instanceof PlainText) {
    return value.value
  }

  if (typeof value !== 'string' && !(value instanceof String)) {
    throw new TypeError('Not a string')
  }

  return value.toString()
}
