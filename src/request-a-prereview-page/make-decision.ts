import * as E from 'fp-ts/Either'
import type { Reader } from 'fp-ts/Reader'
import * as RT from 'fp-ts/ReaderTask'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { flow, identity, pipe } from 'fp-ts/function'
import { P, match } from 'ts-pattern'
import { type CanRequestReviewsEnv, canRequestReviews } from '../feature-flags'
import * as Preprint from '../preprint'
import * as ReviewRequest from '../review-request'
import * as PreprintId from '../types/preprint-id'
import type { User } from '../user'
import * as Decision from './decision'
import * as Form from './form'

export type Env = EnvFor<ReturnType<typeof makeDecision>>

export const makeDecision = ({
  body,
  method,
  user,
}: {
  body: unknown
  method: string
  user?: User
}): RT.ReaderTask<CanRequestReviewsEnv & Preprint.ResolvePreprintIdEnv, Decision.Decision> =>
  pipe(
    user,
    RTE.fromNullable(Decision.RequireLogIn),
    RTE.chainFirstW(
      flow(
        RTE.fromReaderK(user => canRequestReviews(user)),
        RTE.filterOrElse(
          canRequestReviews => canRequestReviews,
          () => Decision.DenyAccess,
        ),
      ),
    ),
    RTE.filterOrElseW(
      () => method === 'POST',
      () => Decision.ShowForm(Form.UnsubmittedForm),
    ),
    RTE.chainEitherKW(() => pipe(Form.fromBody(body), E.mapLeft(Decision.ShowForm))),
    RTE.matchEW(RT.of, handleForm),
  )

const handleForm = flow(
  RTE.fromEitherK((form: Form.ValidForm) =>
    match(form.value)
      .returnType<E.Either<Decision.Decision, PreprintId.IndeterminatePreprintId>>()
      .with(P.string, E.fromOptionK(() => Decision.ShowUnsupportedDoi)(PreprintId.parsePreprintDoi))
      .with(P.instanceOf(URL), E.fromOptionK(() => Decision.ShowUnsupportedUrl)(PreprintId.fromUrl))
      .exhaustive(),
  ),
  RTE.chainW(preprintId =>
    pipe(
      Preprint.resolvePreprintId(preprintId),
      RTE.mapLeft(error =>
        match(error)
          .with('not-a-preprint', () => Decision.ShowNotAPreprint)
          .with('not-found', () => Decision.ShowUnknownPreprint(preprintId))
          .with('unavailable', () => Decision.ShowError)
          .exhaustive(),
      ),
    ),
  ),
  RTE.filterOrElseW(ReviewRequest.isReviewRequestPreprintId, Decision.ShowUnsupportedPreprint),
  RTE.match(identity, Decision.BeginFlow),
)

type EnvFor<T> = T extends Reader<infer R, unknown> ? R : never
