import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Effect, Layer } from 'effect'
import { Ghost } from '../../src/ExternalApis/index.js'
import * as _ from '../../src/GhostPage/GetPage.js'
import { rawHtml } from '../../src/html.js'
import * as EffectTest from '../EffectTest.js'
import * as fc from '../fc.js'

describe('getPage', () => {
  test.prop([fc.string({ unit: fc.alphanumeric(), minLength: 1 }), fc.sanitisedHtml()])(
    'when the page can be loaded',
    (id, html) =>
      Effect.gen(function* () {
        const actual = yield* _.getPage(id).pipe(
          Effect.provide(Layer.mock(Ghost.Ghost, { getPage: () => Effect.succeed(new Ghost.Page({ html })) })),
        )

        expect(actual).toStrictEqual(html)
      }).pipe(EffectTest.run),
  )

  test.prop([fc.string({ unit: fc.alphanumeric(), minLength: 1 })])('when the page contains links', id =>
    Effect.gen(function* () {
      const actual = yield* _.getPage(id).pipe(
        Effect.provide(
          Layer.mock(Ghost.Ghost, {
            getPage: () =>
              Effect.succeed(
                new Ghost.Page({
                  html: rawHtml(
                    '<a href="https://airtable.com/appNMgC4snjFIJQ0X/shrV1HBbujo5ZZbzN">Start a Club!</a><a href="https://prereview.org/clubs/asapbio-cancer-biology" rel="noopener noreferrer">ASAPbio Cancer Biology Crowd</a><a href="https://prereview.org/clubs/asapbio-metabolism" rel="noopener noreferrer">ASAPbio Metabolism Crowd</a><a href="http://prereview.org">PREreview</a>',
                  ),
                }),
              ),
          }),
        ),
      )

      expect(actual).toStrictEqual(
        rawHtml(
          '<a href="https://airtable.com/appNMgC4snjFIJQ0X/shrV1HBbujo5ZZbzN">Start a Club!</a><a href="/clubs/asapbio-cancer-biology">ASAPbio Cancer Biology Crowd</a><a href="/clubs/asapbio-metabolism">ASAPbio Metabolism Crowd</a><a href="/">PREreview</a>',
        ),
      )
    }).pipe(EffectTest.run),
  )

  test.prop([fc.string({ unit: fc.alphanumeric(), minLength: 1 })])('when the page contains an image', id =>
    Effect.gen(function* () {
      const actual = yield* _.getPage(id).pipe(
        Effect.provide(
          Layer.mock(Ghost.Ghost, {
            getPage: () =>
              Effect.succeed(
                new Ghost.Page({
                  html: rawHtml(
                    '<figure class="kg-card kg-image-card"><img src="https://content.prereview.org/content/images/2021/09/Screen-Shot-2021-09-30-at-11.52.02-AM.png" class="kg-image" alt loading="lazy" width="1464" height="192" srcset="https://content.prereview.org/content/images/size/w600/2021/09/Screen-Shot-2021-09-30-at-11.52.02-AM.png 600w, https://content.prereview.org/content/images/size/w1000/2021/09/Screen-Shot-2021-09-30-at-11.52.02-AM.png 1000w, https://content.prereview.org/content/images/2021/09/Screen-Shot-2021-09-30-at-11.52.02-AM.png 1464w" sizes="(min-width: 720px) 720px"></figure>',
                  ),
                }),
              ),
          }),
        ),
      )

      expect(actual).toStrictEqual(
        rawHtml(
          '<img src="https://content.prereview.org/content/images/2021/09/Screen-Shot-2021-09-30-at-11.52.02-AM.png" alt="" width="1464" height="192" />',
        ),
      )
    }).pipe(EffectTest.run),
  )

  test.prop([fc.string({ unit: fc.alphanumeric(), minLength: 1 })])('when the page contains a button', id =>
    Effect.gen(function* () {
      const actual = yield* _.getPage(id).pipe(
        Effect.provide(
          Layer.mock(Ghost.Ghost, {
            getPage: () =>
              Effect.succeed(
                new Ghost.Page({
                  html: rawHtml(
                    '<div class="kg-card kg-button-card kg-align-center"><a href="https://donorbox.org/prereview" class="kg-btn kg-btn-accent">Donate</a></div>',
                  ),
                }),
              ),
          }),
        ),
      )

      expect(actual).toStrictEqual(rawHtml('<a href="https://donorbox.org/prereview" class="button">Donate</a>'))
    }).pipe(EffectTest.run),
  )

  test.prop([fc.string({ unit: fc.alphanumeric(), minLength: 1 })])('when the page contains a heading with an ID', id =>
    Effect.gen(function* () {
      const actual = yield* _.getPage(id).pipe(
        Effect.provide(
          Layer.mock(Ghost.Ghost, {
            getPage: () => Effect.succeed(new Ghost.Page({ html: rawHtml('<h2 id="some-heading">Some heading</h2>') })),
          }),
        ),
      )

      expect(actual).toStrictEqual(rawHtml('<h2 id="some-heading">Some heading</h2>'))
    }).pipe(EffectTest.run),
  )
})
