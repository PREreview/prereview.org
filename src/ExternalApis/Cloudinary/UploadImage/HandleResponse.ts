import { HttpClientResponse } from 'effect/http'
import { Effect, Equal, flow, Struct } from 'effect'
import * as StatusCodes from '../../../StatusCodes.ts'
import { UploadImageResponse } from './UploadImageResponse.ts'

export const HandleResponse = flow(
  HttpClientResponse.filterStatus(Equal.equals(StatusCodes.OK)),
  Effect.andThen(HttpClientResponse.schemaBodyJson(UploadImageResponse)),
  Effect.map(Struct.get('public_id')),
)
