import { Effect, pipe } from 'effect'
import * as Preprints from '../../../Domain/Preprints/index.ts'
import { OpenAlex } from '../../../ExternalApis/index.ts'
import type * as LanguageDetection from '../../LanguageDetection/index.ts'
import { determinePreprintId } from './DeterminePreprintId.ts'
import { workToPreprint } from './WorkToPreprint.ts'

export const getPreprintFromOpenAlex = (
  id: Preprints.IndeterminatePreprintIdWithDoi,
): Effect.Effect<
  Preprints.Preprint,
  Preprints.NotAPreprint | Preprints.PreprintIsNotFound | Preprints.PreprintIsUnavailable,
  OpenAlex.OpenAlex | LanguageDetection.LanguageDetection
> =>
  pipe(
    OpenAlex.getWork(id.value),
    Effect.andThen(work =>
      pipe(
        determinePreprintId(id, work),
        Effect.andThen(determinedId => workToPreprint(determinedId)(work)),
      ),
    ),
    Effect.catchTags({
      WorkIsNotFound: error => new Preprints.PreprintIsNotFound({ cause: error }),
      WorkIsUnavailable: error => new Preprints.PreprintIsUnavailable({ cause: error }),
    }),
  )
