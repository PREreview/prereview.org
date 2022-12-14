import * as RTE from 'fp-ts/ReaderTaskEither'
import { flow, pipe } from 'fp-ts/function'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import { match } from 'ts-pattern'
import { logInAndRedirect } from '../log-in'
import { notFound, serviceUnavailable } from '../middleware'
import { writeReviewStartMatch } from '../routes'
import { getUserFromSession } from '../user'
import { createForm, getForm, showNextForm } from './form'
import { getPreprint } from './preprint'

export const writeReviewStart = flow(
  RM.fromReaderTaskEitherK(getPreprint),
  RM.ichainW(preprint =>
    pipe(
      getUserFromSession(),
      RM.chainReaderTaskEitherKW(
        flow(
          user => getForm(user.orcid, preprint.doi),
          RTE.alt(() => RTE.of(createForm())),
        ),
      ),
      RM.ichainMiddlewareKW(showNextForm(preprint.doi)),
      RM.orElseW(() => logInAndRedirect(writeReviewStartMatch.formatter, { doi: preprint.doi })),
    ),
  ),
  RM.orElseW(error =>
    match(error)
      .with('not-found', () => notFound)
      .with('unavailable', () => serviceUnavailable)
      .exhaustive(),
  ),
)
