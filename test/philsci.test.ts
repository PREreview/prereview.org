import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Temporal } from '@js-temporal/polyfill'
import * as E from 'fp-ts/Either'
import { rawHtml } from '../src/html'
import * as _ from '../src/philsci'
import * as fc from './fc'

import PlainDate = Temporal.PlainDate

describe('getPreprintFromPhilsci', () => {
  test('when the ID is 21986', async () => {
    const actual = await _.getPreprintFromPhilsci({ type: 'philsci', value: 21986 })({})()

    expect(actual).toStrictEqual(
      E.right({
        abstract: {
          language: 'en',
          text: expect.stringContaining('In response to broad transformations'),
        },
        authors: [
          {
            name: 'Sabina Leonelli',
            orcid: '0000-0002-7815-6609',
          },
        ],
        id: {
          type: 'philsci',
          value: 21986,
        },
        posted: new PlainDate(2023, 4, 13),
        title: {
          language: 'en',
          text: rawHtml('Philosophy of Open Science'),
        },
        url: new URL('https://philsci-archive.pitt.edu/21986/'),
      }),
    )
  })

  test.prop([fc.philsciPreprintId().filter(id => id.value !== 21986)])('when the preprint is not found', async id => {
    const actual = await _.getPreprintFromPhilsci(id)({})()

    expect(actual).toStrictEqual(E.left('not-found'))
  })
})
