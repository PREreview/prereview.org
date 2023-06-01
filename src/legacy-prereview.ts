import { type Doi, isDoi } from 'doi-ts'
import * as F from 'fetch-fp-ts'
import * as E from 'fp-ts/Either'
import * as J from 'fp-ts/Json'
import * as O from 'fp-ts/Option'
import * as R from 'fp-ts/Reader'
import * as RTE from 'fp-ts/ReaderTaskEither'
import * as RA from 'fp-ts/ReadonlyArray'
import * as b from 'fp-ts/boolean'
import { constVoid, flow, identity, pipe } from 'fp-ts/function'
import { Status } from 'hyper-ts'
import * as D from 'io-ts/Decoder'
import { type Orcid, isOrcid } from 'orcid-id-ts'
import { get } from 'spectacles-ts'
import { match } from 'ts-pattern'
import { URL } from 'url'
import { type Uuid, isUuid } from 'uuid-ts'
import { revalidateIfStale, timeoutRequest, useStaleCache } from './fetch'
import { type PreprintId, parsePreprintDoi } from './preprint-id'
import { PseudonymC, isPseudonym } from './pseudonym'
import type { NewPrereview } from './write-review'

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

const OrcidD = D.fromRefinement(isOrcid, 'ORCID')

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

const UuidD = D.fromRefinement(isUuid, 'UUID')

const LegacyPrereviewPreprintD = pipe(
  JsonD,
  D.compose(
    D.struct({
      uuid: UuidD,
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

export const getPreprintIdFromLegacyPreviewUuid = flow(
  RTE.fromReaderK((uuid: Uuid) => legacyPrereviewUrl(`preprints/${uuid}`)),
  RTE.chainReaderK(flow(F.Request('GET'), addLegacyPrereviewApiHeaders)),
  RTE.chainW(F.send),
  RTE.local(useStaleCache()),
  RTE.local(timeoutRequest(2000)),
  RTE.filterOrElseW(F.hasStatus(Status.OK), identity),
  RTE.chainTaskEitherKW(F.decode(LegacyPrereviewPreprintUuidD)),
  RTE.mapLeft(error =>
    match(error)
      .with({ status: Status.NotFound }, () => 'not-found' as const)
      .otherwise(() => 'unavailable' as const),
  ),
  RTE.chainOptionK<'not-found' | 'unavailable'>(() => 'not-found')(flow(get('data.[0].handle'), parsePreprintDoi)),
)

const createUserOnLegacyPrereview = ({ orcid, name }: { orcid: Orcid; name: string }) =>
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
    RTE.filterOrElseW(F.hasStatus(Status.Created), identity),
    RTE.chainTaskEitherKW(F.decode(PseudonymC)),
    RTE.mapLeft(() => 'unavailable' as const),
  )

export const getPseudonymFromLegacyPrereview = (user: { orcid: Orcid; name: string }) =>
  pipe(
    RTE.fromReader(legacyPrereviewUrl(`users/${user.orcid}`)),
    RTE.chainReaderK(flow(F.Request('GET'), addLegacyPrereviewApiHeaders)),
    RTE.chainW(F.send),
    RTE.local(useStaleCache()),
    RTE.local(timeoutRequest(2000)),
    RTE.filterOrElseW(F.hasStatus(Status.OK), identity),
    RTE.chainTaskEitherKW(F.decode(LegacyPrereviewUserD)),
    RTE.chainOptionK(() => 'unknown-pseudonym' as unknown)(
      flow(get('data.personas'), RA.findFirst(get('isAnonymous')), O.map(get('name')), O.filter(isPseudonym)),
    ),
    RTE.orElse(error =>
      match(error)
        .with({ status: Status.NotFound }, () => createUserOnLegacyPrereview(user))
        .otherwise(() => RTE.left('unavailable' as const)),
    ),
  )

export const getRapidPreviewsFromLegacyPrereview = (id: Extract<PreprintId, { value: Doi }>) =>
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
    RTE.local(revalidateIfStale()),
    RTE.local(useStaleCache()),
    RTE.local(timeoutRequest(2000)),
    RTE.filterOrElseW(F.hasStatus(Status.OK), identity),
    RTE.chainTaskEitherKW(F.decode(LegacyRapidPrereviewsD)),
    RTE.map(
      flow(
        get('data'),
        RA.map(results => ({
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
        .with({ status: Status.NotFound }, () => RTE.right([]))
        .otherwise(() => RTE.left('unavailable' as const)),
    ),
  )

export type LegacyCompatibleNewPrereview = NewPrereview & { preprint: { id: Extract<PreprintId, { value: Doi }> } }

export const isLegacyCompatiblePreprint = (preprint: PreprintId): preprint is Extract<PreprintId, { value: Doi }> =>
  isDoi(preprint.value)

export const isLegacyCompatiblePrereview = (newPrereview: NewPrereview): newPrereview is LegacyCompatibleNewPrereview =>
  isLegacyCompatiblePreprint(newPrereview.preprint.id)

export const createPrereviewOnLegacyPrereview = (newPrereview: LegacyCompatibleNewPrereview) => (doi: Doi) =>
  pipe(
    shouldUpdate,
    R.chain(
      b.match(
        () => RTE.of(undefined),
        () =>
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
            RTE.filterOrElseW(F.hasStatus(Status.Created), identity),
            RTE.map(constVoid),
          ),
      ),
    ),
  )

const resolvePreprint = flow(
  RTE.fromReaderK((doi: Extract<PreprintId, { value: Doi }>['value']) =>
    legacyPrereviewUrl(`resolve?identifier=${doi}`),
  ),
  RTE.chainReaderK(flow(F.Request('GET'), addLegacyPrereviewApiHeaders)),
  RTE.chainW(F.send),
  RTE.filterOrElseW(F.hasStatus(Status.OK), identity),
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
