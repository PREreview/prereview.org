import * as E from 'fp-ts/Either'
import type { Reader } from 'fp-ts/Reader'
import * as R from 'fp-ts/Reader'
import type * as RE from 'fp-ts/ReaderEither'
import type * as RT from 'fp-ts/ReaderTask'
import * as RTE from 'fp-ts/ReaderTaskEither'
import * as b from 'fp-ts/boolean'
import { flow, identity, pipe } from 'fp-ts/function'
import { P, match } from 'ts-pattern'
import { type CanRequestReviewsEnv, canRequestReviews } from '../feature-flags.js'
import * as Preprint from '../preprint.js'
import * as ReviewRequest from '../review-request.js'
import * as PreprintId from '../types/preprint-id.js'
import type { User } from '../user.js'
import * as Decision from './decision.js'
import * as Form from './form.js'

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
    RTE.fromReaderEitherK(ensureUserCanRequestReviews),
    RTE.filterOrElseW(
      () => method === 'POST',
      () => Decision.ShowEmptyForm,
    ),
    RTE.chainEitherKW(() => extractPreprintId(body)),
    RTE.chainW(resolvePreprintId),
    RTE.filterOrElseW(ReviewRequest.isReviewRequestPreprintId, Decision.ShowUnsupportedPreprint),
    RTE.matchW(identity, Decision.BeginFlow),
  )

const resolvePreprintId = (
  preprintId: PreprintId.IndeterminatePreprintId,
): RTE.ReaderTaskEither<
  Preprint.ResolvePreprintIdEnv,
  Decision.ShowNotAPreprint | Decision.ShowUnknownPreprint | Decision.ShowError,
  PreprintId.PreprintId
> =>
  pipe(
    Preprint.resolvePreprintId(preprintId),
    RTE.mapLeft(error =>
      match(error)
        .with('not-a-preprint', () => Decision.ShowNotAPreprint)
        .with('not-found', () => Decision.ShowUnknownPreprint(preprintId))
        .with('unavailable', () => Decision.ShowError)
        .exhaustive(),
    ),
  )

const extractPreprintId: (
  body: unknown,
) => E.Either<
  Decision.ShowFormWithErrors | Decision.ShowUnsupportedDoi | Decision.ShowUnsupportedUrl,
  PreprintId.IndeterminatePreprintId
> = flow(
  Form.fromBody,
  E.mapLeft(Decision.ShowFormWithErrors),
  E.chainW(form =>
    match(form.value)
      .returnType<
        E.Either<Decision.ShowUnsupportedDoi | Decision.ShowUnsupportedUrl, PreprintId.IndeterminatePreprintId>
      >()
      .with(P.string, E.fromOptionK(() => Decision.ShowUnsupportedDoi)(PreprintId.parsePreprintDoi))
      .with(P.instanceOf(URL), E.fromOptionK(() => Decision.ShowUnsupportedUrl)(PreprintId.fromUrl))
      .exhaustive(),
  ),
)

const ensureUserCanRequestReviews: (user?: User) => RE.ReaderEither<CanRequestReviewsEnv, Decision.DenyAccess, void> =
  flow(
    canRequestReviews,
    R.map(
      b.match(
        () => E.left(Decision.DenyAccess),
        () => E.right(undefined),
      ),
    ),
  )

type EnvFor<T> = T extends Reader<infer R, unknown> ? R : never
