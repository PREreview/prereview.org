import { Temporal } from '@js-temporal/polyfill'
import { isDoi } from 'doi-ts'
import { Array, Context, Option, type Redacted, Struct, flow, identity, pipe } from 'effect'
import * as F from 'fetch-fp-ts'
import * as E from 'fp-ts/lib/Either.js'
import * as J from 'fp-ts/lib/Json.js'
import * as R from 'fp-ts/lib/Reader.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import * as D from 'io-ts/lib/Decoder.js'
import { match } from 'ts-pattern'
import { URL } from 'url'
import { timeoutRequest, useStaleCache } from './fetch.ts'
import type { PreprintId, PreprintIdWithDoi } from './Preprints/index.ts'
import * as StatusCodes from './StatusCodes.ts'
import { type OrcidId, isOrcidId } from './types/OrcidId.ts'
import { PseudonymC, isPseudonym } from './types/Pseudonym.ts'

export class LegacyPrereviewApi extends Context.Tag('LegacyPrereviewApi')<
  LegacyPrereviewApi,
  { app: string; key: Redacted.Redacted; origin: URL }
>() {}

export interface LegacyPrereviewApiEnv {
  legacyPrereviewApi: {
    app: string
    key: string
    url: URL
  }
}

const JsonD = {
  decode: (s: string) =>
    pipe(
      J.parse(s),
      E.mapLeft(() => D.error(s, 'JSON')),
    ),
}

const OrcidD = D.fromRefinement(isOrcidId, 'ORCID')

const InstantD = pipe(
  D.string,
  D.parse(string =>
    E.tryCatch(
      () => Temporal.Instant.from(string),
      () => D.error(string, 'Instant'),
    ),
  ),
)

const LegacyPrereviewUsersD = pipe(
  JsonD,
  D.compose(
    D.struct({
      data: D.array(
        D.struct({
          orcid: OrcidD,
          createdAt: InstantD,
        }),
      ),
    }),
  ),
)

const LegacyPrereviewUserFullD = pipe(
  JsonD,
  D.compose(
    D.struct({
      data: D.struct({
        personas: D.array(
          D.struct({
            isAnonymous: D.boolean,
            name: D.string,
          }),
        ),
        createdAt: InstantD,
      }),
    }),
  ),
)

const RapidPrereviewAnswerD = pipe(
  D.literal('yes', 'unsure', 'N/A', 'no'),
  D.map(answer =>
    match(answer)
      .with('yes', identity)
      .with('unsure', identity)
      .with('N/A', () => 'na' as const)
      .with('no', identity)
      .exhaustive(),
  ),
)

const LegacyRapidPrereviewsD = pipe(
  JsonD,
  D.compose(
    D.struct({
      data: D.array(
        D.struct({
          author: pipe(
            D.struct({
              name: D.string,
            }),
            D.intersect(
              D.partial({
                orcid: OrcidD,
              }),
            ),
          ),
          ynNovel: RapidPrereviewAnswerD,
          ynFuture: RapidPrereviewAnswerD,
          ynReproducibility: RapidPrereviewAnswerD,
          ynMethods: RapidPrereviewAnswerD,
          ynCoherent: RapidPrereviewAnswerD,
          ynLimitations: RapidPrereviewAnswerD,
          ynEthics: RapidPrereviewAnswerD,
          ynNewData: RapidPrereviewAnswerD,
          ynRecommend: RapidPrereviewAnswerD,
          ynPeerReview: RapidPrereviewAnswerD,
          ynAvailableCode: RapidPrereviewAnswerD,
          ynAvailableData: RapidPrereviewAnswerD,
        }),
      ),
    }),
  ),
)

export const createUserOnLegacyPrereview = ({ orcid, name }: { orcid: OrcidId; name: string }) =>
  pipe(
    RTE.fromReader(legacyPrereviewUrl('users')),
    RTE.chainReaderK(
      flow(
        F.Request('POST'),
        F.setBody(JSON.stringify({ orcid, name }), 'application/json'),
        addLegacyPrereviewApiHeaders,
      ),
    ),
    RTE.chainW(F.send),
    RTE.local(timeoutRequest(2000)),
    RTE.filterOrElseW(F.hasStatus(StatusCodes.Created), identity),
    RTE.chainTaskEitherKW(F.decode(PseudonymC)),
    RTE.mapLeft(() => 'unavailable' as const),
  )

