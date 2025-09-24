import { Effect, pipe } from 'effect'
import { Philsci } from '../../ExternalApis/index.ts'
import * as StatusCodes from '../../StatusCodes.ts'
import * as Preprint from '../Preprint.ts'
import type { PhilsciPreprintId } from '../PreprintId.ts'
import { EprintToPreprint } from './EprintToPreprint.ts'

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
