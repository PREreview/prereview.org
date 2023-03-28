import { Refinement } from 'fp-ts/Refinement'
import { pipe } from 'fp-ts/function'
import { decode } from 'html-entities'
import { HeadersOpen, MediaType, ResponseEnded } from 'hyper-ts'
import * as M from 'hyper-ts/lib/Middleware'
import * as C from 'io-ts/Codec'
import * as D from 'io-ts/Decoder'
import katex from 'katex'
import nanohtml from 'nanohtml'
import raw from 'nanohtml/raw'
import sanitize from 'sanitize-html'
import stripTags from 'striptags'

export interface Html {
  readonly Html: unique symbol
}

export interface PlainText {
  readonly PlainText: unique symbol
}

export function html(
  literals: TemplateStringsArray,
  ...placeholders: ReadonlyArray<ReadonlyArray<Html | PlainText> | Html | PlainText | string | number>
): Html {
  return nanohtml(literals, ...placeholders) as unknown as Html
}

export function rawHtml(html: string): Html {
  return raw(texToMathml(html)) as unknown as Html
}

export function sanitizeHtml(html: string): Html {
  const sanitized = sanitize(html, {
    allowedTags: [
      'h1',
      'h2',
      'h3',
      'li',
      'ol',
      'p',
      'ul',
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
    ],
    allowedAttributes: {
      '*': ['dir', 'displaystyle', 'lang', 'mathvariant'],
      a: ['href'],
      annotation: ['encoding'],
      math: ['display'],
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
    },
    transformTags: {
      a: (tagName, attribs) => {
        if (!/^[A-z][A-z0-9+\-.]*:/.test(attribs.href)) {
          delete attribs.href
        }

        return {
          tagName,
          attribs,
        }
      },
      em: 'i',
      strong: 'b',
    },
    exclusiveFilter: frame => ['h1', 'h2', 'h3', 'li', 'ol', 'p', 'ul'].includes(frame.tag) && frame.text.trim() === '',
    nonTextTags: ['style', 'script', 'textarea', 'option', 'annotation-xml'],
  })

  return rawHtml(sanitized)
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
  const isTemplateStringsArray = Array.isArray as unknown as Refinement<unknown, TemplateStringsArray>

  return stripTags(
    mathmlToTex((isTemplateStringsArray(input) ? html(input, ...placeholders) : input).toString()),
  ) as unknown as PlainText
}

export function sendHtml(html: Html): M.Middleware<HeadersOpen, ResponseEnded, never, void> {
  return pipe(
    M.contentType(MediaType.textHTML),
    M.ichainFirst(() => M.closeHeaders()),
    M.ichain(() => M.send(html.toString())),
  )
}

export const RawHtmlC = C.make(
  pipe(
    D.union(
      pipe(D.string),
      pipe(
        D.id(),
        D.parse(s => (s instanceof String ? D.success(s) : D.failure(s, 'String'))),
      ),
    ),
    D.map(html => rawHtml(html as string)),
  ),
  { encode: String },
)

function texToMathml(input: string) {
  return input.replace(/(\${1,2})([\s\S]+?)\1/g, (original, mode: string, match: string) => {
    try {
      return sanitizeHtml(
        katex
          .renderToString(decode(match), { displayMode: mode === '$$', output: 'mathml' })
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
