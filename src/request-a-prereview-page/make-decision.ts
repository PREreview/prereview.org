import { flow, identity, pipe } from 'effect'
import * as E from 'fp-ts/lib/Either.js'
import * as R from 'fp-ts/lib/Reader.js'
import type * as RE from 'fp-ts/lib/ReaderEither.js'
import type * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import * as b from 'fp-ts/lib/boolean.js'
import { P, match } from 'ts-pattern'
import type { EnvFor } from '../Fpts.js'
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
        .with({ _tag: 'NotAPreprint' }, () => Decision.ShowNotAPreprint)
        .with({ _tag: 'PreprintIsNotFound' }, () => Decision.ShowUnknownPreprint(preprintId))
        .with({ _tag: 'PreprintIsUnavailable' }, () => Decision.ShowError)
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
