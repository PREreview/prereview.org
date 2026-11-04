import { HttpBody, HttpPlatform, HttpServerRequest, HttpServerResponse } from 'effect/http'
import { describe, expect, it } from '../vitest.ts'
import { ByteSize, Effect, FileSystem, Layer, Path, PlatformError } from 'effect'
import path from 'node:path'
import * as _ from '../../src/HttpMiddleware/index.ts'
import { PublicUrl } from '../../src/public-url.ts'
import * as StatusCodes from '../../src/StatusCodes.ts'

const assetsDirectory = new URL('../../dist/assets/', import.meta.url).pathname

describe('serveStaticFiles', () => {
  it.effect('serves a file', () =>
    Effect.gen(function* () {
      const actual = yield* _.serveStaticFiles(app)

      expect(actual.body).toStrictEqual(HttpBody.text(`${assetsDirectory}file.txt`))
      expect(actual.headers['link']).toStrictEqual('<https://prereview.test/file.txt>; rel="canonical"')
      expect(actual.headers['cache-control']).toBeUndefined()
    }).pipe(Effect.provide([layer('/file.txt', ['/file.txt'])])),
  )

  it.effect('serves a file with a content hash as immutable', () =>
    Effect.gen(function* () {
      const actual = yield* _.serveStaticFiles(app)

      expect(actual.body).toStrictEqual(HttpBody.text(`${assetsDirectory}file.AbCd-12_.js`))
      expect(actual.headers['link']).toStrictEqual('<https://prereview.test/file.AbCd-12_.js>; rel="canonical"')
      expect(actual.headers['cache-control']).toStrictEqual('public, max-age=31536000, immutable')
    }).pipe(Effect.provide([layer('/file.AbCd-12_.js', ['/file.AbCd-12_.js'])])),
  )

  it.effect('ignores the query string', () =>
    Effect.gen(function* () {
      const actual = yield* _.serveStaticFiles(app)

      expect(actual.body).toStrictEqual(HttpBody.text(`${assetsDirectory}file.AbCd-12_.js`))
      expect(actual.headers['link']).toStrictEqual('<https://prereview.test/file.AbCd-12_.js>; rel="canonical"')
      expect(actual.headers['cache-control']).toStrictEqual('public, max-age=31536000, immutable')
    }).pipe(Effect.provide([layer('/file.AbCd-12_.js?v=1', ['/file.AbCd-12_.js'])])),
  )

  it.effect('passes the request on when the file does not exist', () =>
    Effect.gen(function* () {
      const actual = yield* _.serveStaticFiles(app)

      expect(actual.body).toStrictEqual(HttpBody.text('app'))
    }).pipe(Effect.provide([layer('/file.txt', [])])),
  )

  it.effect.each<[string]>([['/../../package.json'], ['/../assets.json'], ['//etc/passwd']])(
    'passes the request on when %s is outside the assets directory',
    ([url]) =>
      Effect.gen(function* () {
        const actual = yield* _.serveStaticFiles(app)

        expect(actual.body).toStrictEqual(HttpBody.text('app'))
      }).pipe(Effect.provide([layer(url, [url])])),
  )
})

describe('stopSuspiciousRequests', () => {
  it.effect.each<[string]>([
    ['/../etc/passwd'],
    ['/%2e%2e%2fetc/passwd'],
    ['/%2e%2e/etc/passwd'],
    ['/..%2fetc/passwd'],
    ['/..\\etc\\passwd'],
    ['/%2e%2e%5cetc%5cpasswd'],
    ['/%2e%2e\\etc\\passwd'],
    ['/..%5cetc%5cpasswd'],
    ['/%252e%252e%255cetc%255cpasswd'],
    ['/..%255cetc%255cpasswd'],
    ['/search?q=../etc/passwd'],
    ['/%2E%2E%2Fetc/passwd'],
    ['/..%2F..%2Fpackage.json'],
    ['/..%5Cetc%5Cpasswd'],
    ['/.%2e/etc/passwd'],
    ['/%2e./etc/passwd'],
    ['/%252e%252e%252fetc%252fpasswd'],
    ['/%25252e%25252e%25252fetc%25252fpasswd'],
    ['/%2525252e%2525252e%2525252fetc%2525252fpasswd'],
    ['/%25252561'],
  ])('returns a 404 for %s', ([url]) =>
    Effect.gen(function* () {
      const actual = yield* _.stopSuspiciousRequests(app)

      expect(actual).toStrictEqual(HttpServerResponse.empty({ status: StatusCodes.NotFound }))
    }).pipe(Effect.provide([requestLayer(url)])),
  )

  it.effect.each<[string]>([
    ['/'],
    ['/reviews'],
    ['/file.AbCd-12_.js'],
    ['/a..b'],
    ['/100%25'],
    ['/%zz'],
    ['/search?q=a..b'],
  ])('passes the request on for %s', ([url]) =>
    Effect.gen(function* () {
      const actual = yield* _.stopSuspiciousRequests(app)

      expect(actual.body).toStrictEqual(HttpBody.text('app'))
    }).pipe(Effect.provide([requestLayer(url)])),
  )
})

const app = Effect.sync(() => HttpServerResponse.text('app'))

const requestLayer = (url: string) =>
  Layer.succeed(
    HttpServerRequest.HttpServerRequest,
    HttpServerRequest.fromWeb(new Request('http://example.com')).modify({ url }),
  )

const layer = (url: string, files: ReadonlyArray<string>) =>
  Layer.mergeAll(
    requestLayer(url),
    Layer.succeed(PublicUrl, new URL('https://prereview.test')),
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
