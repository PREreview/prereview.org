import { Doi } from 'doi-ts'
import * as F from 'fetch-fp-ts'
import * as E from 'fp-ts/Either'
import * as J from 'fp-ts/Json'
import * as R from 'fp-ts/Reader'
import * as RTE from 'fp-ts/ReaderTaskEither'
import * as TE from 'fp-ts/TaskEither'
import * as b from 'fp-ts/boolean'
import { constVoid, flow, identity, pipe } from 'fp-ts/function'
import { Status } from 'hyper-ts'
import * as D from 'io-ts/Decoder'
import { Orcid } from 'orcid-id-ts'
import { get } from 'spectacles-ts'
import { match } from 'ts-pattern'
import { URL } from 'url'
import { isUuid } from 'uuid-ts'
import { PreprintId } from './preprint-id'
import { NewPrereview } from './write-review'

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

const LegacyPrereviewUserD = pipe(
  JsonD,
  D.compose(
    D.struct({
      data: D.struct({
        personas: D.tuple(
          D.struct({
            isAnonymous: D.literal(true),
            name: D.string,
          }),
        ),
      }),
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

export const getPseudonymFromLegacyPrereview = flow(
  RTE.fromReaderK((orcid: Orcid) => legacyPrereviewUrl(`users/${orcid}`)),
  RTE.chainReaderK(flow(F.Request('GET'), addLegacyPrereviewApiHeaders)),
  RTE.chainW(F.send),
  RTE.filterOrElseW(F.hasStatus(Status.OK), identity),
  RTE.chainTaskEitherKW(F.decode(LegacyPrereviewUserD)),
  RTE.bimap(
    error =>
      match(error)
        .with({ status: Status.NotFound }, () => 'no-pseudonym' as const)
        .otherwise(identity),
    get('data.personas.[0].name'),
  ),
)

export const getRapidPreviewsFromLegacyPrereview = (id: PreprintId) =>
  id.doi === ('10.1101/2022.02.14.480364' as Doi)
    ? TE.right([
        {
          novel: 'yes',
          future: 'yes',
          reproducibility: 'yes',
          methods: 'yes',
          coherent: 'yes',
          limitations: 'yes',
          ethics: 'na',
          newData: 'yes',
          recommend: 'yes',
          peerReview: 'yes',
          availableCode: 'na',
          availableData: 'na',
        },
        {
          novel: 'yes',
          future: 'yes',
          reproducibility: 'unsure',
          methods: 'unsure',
          coherent: 'yes',
          limitations: 'unsure',
          ethics: 'yes',
          newData: 'yes',
          recommend: 'yes',
          peerReview: 'yes',
          availableCode: 'no',
          availableData: 'no',
        },
        {
          novel: 'unsure',
          future: 'yes',
          reproducibility: 'unsure',
          methods: 'yes',
          coherent: 'yes',
          limitations: 'no',
          ethics: 'na',
          newData: 'yes',
          recommend: 'yes',
          peerReview: 'yes',
          availableCode: 'no',
          availableData: 'yes',
        },
        {
          novel: 'yes',
          future: 'yes',
          reproducibility: 'unsure',
          methods: 'unsure',
          coherent: 'yes',
          limitations: 'no',
          ethics: 'no',
          newData: 'yes',
          recommend: 'yes',
          peerReview: 'yes',
          availableCode: 'na',
          availableData: 'unsure',
        },
        {
          novel: 'yes',
          future: 'yes',
          reproducibility: 'unsure',
          methods: 'yes',
          coherent: 'yes',
          limitations: 'na',
          ethics: 'no',
          newData: 'yes',
          recommend: 'no',
          peerReview: 'yes',
          availableCode: 'na',
          availableData: 'na',
        },
        {
          novel: 'yes',
          future: 'yes',
          reproducibility: 'unsure',
          methods: 'yes',
          coherent: 'yes',
          limitations: 'no',
          ethics: 'no',
          newData: 'yes',
          recommend: 'yes',
          peerReview: 'yes',
          availableCode: 'na',
          availableData: 'na',
        },
        {
          novel: 'yes',
          future: 'yes',
          reproducibility: 'unsure',
          methods: 'na',
          coherent: 'yes',
          limitations: 'no',
          ethics: 'no',
          newData: 'yes',
          recommend: 'yes',
          peerReview: 'yes',
          availableCode: 'no',
          availableData: 'yes',
        },
        {
          novel: 'yes',
          future: 'yes',
          reproducibility: 'yes',
          methods: 'yes',
          coherent: 'yes',
          limitations: 'no',
          ethics: 'no',
          newData: 'yes',
          recommend: 'yes',
          peerReview: 'yes',
          availableCode: 'yes',
          availableData: 'unsure',
        },
        {
          novel: 'unsure',
          future: 'yes',
          reproducibility: 'unsure',
          methods: 'unsure',
          coherent: 'yes',
          limitations: 'no',
          ethics: 'no',
          newData: 'yes',
          recommend: 'yes',
          peerReview: 'yes',
          availableCode: 'na',
          availableData: 'no',
        },
        {
          novel: 'yes',
          future: 'yes',
          reproducibility: 'no',
          methods: 'unsure',
          coherent: 'yes',
          limitations: 'no',
          ethics: 'no',
          newData: 'yes',
          recommend: 'unsure',
          peerReview: 'yes',
          availableCode: 'no',
          availableData: 'no',
        },
        {
          novel: 'yes',
          future: 'yes',
          reproducibility: 'unsure',
          methods: 'yes',
          coherent: 'yes',
          limitations: 'no',
          ethics: 'yes',
          newData: 'yes',
          recommend: 'yes',
          peerReview: 'yes',
          availableCode: 'unsure',
          availableData: 'unsure',
        },
        {
          novel: 'yes',
          future: 'yes',
          reproducibility: 'yes',
          methods: 'yes',
          coherent: 'yes',
          limitations: 'no',
          ethics: 'no',
          newData: 'yes',
          recommend: 'yes',
          peerReview: 'yes',
          availableCode: 'no',
          availableData: 'no',
        },
        {
          novel: 'yes',
          future: 'yes',
          reproducibility: 'unsure',
          methods: 'yes',
          coherent: 'yes',
          limitations: 'no',
          ethics: 'no',
          newData: 'yes',
          recommend: 'yes',
          peerReview: 'yes',
          availableCode: 'na',
          availableData: 'unsure',
        },
        {
          novel: 'yes',
          future: 'yes',
          reproducibility: 'yes',
          methods: 'yes',
          coherent: 'no',
          limitations: 'no',
          ethics: 'yes',
          newData: 'yes',
          recommend: 'yes',
          peerReview: 'yes',
          availableCode: 'yes',
          availableData: 'yes',
        },
        {
          novel: 'yes',
          future: 'yes',
          reproducibility: 'unsure',
          methods: 'yes',
          coherent: 'yes',
          limitations: 'unsure',
          ethics: 'unsure',
          newData: 'yes',
          recommend: 'yes',
          peerReview: 'yes',
          availableCode: 'na',
          availableData: 'na',
        },
        {
          novel: 'yes',
          future: 'yes',
          reproducibility: 'yes',
          methods: 'yes',
          coherent: 'yes',
          limitations: 'no',
          ethics: 'no',
          newData: 'yes',
          recommend: 'yes',
          peerReview: 'yes',
          availableCode: 'no',
          availableData: 'unsure',
        },
        {
          novel: 'yes',
          future: 'yes',
          reproducibility: 'no',
          methods: 'yes',
          coherent: 'yes',
          limitations: 'no',
          ethics: 'yes',
          newData: 'yes',
          recommend: 'yes',
          peerReview: 'yes',
          availableCode: 'na',
          availableData: 'na',
        },
        {
          novel: 'yes',
          future: 'yes',
          reproducibility: 'yes',
          methods: 'yes',
          coherent: 'yes',
          limitations: 'no',
          ethics: 'no',
          newData: 'yes',
          recommend: 'yes',
          peerReview: 'yes',
          availableCode: 'no',
          availableData: 'no',
        },
        {
          novel: 'unsure',
          future: 'yes',
          reproducibility: 'yes',
          methods: 'yes',
          coherent: 'unsure',
          limitations: 'no',
          ethics: 'no',
          newData: 'unsure',
          recommend: 'no',
          peerReview: 'yes',
          availableCode: 'unsure',
          availableData: 'unsure',
        },
      ] as const)
    : TE.right([])

export const createPrereviewOnLegacyPrereview = (newPrereview: NewPrereview) => (doi: Doi) =>
  pipe(
    shouldUpdate,
    R.chain(
      b.match(
        () => RTE.of(undefined),
        () =>
          pipe(
            resolvePreprint(newPrereview.preprint.doi),
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
  RTE.fromReaderK((doi: PreprintId['doi']) => legacyPrereviewUrl(`resolve?identifier=${doi}`)),
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
