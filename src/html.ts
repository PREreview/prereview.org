import { pipe } from 'fp-ts/function'
import { HeadersOpen, MediaType, ResponseEnded } from 'hyper-ts'
import * as M from 'hyper-ts/lib/Middleware'
import nanohtml from 'nanohtml'
import raw from 'nanohtml/raw'

export interface Html extends String {
  readonly Html: unique symbol
}

export function html(
  literals: TemplateStringsArray,
  ...placeholders: ReadonlyArray<ReadonlyArray<Html> | Html | string | number>
): Html {
  return nanohtml(literals, ...placeholders) as Html
}

export function rawHtml(html: string): Html {
  return raw(html) as unknown as Html
}

export function sendHtml(html: Html): M.Middleware<HeadersOpen, ResponseEnded, never, void> {
  return pipe(
    M.contentType(MediaType.textHTML),
    M.ichainFirst(() => M.closeHeaders()),
    M.ichain(() => M.send(html.toString())),
  )
}
