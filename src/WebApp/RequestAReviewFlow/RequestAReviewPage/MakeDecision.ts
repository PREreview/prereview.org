import type { UrlParams } from '@effect/platform'
import { Array, Effect, Either, Match, Option, type Types, flow, identity, pipe } from 'effect'
import * as Preprints from '../../../Preprints/index.ts'
import * as Decision from './Decision.ts'
import * as RequestAReviewForm from './RequestAReviewForm.ts'

export const makeDecision = ({
  body,
  method,
}: {
  body: UrlParams.UrlParams
  method: string
}): Effect.Effect<Decision.Decision, never, Preprints.Preprints> =>
  pipe(
    Effect.Do,
    Effect.filterOrFail(
      () => method === 'POST',
      () => Decision.ShowEmptyForm,
    ),
    Effect.andThen(extractPreprintId(body)),
    Effect.andThen(resolvePreprintId),
    Effect.match({ onFailure: identity, onSuccess: Decision.BeginFlow }),
  )

const resolvePreprintId = (
  preprintIds: Array.NonEmptyReadonlyArray<Preprints.IndeterminatePreprintId>,
): Effect.Effect<
  Preprints.PreprintId,
  Decision.ShowNotAPreprint | Decision.ShowUnknownPreprint | Decision.ShowError,
  Preprints.Preprints
> =>
  pipe(
    Preprints.resolvePreprintId(...preprintIds),
    Effect.catchTags({
      NotAPreprint: () => Effect.fail(Decision.ShowNotAPreprint),
      PreprintIsNotFound: () => Effect.fail(Decision.ShowUnknownPreprint(Array.headNonEmpty(preprintIds))),
      PreprintIsUnavailable: () => Effect.fail(Decision.ShowError),
    }),
  )

const extractPreprintId = (
  body: UrlParams.UrlParams,
): Effect.Effect<
  Array.NonEmptyReadonlyArray<Preprints.IndeterminatePreprintId>,
  Decision.ShowFormWithErrors | Decision.ShowUnsupportedDoi | Decision.ShowUnsupportedUrl
> =>
  pipe(
    RequestAReviewForm.fromBody(body),
    Effect.filterOrFail(hasTag('CompletedForm'), form => Decision.ShowFormWithErrors(form)),
    Effect.andThen(form =>
      pipe(
        Match.value(form.whichPreprint),
        Match.when(
          Match.string,
          flow(
            Preprints.parsePreprintDoi,
            Option.andThen(Array.of),
            Either.fromOption(() => Decision.ShowUnsupportedDoi),
          ),
        ),
        Match.when(
          Match.instanceOfUnsafe(URL),
          flow(
            Preprints.fromUrl,
            Array.match({ onEmpty: () => Either.left(Decision.ShowUnsupportedUrl), onNonEmpty: Either.right }),
          ),
        ),
        Match.exhaustive,
      ),
    ),
  )

function hasTag<Tag extends Types.Tags<T>, T extends { _tag: string }>(...tags: ReadonlyArray<Tag>) {
  return (tagged: T): tagged is Types.ExtractTag<T, Tag> => Array.contains(tags, tagged._tag)
}
