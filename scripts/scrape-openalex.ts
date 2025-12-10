import { FileSystem, HttpClient, type HttpClientError, HttpClientRequest, HttpClientResponse } from '@effect/platform'
import { NodeFileSystem, NodeHttpClient } from '@effect/platform-node'
import { Chunk, Effect, flow, Layer, Order, ParseResult, pipe, Schema, Stream, String } from 'effect'
import path from 'path'

const ListResponse = <A, I, R>(resultSchema: Schema.Schema<A, I, R>) =>
  Schema.Struct({
    meta: Schema.Struct({ next_cursor: Schema.optionalWith(Schema.String, { as: 'Option', nullable: true }) }),
    results: Schema.Chunk(resultSchema),
  })

const FieldIdSchema = pipe(Schema.NumberFromString, Schema.brand('FieldId'))

const FieldIdFromUrlSchema = Schema.transformOrFail(Schema.URL, FieldIdSchema, {
  strict: true,
  decode: (url, _, ast) =>
    url.origin === 'https://openalex.org' && url.pathname.startsWith('/fields/')
      ? ParseResult.succeed(decodeURIComponent(url.pathname.substring(8)))
      : ParseResult.fail(new ParseResult.Type(ast, url)),
  encode: fieldId => ParseResult.succeed(new URL(`https://openalex.org/fields/${encodeURIComponent(fieldId)}`)),
})

const SubfieldIdSchema = pipe(Schema.NumberFromString, Schema.brand('SubfieldId'))

const SubfieldIdFromUrlSchema = Schema.transformOrFail(Schema.URL, SubfieldIdSchema, {
  strict: true,
  decode: (url, _, ast) =>
    url.origin === 'https://openalex.org' && url.pathname.startsWith('/subfields/')
      ? ParseResult.succeed(decodeURIComponent(url.pathname.substring(11)))
      : ParseResult.fail(new ParseResult.Type(ast, url)),
  encode: subfieldId =>
    ParseResult.succeed(new URL(`https://openalex.org/subfields/${encodeURIComponent(subfieldId)}`)),
})

const FieldSchema = Schema.Struct({
  id: FieldIdFromUrlSchema,
  display_name: Schema.NonEmptyTrimmedString,
})

const SubfieldSchema = Schema.Struct({
  id: SubfieldIdFromUrlSchema,
  display_name: Schema.NonEmptyTrimmedString,
})

const LocaleFileSchema = Schema.Record({
  key: Schema.String,
  value: Schema.Struct({
    message: Schema.NonEmptyTrimmedString,
  }),
})

const GetFields: Effect.Effect<
  Chunk.Chunk<typeof FieldSchema.Type>,
  HttpClientError.HttpClientError | ParseResult.ParseError,
  HttpClient.HttpClient
> = pipe(
  Stream.paginateChunkEffect(
    '*',
    flow(
      cursor => HttpClient.get('https://api.openalex.org/fields', { urlParams: { 'per-page': 100, cursor } }),
      Effect.andThen(HttpClientResponse.schemaBodyJson(ListResponse(FieldSchema))),
      Effect.scoped,
      Effect.andThen(response => [response.results, response.meta.next_cursor]),
    ),
  ),
  Stream.runCollect,
  Effect.andThen(Chunk.sortWith(field => field.id, Order.number)),
)

const GetSubfields: Effect.Effect<
  Chunk.Chunk<typeof SubfieldSchema.Type>,
  HttpClientError.HttpClientError | ParseResult.ParseError,
  HttpClient.HttpClient
> = pipe(
  Stream.paginateChunkEffect(
    '*',
    flow(
      cursor => HttpClient.get('https://api.openalex.org/subfields', { urlParams: { 'per-page': 100, cursor } }),
      Effect.andThen(HttpClientResponse.schemaBodyJson(ListResponse(SubfieldSchema))),
      Effect.scoped,
      Effect.andThen(response => [response.results, response.meta.next_cursor]),
    ),
  ),
  Stream.runCollect,
  Effect.andThen(Chunk.sortWith(subfield => subfield.id, Order.number)),
  Effect.andThen(
    Chunk.map(subfield =>
      subfield.id === 2311
        ? ({ id: subfield.id, display_name: 'Waste Management and Disposal' } satisfies typeof SubfieldSchema.Type)
        : subfield,
    ),
  ),
)

const WriteToFile = (filePath: string) => (content: string) =>
  Effect.andThen(FileSystem.FileSystem, fileSystem =>
    fileSystem.writeFileString(path.resolve(import.meta.dirname, '..', filePath), content),
  )

const FieldsToLocaleFile = flow(
  Chunk.reduce<typeof LocaleFileSchema.Type, typeof FieldSchema.Type>({}, (accumulator, field) => ({
    ...accumulator,
    [`field${field.id}`]: { message: field.display_name },
  })),
  Schema.encode(Schema.parseJson(LocaleFileSchema, { space: 2 })),
  Effect.andThen(String.concat('\n')),
  Effect.andThen(WriteToFile('locales/en-US/fields.json')),
)

const SubfieldsToLocaleFile = flow(
  Chunk.reduce<typeof LocaleFileSchema.Type, typeof SubfieldSchema.Type>({}, (accumulator, subfield) => ({
    ...accumulator,
    [`subfield${subfield.id}`]: { message: subfield.display_name },
  })),
  Schema.encode(Schema.parseJson(LocaleFileSchema, { space: 2 })),
  Effect.andThen(String.concat('\n')),
  Effect.andThen(WriteToFile('locales/en-US/subfields.json')),
)

const UpdateFields = pipe(GetFields, Effect.tap(FieldsToLocaleFile))

const UpdateSubfields = pipe(GetSubfields, Effect.tap(SubfieldsToLocaleFile))

void pipe(
  Effect.all([UpdateFields, UpdateSubfields]),
  Effect.provide(
    pipe(
      Layer.effect(
        HttpClient.HttpClient,
        Effect.andThen(
          HttpClient.HttpClient,
          HttpClient.mapRequest(
            HttpClientRequest.setHeaders({
              'User-Agent': 'PREreview (https://prereview.org/; mailto:engineering@prereview.org)',
            }),
          ),
        ),
      ),
      Layer.provideMerge(Layer.mergeAll(NodeHttpClient.layer, NodeFileSystem.layer)),
    ),
  ),
  Effect.runPromise,
)
