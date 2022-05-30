import { pipe } from 'fp-ts/function'
import { HeadersOpen, MediaType, ResponseEnded } from 'hyper-ts'
import * as M from 'hyper-ts/lib/Middleware'

export function html(literals: TemplateStringsArray, ...placeholders: ReadonlyArray<string | number>): string {
  return String.raw(literals, ...placeholders)
}

export function sendHtml(html: string): M.Middleware<HeadersOpen, ResponseEnded, never, void> {
  return pipe(
    M.contentType(MediaType.textHTML),
    M.ichainFirst(() => M.closeHeaders()),
    M.ichain(() => M.send(html)),
  )
}
