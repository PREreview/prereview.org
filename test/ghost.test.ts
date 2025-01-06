import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Redacted } from 'effect'
import fetchMock from 'fetch-mock'
import * as E from 'fp-ts/lib/Either.js'
import { Status } from 'hyper-ts'
import * as _ from '../src/ghost.js'
import { rawHtml } from '../src/html.js'
import * as fc from './fc.js'

describe('getPage', () => {
  test.prop([
    fc.string({ unit: fc.alphanumeric(), minLength: 1 }),
    fc.string({ unit: fc.alphanumeric(), minLength: 1 }),
    fc.sanitisedHtml(),
  ])('when the page can be decoded', async (id, key, html) => {
    const actual = await _.getPage(id)({
      fetch: fetchMock
        .sandbox()
        .getOnce(
          { url: `https://content.prereview.org/ghost/api/content/pages/${id}`, query: { key } },
          { body: { pages: [{ html: html.toString() }] } },
        ),
      ghostApi: { key: Redacted.make(key) },
    })()

    expect(actual).toStrictEqual(E.right(html))
  })

  test.prop([
    fc.string({ unit: fc.alphanumeric(), minLength: 1 }),
    fc.string({ unit: fc.alphanumeric(), minLength: 1 }),
  ])('when the page contains links', async (id, key) => {
    const actual = await _.getPage(id)({
      fetch: fetchMock.sandbox().getOnce(
        { url: `https://content.prereview.org/ghost/api/content/pages/${id}`, query: { key } },
        {
          body: {
            pages: [
              {
                html: '<a href="https://airtable.com/appNMgC4snjFIJQ0X/shrV1HBbujo5ZZbzN">Start a Club!</a><a href="https://prereview.org/clubs/asapbio-cancer-biology" rel="noopener noreferrer">ASAPbio Cancer Biology Crowd</a><a href="https://prereview.org/clubs/asapbio-metabolism" rel="noopener noreferrer">ASAPbio Metabolism Crowd</a><a href="http://prereview.org">PREreview</a>',
              },
            ],
          },
        },
      ),
      ghostApi: { key: Redacted.make(key) },
    })()

    expect(actual).toStrictEqual(
      E.right(
        rawHtml(
          '<a href="https://airtable.com/appNMgC4snjFIJQ0X/shrV1HBbujo5ZZbzN">Start a Club!</a><a href="/clubs/asapbio-cancer-biology">ASAPbio Cancer Biology Crowd</a><a href="/clubs/asapbio-metabolism">ASAPbio Metabolism Crowd</a><a href="/">PREreview</a>',
        ),
      ),
    )
  })

  test.prop([
    fc.string({ unit: fc.alphanumeric(), minLength: 1 }),
    fc.string({ unit: fc.alphanumeric(), minLength: 1 }),
  ])('when the page contains an image', async (id, key) => {
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
      ghostApi: { key: Redacted.make(key) },
    })()

    expect(actual).toStrictEqual(
      E.right(
        rawHtml(
          '<img src="https://content.prereview.org/content/images/2021/09/Screen-Shot-2021-09-30-at-11.52.02-AM.png" alt="" width="1464" height="192" />',
        ),
      ),
    )
  })

  test.prop([
    fc.string({ unit: fc.alphanumeric(), minLength: 1 }),
    fc.string({ unit: fc.alphanumeric(), minLength: 1 }),
  ])('when the page contains a button', async (id, key) => {
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
      ghostApi: { key: Redacted.make(key) },
    })()

    expect(actual).toStrictEqual(E.right(rawHtml('<a href="https://donorbox.org/prereview" class="button">Donate</a>')))
  })

  test.prop([
    fc.string({ unit: fc.alphanumeric(), minLength: 1 }),
    fc.string({ unit: fc.alphanumeric(), minLength: 1 }),
  ])('when the page contains a heading with an ID', async (id, key) => {
    const actual = await _.getPage(id)({
      fetch: fetchMock.sandbox().getOnce(
        { url: `https://content.prereview.org/ghost/api/content/pages/${id}`, query: { key } },
        {
          body: {
            pages: [
              {
                html: '<h2 id="some-heading">Some heading</h2>',
              },
            ],
          },
        },
      ),
      ghostApi: { key: Redacted.make(key) },
    })()

    expect(actual).toStrictEqual(E.right(rawHtml('<h2 id="some-heading">Some heading</h2>')))
  })

  test.prop([
    fc.string({ unit: fc.alphanumeric(), minLength: 1 }),
    fc.string({ unit: fc.alphanumeric(), minLength: 1 }),
    fc.fetchResponse({ status: fc.constant(Status.OK) }),
  ])('when the response cannot be decoded', async (id, key, response) => {
    const fetch = fetchMock
      .sandbox()
      .getOnce({ url: `begin:https://content.prereview.org/ghost/api/content/pages/${id}?`, query: { key } }, response)

    const actual = await _.getPage(id)({
      fetch,
      ghostApi: { key: Redacted.make(key) },
    })()

    expect(actual).toStrictEqual(E.left('unavailable'))
    expect(fetch.done()).toBeTruthy()
  })

  test.prop([
    fc.string({ unit: fc.alphanumeric(), minLength: 1 }),
    fc.string({ unit: fc.alphanumeric(), minLength: 1 }),
  ])('when the response has a 404 status code', async (id, key) => {
    const fetch = fetchMock
      .sandbox()
      .getOnce({ url: `https://content.prereview.org/ghost/api/content/pages/${id}`, query: { key } }, Status.NotFound)

    const actual = await _.getPage(id)({
      fetch,
      ghostApi: { key: Redacted.make(key) },
    })()

    expect(actual).toStrictEqual(E.left('not-found'))
  })

  test.prop([
    fc.string({ unit: fc.alphanumeric(), minLength: 1 }),
    fc.string({ unit: fc.alphanumeric(), minLength: 1 }),
    fc.integer({ min: 200, max: 599 }).filter(status => status !== Status.OK && status !== Status.NotFound),
  ])('when the response has a non-200/404 status code', async (id, key, status) => {
    const fetch = fetchMock
      .sandbox()
      .getOnce({ url: `begin:https://content.prereview.org/ghost/api/content/pages/${id}?`, query: { key } }, status)

    const actual = await _.getPage(id)({
      fetch,
      ghostApi: { key: Redacted.make(key) },
    })()

    expect(actual).toStrictEqual(E.left('unavailable'))
    expect(fetch.done()).toBeTruthy()
  })

  test.prop([
    fc.string({ unit: fc.alphanumeric(), minLength: 1 }),
    fc.string({ unit: fc.alphanumeric(), minLength: 1 }),
    fc.error(),
  ])('when fetch throws an error', async (id, key, error) => {
    const actual = await _.getPage(id)({
      fetch: () => Promise.reject(error),
      ghostApi: { key: Redacted.make(key) },
    })()

    expect(actual).toStrictEqual(E.left('unavailable'))
  })
})
