import { Effect, pipe } from 'effect'
import { Crossref } from '../../ExternalApis/index.ts'
import * as Preprint from '../Preprint.ts'
import { workToPreprint } from './Preprint.ts'
import type { IndeterminateCrossrefPreprintId } from './PreprintId.ts'

export { isCrossrefPreprintId } from './PreprintId.ts'

export const getPreprintFromCrossref = (
  id: IndeterminateCrossrefPreprintId,
): Effect.Effect<
  Preprint.Preprint,
  Preprint.NotAPreprint | Preprint.PreprintIsNotFound | Preprint.PreprintIsUnavailable,
  Crossref.Crossref
> =>
  pipe(
    Crossref.getWork(id.value),
    Effect.andThen(workToPreprint),
    Effect.catchTags({
      WorkIsNotFound: error => new Preprint.PreprintIsNotFound({ cause: error }),
      WorkIsUnavailable: error => new Preprint.PreprintIsUnavailable({ cause: error }),
    }),
  )
