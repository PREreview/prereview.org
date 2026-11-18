import { NodeFileSystem, NodeHttpClient } from '@effect/platform-node'
import { Temporal } from '@js-temporal/polyfill'
import {
  Array,
  Data,
  Effect,
  FileSystem,
  flow,
  Layer,
  Logger,
  Option,
  pipe,
  References,
  Schedule,
  Schema,
  Stream,
  String,
} from 'effect'
import { HttpClient, HttpClientRequest, HttpClientResponse, UrlParams } from 'effect/http'
import path from 'node:path'

const outputFile = path.resolve(import.meta.dirname, '..', '.cache', 'comment-publication-dates-to-import.json')

const RecordSchema = Schema.Struct({
  created: Schema.String,
  doi: Schema.String,
  metadata: Schema.Struct({ publication_date: Schema.String }),
})

const SearchResponseSchema = Schema.Struct({
  hits: Schema.Struct({ hits: Schema.Array(RecordSchema) }),
  links: Schema.Struct({ next: Schema.optional(Schema.String) }),
})

const OutputSchema = Schema.Array(Schema.Struct({ doi: Schema.String, publishedAt: Schema.String }))

class CreatedDoesNotMatchPublicationDate extends Data.TaggedError('CreatedDoesNotMatchPublicationDate')<{
  doi: string
  created: string
  publicationDate: string
}> {}

const GetRecordsPage = (page: number) =>
  pipe(
    HttpClient.get('https://zenodo.org/api/communities/prereview-reviews/records', {
      urlParams: {
        q: 'related.relation:"references"',
        page,
        size: 25,
        sort: 'oldest',
        resource_type: 'publication::publication-other',
        access_status: 'open',
      },
    }),
    Effect.andThen(HttpClientResponse.schemaBodyJson(SearchResponseSchema)),
    Effect.scoped,
    Effect.tap(response =>
      Effect.logInfo('Downloaded page').pipe(Effect.annotateLogs({ page, records: response.hits.hits.length })),
    ),
    Effect.map(
      response => [response.hits.hits, Option.as(Option.fromUndefinedOr(response.links.next), page + 1)] as const,
    ),
    Effect.delay('2 seconds'),
  )

const getPublishedAt = (record: typeof RecordSchema.Type) => {
  const publicationDate = Temporal.PlainDate.from(record.metadata.publication_date)
  const created = Temporal.Instant.from(record.created)

  if (
    !Array.some(['UTC', 'Europe/Zurich'], timeZone =>
      created.toZonedDateTimeISO(timeZone).toPlainDate().equals(publicationDate),
    )
  ) {
    return Effect.fail(
      new CreatedDoesNotMatchPublicationDate({
        doi: record.doi,
        created: record.created,
        publicationDate: record.metadata.publication_date,
      }),
    )
  }

  return Effect.succeed({ doi: record.doi, publishedAt: created.toString() })
}

const ConvertComments = pipe(
  Stream.paginate(1, GetRecordsPage),
  Stream.mapEffect(getPublishedAt),
  Stream.runCollect,
  Effect.andThen(Schema.encodeEffect(Schema.fromJsonString(OutputSchema, { space: 2 }))),
  Effect.map(String.concat('\n')),
  Effect.andThen(content =>
    Effect.andThen(FileSystem.FileSystem, fileSystem => fileSystem.writeFileString(outputFile, content)),
  ),
  Effect.tap(() => Effect.logInfo('Wrote comment publication dates').pipe(Effect.annotateLogs({ outputFile }))),
)

void pipe(
  ConvertComments,
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
            HttpClient.filterStatusOk,
            HttpClient.retryTransient({ schedule: Schedule.exponential('1 second'), times: 5 }),
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
