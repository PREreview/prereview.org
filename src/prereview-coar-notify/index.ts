import type * as F from 'fetch-fp-ts'
import type { FetchEnv } from 'fetch-fp-ts'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { identity, pipe } from 'fp-ts/function'
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

const hardcodedCoarNotifyUrl = 'https://coar-notify-sandbox.prereview.org'

export const publishToPrereviewCoarNotifyInbox = (
  preprint: ReviewRequestPreprintId,
  user: User,
  persona: 'public' | 'pseudonym',
): RTE.ReaderTaskEither<F.FetchEnv & GenerateUuidEnv, 'unavailable', void> =>
  pipe(
    { coarNotifyUrl: hardcodedCoarNotifyUrl, preprint, user, persona },
    constructCoarPayload,
    RTE.rightReaderIO,
    RTE.chainW(sendReviewActionOffer),
  )

export const getRecentReviewRequestsFromPrereviewCoarNotify = (): RTE.ReaderTaskEither<
  FetchEnv & GetPreprintTitleEnv & LoggerEnv,
  'unavailable',
  ReadonlyArray<RecentReviewRequest>
> =>
  pipe(
    getRecentReviewRequests(hardcodedCoarNotifyUrl),
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
