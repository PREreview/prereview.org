import cookie from 'cookie'
import * as RR from 'fp-ts/ReadonlyRecord'
import { flow, pipe } from 'fp-ts/function'
import type { HeadersOpen } from 'hyper-ts'
import * as M from 'hyper-ts/Middleware'
import * as D from 'io-ts/Decoder'

export const deleteFlashMessage = pipe(
  M.decodeHeader<HeadersOpen, unknown, string>('Cookie', D.string.decode),
  M.orElse(() => M.right('')),
  M.map(header => RR.has('flash-message', cookie.parse(header))),
  M.chain(hasCookie => (hasCookie ? M.clearCookie('flash-message', { httpOnly: true }) : M.right(undefined))),
)

export const getFlashMessage = <A>(decoder: D.Decoder<string, A>) =>
  pipe(
    M.decodeHeader('Cookie', D.string.decode),
    M.chainOptionKW(() => 'no-cookie' as const)(flow(cookie.parse, RR.lookup('flash-message'))),
    M.chainEitherKW(decoder.decode),
    M.orElseW(() => M.right(undefined)),
  )

export const setFlashMessage = (message: string) => M.cookie('flash-message', message, { httpOnly: true })
