import { FileSystem, HttpClient, HttpClientRequest, HttpClientResponse, UrlParams } from '@effect/platform'
import { NodeFileSystem, NodeHttpClient } from '@effect/platform-node'
import {
  Array,
  Chunk,
  Config,
  Effect,
  flow,
  Layer,
  Logger,
  LogLevel,
  Option,
  pipe,
  Redacted,
  Schema,
  Stream,
  String,
} from 'effect'

const ghostApiUrl = 'https://content.prereview.org/ghost/api/content/posts/'
const outputFile = 'contentful-import/all-posts.json'
const pageSize = 100

const PostSchema = Schema.Record({ key: Schema.String, value: Schema.Unknown })

const PostsResponseSchema = Schema.Struct({
  posts: Schema.Array(PostSchema),
  meta: Schema.Struct({
    pagination: Schema.Struct({
      page: Schema.Number,
      pages: Schema.Number,
      total: Schema.Number,
      next: Schema.NullOr(Schema.Number),
    }),
  }),
})

const PostsFileSchema = Schema.Array(PostSchema)

const GetPageOfPosts = Effect.fn(function* (key: Redacted.Redacted<string>, page: number) {
  const httpClient = yield* HttpClient.HttpClient

  const response = yield* pipe(
    HttpClientRequest.get(ghostApiUrl, {
      urlParams: {
        key: Redacted.value(key),
        include: 'authors,tags',
        limit: pageSize,
        page: page,
        order: 'published_at desc',
      },
    }),
    HttpClientRequest.acceptJson,
    httpClient.execute,
    Effect.andThen(HttpClientResponse.schemaBodyJson(PostsResponseSchema)),
    Effect.scoped,
  )

  yield* Effect.logInfo('Fetched a page of posts').pipe(
    Effect.annotateLogs({
      page: response.meta.pagination.page,
      pages: response.meta.pagination.pages,
      total: response.meta.pagination.total,
      posts: response.posts.length,
    }),
  )

  return response
})

const GetAllPosts = (key: Redacted.Redacted<string>) =>
  pipe(
    Stream.paginateChunkEffect(1, (page: number) =>
      Effect.andThen(
        GetPageOfPosts(key, page),
        response =>
          [
            Chunk.unsafeFromArray(Array.copy(response.posts)),
            Option.fromNullable(response.meta.pagination.next),
          ] as const,
      ),
    ),
    Stream.runCollect,
    Effect.andThen(Chunk.toArray),
    Effect.andThen(Array.dedupeWith((a, b) => a['id'] === b['id'])),
  )

const WriteToFile = (path: string) =>
  Effect.fn(function* (content: string) {
    const fileSystem = yield* FileSystem.FileSystem

    yield* fileSystem.writeFileString(path, content)

    yield* Effect.logInfo('Written file').pipe(Effect.annotateLogs({ path }))
  })

const UpdatePosts = pipe(
  Config.redacted('GHOST_API_KEY'),
  Effect.andThen(GetAllPosts),
  Effect.tap(posts => Effect.logInfo('Fetched all posts').pipe(Effect.annotateLogs({ posts: posts.length }))),
  Effect.andThen(Schema.encode(Schema.parseJson(PostsFileSchema, { space: 2 }))),
  Effect.andThen(String.concat('\n')),
  Effect.andThen(WriteToFile(outputFile)),
)

void pipe(
  UpdatePosts,
  Effect.provide(
    pipe(
      Layer.effect(
        HttpClient.HttpClient,
        Effect.andThen(
          HttpClient.HttpClient,
          flow(
            HttpClient.filterStatusOk,
            HttpClient.tapRequest(request =>
              Effect.logDebug('Sending HTTP request').pipe(
                Effect.annotateLogs({
                  url: `${request.url}?${UrlParams.toString(UrlParams.remove(request.urlParams, 'key'))}`,
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
