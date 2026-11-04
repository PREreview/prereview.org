import { HttpBody, HttpPlatform, HttpServerRequest, HttpServerResponse } from 'effect/http'
import { describe, expect, it } from '../vitest.ts'
import { ByteSize, Effect, FileSystem, Layer, Path, PlatformError } from 'effect'
import path from 'node:path'
import * as _ from '../../src/HttpMiddleware/index.ts'

const assetsDirectory = new URL('../../dist/assets/', import.meta.url).pathname

describe('serveStaticFiles', () => {
  it.effect('serves a file', () =>
    Effect.gen(function* () {
      const actual = yield* _.serveStaticFiles(app)

      expect(actual.body).toStrictEqual(HttpBody.text(`${assetsDirectory}file.txt`))
      expect(actual.headers['cache-control']).toBeUndefined()
    }).pipe(Effect.provide([layer('/file.txt', ['/file.txt'])])),
  )

  it.effect('serves a file with a content hash as immutable', () =>
    Effect.gen(function* () {
      const actual = yield* _.serveStaticFiles(app)

      expect(actual.body).toStrictEqual(HttpBody.text(`${assetsDirectory}file.AbCd-12_.js`))
      expect(actual.headers['cache-control']).toStrictEqual('public, max-age=31536000, immutable')
    }).pipe(Effect.provide([layer('/file.AbCd-12_.js', ['/file.AbCd-12_.js'])])),
  )

  it.effect('passes the request on when the file does not exist', () =>
    Effect.gen(function* () {
      const actual = yield* _.serveStaticFiles(app)

      expect(actual.body).toStrictEqual(HttpBody.text('app'))
    }).pipe(Effect.provide([layer('/file.txt', [])])),
  )

  it.effect.each<[string]>([['/../../package.json'], ['//etc/passwd']])(
    'passes the request on when %s is outside the assets directory',
    ([url]) =>
      Effect.gen(function* () {
        const actual = yield* _.serveStaticFiles(app)

        expect(actual.body).toStrictEqual(HttpBody.text('app'))
      }).pipe(Effect.provide([layer(url, [url])])),
  )
})

const app = Effect.sync(() => HttpServerResponse.text('app'))

const layer = (url: string, files: ReadonlyArray<string>) =>
  Layer.mergeAll(
    Layer.succeed(
      HttpServerRequest.HttpServerRequest,
      HttpServerRequest.fromWeb(new Request('http://example.com')).modify({ url }),
    ),
    Path.layer,
    FileSystem.layerNoop({
      stat: filePath =>
        files.some(file => path.resolve(assetsDirectory, file.slice(1)) === filePath)
          ? Effect.succeed({ type: 'File', size: ByteSize.bytes(1) } as FileSystem.File.Info)
          : Effect.fail(
              PlatformError.systemError({
                _tag: 'NotFound',
                module: 'FileSystem',
                method: 'stat',
                pathOrDescriptor: filePath,
              }),
            ),
    }),
    Layer.succeed(
      HttpPlatform.HttpPlatform,
      HttpPlatform.HttpPlatform.of({
        platform: 'node',
        compression: { algorithms: new Set(), compressResponse: response => Effect.succeed(response) },
        fileResponse: filePath => Effect.succeed(HttpServerResponse.text(filePath)),
        fileWebResponse: () => Effect.die('unused'),
      }),
    ),
  )
