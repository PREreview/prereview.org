import { Option, Tuple, flow, pipe } from 'effect'
import * as P from 'fp-ts-routing'
import { concatAll } from 'fp-ts/lib/Monoid.js'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import type * as TE from 'fp-ts/lib/TaskEither.js'
import type * as C from 'io-ts/lib/Codec.js'
import { match } from 'ts-pattern'
import type { Uuid } from 'uuid-ts'
import * as FptsToEffect from '../../FptsToEffect.ts'
import { havingProblemsPage, pageNotFound } from '../../http-error.ts'
import type { SupportedLocale } from '../../locales/index.ts'
import type { IndeterminatePreprintId } from '../../Preprints/index.ts'
import { type PageResponse, RedirectResponse } from '../../Response/index.ts'
import { preprintReviewsMatch, profileMatch } from '../../routes.ts'
import * as StatusCodes from '../../StatusCodes.ts'
import type { ProfileId } from '../../types/profile-id.ts'
import { UuidC } from '../../types/uuid.ts'

export type LegacyEnv = GetPreprintIdFromUuidEnv & GetProfileIdFromUuidEnv & { locale: SupportedLocale }

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

export const legacyRouter: P.Parser<RT.ReaderTask<LegacyEnv, PageResponse | RedirectResponse>> = pipe(
  [
    pipe(
      pipe(P.lit('about'), P.then(type('personaUuid', UuidC)), P.then(P.end)).parser,
      P.map(({ personaUuid }) => redirectToProfile(personaUuid)),
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

export const legacyRoutes: (url: string) => RT.ReaderTask<LegacyEnv, Option.Option<PageResponse | RedirectResponse>> =
  flow(
    Option.liftThrowable(url => P.Route.parse(url)),
    Option.andThen(FptsToEffect.optionK(legacyRouter.run)),
    Option.match({
      onNone: () => RT.of(Option.none()),
      onSome: ([response]) => pipe(response, RT.map(Option.some)),
    }),
  )

const redirectToPreprintReviews = flow(
  getPreprintIdFromUuid,
  RTE.matchEW(
    error =>
      RT.asks(({ locale }: { locale: SupportedLocale }) =>
        match(error)
          .with('not-found', () => pageNotFound(locale))
          .with('unavailable', () => havingProblemsPage(locale))
          .exhaustive(),
      ),
    id =>
      RT.of(
        RedirectResponse({
          status: StatusCodes.MovedPermanently,
          location: P.format(preprintReviewsMatch.formatter, { id }),
        }),
      ),
  ),
)

const redirectToProfile = flow(
  getProfileIdFromUuid,
  RTE.matchEW(
    error =>
      RT.asks(({ locale }: { locale: SupportedLocale }) =>
        match(error)
          .with('not-found', () => pageNotFound(locale))
          .with('unavailable', () => havingProblemsPage(locale))
          .exhaustive(),
      ),
    profile =>
      RT.of(
        RedirectResponse({
          status: StatusCodes.MovedPermanently,
          location: P.format(profileMatch.formatter, { profile }),
        }),
      ),
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
