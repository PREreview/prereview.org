import type { Doi } from 'doi-ts'
import { Array, Context, Effect, type Redacted, flow, identity, pipe } from 'effect'
import type * as F from 'fetch-fp-ts'
import type { FetchEnv } from 'fetch-fp-ts'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import type { LanguageCode } from 'iso-639-1'
import type { LoggerEnv } from 'logger-fp-ts'
import { match } from 'ts-pattern'
import * as FptsToEffect from '../FptsToEffect.js'
import type { RecentReviewRequest } from '../home-page/index.js'
import { type GetPreprintTitleEnv, getPreprintTitle } from '../preprint.js'
import { type PublicUrlEnv, toUrl } from '../public-url.js'
import type { ReviewRequestPreprintId } from '../review-request.js'
import {
  RecentReviewRequestsAreUnavailable,
  RecentReviewRequestsNotFound,
  type ReviewRequests,
} from '../review-requests-page/index.js'
import { reviewMatch } from '../routes.js'
import type { FieldId } from '../types/field.js'
import { Uuid } from '../types/index.js'
import { type PreprintId, PreprintIdEquivalence } from '../types/preprint-id.js'
import type { User } from '../user.js'
import type { NewPrereview } from '../write-review/index.js'
import { constructCoarReviewActionOfferPayload } from './ConstructCoarReviewActionOfferPayload.js'
import {
  type RecentReviewRequestFromPrereviewCoarNotify,
  getRecentReviewRequests,
} from './get-recent-review-requests.js'
import { postNewPrereview } from './new-prereview.js'
import { sendReviewActionOffer } from './SendReviewActionOffer.js'

export interface PrereviewCoarNotifyEnv {
  readonly coarNotifyToken: string
  readonly coarNotifyUrl: URL
}

export class PrereviewCoarNotifyConfig extends Context.Tag('PrereviewCoarNotifyConfig')<
  PrereviewCoarNotifyConfig,
  { coarNotifyToken: Redacted.Redacted; coarNotifyUrl: URL }
>() {}

export const publishReviewRequest = Effect.fn(function* (
  preprint: ReviewRequestPreprintId,
  user: User,
  persona: 'public' | 'pseudonym',
) {
  const uuid = yield* Uuid.generateUuid
  const coarNotifyConfig = yield* PrereviewCoarNotifyConfig

  return yield* pipe(
    {
      coarNotifyUrl: coarNotifyConfig.coarNotifyUrl,
      persona,
      preprint,
      user,
      uuid,
    },
    constructCoarReviewActionOfferPayload,
    Effect.succeed,
    Effect.andThen(sendReviewActionOffer),
  )
})

export const isReviewRequested = (id: PreprintId) =>
  pipe(
    RTE.asksReaderTaskEitherW(({ coarNotifyUrl }: PrereviewCoarNotifyEnv) => getRecentReviewRequests(coarNotifyUrl)),
    RTE.map(Array.some(request => PreprintIdEquivalence(request.preprint, id))),
  )

export const getReviewRequestsFromPrereviewCoarNotify = ({
  field,
  language,
  page,
}: {
  field?: FieldId
  language?: LanguageCode
  page: number
}): RTE.ReaderTaskEither<
  FetchEnv & GetPreprintTitleEnv & LoggerEnv & PrereviewCoarNotifyEnv,
  RecentReviewRequestsNotFound | RecentReviewRequestsAreUnavailable,
  ReviewRequests
