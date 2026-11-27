import { Effect, Equal, flow, Schema } from 'effect'
import { HttpClientResponse } from 'effect/http'
import * as StatusCodes from '../../../StatusCodes.ts'
import { Doi } from '../../../types/index.ts'

const DraftWithADoi = Schema.Struct({
  pids: Schema.Struct({ doi: Schema.Struct({ identifier: Doi.DoiSchema }) }),
})

export const HandleResponse = flow(
  HttpClientResponse.filterStatus(Equal.equals(StatusCodes.Created)),
  Effect.andThen(HttpClientResponse.schemaBodyJson(DraftWithADoi)),
  Effect.map(draft => draft.pids.doi.identifier),
)
