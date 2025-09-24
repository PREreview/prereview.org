import type { HttpClient } from '@effect/platform'
import type { Doi } from 'doi-ts'
import {
  Array,
  Boolean,
  Chunk,
  Context,
  Effect,
  identity,
  Option,
  pipe,
  type Redacted,
  Stream,
  Struct,
  Tuple,
} from 'effect'
import type * as F from 'fetch-fp-ts'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import type { LanguageCode } from 'iso-639-1'
import type { LoggerEnv } from 'logger-fp-ts'
import { match } from 'ts-pattern'
import * as Preprints from '../Preprints/index.ts'
import { type PreprintId, PreprintIdEquivalence } from '../Preprints/index.ts'
import { type PublicUrlEnv, toUrl } from '../public-url.ts'
import type { ReviewRequestPreprintId } from '../review-request.ts'
import {
  type ReviewRequests,
  ReviewRequestsAreUnavailable,
  ReviewRequestsNotFound,
} from '../review-requests-page/index.ts'
import { reviewMatch } from '../routes.ts'
import type { FieldId } from '../types/field.ts'
import { Uuid } from '../types/index.ts'
import type { User } from '../user.ts'
import type { NewPrereview } from '../write-review/index.ts'
import { constructCoarReviewActionOfferPayload } from './ConstructCoarReviewActionOfferPayload.ts'
import { getPageOfReviewRequests } from './GetPageOfReviewRequests.ts'
import { postNewPrereview } from './new-prereview.ts'
import { sendReviewActionOffer } from './SendReviewActionOffer.ts'

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

export const isReviewRequested = Effect.fn(function* (id: PreprintId) {
  const baseUrl = yield* Effect.andThen(PrereviewCoarNotifyConfig, Struct.get('coarNotifyUrl'))

  return yield* Stream.paginateEffect(1, page =>
    pipe(
      getPageOfReviewRequests(baseUrl, page),
      Effect.bindTo('requests'),
      Effect.let('isAMatch', ({ requests }) =>
        Array.some(requests, request => PreprintIdEquivalence(request.preprint, id)),
      ),
      Effect.andThen(({ isAMatch, requests }) =>
        isAMatch
          ? Tuple.make(true, Option.none<number>())
          : Tuple.make(false, Option.andThen(Option.fromIterable(requests), page + 1)),
      ),
    ),
  ).pipe(Stream.runCollect, Effect.andThen(Boolean.some))
})

export const getFirstPageOfReviewRequestsFromPrereviewCoarNotify: Effect.Effect<
  ReadonlyArray<ReviewRequests['reviewRequests'][number]>,
  ReviewRequestsNotFound | ReviewRequestsAreUnavailable,
  HttpClient.HttpClient | Preprints.Preprints | PrereviewCoarNotifyConfig
> = pipe(
  Effect.andThen(PrereviewCoarNotifyConfig, Struct.get('coarNotifyUrl')),
  Effect.andThen(getPageOfReviewRequests),
  Effect.andThen(Array.take(5)),
  Effect.andThen(
    Effect.forEach(
      ({ timestamp, preprint, fields, subfields }) =>
        pipe(
          Effect.Do,
          Effect.let('published', () => timestamp.toZonedDateTimeISO('UTC').toPlainDate()),
          Effect.bind('preprint', () =>
            Effect.mapError(Preprints.getPreprintTitle(preprint), cause => new ReviewRequestsAreUnavailable({ cause })),
          ),
          Effect.let('fields', () => fields),
          Effect.let('subfields', () => subfields),
        ),
      { concurrency: 'inherit' },
    ),
  ),
)

export const getReviewRequestsFromPrereviewCoarNotify = ({
  field,
  language,
  page,
}: {
  field?: FieldId
  language?: LanguageCode
  page: number
}): Effect.Effect<
  ReviewRequests,
  ReviewRequestsNotFound | ReviewRequestsAreUnavailable,
  HttpClient.HttpClient | Preprints.Preprints | PrereviewCoarNotifyConfig
> =>
  pipe(
    Effect.andThen(PrereviewCoarNotifyConfig, Struct.get('coarNotifyUrl')),
    Effect.andThen(baseUrl =>
      Stream.runCollect(
        Stream.paginateChunkEffect(1, page =>
          Effect.andThen(getPageOfReviewRequests(baseUrl, page), requests => [
            Chunk.fromIterable(requests),
            Option.andThen(Option.fromIterable(requests), page + 1),
          ]),
        ),
      ),
    ),
    Effect.andThen(field ? Chunk.filter(request => request.fields.includes(field)) : identity),
    Effect.andThen(language ? Chunk.filter(request => request.language === language) : identity),
    Effect.andThen(Array.chunksOf(5)),
    Effect.andThen(pages =>
      pipe(
        Effect.Do,
        Effect.let('currentPage', () => page),
        Effect.let('totalPages', () => pages.length),
        Effect.let('field', () => field),
        Effect.let('language', () => language),
        Effect.bind('reviewRequests', () =>
          pipe(
            Effect.mapError(Array.get(pages, page - 1), () => new ReviewRequestsNotFound({})),
            Effect.andThen(
              Effect.forEach(
                ({ timestamp, preprint, fields, subfields }) =>
                  pipe(
                    Effect.Do,
                    Effect.let('published', () => timestamp.toZonedDateTimeISO('UTC').toPlainDate()),
                    Effect.bind('preprint', () =>
                      Effect.mapError(
                        Preprints.getPreprintTitle(preprint),
                        cause => new ReviewRequestsAreUnavailable({ cause }),
                      ),
                    ),
                    Effect.let('fields', () => fields),
                    Effect.let('subfields', () => subfields),
                  ),
                { concurrency: 'inherit' },
              ),
            ),
          ),
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
