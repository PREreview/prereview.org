import {
  FileSystem,
  SchemaIssue,
  SchemaGetter,
  SchemaTransformation,
  Effect,
  Chunk,
  flow,
  identity,
  Layer,
  Logger,
  Order,
  References,
  pipe,
  Record,
  Schema,
  Stream,
  String,
  Number,
  Option,
} from 'effect'
import { HttpClient, type HttpClientError, HttpClientRequest, HttpClientResponse, UrlParams } from 'effect/http'
import { NodeFileSystem, NodeHttpClient } from '@effect/platform-node'
import crypto from 'node:crypto'
import path from 'node:path'

const NumberFromStringSchema = Schema.String.pipe(
  Schema.decodeTo(Schema.Number, {
    decode: SchemaGetter.transformEffect(string =>
      Option.match(Number.parse(string), {
        onNone: () => Effect.fail(new SchemaIssue.InvalidValue(undefined, string)),
        onSome: Effect.succeed,
      }),
    ),
    encode: SchemaGetter.String(),
  }),
)

const NormalizedWhitespaceSchema = Schema.String.pipe(
  Schema.decodeTo(
    Schema.Trim,
    SchemaTransformation.transform({ decode: String.replaceAll(/\s+/g, ' '), encode: identity }),
  ),
)

