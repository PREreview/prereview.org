import {
  FileSystem,
  HttpClient,
  type HttpClientError,
  HttpClientRequest,
  HttpClientResponse,
  UrlParams,
} from '@effect/platform'
import { NodeFileSystem, NodeHttpClient } from '@effect/platform-node'
import crypto from 'crypto'
import {
  Chunk,
  Effect,
  flow,
  Layer,
  Logger,
  LogLevel,
  Order,
  ParseResult,
  pipe,
  Record,
  Schema,
  Stream,
  String,
} from 'effect'
import path from 'path'

const ListResponse = <A, I, R>(resultSchema: Schema.Schema<A, I, R>) =>
  Schema.Struct({
    meta: Schema.Struct({ next_cursor: Schema.optionalWith(Schema.String, { as: 'Option', nullable: true }) }),
    results: Schema.Chunk(resultSchema),
  })

const DomainIdSchema = pipe(Schema.NumberFromString, Schema.brand('DomainId'))

const DomainIdFromUrlSchema = Schema.transformOrFail(Schema.URL, DomainIdSchema, {
  strict: true,
  decode: (url, _, ast) =>
    url.origin === 'https://openalex.org' && url.pathname.startsWith('/domains/')
      ? ParseResult.succeed(decodeURIComponent(url.pathname.substring(9)))
      : ParseResult.fail(new ParseResult.Type(ast, url)),
  encode: domainId => ParseResult.succeed(new URL(`https://openalex.org/domains/${encodeURIComponent(domainId)}`)),
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

const TopicIdSchema = pipe(Schema.NumberFromString, Schema.brand('TopicId'))

const TopicIdFromUrlSchema = Schema.transformOrFail(Schema.URL, TopicIdSchema, {
  strict: true,
  decode: (url, _, ast) =>
    url.origin === 'https://openalex.org' && url.pathname.startsWith('/T')
      ? ParseResult.succeed(decodeURIComponent(url.pathname.substring(2)))
      : ParseResult.fail(new ParseResult.Type(ast, url)),
  encode: topicId => ParseResult.succeed(new URL(`https://openalex.org/T${encodeURIComponent(topicId)}`)),
})

const KeywordIdSchema = pipe(Schema.String, Schema.brand('KeywordId'))

const KeywordIdFromUrlSchema = Schema.transformOrFail(Schema.URL, KeywordIdSchema, {
  strict: true,
  decode: (url, _, ast) =>
    url.origin === 'https://openalex.org' && url.pathname.startsWith('/keywords/')
      ? ParseResult.succeed(decodeURIComponent(url.pathname.substring(10)))
      : ParseResult.fail(new ParseResult.Type(ast, url)),
  encode: keywordId => ParseResult.succeed(new URL(`https://openalex.org/keywords/${encodeURIComponent(keywordId)}`)),
})

const DomainSchema = Schema.Struct({
  id: DomainIdFromUrlSchema,
  display_name: Schema.NonEmptyTrimmedString,
})

const FieldSchema = Schema.Struct({
  id: FieldIdFromUrlSchema,
  display_name: Schema.NonEmptyTrimmedString,
  domain: Schema.Struct({ id: DomainIdFromUrlSchema }),
})

const SubfieldSchema = Schema.Struct({
  id: SubfieldIdFromUrlSchema,
  display_name: Schema.NonEmptyTrimmedString,
  domain: Schema.Struct({ id: DomainIdFromUrlSchema }),
  field: Schema.Struct({ id: FieldIdFromUrlSchema }),
})

const TopicSchema = Schema.Struct({
  id: TopicIdFromUrlSchema,
  display_name: Schema.NonEmptyTrimmedString,
  domain: Schema.Struct({ id: DomainIdFromUrlSchema }),
  field: Schema.Struct({ id: FieldIdFromUrlSchema }),
  subfield: Schema.Struct({ id: SubfieldIdFromUrlSchema }),
})

const KeywordSchema = Schema.Struct({
  id: KeywordIdFromUrlSchema,
  display_name: Schema.NonEmptyTrimmedString,
})

const LocaleFileSchema = Schema.Record({
  key: Schema.String,
  value: Schema.Struct({
    message: Schema.NonEmptyTrimmedString,
  }),
})

const DomainTypesFileSchema = Schema.Record({
  key: Schema.String,
  value: Schema.Struct({
    name: Schema.NonEmptyTrimmedString,
  }),
})

const FieldTypesFileSchema = Schema.Record({
  key: Schema.String,
  value: Schema.Struct({
    name: Schema.NonEmptyTrimmedString,
    domain: DomainIdSchema,
  }),
})

const SubfieldTypesFileSchema = Schema.Record({
  key: Schema.String,
  value: Schema.Struct({
    name: Schema.NonEmptyTrimmedString,
    domain: DomainIdSchema,
    field: FieldIdSchema,
  }),
})

const TopicTypesFileSchema = Schema.Record({
  key: Schema.String,
  value: Schema.Struct({
    name: Schema.NonEmptyTrimmedString,
    domain: DomainIdSchema,
    field: FieldIdSchema,
    subfield: SubfieldIdSchema,
  }),
})

const KeywordTypesFileSchema = Schema.Record({
  key: Schema.String,
  value: Schema.Struct({
    name: Schema.NonEmptyTrimmedString,
  }),
})

const GetDomains: Effect.Effect<
  Chunk.Chunk<typeof DomainSchema.Type>,
  HttpClientError.HttpClientError | ParseResult.ParseError,
  HttpClient.HttpClient
> = pipe(
  Stream.paginateChunkEffect(
    '*',
    flow(
      cursor =>
        HttpClient.get('https://api.openalex.org/domains', {
          urlParams: { select: Object.keys(DomainSchema.fields).join(','), 'per-page': 200, cursor },
        }),
      Effect.andThen(HttpClientResponse.schemaBodyJson(ListResponse(DomainSchema))),
      Effect.scoped,
      Effect.andThen(response => [response.results, response.meta.next_cursor]),
    ),
  ),
  Stream.runCollect,
  Effect.andThen(Chunk.sortWith(domain => domain.id, Order.number)),
)

const GetFields: Effect.Effect<
  Chunk.Chunk<typeof FieldSchema.Type>,
  HttpClientError.HttpClientError | ParseResult.ParseError,
  HttpClient.HttpClient
> = pipe(
  Stream.paginateChunkEffect(
    '*',
    flow(
      cursor =>
        HttpClient.get('https://api.openalex.org/fields', {
          urlParams: { select: Object.keys(FieldSchema.fields).join(','), 'per-page': 200, cursor },
        }),
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
      cursor =>
        HttpClient.get('https://api.openalex.org/subfields', {
          urlParams: { select: Object.keys(SubfieldSchema.fields).join(','), 'per-page': 200, cursor },
        }),
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
        ? ({ ...subfield, display_name: 'Waste Management and Disposal' } satisfies typeof SubfieldSchema.Type)
        : subfield,
    ),
  ),
)

const GetTopics: Effect.Effect<
  Chunk.Chunk<typeof TopicSchema.Type>,
  HttpClientError.HttpClientError | ParseResult.ParseError,
  HttpClient.HttpClient
> = pipe(
  Stream.paginateChunkEffect(
    '*',
    flow(
      cursor =>
        HttpClient.get('https://api.openalex.org/topics', {
          urlParams: { select: Object.keys(TopicSchema.fields).join(','), 'per-page': 200, cursor },
        }),
      Effect.andThen(HttpClientResponse.schemaBodyJson(ListResponse(TopicSchema))),
      Effect.scoped,
      Effect.andThen(response => [response.results, response.meta.next_cursor]),
    ),
  ),
  Stream.runCollect,
  Effect.andThen(Chunk.sortWith(topic => topic.id, Order.number)),
)

const GetKeywords: Effect.Effect<
  Chunk.Chunk<typeof KeywordSchema.Type>,
  HttpClientError.HttpClientError | ParseResult.ParseError,
  HttpClient.HttpClient
> = pipe(
  Stream.paginateChunkEffect(
    '*',
    flow(
      cursor =>
        HttpClient.get('https://api.openalex.org/keywords', {
          urlParams: { select: Object.keys(KeywordSchema.fields).join(','), 'per-page': 200, cursor },
        }),
      Effect.andThen(HttpClientResponse.schemaBodyJson(ListResponse(KeywordSchema))),
      Effect.scoped,
      Effect.andThen(response => [response.results, response.meta.next_cursor]),
    ),
  ),
  Stream.runCollect,
  Effect.andThen(Chunk.sortWith(keyword => keyword.id, Order.string)),
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

const DomainsToTypesFile = flow(
  Chunk.reduce<typeof DomainTypesFileSchema.Type, typeof DomainSchema.Type>({}, (accumulator, domain) => ({
    ...accumulator,
    [domain.id]: { name: domain.display_name },
  })),
  Schema.encode(Schema.parseJson(DomainTypesFileSchema, { space: 2 })),
  Effect.andThen(String.concat('\n')),
  Effect.andThen(WriteToFile('src/types/data/domains.json')),
)

const FieldsToTypesFile = flow(
  Chunk.reduce<typeof FieldTypesFileSchema.Type, typeof FieldSchema.Type>({}, (accumulator, field) => ({
    ...accumulator,
    [field.id]: { name: field.display_name, domain: field.domain.id },
  })),
  Schema.encode(Schema.parseJson(FieldTypesFileSchema, { space: 2 })),
  Effect.andThen(String.concat('\n')),
  Effect.andThen(WriteToFile('src/types/data/fields.json')),
)

const SubfieldsToTypesFile = flow(
  Chunk.reduce<typeof SubfieldTypesFileSchema.Type, typeof SubfieldSchema.Type>({}, (accumulator, subfield) => ({
    ...accumulator,
    [subfield.id]: { name: subfield.display_name, domain: subfield.domain.id, field: subfield.field.id },
  })),
  Schema.encode(Schema.parseJson(SubfieldTypesFileSchema, { space: 2 })),
  Effect.andThen(String.concat('\n')),
  Effect.andThen(WriteToFile('src/types/data/subfields.json')),
)

const TopicsToTypesFile = flow(
  Chunk.reduce<typeof TopicTypesFileSchema.Type, typeof TopicSchema.Type>({}, (accumulator, topic) => ({
    ...accumulator,
    [topic.id]: {
      name: topic.display_name,
      domain: topic.domain.id,
      field: topic.field.id,
      subfield: topic.subfield.id,
    },
  })),
  Schema.encode(Schema.parseJson(TopicTypesFileSchema, { space: 2 })),
  Effect.andThen(String.concat('\n')),
  Effect.andThen(WriteToFile('src/types/data/topics.json')),
)

const KeywordsToTypesFile = flow(
  Chunk.map<Chunk.Chunk<typeof KeywordSchema.Type>, [string, typeof KeywordTypesFileSchema.value.Type]>(keyword => [
    crypto.createHash('shake256', { outputLength: 10 }).update(keyword.id).digest('hex'),
    { name: keyword.display_name },
  ]),
  Record.fromEntries,
  Schema.encode(Schema.parseJson(KeywordTypesFileSchema, { space: 2 })),
  Effect.andThen(String.concat('\n')),
  Effect.andThen(WriteToFile('src/types/data/keywords.json')),
)

const UpdateDomains = pipe(GetDomains, Effect.tap(DomainsToTypesFile))

const UpdateFields = pipe(GetFields, Effect.tap(FieldsToLocaleFile), Effect.tap(FieldsToTypesFile))

const UpdateSubfields = pipe(GetSubfields, Effect.tap(SubfieldsToLocaleFile), Effect.tap(SubfieldsToTypesFile))

const UpdateTopics = pipe(GetTopics, Effect.tap(TopicsToTypesFile))

const UpdateKeywords = pipe(GetKeywords, Effect.tap(KeywordsToTypesFile))

void pipe(
  Effect.all([UpdateDomains, UpdateFields, UpdateSubfields, UpdateTopics, UpdateKeywords]),
  Effect.provide(
    pipe(
      Layer.effect(
        HttpClient.HttpClient,
        Effect.andThen(
          HttpClient.HttpClient,
          flow(
            HttpClient.mapRequest(
              HttpClientRequest.setHeaders({
                'User-Agent': 'PREreview (https://prereview.org/; mailto:engineering@prereview.org)',
              }),
            ),
            HttpClient.tapRequest(request =>
              Effect.logDebug('Sending HTTP request').pipe(
                Effect.annotateLogs({
                  url: `${request.url}?${UrlParams.toString(request.urlParams)}`,
                  method: request.method,
                }),
              ),
            ),
          ),
        ),
      ),
      Layer.provideMerge(Layer.mergeAll(NodeHttpClient.layer, NodeFileSystem.layer)),
      Layer.provideMerge(Logger.pretty),
    ),
  ),
  Logger.withMinimumLogLevel(LogLevel.Debug),
  Effect.runPromise,
)
