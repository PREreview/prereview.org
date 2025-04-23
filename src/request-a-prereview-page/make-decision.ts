import { Array, Option, flow, identity, pipe } from 'effect'
import * as E from 'fp-ts/lib/Either.js'
import type * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { P, match } from 'ts-pattern'
import type { EnvFor } from '../Fpts.js'
import * as Preprint from '../preprint.js'
import * as ReviewRequest from '../review-request.js'
import * as PreprintId from '../types/preprint-id.js'
import * as Decision from './decision.js'
import * as Form from './form.js'

export type Env = EnvFor<ReturnType<typeof makeDecision>>

export const makeDecision = ({
  body,
  method,
}: {
  body: unknown
  method: string
}): RT.ReaderTask<Preprint.ResolvePreprintIdEnv, Decision.Decision> =>
  pipe(
    RTE.Do,
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
      .with(
        P.instanceOf(URL),
        E.fromOptionK(() => Decision.ShowUnsupportedUrl)(
          flow(
            PreprintId.fromUrl,
            Array.match({
              onEmpty: Option.none,
              onNonEmpty: ([head, ...tail]) => (tail.length === 0 ? Option.some(head) : Option.none()),
            }),
          ),
        ),
      )
      .exhaustive(),
  ),
)
