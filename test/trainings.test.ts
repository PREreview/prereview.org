import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import fetchMock from 'fetch-mock'
import { format } from 'fp-ts-routing'
import { Status } from 'hyper-ts'
import { trainingsMatch } from '../src/routes'
import * as _ from '../src/trainings'
import * as fc from './fc'
import { shouldNotBeCalled } from './should-not-be-called'

describe('trainings', () => {
  test.prop([fc.stringOf(fc.alphanumeric(), { minLength: 1 })])('when the page can be loaded', async key => {
    const fetch = fetchMock.sandbox().getOnce(
      {
        url: 'https://content.prereview.org/ghost/api/content/pages/64639b5007fb34a92c7f8518',
        query: { key },
      },
      { body: { pages: [{ html: '<p>Foo<script>bar</script></p>' }] } },
    )

    const actual = await _.trainings({ fetch, ghostApi: { key }, sleep: shouldNotBeCalled })()

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      canonical: format(trainingsMatch.formatter, {}),
      current: 'trainings',
      status: Status.OK,
      title: expect.stringContaining('Trainings'),
      main: expect.stringContaining('<p>Foo</p>'),
      skipToLabel: 'main',
      js: [],
    })
  })

  test.prop([fc.stringOf(fc.alphanumeric(), { minLength: 1 }), fc.fetchResponse()])(
    'when the page cannot be loaded',
    async (key, response) => {
      const fetch = fetchMock.sandbox().getOnce(
        {
          url: 'begin:https://content.prereview.org/ghost/api/content/pages/64639b5007fb34a92c7f8518?',
          query: { key },
        },
        response,
      )

      const actual = await _.trainings({ fetch, ghostApi: { key }, sleep: shouldNotBeCalled })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: Status.ServiceUnavailable,
        title: expect.stringContaining('problems'),
        main: expect.stringContaining('problems'),
        skipToLabel: 'main',
        js: [],
      })
      expect(fetch.done()).toBeTruthy()
    },
  )
})
