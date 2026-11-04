import { HttpClientResponse } from 'effect/http'
import resolveResponse from 'contentful-resolve-response'
import { Effect, Equal, flow, Option, Schema } from 'effect'
import { configure } from 'safe-stable-stringify'
import * as StatusCodes from '../../../StatusCodes.ts'
import { ContentfulIsUnavailable } from '../Errors.ts'
import { ContentfulErrorResponse, Entries } from '../Types.ts'

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
  Effect.map(configure({ circularValue: '[Circular]' })),
  Effect.andThen(Schema.decodeUnknownEffect(Schema.fromJsonString(Entries))),
  Effect.catchTag(
    'HttpClientError',
    Effect.fnUntraced(function* (error) {
      if (error.reason._tag !== 'StatusCodeError') {
        return yield* new ContentfulIsUnavailable({ cause: error })
      }

      const response = yield* Effect.option(
        HttpClientResponse.schemaBodyJson(ContentfulErrorResponse)(error.reason.response),
      )

      return yield* new ContentfulIsUnavailable({ cause: error, response: Option.getOrUndefined(response) })
    }),
  ),
  Effect.catchTag('SchemaError', error => new ContentfulIsUnavailable({ cause: error })),
)
