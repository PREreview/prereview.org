import { Effect, pipe } from 'effect'
import * as Philsci from '../../Philsci/index.js'
import * as Preprint from '../../preprint.js'
import * as StatusCodes from '../../StatusCodes.js'
import type { PhilsciPreprintId } from '../../types/preprint-id.js'
import { EprintToPreprint } from './EprintToPreprint.js'

export { Philsci } from '../../Philsci/index.js'

export const getPreprintFromPhilsci = (
  id: PhilsciPreprintId,
): Effect.Effect<
  Preprint.Preprint,
  Preprint.NotAPreprint | Preprint.PreprintIsNotFound | Preprint.PreprintIsUnavailable,
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
      error => new Preprint.PreprintIsNotFound({ cause: error }),
    ),
    Effect.catchTag(
      'ParseError',
      'RequestError',
      'ResponseError',
      error => new Preprint.PreprintIsUnavailable({ cause: error }),
    ),
  )
