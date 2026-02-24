import { Effect, pipe } from 'effect'
import { Crossref } from '../../../ExternalApis/index.ts'
import * as Preprints from '../../../Preprints/index.ts'
import type * as LanguageDetection from '../../LanguageDetection/index.ts'
import { workToPreprint } from './Preprint.ts'
import type { IndeterminateCrossrefPreprintId } from './PreprintId.ts'

export { isCrossrefPreprintId } from './PreprintId.ts'

export const getPreprintFromCrossref = (
  id: IndeterminateCrossrefPreprintId,
): Effect.Effect<
  Preprints.Preprint,
  Preprints.NotAPreprint | Preprints.PreprintIsNotFound | Preprints.PreprintIsUnavailable,
  Crossref.Crossref | LanguageDetection.LanguageDetection
> =>
  pipe(
    Crossref.getWork(id.value),
    Effect.andThen(workToPreprint),
    Effect.catchTags({
      WorkIsNotFound: error => new Preprints.PreprintIsNotFound({ cause: error }),
      WorkIsUnavailable: error => new Preprints.PreprintIsUnavailable({ cause: error }),
    }),
  )
