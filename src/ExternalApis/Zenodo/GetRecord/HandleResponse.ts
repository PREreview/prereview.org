import { Effect, Equal, Option, pipe } from 'effect'
import { HttpClientResponse } from 'effect/http'
import * as StatusCodes from '../../../StatusCodes.ts'
import { PublishedRecord } from '../PublishedRecord.ts'

export const HandleResponse = (response: HttpClientResponse.HttpClientResponse) => {
  if (response.status === StatusCodes.NotFound) {
    return Effect.succeedNone
  }

  return pipe(
    response,
    HttpClientResponse.filterStatus(Equal.equals(StatusCodes.OK)),
    Effect.andThen(HttpClientResponse.schemaBodyJson(PublishedRecord)),
    Effect.map(Option.some),
  )
}
