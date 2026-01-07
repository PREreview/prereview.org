import { Temporal } from '@js-temporal/polyfill'
import { type Doi, isDoi } from 'doi-ts'
import { Array, Boolean, Context, Function, Option, type Redacted, Struct, flow, identity, pipe } from 'effect'
import * as F from 'fetch-fp-ts'
import * as E from 'fp-ts/lib/Either.js'
import * as J from 'fp-ts/lib/Json.js'
import * as R from 'fp-ts/lib/Reader.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import * as D from 'io-ts/lib/Decoder.js'
import * as L from 'logger-fp-ts'
import { P, match } from 'ts-pattern'
import { URL } from 'url'
import type { Uuid } from 'uuid-ts'
import { timeoutRequest, useStaleCache } from './fetch.ts'
import {
  type IndeterminatePreprintIdWithDoi,
  type PreprintId,
  type PreprintIdWithDoi,
  parsePreprintDoi,
} from './Preprints/index.ts'
import * as StatusCodes from './StatusCodes.ts'
import { ProfileId } from './types/index.ts'
import { type OrcidId, isOrcidId } from './types/OrcidId.ts'
import { PseudonymC, isPseudonym } from './types/Pseudonym.ts'
import { UuidC } from './types/uuid.ts'
import type { NewPrereview } from './WebApp/write-review/index.ts' // eslint-disable-line import/no-internal-modules

export class LegacyPrereviewApi extends Context.Tag('LegacyPrereviewApi')<
  LegacyPrereviewApi,
  { app: string; key: Redacted.Redacted; origin: URL; update: boolean }
>() {}

