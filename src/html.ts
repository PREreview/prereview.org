import { Refinement } from 'fp-ts/Refinement'
import { pipe } from 'fp-ts/function'
import { HeadersOpen, MediaType, ResponseEnded } from 'hyper-ts'
import * as M from 'hyper-ts/lib/Middleware'
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
  return raw(html) as unknown as Html
}

export function sanitizeHtml(html: string): Html {
  const sanitized = sanitize(html, {
    allowedTags: ['h1', 'h2', 'h3', 'li', 'ol', 'p', 'ul', 'a', 'b', 'i', 'sub', 'sup'],
    allowedAttributes: {
      '*': ['dir', 'lang'],
      a: ['href'],
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
    (isTemplateStringsArray(input) ? html(input, ...placeholders) : input).toString(),
  ) as unknown as PlainText
}

export function sendHtml(html: Html): M.Middleware<HeadersOpen, ResponseEnded, never, void> {
  return pipe(
    M.contentType(MediaType.textHTML),
    M.ichainFirst(() => M.closeHeaders()),
    M.ichain(() => M.send(html.toString())),
  )
}
