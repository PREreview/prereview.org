import { type Doi, isDoi } from 'doi-ts'
import { Function, Option, Tuple, flow, pipe } from 'effect'
import * as P from 'fp-ts-routing'
import { concatAll } from 'fp-ts/lib/Monoid.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import type * as TE from 'fp-ts/lib/TaskEither.js'
import httpErrors from 'http-errors'
import type { ResponseEnded, StatusOpen } from 'hyper-ts'
import { route } from 'hyper-ts-routing'
import * as RM from 'hyper-ts/lib/ReaderMiddleware.js'
import * as C from 'io-ts/lib/Codec.js'
import * as D from 'io-ts/lib/Decoder.js'
import { match, P as p } from 'ts-pattern'
import type { Uuid } from 'uuid-ts'
import * as FptsToEffect from '../FptsToEffect.js'
import type { SupportedLocale } from '../locales/index.js'
import { movedPermanently, notFound, serviceUnavailable } from '../middleware.js'
import type { TemplatePageEnv } from '../page.js'
import type { PublicUrlEnv } from '../public-url.js'
import { preprintReviewsMatch, profileMatch, writeReviewReviewTypeMatch } from '../routes.js'
import {
  type ArxivPreprintId,
  type IndeterminatePreprintId,
  type PhilsciPreprintId,
  PreprintDoiD,
  fromPreprintDoi,
} from '../types/preprint-id.js'
import type { ProfileId } from '../types/profile-id.js'
import { UuidC } from '../types/uuid.js'
import type { GetUserOnboardingEnv } from '../user-onboarding.js'
import type { GetUserEnv } from '../user.js'

export type LegacyEnv = GetPreprintIdFromUuidEnv &
  GetProfileIdFromUuidEnv &
  GetUserEnv &
  GetUserOnboardingEnv &
  PublicUrlEnv &
  TemplatePageEnv & { locale: SupportedLocale }

export interface GetPreprintIdFromUuidEnv {
  getPreprintIdFromUuid: (uuid: Uuid) => TE.TaskEither<'not-found' | 'unavailable', IndeterminatePreprintId>
}

export interface GetProfileIdFromUuidEnv {
  getProfileIdFromUuid: (uuid: Uuid) => TE.TaskEither<'not-found' | 'unavailable', ProfileId>
}

const getPreprintIdFromUuid = (uuid: Uuid) =>
  RTE.asksReaderTaskEither(
    RTE.fromTaskEitherK(({ getPreprintIdFromUuid }: GetPreprintIdFromUuidEnv) => getPreprintIdFromUuid(uuid)),
  )

const getProfileIdFromUuid = (uuid: Uuid) =>
  RTE.asksReaderTaskEither(
    RTE.fromTaskEitherK(({ getProfileIdFromUuid }: GetProfileIdFromUuidEnv) => getProfileIdFromUuid(uuid)),
  )

const ArxivPreprintIdC = C.make(
  pipe(
    D.string,
    D.parse(s => {
      const [, match] = /^arxiv-([A-z0-9.+-]+?)(?:v[0-9]+)?$/i.exec(s) ?? []

      if (typeof match === 'string') {
        return D.success({ _tag: 'arxiv', value: `10.48550/arxiv.${match}` as Doi<'48550'> } satisfies ArxivPreprintId)
      }

      return D.failure(s, 'ID')
    }),
  ),
  {
    encode: id => `philsci-${id.value}`,
  },
)

const PreprintDoiC = C.make(
  pipe(
    D.string,
    D.parse(s => {
      const [, match] = /^doi-(.+)$/.exec(s) ?? []

      if (typeof match === 'string' && match.toLowerCase() === match) {
        return pipe(PreprintDoiD, D.map(fromPreprintDoi)).decode(match.replaceAll('-', '/').replaceAll('+', '-'))
      }

      return D.failure(s, 'DOI')
    }),
  ),
  {
    encode: id => `doi-${id.value.toLowerCase().replaceAll('-', '+').replaceAll('/', '-')}`,
  },
)

const PreprintPhilsciC = C.make(
  pipe(
    D.string,
    D.parse(s => {
      const [, match] = /^philsci-([1-9][0-9]*)$/.exec(s) ?? []

      if (typeof match === 'string') {
        return D.success({ _tag: 'philsci', value: parseInt(match, 10) } satisfies PhilsciPreprintId)
      }

      return D.failure(s, 'ID')
    }),
  ),
  {
    encode: id => `philsci-${id.value}`,
  },
)

