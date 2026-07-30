import { HttpClientResponse } from '@effect/platform'
import resolveResponse from 'contentful-resolve-response'
import { Effect, Equal, flow, Option, Schema } from 'effect'
import * as StatusCodes from '../../../StatusCodes.ts'
import { ContentfulIsUnavailable } from '../Errors.ts'
import { Entries } from '../Types.ts'

const ResolveEntries = Effect.fnUntraced(function* (response: HttpClientResponse.HttpClientResponse) {
  const body = yield* response.json

  if (typeof body !== 'object' || body === null || !('includes' in body) || !('items' in body)) {
    return body
  }

  const items = Option.liftThrowable(resolveResponse)(body)

  return Option.match(items, { onSome: items => ({ ...body, items }), onNone: () => body })
})

export const HandleResponse = flow(
  HttpClientResponse.filterStatus(Equal.equals(StatusCodes.OK)),
  Effect.andThen(ResolveEntries),
  Effect.andThen(Schema.decodeUnknown(Entries)),
  Effect.catchTag('ResponseError', 'ParseError', error => new ContentfulIsUnavailable({ cause: error })),
)
