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
