import { pipe } from 'fp-ts/function'
import { HeadersOpen, MediaType, ResponseEnded } from 'hyper-ts'
import * as M from 'hyper-ts/lib/Middleware'
import nanohtml from 'nanohtml'
import raw from 'nanohtml/raw'
import sanitize from 'sanitize-html'

export interface Html {
  readonly Html: unique symbol
}

export function html(
  literals: TemplateStringsArray,
  ...placeholders: ReadonlyArray<ReadonlyArray<Html> | Html | string | number>
): Html {
  return nanohtml(literals, ...placeholders) as unknown as Html
}

export function rawHtml(html: string): Html {
  return raw(html) as unknown as Html
}

export function sanitizeHtml(html: string): Html {
  const sanitized = sanitize(html, {
    allowedTags: ['h1', 'h2', 'li', 'ol', 'p', 'ul', 'a', 'b', 'i', 'sub', 'sup'],
    allowedAttributes: {
      '*': ['dir', 'lang'],
      a: ['href'],
    },
    transformTags: {
      em: 'i',
      strong: 'b',
    },
  })

  return rawHtml(sanitized)
}

export function sendHtml(html: Html): M.Middleware<HeadersOpen, ResponseEnded, never, void> {
  return pipe(
    M.contentType(MediaType.textHTML),
    M.ichainFirst(() => M.closeHeaders()),
    M.ichain(() => M.send(html.toString())),
  )
}