export interface LegacyPrereviewApiEnv {
  legacyPrereviewApi: {
    app: string
    key: string
    url: URL
    update: boolean
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

const LegacyPrereviewUserD = pipe(
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

const LegacyPrereviewPreprintD = pipe(
  JsonD,
  D.compose(
    D.struct({
      uuid: UuidC,
    }),
  ),
)

const LegacyPrereviewPreprintUuidD = pipe(
  JsonD,
  D.compose(
    D.struct({
      data: D.tuple(
        D.struct({
          handle: D.string,
        }),
      ),
    }),
  ),
)

const LegacyPrereviewProfileUuidD = pipe(
  JsonD,
  D.compose(
    D.struct({
      data: D.tuple(
        D.union(
          D.struct({
            isAnonymous: D.literal(false),
            orcid: OrcidD,
          }),
          D.struct({
            isAnonymous: D.literal(true),
            name: PseudonymC,
          }),
        ),
      ),
    }),
  ),
)

export const getPreprintIdFromLegacyPreviewUuid: (
  uuid: Uuid,
) => RTE.ReaderTaskEither<
  LegacyPrereviewApiEnv & F.FetchEnv,
  'not-found' | 'unavailable',
  IndeterminatePreprintIdWithDoi
> = flow(
  RTE.fromReaderK((uuid: Uuid) => legacyPrereviewUrl(`preprints/${uuid}`)),
  RTE.chainReaderK(flow(F.Request('GET'), addLegacyPrereviewApiHeaders)),
  RTE.chainW(F.send),
  RTE.local(useStaleCache()),
  RTE.local(timeoutRequest(2000)),
  RTE.filterOrElseW(F.hasStatus(StatusCodes.OK), identity),
  RTE.chainTaskEitherKW(F.decode(LegacyPrereviewPreprintUuidD)),
  RTE.mapLeft(error =>
    match(error)
      .with({ status: StatusCodes.NotFound }, () => 'not-found' as const)
      .otherwise(() => 'unavailable' as const),
  ),
  RTE.chainOptionK<'not-found' | 'unavailable'>(() => 'not-found')(
    flow(({ data }) => data[0].handle, parsePreprintDoi),
  ),
)

export const getProfileIdFromLegacyPreviewUuid: (
  uuid: Uuid,
) => RTE.ReaderTaskEither<LegacyPrereviewApiEnv & F.FetchEnv, 'not-found' | 'unavailable', ProfileId.ProfileId> = flow(
  RTE.fromReaderK((uuid: Uuid) => legacyPrereviewUrl(`personas/${uuid}`)),
  RTE.chainReaderK(flow(F.Request('GET'), addLegacyPrereviewApiHeaders)),
  RTE.chainW(F.send),
  RTE.local(useStaleCache()),
  RTE.local(timeoutRequest(2000)),
  RTE.filterOrElseW(F.hasStatus(StatusCodes.OK), identity),
  RTE.chainTaskEitherKW(F.decode(LegacyPrereviewProfileUuidD)),
  RTE.bimap(
    error =>
      match(error)
        .with({ status: StatusCodes.NotFound }, () => 'not-found' as const)
        .otherwise(() => 'unavailable' as const),
    ({ data: [data] }) =>
      match(data)
        .with({ isAnonymous: false, orcid: P.select() }, ProfileId.forOrcid)
        .with({ isAnonymous: true, name: P.select() }, ProfileId.forPseudonym)
        .exhaustive(),
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

export const getPseudonymFromLegacyPrereview = (orcid: OrcidId) =>
  pipe(
    RTE.fromReader(legacyPrereviewUrl(`users/${orcid}`)),
    RTE.chainReaderK(flow(F.Request('GET'), addLegacyPrereviewApiHeaders)),
    RTE.chainW(F.send),
    RTE.local(useStaleCache()),
    RTE.local(timeoutRequest(2000)),
    RTE.filterOrElseW(F.hasStatus(StatusCodes.OK), identity),
    RTE.chainTaskEitherKW(F.decode(LegacyPrereviewUserD)),
    RTE.chainOptionK(() => 'unknown-pseudonym' as unknown)(
      flow(
        ({ data }) => Array.findFirst(data.personas, Struct.get('isAnonymous')),
        Option.map(Struct.get('name')),
        Option.filter(isPseudonym),
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

export type LegacyCompatibleNewPrereview = NewPrereview & { preprint: { id: PreprintIdWithDoi } }

export const isLegacyCompatiblePreprint = (preprint: PreprintId): preprint is PreprintIdWithDoi => isDoi(preprint.value)

export const isLegacyCompatiblePrereview = (newPrereview: NewPrereview): newPrereview is LegacyCompatibleNewPrereview =>
  isLegacyCompatiblePreprint(newPrereview.preprint.id)

export const createPrereviewOnLegacyPrereview = (newPrereview: LegacyCompatibleNewPrereview) => (doi: Doi) =>
  pipe(
    shouldUpdate,
    R.chain(
      Boolean.match({
        onFalse: () => RTE.of(undefined),
        onTrue: () =>
          pipe(
            resolvePreprint(newPrereview.preprint.id.value),
            RTE.chainReaderKW(preprint =>
              pipe(
                legacyPrereviewUrl('full-reviews'),
                R.chain(
                  flow(
                    F.Request('POST'),
                    F.setBody(
                      JSON.stringify({
                        preprint: preprint.uuid,
                        doi,
                        authors: [{ orcid: newPrereview.user.orcid, public: newPrereview.persona === 'public' }],
                        isPublished: true,
                        contents: newPrereview.review.toString(),
                      }),
                      'application/json',
                    ),
                    addLegacyPrereviewApiHeaders,
                  ),
                ),
              ),
            ),
            RTE.chainW(F.send),
            RTE.local(timeoutRequest(5000)),
            RTE.filterOrElseW(F.hasStatus(StatusCodes.Created), identity),
            RTE.orElseFirstW(
              RTE.fromReaderIOK(
                flow(
                  error => ({
                    error: match(error)
                      .with(P.instanceOf(Error), error => error.message)
                      .with({ status: P.number }, response => `${response.status} ${response.statusText}`)
                      .with({ _tag: P.string }, D.draw)
                      .exhaustive(),
                  }),
                  L.errorP('Failed to create PREreview on the legacy site'),
                ),
              ),
            ),
            RTE.bimap(() => 'unavailable' as const, Function.constVoid),
          ),
      }),
    ),
  )

const resolvePreprint = flow(
  RTE.fromReaderK((doi: PreprintIdWithDoi['value']) => legacyPrereviewUrl(`resolve?identifier=${doi}`)),
  RTE.chainReaderK(flow(F.Request('GET'), addLegacyPrereviewApiHeaders)),
  RTE.chainW(F.send),
  RTE.local(timeoutRequest(5000)),
  RTE.filterOrElseW(F.hasStatus(StatusCodes.OK), identity),
  RTE.chainTaskEitherKW(F.decode(LegacyPrereviewPreprintD)),
)

function addLegacyPrereviewApiHeaders(request: F.Request) {
  return R.asks(({ legacyPrereviewApi: { app, key } }: LegacyPrereviewApiEnv) =>
    pipe(request, F.setHeaders({ 'X-API-App': app, 'X-API-Key': key })),
  )
}

const legacyPrereviewUrl = (path: string) =>
  R.asks(({ legacyPrereviewApi }: LegacyPrereviewApiEnv) => new URL(`/api/v2/${path}`, legacyPrereviewApi.url))

const shouldUpdate = R.asks(({ legacyPrereviewApi }: LegacyPrereviewApiEnv) => legacyPrereviewApi.update)