const NormalizeApostrophesSchema = Schema.String.pipe(
  Schema.decodeTo(
    Schema.Trim,
    SchemaTransformation.transform({
      decode: String.replaceAll(/(?<=\p{L})'(?=\p{L}|\s+\p{L})/gu, '’'),
      encode: identity,
    }),
  ),
)

const TextSchema = pipe(
  NormalizedWhitespaceSchema,
  Schema.decodeTo(NormalizeApostrophesSchema),
  Schema.decodeTo(Schema.Trimmed.check(Schema.isNonEmpty())),
)

const ListResponse = <A, I, R>(resultSchema: Schema.Codec<A, I, R, R>) =>
  Schema.Struct({
    meta: Schema.Struct({ next_cursor: Schema.OptionFromOptionalNullOr(Schema.String) }),
    results: Schema.Array(resultSchema),
  })

const DomainIdSchema = pipe(NumberFromStringSchema, Schema.brand('DomainId'))

const DomainIdFromUrlSchema = Schema.URLFromString.pipe(
  Schema.decodeTo(DomainIdSchema, {
    decode: SchemaGetter.transformEffect(url =>
      url.origin === 'https://openalex.org' && url.pathname.startsWith('/domains/')
        ? Effect.succeed(decodeURIComponent(url.pathname.slice(9)))
        : Effect.fail(new SchemaIssue.InvalidValue(undefined, url)),
    ),
    encode: SchemaGetter.transformEffect(domainId =>
      Effect.succeed(new URL(`https://openalex.org/domains/${encodeURIComponent(domainId)}`)),
    ),
  }),
)

const FieldIdSchema = pipe(NumberFromStringSchema, Schema.brand('FieldId'))

const FieldIdFromUrlSchema = Schema.URLFromString.pipe(
  Schema.decodeTo(FieldIdSchema, {
    decode: SchemaGetter.transformEffect(url =>
      url.origin === 'https://openalex.org' && url.pathname.startsWith('/fields/')
        ? Effect.succeed(decodeURIComponent(url.pathname.slice(8)))
        : Effect.fail(new SchemaIssue.InvalidValue(undefined, url)),
    ),
    encode: SchemaGetter.transformEffect(fieldId =>
      Effect.succeed(new URL(`https://openalex.org/fields/${encodeURIComponent(fieldId)}`)),
    ),
  }),
)

const SubfieldIdSchema = pipe(NumberFromStringSchema, Schema.brand('SubfieldId'))

const SubfieldIdFromUrlSchema = Schema.URLFromString.pipe(
  Schema.decodeTo(SubfieldIdSchema, {
    decode: SchemaGetter.transformEffect(url =>
      url.origin === 'https://openalex.org' && url.pathname.startsWith('/subfields/')
        ? Effect.succeed(decodeURIComponent(url.pathname.slice(11)))
        : Effect.fail(new SchemaIssue.InvalidValue(undefined, url)),
    ),
    encode: SchemaGetter.transformEffect(subfieldId =>
      Effect.succeed(new URL(`https://openalex.org/subfields/${encodeURIComponent(subfieldId)}`)),
    ),
  }),
)

const TopicIdSchema = pipe(NumberFromStringSchema, Schema.brand('TopicId'))

const TopicIdFromUrlSchema = Schema.URLFromString.pipe(
  Schema.decodeTo(TopicIdSchema, {
    decode: SchemaGetter.transformEffect(url =>
      url.origin === 'https://openalex.org' && url.pathname.startsWith('/T')
        ? Effect.succeed(decodeURIComponent(url.pathname.slice(2)))
        : Effect.fail(new SchemaIssue.InvalidValue(undefined, url)),
    ),
    encode: SchemaGetter.transformEffect(topicId =>
      Effect.succeed(new URL(`https://openalex.org/T${encodeURIComponent(topicId)}`)),
    ),
  }),
)

const KeywordIdSchema = pipe(Schema.String, Schema.brand('KeywordId'))

const KeywordIdFromUrlSchema = Schema.URLFromString.pipe(
  Schema.decodeTo(KeywordIdSchema, {
    decode: SchemaGetter.transformEffect(url =>
      url.origin === 'https://openalex.org' && url.pathname.startsWith('/keywords/')
        ? Effect.succeed(decodeURIComponent(url.pathname.slice(10)))
        : Effect.fail(new SchemaIssue.InvalidValue(undefined, url)),
    ),
    encode: SchemaGetter.transformEffect(keywordId =>
      Effect.succeed(new URL(`https://openalex.org/keywords/${encodeURIComponent(keywordId)}`)),
    ),
  }),
)

const DomainSchema = Schema.Struct({
  id: DomainIdFromUrlSchema,
  display_name: TextSchema,
})

const FieldSchema = Schema.Struct({
  id: FieldIdFromUrlSchema,
  display_name: TextSchema,
  display_name_alternatives: Schema.Array(TextSchema),
  description: TextSchema,
  domain: Schema.Struct({ id: DomainIdFromUrlSchema, display_name: TextSchema }),
})

const SubfieldSchema = Schema.Struct({
  id: SubfieldIdFromUrlSchema,
  display_name: TextSchema,
  display_name_alternatives: Schema.Array(TextSchema),
  description: Schema.optional(TextSchema),
  domain: Schema.Struct({ id: DomainIdFromUrlSchema, display_name: TextSchema }),
  field: Schema.Struct({ id: FieldIdFromUrlSchema, display_name: TextSchema }),
})

const TopicSchema = Schema.Struct({
  id: TopicIdFromUrlSchema,
  display_name: TextSchema,
  domain: Schema.Struct({ id: DomainIdFromUrlSchema }),
  field: Schema.Struct({ id: FieldIdFromUrlSchema }),
  subfield: Schema.Struct({ id: SubfieldIdFromUrlSchema }),
})

const KeywordSchema = Schema.Struct({
  id: KeywordIdFromUrlSchema,
  display_name: TextSchema,
})

const LocaleFileSchema = Schema.Record(
  Schema.String,
  Schema.Struct({
    message: TextSchema,
    description: Schema.optional(TextSchema),
  }),
)

const DomainTypesFileSchema = Schema.Record(
  Schema.String,
  Schema.Struct({
    name: TextSchema,
  }),
)

const FieldTypesFileSchema = Schema.Record(
  Schema.String,
  Schema.Struct({
    name: TextSchema,
    domain: DomainIdSchema,
  }),
)

const SubfieldTypesFileSchema = Schema.Record(
  Schema.String,
  Schema.Struct({
    name: TextSchema,
    domain: DomainIdSchema,
    field: FieldIdSchema,
  }),
)

const TopicTypesFileSchema = Schema.Record(
  Schema.String,
  Schema.Struct({
    name: TextSchema,
    domain: DomainIdSchema,
    field: FieldIdSchema,
    subfield: SubfieldIdSchema,
  }),
)

const KeywordTypesFileSchema = Schema.Record(
  Schema.String,
  Schema.Struct({
    name: TextSchema,
  }),
)

const GetDomains: Effect.Effect<
  Chunk.Chunk<typeof DomainSchema.Type>,
  HttpClientError.HttpClientError | Schema.SchemaError,
  HttpClient.HttpClient
> = pipe(
  Stream.paginate(
    '*',
    flow(
      cursor =>
        HttpClient.get('https://api.openalex.org/domains', {
          urlParams: { select: Object.keys(DomainSchema.fields).join(','), 'per-page': 200, cursor },
        }),
      Effect.andThen(HttpClientResponse.schemaBodyJson(ListResponse(DomainSchema))),
      Effect.scoped,
      Effect.map(response => [response.results, response.meta.next_cursor]),
    ),
  ),
  Stream.runCollect,
  Effect.map(Chunk.fromIterable),
  Effect.map(Chunk.sortWith(domain => domain.id, Order.Number)),
)

const GetFields: Effect.Effect<
  Chunk.Chunk<typeof FieldSchema.Type>,
  HttpClientError.HttpClientError | Schema.SchemaError,
  HttpClient.HttpClient
> = pipe(
  Stream.paginate(
    '*',
    flow(
      cursor =>
        HttpClient.get('https://api.openalex.org/fields', {
          urlParams: { select: Object.keys(FieldSchema.fields).join(','), 'per-page': 200, cursor },
        }),
      Effect.andThen(HttpClientResponse.schemaBodyJson(ListResponse(FieldSchema))),
      Effect.scoped,
      Effect.map(response => [response.results, response.meta.next_cursor]),
    ),
  ),
  Stream.runCollect,
  Effect.map(Chunk.fromIterable),
  Effect.map(Chunk.sortWith(field => field.id, Order.Number)),
)

const GetSubfields: Effect.Effect<
  Chunk.Chunk<typeof SubfieldSchema.Type>,
  HttpClientError.HttpClientError | Schema.SchemaError,
  HttpClient.HttpClient
> = pipe(
  Stream.paginate(
    '*',
    flow(
      cursor =>
        HttpClient.get('https://api.openalex.org/subfields', {
          urlParams: { select: Object.keys(SubfieldSchema.fields).join(','), 'per-page': 200, cursor },
        }),
      Effect.andThen(HttpClientResponse.schemaBodyJson(ListResponse(SubfieldSchema))),
      Effect.scoped,
      Effect.map(response => [response.results, response.meta.next_cursor]),
    ),
  ),
  Stream.runCollect,
  Effect.map(Chunk.fromIterable),
  Effect.map(Chunk.sortWith(subfield => subfield.id, Order.Number)),
)

const GetTopics: Effect.Effect<
  Chunk.Chunk<typeof TopicSchema.Type>,
  HttpClientError.HttpClientError | Schema.SchemaError,
  HttpClient.HttpClient
> = pipe(
  Stream.paginate(
    '*',
    flow(
      cursor =>
        HttpClient.get('https://api.openalex.org/topics', {
          urlParams: { select: Object.keys(TopicSchema.fields).join(','), 'per-page': 200, cursor },
        }),
      Effect.andThen(HttpClientResponse.schemaBodyJson(ListResponse(TopicSchema))),
      Effect.scoped,
      Effect.map(response => [response.results, response.meta.next_cursor]),
    ),
  ),
  Stream.runCollect,
  Effect.map(Chunk.fromIterable),
  Effect.map(Chunk.sortWith(topic => topic.id, Order.Number)),
)

const GetKeywords: Effect.Effect<
  Chunk.Chunk<typeof KeywordSchema.Type>,
  HttpClientError.HttpClientError | Schema.SchemaError,
  HttpClient.HttpClient
> = pipe(
  Stream.paginate(
    '*',
    flow(
      cursor =>
        HttpClient.get('https://api.openalex.org/keywords', {
          urlParams: { select: Object.keys(KeywordSchema.fields).join(','), 'per-page': 200, cursor },
        }),
      Effect.andThen(HttpClientResponse.schemaBodyJson(ListResponse(KeywordSchema))),
      Effect.scoped,
      Effect.map(response => [response.results, response.meta.next_cursor]),
    ),
  ),
  Stream.runCollect,
  Effect.map(Chunk.fromIterable),
  Effect.map(Chunk.sortWith(keyword => keyword.id, Order.String)),
)

const WriteToFile = (filePath: string) => (content: string) =>
  Effect.andThen(FileSystem.FileSystem, fileSystem =>
    fileSystem.writeFileString(path.resolve(import.meta.dirname, '..', filePath), content),
  )

const descriptionToSentence = (description: string) =>
  `${description.charAt(0).toUpperCase()}${description.slice(1)}${description.endsWith('.') ? '' : '.'}`

const FieldsToLocaleFile = flow(
  Chunk.reduce<typeof LocaleFileSchema.Type, typeof FieldSchema.Type>({}, (accumulator, field) => ({
    ...accumulator,
    [`field${field.id}`]: {
      message: field.display_name,
      description: [
        descriptionToSentence(field.description),
        `Part of the “${field.domain.display_name}” domain.`,
        field.display_name_alternatives.length > 0
          ? `Also known as ${new Intl.ListFormat('en-US', { type: 'disjunction' }).format(field.display_name_alternatives.map(name => `“${name}”`))}.`
          : undefined,
      ]
        .join(' ')
        .trim(),
    },
  })),
  Schema.encodeEffect(Schema.fromJsonString(LocaleFileSchema, { space: 2 })),
  Effect.map(String.concat('\n')),
  Effect.andThen(WriteToFile('locales/en-US/fields.json')),
)

const SubfieldsToLocaleFile = flow(
  Chunk.reduce<typeof LocaleFileSchema.Type, typeof SubfieldSchema.Type>({}, (accumulator, subfield) => ({
    ...accumulator,
    [`subfield${subfield.id}`]: {
      message: subfield.display_name,
      description: [
        typeof subfield.description === 'string' ? descriptionToSentence(subfield.description) : undefined,
        `Part of the “${subfield.field.display_name}” field in the “${subfield.domain.display_name}” domain.`,
        subfield.display_name_alternatives.length > 0
          ? `Also known as ${new Intl.ListFormat('en-US', { type: 'disjunction' }).format(subfield.display_name_alternatives.map(name => `“${name}”`))}.`
          : undefined,
      ]
        .join(' ')
        .trim(),
    },
  })),
  Schema.encodeEffect(Schema.fromJsonString(LocaleFileSchema, { space: 2 })),
  Effect.map(String.concat('\n')),
  Effect.andThen(WriteToFile('locales/en-US/subfields.json')),
)

const DomainsToTypesFile = flow(
  Chunk.reduce<typeof DomainTypesFileSchema.Type, typeof DomainSchema.Type>({}, (accumulator, domain) => ({
    ...accumulator,
    [domain.id]: { name: domain.display_name },
  })),
  Schema.encodeEffect(Schema.fromJsonString(DomainTypesFileSchema, { space: 2 })),
  Effect.map(String.concat('\n')),
  Effect.andThen(WriteToFile('src/types/data/domains.json')),
)

const FieldsToTypesFile = flow(
  Chunk.reduce<typeof FieldTypesFileSchema.Type, typeof FieldSchema.Type>({}, (accumulator, field) => ({
    ...accumulator,
    [field.id]: { name: field.display_name, domain: field.domain.id },
  })),
  Schema.encodeEffect(Schema.fromJsonString(FieldTypesFileSchema, { space: 2 })),
  Effect.map(String.concat('\n')),
  Effect.andThen(WriteToFile('src/types/data/fields.json')),
)

const SubfieldsToTypesFile = flow(
  Chunk.reduce<typeof SubfieldTypesFileSchema.Type, typeof SubfieldSchema.Type>({}, (accumulator, subfield) => ({
    ...accumulator,
    [subfield.id]: { name: subfield.display_name, domain: subfield.domain.id, field: subfield.field.id },
  })),
  Schema.encodeEffect(Schema.fromJsonString(SubfieldTypesFileSchema, { space: 2 })),
  Effect.map(String.concat('\n')),
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
  Schema.encodeEffect(Schema.fromJsonString(TopicTypesFileSchema, { space: 2 })),
  Effect.map(String.concat('\n')),
  Effect.andThen(WriteToFile('src/types/data/topics.json')),
)

const KeywordsToTypesFile = flow(
  Chunk.map<Chunk.Chunk<typeof KeywordSchema.Type>, [string, typeof KeywordTypesFileSchema.value.Type]>(keyword => [
    crypto.createHash('shake256', { outputLength: 10 }).update(keyword.id).digest('hex'),
    { name: keyword.display_name },
  ]),
  Record.fromEntries,
  Schema.encodeEffect(Schema.fromJsonString(KeywordTypesFileSchema, { space: 2 })),
  Effect.map(String.concat('\n')),
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
        Effect.map(
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
      Layer.provideMerge(Layer.mergeAll(NodeHttpClient.layerNodeHttp, NodeFileSystem.layer)),
      Layer.provideMerge(Logger.layer([Logger.consolePretty(), Logger.tracerLogger])),
    ),
  ),
  Effect.provideService(References.MinimumLogLevel, 'Debug'),
  Effect.runPromise,
)
