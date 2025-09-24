import { Doi, isDoi } from 'doi-ts'
import { Option, Tuple, flow, pipe } from 'effect'
import * as P from 'fp-ts-routing'
import { concatAll } from 'fp-ts/lib/Monoid.js'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import type * as TE from 'fp-ts/lib/TaskEither.js'
import httpErrors from 'http-errors'
import * as C from 'io-ts/lib/Codec.js'
import * as D from 'io-ts/lib/Decoder.js'
import { match, P as p } from 'ts-pattern'
import type { Uuid } from 'uuid-ts'
import * as FptsToEffect from '../FptsToEffect.ts'
import { havingProblemsPage, pageNotFound } from '../http-error.ts'
import type { SupportedLocale } from '../locales/index.ts'
import {
  ArxivPreprintId,
  type IndeterminatePreprintId,
  PhilsciPreprintId,
  PreprintDoiD,
  fromPreprintDoi,
} from '../Preprints/index.ts'
import { type PageResponse, RedirectResponse } from '../response.ts'
import { preprintReviewsMatch, profileMatch, writeReviewReviewTypeMatch } from '../routes.ts'
import * as StatusCodes from '../StatusCodes.ts'
import type { ProfileId } from '../types/profile-id.ts'
import { UuidC } from '../types/uuid.ts'

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

const ArxivPreprintIdC = C.make(
  pipe(
    D.string,
    D.parse(s => {
      const [, match] = /^arxiv-([A-z0-9.+-]+?)(?:v[0-9]+)?$/i.exec(s) ?? []

      if (typeof match === 'string') {
        return D.success(new ArxivPreprintId({ value: Doi(`10.48550/arxiv.${match}`) }))
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
        return D.success(new PhilsciPreprintId({ value: parseInt(match, 10) }))
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
      .with({ _tag: 'PhilsciPreprintId' }, PreprintPhilsciC.encode)
      .with({ value: p.when(isDoi) }, PreprintDoiC.encode)
      .exhaustive(),
})

const legacyRouter: P.Parser<RT.ReaderTask<LegacyEnv, PageResponse | RedirectResponse>> = pipe(
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
      P.map(({ preprintId }) =>
        RT.of(
          RedirectResponse({
            status: StatusCodes.MovedPermanently,
            location: P.format(writeReviewReviewTypeMatch.formatter, { id: preprintId }),
          }),
        ),
      ),
    ),
    pipe(
      pipe(P.lit('preprints'), P.then(type('preprintId', ArxivPreprintIdC)), P.then(P.end)).parser,
      P.map(({ preprintId }) =>
        RT.of(
          RedirectResponse({
            status: StatusCodes.MovedPermanently,
            location: P.format(preprintReviewsMatch.formatter, { id: preprintId }),
          }),
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

export const legacyRoutes: (
  url: string,
) => RTE.ReaderTaskEither<
  LegacyEnv,
  httpErrors.HttpError<typeof StatusCodes.NotFound>,
  PageResponse | RedirectResponse
> = flow(
  Option.liftThrowable(url => P.Route.parse(url)),
  Option.andThen(FptsToEffect.optionK(legacyRouter.run)),
  Option.match({
    onNone: () => RTE.left(new httpErrors.NotFound()),
    onSome: ([response]) => RTE.rightReaderTask(response),
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
