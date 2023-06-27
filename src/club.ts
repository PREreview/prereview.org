import * as RTE from 'fp-ts/ReaderTaskEither'
import type * as TE from 'fp-ts/TaskEither'
import * as b from 'fp-ts/boolean'
import { flow, pipe } from 'fp-ts/function'
import { Status } from 'hyper-ts'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import { match } from 'ts-pattern'
import { canSeeClubs } from './feature-flags'
import { sendHtml } from './html'
import { notFound, serviceUnavailable } from './middleware'

export interface GetPrereviewsEnv {
  getPrereviews: (id: 'asapbio-metabolism') => TE.TaskEither<'unavailable', never>
}

const getPrereviews = (id: 'asapbio-metabolism') =>
  pipe(
    RTE.ask<GetPrereviewsEnv>(),
    RTE.chainTaskEitherK(({ getPrereviews }) => getPrereviews(id)),
  )

export const club = (id: 'asapbio-metabolism') =>
  pipe(
    RM.rightReader(canSeeClubs),
    RM.ichainW(
      b.match(
        () => notFound,
        () => showClubPage(id),
      ),
    ),
  )

const showClubPage = flow(
  RM.fromReaderTaskEitherK(getPrereviews),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareKW(sendHtml),
  RM.orElseW(error =>
    match(error)
      .with('unavailable', () => serviceUnavailable)
      .exhaustive(),
  ),
)
