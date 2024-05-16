import type { Doi } from 'doi-ts'
import type * as F from 'fetch-fp-ts'
import type { FetchEnv } from 'fetch-fp-ts'
import * as RTE from 'fp-ts/ReaderTaskEither'
import * as RA from 'fp-ts/ReadonlyArray'
import { flow, identity, pipe } from 'fp-ts/function'
import type { LoggerEnv } from 'logger-fp-ts'
import { match } from 'ts-pattern'
import type { RecentReviewRequest } from '../home-page'
import { type GetPreprintTitleEnv, getPreprintTitle } from '../preprint'
import type { ReviewRequestPreprintId } from '../review-request'
import type { ReviewRequests } from '../review-requests-page'
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

export const getReviewRequestsFromPrereviewCoarNotify = (
  page: number,
): RTE.ReaderTaskEither<
  FetchEnv & GetPreprintTitleEnv & LoggerEnv & PrereviewCoarNotifyEnv,
  'not-found' | 'unavailable',
  ReviewRequests
> =>
  pipe(
    RTE.asksReaderTaskEitherW(({ coarNotifyUrl }: PrereviewCoarNotifyEnv) => getRecentReviewRequests(coarNotifyUrl)),
    RTE.map(RA.chunksOf(5)),
    RTE.chainW(pages =>
      pipe(
        RTE.Do,
        RTE.let('currentPage', () => page),
        RTE.let('totalPages', () => pages.length),
        RTE.apS(
          'reviewRequests',
          pipe(
            RTE.fromOption(() => 'not-found' as const)(RA.lookup(page - 1, pages)),
            RTE.chainW(
              RTE.traverseReadonlyNonEmptyArrayWithIndex((_, { timestamp, preprint }) =>
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
                  RTE.let('fields', () =>
                    preprint.value === ('10.1101/2023.06.12.544578' as Doi) ? ['13' as const, '24' as const] : [],
                  ),
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
  FetchEnv & GetPreprintTitleEnv & LoggerEnv & PrereviewCoarNotifyEnv,
  'not-found' | 'unavailable',
  ReadonlyArray<RecentReviewRequest>
> =>
  pipe(
    RTE.asksReaderTaskEitherW(({ coarNotifyUrl }: PrereviewCoarNotifyEnv) => getRecentReviewRequests(coarNotifyUrl)),
    RTE.chainOptionKW(() => 'not-found' as const)(flow(RA.chunksOf(5), RA.lookup(page - 1))),
    RTE.chainW(
      RTE.traverseArray(({ timestamp, preprint }: RecentReviewRequestFromPrereviewCoarNotify) =>
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
        ),
      ),
    ),
  )
