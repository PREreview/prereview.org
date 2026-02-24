import { Effect, pipe } from 'effect'
import { Philsci } from '../../../ExternalApis/index.ts'
import * as Preprints from '../../../Preprints/index.ts'
import * as StatusCodes from '../../../StatusCodes.ts'
import { EprintToPreprint } from './EprintToPreprint.ts'

export const getPreprintFromPhilsci = (
  id: Preprints.PhilsciPreprintId,
): Effect.Effect<
  Preprints.Preprint,
  Preprints.NotAPreprint | Preprints.PreprintIsNotFound | Preprints.PreprintIsUnavailable,
  Philsci.Philsci
> =>
  pipe(
    Philsci.getEprint(id.value),
    Effect.andThen(EprintToPreprint),
    Effect.catchIf(
      error =>
        error._tag === 'ResponseError' &&
        error.reason === 'StatusCode' &&
        error.response.status === StatusCodes.NotFound,
      error => new Preprints.PreprintIsNotFound({ cause: error }),
    ),
    Effect.catchTag(
      'ParseError',
      'RequestError',
      'ResponseError',
      error => new Preprints.PreprintIsUnavailable({ cause: error }),
    ),
  )
