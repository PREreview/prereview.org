import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import fetchMock from 'fetch-mock'
import * as E from 'fp-ts/Either'
import { Status } from 'hyper-ts'
import * as _ from '../src/ghost'
import { rawHtml } from '../src/html'
import * as fc from './fc'

describe('getPage', () => {
  test.prop([
    fc.stringOf(fc.alphanumeric(), { minLength: 1 }),
    fc.stringOf(fc.alphanumeric(), { minLength: 1 }),
    fc.sanitisedHtml(),
  ])('when the page can be decoded', async (id, key, html) => {
    const actual = await _.getPage(id)({
      fetch: fetchMock
        .sandbox()
        .getOnce(
          { url: `https://content.prereview.org/ghost/api/content/pages/${id}`, query: { key } },
          { body: { pages: [{ html: html.toString() }] } },
        ),
      ghostApi: { key },
    })()

    expect(actual).toStrictEqual(E.right(html))
  })

  test.prop([fc.stringOf(fc.alphanumeric(), { minLength: 1 }), fc.stringOf(fc.alphanumeric(), { minLength: 1 })])(
    'when the page contains an image',
    async (id, key) => {
      const actual = await _.getPage(id)({
        fetch: fetchMock.sandbox().getOnce(
          { url: `https://content.prereview.org/ghost/api/content/pages/${id}`, query: { key } },
          {
            body: {
              pages: [
                {
                  html: '<figure class="kg-card kg-image-card"><img src="https://content.prereview.org/content/images/2021/09/Screen-Shot-2021-09-30-at-11.52.02-AM.png" class="kg-image" alt loading="lazy" width="1464" height="192" srcset="https://content.prereview.org/content/images/size/w600/2021/09/Screen-Shot-2021-09-30-at-11.52.02-AM.png 600w, https://content.prereview.org/content/images/size/w1000/2021/09/Screen-Shot-2021-09-30-at-11.52.02-AM.png 1000w, https://content.prereview.org/content/images/2021/09/Screen-Shot-2021-09-30-at-11.52.02-AM.png 1464w" sizes="(min-width: 720px) 720px"></figure>',
                },
              ],
            },
          },
        ),
        ghostApi: { key },
      })()

      expect(actual).toStrictEqual(
        E.right(
          rawHtml(
            '<img src="https://content.prereview.org/content/images/2021/09/Screen-Shot-2021-09-30-at-11.52.02-AM.png" width="1464" height="192" />',
          ),
        ),
      )
    },
  )

  test.prop([fc.stringOf(fc.alphanumeric(), { minLength: 1 }), fc.stringOf(fc.alphanumeric(), { minLength: 1 })])(
    'when the page contains a button',
    async (id, key) => {
      const actual = await _.getPage(id)({
        fetch: fetchMock.sandbox().getOnce(
          { url: `https://content.prereview.org/ghost/api/content/pages/${id}`, query: { key } },
          {
            body: {
              pages: [
                {
                  html: '<div class="kg-card kg-button-card kg-align-center"><a href="https://donorbox.org/prereview" class="kg-btn kg-btn-accent">Donate</a></div>',
                },
              ],
            },
          },
        ),
        ghostApi: { key },
      })()

      expect(actual).toStrictEqual(
        E.right(rawHtml('<a href="https://donorbox.org/prereview" class="button">Donate</a>')),
      )
    },
  )

  test.prop([
    fc.stringOf(fc.alphanumeric(), { minLength: 1 }),
    fc.stringOf(fc.alphanumeric(), { minLength: 1 }),
    fc.sanitisedHtml(),
  ])("revalidates the page if it's stale", async (id, key, html) => {
    const fetch = fetchMock
      .sandbox()
      .getOnce(
        (requestUrl, { cache }) =>
          requestUrl === `https://content.prereview.org/ghost/api/content/pages/${id}?key=${key}` &&
          cache === 'force-cache',
        { body: { pages: [{ html: html.toString() }] }, headers: { 'X-Local-Cache-Status': 'stale' } },
      )
      .getOnce(
        (requestUrl, { cache }) =>
          requestUrl === `https://content.prereview.org/ghost/api/content/pages/${id}?key=${key}` &&
          cache === 'no-cache',
        { throws: new Error('Network error') },
      )

    const actual = await _.getPage(id)({
      fetch,
      ghostApi: { key },
    })()

    expect(actual).toStrictEqual(E.right(html))
    expect(fetch.done()).toBeTruthy()
  })

  test.prop([
    fc.stringOf(fc.alphanumeric(), { minLength: 1 }),
    fc.stringOf(fc.alphanumeric(), { minLength: 1 }),
    fc.fetchResponse({ status: fc.constant(Status.OK) }),
  ])('when the response cannot be decoded', async (id, key, response) => {
    const fetch = fetchMock
      .sandbox()
      .getOnce({ url: `begin:https://content.prereview.org/ghost/api/content/pages/${id}?`, query: { key } }, response)

    const actual = await _.getPage(id)({
      fetch,
      ghostApi: { key },
    })()

    expect(actual).toStrictEqual(E.left('unavailable'))
    expect(fetch.done()).toBeTruthy()
  })

  test.prop([fc.stringOf(fc.alphanumeric(), { minLength: 1 }), fc.stringOf(fc.alphanumeric(), { minLength: 1 })])(
    'when the response has a 404 status code',
    async (id, key) => {
      const fetch = fetchMock
        .sandbox()
        .getOnce(
          { url: `https://content.prereview.org/ghost/api/content/pages/${id}`, query: { key } },
          Status.NotFound,
        )

      const actual = await _.getPage(id)({
        fetch,
        ghostApi: { key },
      })()

      expect(actual).toStrictEqual(E.left('not-found'))
    },
  )

  test.prop([
    fc.stringOf(fc.alphanumeric(), { minLength: 1 }),
    fc.stringOf(fc.alphanumeric(), { minLength: 1 }),
    fc.integer({ min: 200, max: 599 }).filter(status => status !== Status.OK && status !== Status.NotFound),
  ])('when the response has a non-200/404 status code', async (id, key, status) => {
    const fetch = fetchMock
      .sandbox()
      .getOnce({ url: `begin:https://content.prereview.org/ghost/api/content/pages/${id}?`, query: { key } }, status)

    const actual = await _.getPage(id)({
      fetch,
      ghostApi: { key },
    })()

    expect(actual).toStrictEqual(E.left('unavailable'))
    expect(fetch.done()).toBeTruthy()
  })

  test.prop([
    fc.stringOf(fc.alphanumeric(), { minLength: 1 }),
    fc.stringOf(fc.alphanumeric(), { minLength: 1 }),
    fc.error(),
  ])('when fetch throws an error', async (id, key, error) => {
    const actual = await _.getPage(id)({
      fetch: () => Promise.reject(error),
      ghostApi: { key },
    })()

    expect(actual).toStrictEqual(E.left('unavailable'))
  })
})
