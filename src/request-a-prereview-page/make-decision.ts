import { Array, Either, Match, Option, flow, identity, pipe } from 'effect'
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
  preprintIds: Array.NonEmptyReadonlyArray<PreprintId.IndeterminatePreprintId>,
): RTE.ReaderTaskEither<
  Preprint.ResolvePreprintIdEnv,
  Decision.ShowNotAPreprint | Decision.ShowUnknownPreprint | Decision.ShowError,
  PreprintId.PreprintId
> =>
  pipe(
    Preprint.resolvePreprintId(...preprintIds),
    RTE.mapLeft(
      Match.valueTags({
        NotAPreprint: () => Decision.ShowNotAPreprint,
        PreprintIsNotFound: () => Decision.ShowUnknownPreprint(Array.headNonEmpty(preprintIds)),
        PreprintIsUnavailable: () => Decision.ShowError,
      }),
    ),
  )

const extractPreprintId: (
  body: unknown,
) => E.Either<
  Decision.ShowFormWithErrors | Decision.ShowUnsupportedDoi | Decision.ShowUnsupportedUrl,
  Array.NonEmptyReadonlyArray<PreprintId.IndeterminatePreprintId>
> = flow(
  Form.fromBody,
  E.mapLeft(Decision.ShowFormWithErrors),
  E.chainW(form =>
    match(form.value)
      .returnType<
        E.Either<
          Decision.ShowUnsupportedDoi | Decision.ShowUnsupportedUrl,
          Array.NonEmptyReadonlyArray<PreprintId.IndeterminatePreprintId>
        >
      >()
      .with(
        P.string,
        E.fromOptionK(() => Decision.ShowUnsupportedDoi)(flow(PreprintId.parsePreprintDoi, Option.andThen(Array.of))),
      )
      .with(
        P.instanceOf(URL),
        flow(
          PreprintId.fromUrl,
          Array.match({ onEmpty: () => Either.left(Decision.ShowUnsupportedUrl), onNonEmpty: Either.right }),
        ),
      )
      .exhaustive(),
  ),
)
