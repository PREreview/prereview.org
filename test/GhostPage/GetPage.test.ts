import { FetchHttpClient } from '@effect/platform'
import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Effect, Redacted } from 'effect'
import fetchMock from 'fetch-mock'
import { Ghost } from '../../src/ExternalApis/index.js'
import * as _ from '../../src/GhostPage/GetPage.js'
import { rawHtml } from '../../src/html.js'
import * as StatusCodes from '../../src/StatusCodes.js'
import * as EffectTest from '../EffectTest.js'
import * as fc from '../fc.js'

describe('getPage', () => {
  test.prop([
    fc.string({ unit: fc.alphanumeric(), minLength: 1 }),
    fc.string({ unit: fc.alphanumeric(), minLength: 1 }),
    fc.sanitisedHtml(),
  ])('when the page can be decoded', (id, key, html) =>
    Effect.gen(function* () {
      const actual = yield* _.getPage(id).pipe(
        Effect.provide(FetchHttpClient.layer),
        Effect.provideService(
          FetchHttpClient.Fetch,
          fetchMock
            .sandbox()
            .getOnce(
              { url: `https://content.prereview.org/ghost/api/content/pages/${id}/`, query: { key } },
              { body: { pages: [{ html: html.toString() }] } },
            ) as never,
        ),
        Effect.provideService(Ghost.GhostApi, { key: Redacted.make(key) }),
      )

      expect(actual).toStrictEqual(html)
    }).pipe(EffectTest.run),
  )

  test.prop([
    fc.string({ unit: fc.alphanumeric(), minLength: 1 }),
    fc.string({ unit: fc.alphanumeric(), minLength: 1 }),
  ])('when the page contains links', (id, key) =>
    Effect.gen(function* () {
      const actual = yield* _.getPage(id).pipe(
        Effect.provide(FetchHttpClient.layer),
        Effect.provideService(
          FetchHttpClient.Fetch,
          fetchMock.sandbox().getOnce(
            { url: `https://content.prereview.org/ghost/api/content/pages/${id}/`, query: { key } },
            {
              body: {
                pages: [
                  {
                    html: '<a href="https://airtable.com/appNMgC4snjFIJQ0X/shrV1HBbujo5ZZbzN">Start a Club!</a><a href="https://prereview.org/clubs/asapbio-cancer-biology" rel="noopener noreferrer">ASAPbio Cancer Biology Crowd</a><a href="https://prereview.org/clubs/asapbio-metabolism" rel="noopener noreferrer">ASAPbio Metabolism Crowd</a><a href="http://prereview.org">PREreview</a>',
                  },
                ],
              },
            },
          ) as never,
        ),
        Effect.provideService(Ghost.GhostApi, { key: Redacted.make(key) }),
      )

      expect(actual).toStrictEqual(
        rawHtml(
          '<a href="https://airtable.com/appNMgC4snjFIJQ0X/shrV1HBbujo5ZZbzN">Start a Club!</a><a href="/clubs/asapbio-cancer-biology">ASAPbio Cancer Biology Crowd</a><a href="/clubs/asapbio-metabolism">ASAPbio Metabolism Crowd</a><a href="/">PREreview</a>',
        ),
      )
    }).pipe(EffectTest.run),
  )

  test.prop([
    fc.string({ unit: fc.alphanumeric(), minLength: 1 }),
    fc.string({ unit: fc.alphanumeric(), minLength: 1 }),
  ])('when the page contains an image', (id, key) =>
    Effect.gen(function* () {
      const actual = yield* _.getPage(id).pipe(
        Effect.provide(FetchHttpClient.layer),
        Effect.provideService(
          FetchHttpClient.Fetch,
          fetchMock.sandbox().getOnce(
            { url: `https://content.prereview.org/ghost/api/content/pages/${id}/`, query: { key } },
            {
              body: {
                pages: [
                  {
                    html: '<figure class="kg-card kg-image-card"><img src="https://content.prereview.org/content/images/2021/09/Screen-Shot-2021-09-30-at-11.52.02-AM.png" class="kg-image" alt loading="lazy" width="1464" height="192" srcset="https://content.prereview.org/content/images/size/w600/2021/09/Screen-Shot-2021-09-30-at-11.52.02-AM.png 600w, https://content.prereview.org/content/images/size/w1000/2021/09/Screen-Shot-2021-09-30-at-11.52.02-AM.png 1000w, https://content.prereview.org/content/images/2021/09/Screen-Shot-2021-09-30-at-11.52.02-AM.png 1464w" sizes="(min-width: 720px) 720px"></figure>',
                  },
                ],
              },
            },
          ) as never,
        ),
        Effect.provideService(Ghost.GhostApi, { key: Redacted.make(key) }),
      )

      expect(actual).toStrictEqual(
        rawHtml(
          '<img src="https://content.prereview.org/content/images/2021/09/Screen-Shot-2021-09-30-at-11.52.02-AM.png" alt="" width="1464" height="192" />',
        ),
      )
    }).pipe(EffectTest.run),
  )

  test.prop([
    fc.string({ unit: fc.alphanumeric(), minLength: 1 }),
    fc.string({ unit: fc.alphanumeric(), minLength: 1 }),
  ])('when the page contains a button', (id, key) =>
    Effect.gen(function* () {
      const actual = yield* _.getPage(id).pipe(
        Effect.provide(FetchHttpClient.layer),
        Effect.provideService(
          FetchHttpClient.Fetch,
          fetchMock.sandbox().getOnce(
            { url: `https://content.prereview.org/ghost/api/content/pages/${id}/`, query: { key } },
            {
              body: {
                pages: [
                  {
                    html: '<div class="kg-card kg-button-card kg-align-center"><a href="https://donorbox.org/prereview" class="kg-btn kg-btn-accent">Donate</a></div>',
                  },
                ],
              },
            },
          ) as never,
        ),
        Effect.provideService(Ghost.GhostApi, { key: Redacted.make(key) }),
      )

      expect(actual).toStrictEqual(rawHtml('<a href="https://donorbox.org/prereview" class="button">Donate</a>'))
    }).pipe(EffectTest.run),
  )

  test.prop([
    fc.string({ unit: fc.alphanumeric(), minLength: 1 }),
    fc.string({ unit: fc.alphanumeric(), minLength: 1 }),
  ])('when the page contains a heading with an ID', (id, key) =>
    Effect.gen(function* () {
      const actual = yield* _.getPage(id).pipe(
        Effect.provide(FetchHttpClient.layer),
        Effect.provideService(
          FetchHttpClient.Fetch,
          fetchMock.sandbox().getOnce(
            { url: `https://content.prereview.org/ghost/api/content/pages/${id}/`, query: { key } },
            {
              body: {
                pages: [
                  {
                    html: '<h2 id="some-heading">Some heading</h2>',
                  },
                ],
              },
            },
          ) as never,
        ),
        Effect.provideService(Ghost.GhostApi, { key: Redacted.make(key) }),
      )

      expect(actual).toStrictEqual(rawHtml('<h2 id="some-heading">Some heading</h2>'))
    }).pipe(EffectTest.run),
  )

  test.prop([
    fc.string({ unit: fc.alphanumeric(), minLength: 1 }),
    fc.string({ unit: fc.alphanumeric(), minLength: 1 }),
    fc.fetchResponse({ status: fc.constant(StatusCodes.OK) }),
  ])('when the response cannot be decoded', (id, key, response) =>
    Effect.gen(function* () {
      const fetch = fetchMock
        .sandbox()
        .getOnce(
          { url: `begin:https://content.prereview.org/ghost/api/content/pages/${id}/?`, query: { key } },
          response,
        )

      const actual = yield* _.getPage(id).pipe(
        Effect.flip,
        Effect.provide(FetchHttpClient.layer),
        Effect.provideService(FetchHttpClient.Fetch, fetch as never),
        Effect.provideService(Ghost.GhostApi, { key: Redacted.make(key) }),
      )

      expect(actual).toStrictEqual(new Ghost.GhostPageUnavailable({}))
      expect(fetch.done()).toBeTruthy()
    }).pipe(EffectTest.run),
  )

  test.prop([
    fc.string({ unit: fc.alphanumeric(), minLength: 1 }),
    fc.string({ unit: fc.alphanumeric(), minLength: 1 }),
  ])('when the response has a 404 status code', (id, key) =>
    Effect.gen(function* () {
      const fetch = fetchMock
        .sandbox()
        .getOnce(
          { url: `https://content.prereview.org/ghost/api/content/pages/${id}/`, query: { key } },
          StatusCodes.NotFound,
        )

      const actual = yield* _.getPage(id).pipe(
        Effect.flip,
        Effect.provide(FetchHttpClient.layer),
        Effect.provideService(FetchHttpClient.Fetch, fetch as never),
        Effect.provideService(Ghost.GhostApi, { key: Redacted.make(key) }),
      )

      expect(actual).toStrictEqual(new Ghost.GhostPageNotFound({}))
    }).pipe(EffectTest.run),
  )

  test.prop([
    fc.string({ unit: fc.alphanumeric(), minLength: 1 }),
    fc.string({ unit: fc.alphanumeric(), minLength: 1 }),
    fc.integer({ min: 200, max: 599 }).filter(status => status !== StatusCodes.OK && status !== StatusCodes.NotFound),
  ])('when the response has a non-200/404 status code', (id, key, status) =>
    Effect.gen(function* () {
      const fetch = fetchMock
        .sandbox()
        .getOnce({ url: `begin:https://content.prereview.org/ghost/api/content/pages/${id}/?`, query: { key } }, status)

      const actual = yield* _.getPage(id).pipe(
        Effect.flip,
        Effect.provide(FetchHttpClient.layer),
        Effect.provideService(FetchHttpClient.Fetch, fetch as never),
        Effect.provideService(Ghost.GhostApi, { key: Redacted.make(key) }),
      )

      expect(actual).toStrictEqual(new Ghost.GhostPageUnavailable({}))
      expect(fetch.done()).toBeTruthy()
    }).pipe(EffectTest.run),
  )

  test.prop([
    fc.string({ unit: fc.alphanumeric(), minLength: 1 }),
    fc.string({ unit: fc.alphanumeric(), minLength: 1 }),
    fc.error(),
  ])('when fetch throws an error', (id, key, error) =>
    Effect.gen(function* () {
      const actual = yield* _.getPage(id).pipe(
        Effect.flip,
        Effect.provide(FetchHttpClient.layer),
        Effect.provideService(FetchHttpClient.Fetch, () => Promise.reject(error)),
      )

      expect(actual).toStrictEqual(new Ghost.GhostPageUnavailable({}))
    }).pipe(Effect.provideService(Ghost.GhostApi, { key: Redacted.make(key) }), EffectTest.run),
  )
})
