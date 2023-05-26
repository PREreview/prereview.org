import type { Doi } from 'doi-ts'
import { format } from 'fp-ts-routing'
import * as P from 'fp-ts-routing'
import { concatAll } from 'fp-ts/Monoid'
import * as O from 'fp-ts/Option'
import { constant, pipe, tuple } from 'fp-ts/function'
import { NotFound } from 'http-errors'
import type { ResponseEnded, StatusOpen } from 'hyper-ts'
import { route } from 'hyper-ts-routing'
import * as M from 'hyper-ts/lib/Middleware'
import * as C from 'io-ts/Codec'
import * as D from 'io-ts/Decoder'
import { isUuid } from 'uuid-ts'
import { movedPermanently } from './middleware'
import type { ArxivPreprintId } from './preprint-id'
import {
  logInMatch,
  logOutMatch,
  preprintReviewsMatch,
  preprintReviewsUuidMatch,
  reviewAPreprintMatch,
  reviewsMatch,
} from './routes'

const UuidD = D.fromRefinement(isUuid, 'UUID')

const UuidC = C.make(
  pipe(
    D.string,
    D.parse(s => {
      if (s.toLowerCase() === s) {
        return UuidD.decode(s)
      }

      return D.failure(s, 'UUID')
    }),
  ),
  { encode: uuid => uuid.toLowerCase() },
)

const ArxivPreprintIdC = C.make(
  pipe(
    D.string,
    D.parse(s => {
      const [, match] = s.match(/^arxiv-([A-z0-9.+-]+?)(?:v[0-9]+)?$/) ?? []

      if (match) {
        return D.success({ type: 'arxiv', value: `10.48550/arxiv.${match}` as Doi<'48550'> } satisfies ArxivPreprintId)
      }

      return D.failure(s, 'ID')
    }),
  ),
  {
    encode: id => `philsci-${id.value}`,
  },
)

const legacyRouter: P.Parser<M.Middleware<StatusOpen, ResponseEnded, never, void>> = pipe(
  [
    pipe(
      pipe(P.lit('login'), P.then(P.end)).parser,
      P.map(() => movedPermanently(format(logInMatch.formatter, {}))),
    ),
    pipe(
      pipe(P.lit('logout'), P.then(P.end)).parser,
      P.map(() => movedPermanently(format(logOutMatch.formatter, {}))),
    ),
    pipe(
      pipe(P.lit('preprints'), P.then(type('preprintId', ArxivPreprintIdC)), P.then(P.end)).parser,
      P.map(({ preprintId }) => movedPermanently(format(preprintReviewsMatch.formatter, { id: preprintId }))),
    ),
    pipe(
      pipe(
        P.lit('preprints'),
        P.then(type('preprintUuid', UuidC)),
        P.then(P.lit('full-reviews')),
        P.then(P.str('reviewUuid')),
        P.then(P.end),
      ).parser,
      P.map(({ preprintUuid }) => movedPermanently(format(preprintReviewsUuidMatch.formatter, { uuid: preprintUuid }))),
    ),
    pipe(
      pipe(P.lit('reviews'), P.then(P.lit('new')), P.then(P.end)).parser,
      P.map(() => movedPermanently(format(reviewAPreprintMatch.formatter, {}))),
    ),
    pipe(
      pipe(P.lit('reviews'), P.then(P.end)).parser,
      P.map(() => movedPermanently(format(reviewsMatch.formatter, { page: 1 }))),
    ),
    pipe(
      pipe(P.lit('validate'), P.then(type('preprintUuid', UuidC)), P.then(P.end)).parser,
      P.map(({ preprintUuid }) => movedPermanently(format(preprintReviewsUuidMatch.formatter, { uuid: preprintUuid }))),
    ),
  ],
  concatAll(P.getParserMonoid()),
)

export const legacyRoutes = pipe(route(legacyRouter, constant(new NotFound())), M.iflatten)

// https://github.com/gcanti/fp-ts-routing/pull/64
function type<K extends string, A>(k: K, type: C.Codec<string, string, A>): P.Match<{ [_ in K]: A }> {
  return new P.Match(
    new P.Parser(r => {
      if (r.parts.length === 0) {
        return O.none
      } else {
        const head = r.parts[0]
        const tail = r.parts.slice(1)
        return O.Functor.map(O.fromEither(type.decode(head)), a => tuple(singleton(k, a), new P.Route(tail, r.query)))
      }
    }),
    new P.Formatter((r, o) => new P.Route(r.parts.concat(type.encode(o[k])), r.query)),
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return
const singleton = <K extends string, V>(k: K, v: V): { [_ in K]: V } => ({ [k as any]: v } as any)