// Unfortunately, there's no way to describe a union encoder, so we must implement it ourselves.
// Refs https://github.com/gcanti/io-ts/issues/625#issuecomment-1007478009
const PreprintIdC = C.make(D.union(PreprintDoiC, PreprintPhilsciC), {
  encode: id =>
    match(id)
      .with({ _tag: 'philsci' }, PreprintPhilsciC.encode)
      .with({ value: p.when(isDoi) }, PreprintDoiC.encode)
      .exhaustive(),
})

const legacyRouter: P.Parser<RM.ReaderMiddleware<LegacyEnv, StatusOpen, ResponseEnded, never, void>> = pipe(
  [
    pipe(
      pipe(P.lit('about'), P.then(type('personaUuid', UuidC)), P.then(P.end)).parser,
      P.map(({ personaUuid }) => redirectToProfile(personaUuid)),
    ),
    pipe(
      pipe(
        P.lit('preprints'),
        P.then(type('preprintId', PreprintIdC)),
        P.then(P.lit('write-a-prereview')),
        P.then(P.lit('already-written')),
        P.then(P.end),
      ).parser,
      P.map(
        RM.fromMiddlewareK(({ preprintId }) =>
          movedPermanently(P.format(writeReviewReviewTypeMatch.formatter, { id: preprintId })),
        ),
      ),
    ),
    pipe(
      pipe(P.lit('preprints'), P.then(type('preprintId', ArxivPreprintIdC)), P.then(P.end)).parser,
      P.map(
        RM.fromMiddlewareK(({ preprintId }) =>
          movedPermanently(P.format(preprintReviewsMatch.formatter, { id: preprintId })),
        ),
      ),
    ),
    pipe(
      pipe(P.lit('preprints'), P.then(type('uuid', UuidC)), P.then(P.end)).parser,
      P.map(({ uuid }) => redirectToPreprintReviews(uuid)),
    ),
    pipe(
      pipe(
        P.lit('preprints'),
        P.then(type('preprintUuid', UuidC)),
        P.then(P.lit('full-reviews')),
        P.then(P.str('reviewUuid')),
        P.then(P.end),
      ).parser,
      P.map(({ preprintUuid }) => redirectToPreprintReviews(preprintUuid)),
    ),
    pipe(
      pipe(P.lit('validate'), P.then(type('preprintUuid', UuidC)), P.then(P.end)).parser,
      P.map(({ preprintUuid }) => redirectToPreprintReviews(preprintUuid)),
    ),
  ],
  concatAll(P.getParserMonoid()),
)

export const legacyRoutes = pipe(
  route(legacyRouter, Function.constant(new httpErrors.NotFound())),
  RM.fromMiddleware,
  RM.iflatten,
)

const redirectToPreprintReviews = flow(
  RM.fromReaderTaskEitherK(getPreprintIdFromUuid),
  RM.ichainMiddlewareK(id => movedPermanently(P.format(preprintReviewsMatch.formatter, { id }))),
  RM.orElseW(error =>
    match(error)
      .with('not-found', () => notFound)
      .with('unavailable', () => serviceUnavailable)
      .exhaustive(),
  ),
)

const redirectToProfile = flow(
  RM.fromReaderTaskEitherK(getProfileIdFromUuid),
  RM.ichainMiddlewareK(profile => movedPermanently(P.format(profileMatch.formatter, { profile }))),
  RM.orElseW(error =>
    match(error)
      .with('not-found', () => notFound)
      .with('unavailable', () => serviceUnavailable)
      .exhaustive(),
  ),
)

function type<K extends string, A>(k: K, type: C.Codec<string, string, A>): P.Match<Record<K, A>> {
  return new P.Match(
    new P.Parser(r => {
      if (typeof r.parts[0] !== 'string') {
        return Option.none()
      } else {
        const head = r.parts[0]
        const tail = r.parts.slice(1)
        return Option.map(Option.getRight(FptsToEffect.either(type.decode(head))), a =>
          Tuple.make(singleton(k, a), new P.Route(tail, r.query)),
        )
      }
    }),
    new P.Formatter((r, o) => new P.Route(r.parts.concat(type.encode(o[k])), r.query)),
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return
const singleton = <K extends string, V>(k: K, v: V): Record<K, V> => ({ [k as any]: v }) as any