> =>
  pipe(
    RTE.asksReaderTaskEitherW(({ coarNotifyUrl }: PrereviewCoarNotifyEnv) => getRecentReviewRequests(coarNotifyUrl)),
    RTE.map(field ? Array.filter(request => request.fields.includes(field)) : identity),
    RTE.map(language ? Array.filter(request => request.language === language) : identity),
    RTE.map(Array.chunksOf(5)),
    RTE.chainW(pages =>
      pipe(
        RTE.Do,
        RTE.let('currentPage', () => page),
        RTE.let('totalPages', () => pages.length),
        RTE.let('field', () => field),
        RTE.let('language', () => language),
        RTE.apS(
          'reviewRequests',
          pipe(
            RTE.fromOption(() => new RecentReviewRequestsNotFound({}))(Array.get(pages, page - 1)),
            RTE.chainW(
              RTE.traverseReadonlyNonEmptyArrayWithIndex((_, { timestamp, preprint, fields, subfields }) =>
                pipe(
                  RTE.Do,
                  RTE.let('published', () => timestamp.toZonedDateTimeISO('UTC').toPlainDate()),
                  RTE.apS(
                    'preprint',
                    pipe(
                      getPreprintTitle(preprint),
                      RTE.mapLeft(cause => new RecentReviewRequestsAreUnavailable({ cause })),
                    ),
                  ),
                  RTE.let('fields', () => fields),
                  RTE.let('subfields', () => subfields),
                ),
              ),
            ),
            RTE.map(FptsToEffect.array),
          ),
        ),
      ),
    ),
  )

export const getRecentReviewRequestsFromPrereviewCoarNotify = (
  page: number,
): RTE.ReaderTaskEither<
  FetchEnv & GetPreprintTitleEnv & LoggerEnv & PrereviewCoarNotifyEnv,
  RecentReviewRequestsNotFound | RecentReviewRequestsAreUnavailable,
  ReadonlyArray<RecentReviewRequest>
> =>
  pipe(
    RTE.asksReaderTaskEitherW(({ coarNotifyUrl }: PrereviewCoarNotifyEnv) => getRecentReviewRequests(coarNotifyUrl)),
    RTE.chainOptionKW(() => new RecentReviewRequestsNotFound({}))(flow(Array.chunksOf(5), Array.get(page - 1))),
    RTE.chainW(
      RTE.traverseArray(({ timestamp, preprint, fields, subfields }: RecentReviewRequestFromPrereviewCoarNotify) =>
        pipe(
          RTE.Do,
          RTE.let('published', () => timestamp.toZonedDateTimeISO('UTC').toPlainDate()),
          RTE.apS(
            'preprint',
            pipe(
              getPreprintTitle(preprint),
              RTE.mapLeft(cause => new RecentReviewRequestsAreUnavailable({ cause })),
            ),
          ),
          RTE.let('fields', () => fields),
          RTE.let('subfields', () => subfields),
        ),
      ),
    ),
  )

export const sendPrereviewToPrereviewCoarNotifyInbox = (
  newPrereview: NewPrereview,
  doi: Doi,
  id: number,
): RTE.ReaderTaskEither<F.FetchEnv & LoggerEnv & PrereviewCoarNotifyEnv & PublicUrlEnv, 'unavailable', void> =>
  pipe(
    RTE.Do,
    RTE.apS(
      'baseUrl',
      RTE.asks(({ coarNotifyUrl }: PrereviewCoarNotifyEnv) => coarNotifyUrl),
    ),
    RTE.apS(
      'apiToken',
      RTE.asks(({ coarNotifyToken }: PrereviewCoarNotifyEnv) => coarNotifyToken),
    ),
    RTE.apSW('prereviewUrl', RTE.rightReader(toUrl(reviewMatch.formatter, { id }))),
    RTE.let('newPrereview', ({ prereviewUrl }) => ({
      preprint: match(newPrereview.preprint.id)
        .with({ _tag: 'PhilsciPreprintId' }, () => ({}))
        .otherwise(id => ({ doi: id.value })),
      doi,
      url: prereviewUrl,
      author: match(newPrereview.persona)
        .with('public', () => ({ name: newPrereview.user.name }))
        .with('pseudonym', () => ({ name: newPrereview.user.pseudonym }))
        .exhaustive(),
    })),
    RTE.chainW(postNewPrereview),
  )
