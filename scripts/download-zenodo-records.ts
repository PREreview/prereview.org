import { NodeFileSystem, NodeHttpClient } from '@effect/platform-node'
import {
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

const outputDirectory = path.resolve(import.meta.dirname, '..', '.cache', 'zenodo-records')

const RecordSchema = Schema.StructWithRest(Schema.Struct({ id: Schema.Number }), [
  Schema.Record(Schema.String, Schema.Json),
])

const SearchResponseSchema = Schema.Struct({
  hits: Schema.Struct({ hits: Schema.Array(RecordSchema) }),
  links: Schema.Struct({ next: Schema.optional(Schema.String) }),
})

const GetRecordsPage = (page: number) =>
  pipe(
    HttpClient.get('https://zenodo.org/api/communities/prereview-reviews/records', {
      urlParams: {
        q: 'metadata.related_identifiers.resource_type.id:"publication-preprint"',
        page,
        size: 25,
        sort: 'oldest',
        resource_type: 'publication::publication-peerreview',
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

const RecordFilesSchema = Schema.Struct({
  files: Schema.optional(
    Schema.Array(Schema.Struct({ key: Schema.String, links: Schema.Struct({ self: Schema.String }) })),
  ),
})

const OutputFileSchema = Schema.Struct({ record: RecordSchema, html: Schema.NullOr(Schema.String) })

const GetHtml = (record: typeof RecordSchema.Type) =>
  pipe(
    Schema.decodeUnknownEffect(RecordFilesSchema)(record),
    Effect.andThen(({ files = [] }) => {
      const [file, ...otherFiles] = files

      if (file === undefined || otherFiles.length > 0 || !file.key.endsWith('.html')) {
        return Effect.as(
          Effect.logWarning('Record does not have exactly one HTML file').pipe(
            Effect.annotateLogs({ record: record.id, files: files.map(file => file.key) }),
          ),
          Option.none(),
        )
      }

      return pipe(
        HttpClient.get(file.links.self),
        Effect.andThen(response => response.text),
        Effect.scoped,
        Effect.map(Option.some),
        Effect.delay('500 millis'),
      )
    }),
  )

const WriteRecord = (record: typeof RecordSchema.Type, html: Option.Option<string>) =>
  pipe(
    Schema.encodeEffect(Schema.fromJsonString(OutputFileSchema, { space: 2 }))({
      record,
      html: Option.getOrNull(html),
    }),
    Effect.map(String.concat('\n')),
    Effect.andThen(content =>
      Effect.andThen(FileSystem.FileSystem, fileSystem =>
        fileSystem.writeFileString(path.join(outputDirectory, `${record.id}.json`), content),
      ),
    ),
  )

const DownloadRecord = (record: typeof RecordSchema.Type) =>
  pipe(
    GetHtml(record),
    Effect.tap(html => WriteRecord(record, html)),
  )

const PrepareOutputDirectory = Effect.andThen(FileSystem.FileSystem, fileSystem =>
  Effect.andThen(fileSystem.remove(outputDirectory, { recursive: true, force: true }), () =>
    fileSystem.makeDirectory(outputDirectory, { recursive: true }),
  ),
)

const DownloadRecords = pipe(
  PrepareOutputDirectory,
  Effect.andThen(() =>
    pipe(
      Stream.paginate(1, GetRecordsPage),
      Stream.mapEffect(DownloadRecord),
      Stream.runFold(
        () => ({ count: 0, withoutHtml: 0 }),
        ({ count, withoutHtml }, html) => ({
          count: count + 1,
          withoutHtml: withoutHtml + (Option.isNone(html) ? 1 : 0),
        }),
      ),
    ),
  ),
  Effect.tap(({ count }) => Effect.logInfo('Downloaded records').pipe(Effect.annotateLogs({ count, outputDirectory }))),
  Effect.tap(({ withoutHtml }) =>
    withoutHtml > 0
      ? Effect.logWarning('Some records do not have exactly one HTML file').pipe(Effect.annotateLogs({ withoutHtml }))
      : Effect.void,
  ),
)

void pipe(
  DownloadRecords,
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
