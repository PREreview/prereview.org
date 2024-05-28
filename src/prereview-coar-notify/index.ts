import type * as F from 'fetch-fp-ts'
import type { FetchEnv } from 'fetch-fp-ts'
import * as RTE from 'fp-ts/ReaderTaskEither'
import * as RA from 'fp-ts/ReadonlyArray'
import { flow, identity, pipe } from 'fp-ts/function'
import type { LanguageCode } from 'iso-639-1'
import type { LoggerEnv } from 'logger-fp-ts'
import { match } from 'ts-pattern'
import type { SleepEnv } from '../fetch'
import type { RecentReviewRequest } from '../home-page'
import { type GetPreprintTitleEnv, getPreprintTitle } from '../preprint'
import type { ReviewRequestPreprintId } from '../review-request'
import type { ReviewRequests } from '../review-requests-page'
import type { FieldId } from '../types/field'
import type { GenerateUuidEnv } from '../types/uuid'
import type { User } from '../user'
import { constructCoarPayload } from './construct-coar-payload'
import { type RecentReviewRequestFromPrereviewCoarNotify, getRecentReviewRequests } from './get-recent-review-requests'
import { sendReviewActionOffer } from './send-review-action-offer'

export interface PrereviewCoarNotifyEnv {
  readonly coarNotifyUrl: URL
}

export const publishToPrereviewCoarNotifyInbox = (
  preprint: ReviewRequestPreprintId,
  user: User,
  persona: 'public' | 'pseudonym',
): RTE.ReaderTaskEither<F.FetchEnv & GenerateUuidEnv & PrereviewCoarNotifyEnv, 'unavailable', void> =>
  pipe(
    RTE.asks(({ coarNotifyUrl }: PrereviewCoarNotifyEnv) => coarNotifyUrl),
    RTE.chainReaderIOKW(coarNotifyUrl => constructCoarPayload({ coarNotifyUrl, preprint, user, persona })),
    RTE.chainW(sendReviewActionOffer),
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
  FetchEnv & GetPreprintTitleEnv & LoggerEnv & PrereviewCoarNotifyEnv & SleepEnv,
  'not-found' | 'unavailable',
  ReviewRequests
> =>
  pipe(
    RTE.asksReaderTaskEitherW(({ coarNotifyUrl }: PrereviewCoarNotifyEnv) => getRecentReviewRequests(coarNotifyUrl)),
    RTE.map(field ? RA.filter(request => request.fields.includes(field)) : identity),
    RTE.map(language ? RA.filter(request => request.language === language) : identity),
    RTE.map(RA.chunksOf(5)),
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
            RTE.fromOption(() => 'not-found' as const)(RA.lookup(page - 1, pages)),
            RTE.chainW(
              RTE.traverseReadonlyNonEmptyArrayWithIndex((_, { timestamp, preprint, fields, subfields }) =>
                pipe(
                  RTE.Do,
                  RTE.let('published', () => timestamp.toZonedDateTimeISO('UTC').toPlainDate()),
                  RTE.apS(
                    'preprint',
                    pipe(
                      getPreprintTitle(preprint),
                      RTE.mapLeft(error =>
                        match(error)
                          .with('not-found', () => 'unavailable' as const)
                          .otherwise(identity),
                      ),
                    ),
                  ),
                  RTE.let('fields', () => fields),
                  RTE.let('subfields', () => subfields),
                ),
              ),
            ),
          ),
        ),
      ),
    ),
  )

export const getRecentReviewRequestsFromPrereviewCoarNotify = (
  page: number,
): RTE.ReaderTaskEither<
  FetchEnv & GetPreprintTitleEnv & LoggerEnv & PrereviewCoarNotifyEnv & SleepEnv,
  'not-found' | 'unavailable',
  ReadonlyArray<RecentReviewRequest>
> =>
  pipe(
    RTE.asksReaderTaskEitherW(({ coarNotifyUrl }: PrereviewCoarNotifyEnv) => getRecentReviewRequests(coarNotifyUrl)),
    RTE.chainOptionKW(() => 'not-found' as const)(flow(RA.chunksOf(5), RA.lookup(page - 1))),
    RTE.chainW(
      RTE.traverseArray(({ timestamp, preprint, fields, subfields }: RecentReviewRequestFromPrereviewCoarNotify) =>
        pipe(
          RTE.Do,
          RTE.let('published', () => timestamp.toZonedDateTimeISO('UTC').toPlainDate()),
          RTE.apS(
            'preprint',
            pipe(
              getPreprintTitle(preprint),
              RTE.mapLeft(error =>
                match(error)
                  .with('not-found', () => 'unavailable' as const)
                  .otherwise(identity),
              ),
            ),
          ),
          RTE.let('fields', () => fields),
          RTE.let('subfields', () => subfields),
        ),
      ),
    ),
  )