export const getUserFromLegacyPrereview = (orcid: OrcidId) =>
  pipe(
    RTE.fromReader(legacyPrereviewUrl(`users/${orcid}`)),
    RTE.chainReaderK(flow(F.Request('GET'), addLegacyPrereviewApiHeaders)),
    RTE.chainW(F.send),
    RTE.local(useStaleCache()),
    RTE.local(timeoutRequest(2000)),
    RTE.filterOrElseW(F.hasStatus(StatusCodes.OK), identity),
    RTE.chainTaskEitherKW(F.decode(LegacyPrereviewUserFullD)),
    RTE.map(({ data }) => data),
    RTE.chainOptionK(() => 'unknown-pseudonym' as unknown)(({ personas, createdAt }) =>
      pipe(
        Array.findFirst(personas, Struct.get('isAnonymous')),
        Option.map(Struct.get('name')),
        Option.filter(isPseudonym),
        Option.map(pseudonym => ({ pseudonym, createdAt, orcid })),
      ),
    ),
    RTE.mapLeft(error =>
      match(error)
        .with({ status: StatusCodes.NotFound }, () => 'not-found' as const)
        .otherwise(() => 'unavailable' as const),
    ),
  )

export const getUsersFromLegacyPrereview = () =>
  pipe(
    RTE.fromReader(legacyPrereviewUrl('users')),
    RTE.chainReaderK(flow(F.Request('GET'), addLegacyPrereviewApiHeaders)),
    RTE.chainW(F.send),
    RTE.local(timeoutRequest(5000)),
    RTE.filterOrElseW(F.hasStatus(StatusCodes.OK), identity),
    RTE.chainTaskEitherKW(F.decode(LegacyPrereviewUsersD)),
    RTE.bimap(
      () => 'unavailable' as const,
      flow(
        response => response.data,
        Array.map(user => ({ orcid: user.orcid, timestamp: user.createdAt })),
      ),
    ),
  )

export const getRapidPreviewsFromLegacyPrereview = (id: PreprintIdWithDoi) =>
  pipe(
    RTE.fromReader(
      legacyPrereviewUrl(
        `preprints/doi-${encodeURIComponent(
          id.value.toLowerCase().replaceAll('-', '+').replaceAll('/', '-'),
        )}/rapid-reviews`,
      ),
    ),
    RTE.chainReaderK(flow(F.Request('GET'), addLegacyPrereviewApiHeaders)),
    RTE.chainW(F.send),
    RTE.local(useStaleCache()),
    RTE.local(timeoutRequest(2000)),
    RTE.filterOrElseW(F.hasStatus(StatusCodes.OK), identity),
    RTE.chainTaskEitherKW(F.decode(LegacyRapidPrereviewsD)),
    RTE.map(
      flow(
        Struct.get('data'),
        Array.map(results => ({
          author: { name: results.author.name, orcid: results.author.orcid },
          questions: {
            availableCode: results.ynAvailableCode,
            availableData: results.ynAvailableData,
            coherent: results.ynCoherent,
            ethics: results.ynEthics,
            future: results.ynFuture,
            limitations: results.ynLimitations,
            methods: results.ynMethods,
            newData: results.ynNewData,
            novel: results.ynNovel,
            peerReview: results.ynPeerReview,
            recommend: results.ynRecommend,
            reproducibility: results.ynReproducibility,
          },
        })),
      ),
    ),
    RTE.orElseW(error =>
      match(error)
        .with({ status: StatusCodes.NotFound }, () => RTE.right([]))
        .otherwise(() => RTE.left('unavailable' as const)),
    ),
  )

export const isLegacyCompatiblePreprint = (preprint: PreprintId): preprint is PreprintIdWithDoi => isDoi(preprint.value)

function addLegacyPrereviewApiHeaders(request: F.Request) {
  return R.asks(({ legacyPrereviewApi: { app, key } }: LegacyPrereviewApiEnv) =>
    pipe(request, F.setHeaders({ 'X-API-App': app, 'X-API-Key': key })),
  )
}

const legacyPrereviewUrl = (path: string) =>
  R.asks(({ legacyPrereviewApi }: LegacyPrereviewApiEnv) => new URL(`/api/v2/${path}`, legacyPrereviewApi.url))
