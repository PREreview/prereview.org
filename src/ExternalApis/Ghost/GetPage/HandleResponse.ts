import { HttpClientResponse } from 'effect/http'
import { Effect, Equal, flow, Match, Schema, Tuple, SchemaTransformation, Struct } from 'effect'
import * as StatusCodes from '../../../StatusCodes.ts'
import { Page } from '../Page.ts'
import { GhostPageNotFound, GhostPageUnavailable } from './Errors.ts'

const pluck = <Fields extends Schema.Struct.Fields, K extends keyof Fields & string>(
  schema: Schema.Struct<Fields>,
  key: K,
): Schema.Codec<
  Fields[K]['Type'],
  Readonly<Record<K, Fields[K]['Encoded']>>,
  Fields[K]['DecodingServices'],
  Fields[K]['EncodingServices']
> =>
  schema.mapFields(Struct.pick([key])).pipe(
    Schema.decodeTo(
      Schema.toType(schema.fields[key] as Schema.Top),
      SchemaTransformation.transform<unknown, Record<K, unknown>>({
        decode: whole => whole[key],
        encode: value => ({ [key]: value }) as Record<K, unknown>,
      }) as never,
    ),
  ) as never

const ValueFromTupleSchema = <A, I, R>(schema: Schema.Codec<A, I, R, R>): Schema.Codec<A, readonly [I], R, R> =>
  Schema.Tuple([schema]).pipe(
    Schema.decodeTo(
      Schema.toType(schema),
      SchemaTransformation.transform({ decode: Tuple.get(0), encode: value => [value] as const }),
    ),
  )

const ResponseSchema = pluck(Schema.Struct({ pages: ValueFromTupleSchema(Page) }), 'pages')

export const HandleResponse = flow(
  HttpClientResponse.filterStatus(Equal.equals(StatusCodes.OK)),
  Effect.andThen(HttpClientResponse.schemaBodyJson(ResponseSchema)),
  Effect.mapError(
    flow(
      Match.value,
      Match.when({ response: { status: StatusCodes.NotFound } }, error => new GhostPageNotFound({ cause: error })),
      Match.orElse(error => new GhostPageUnavailable({ cause: error })),
    ),
  ),
)
