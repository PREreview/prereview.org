import { describe, expect, it } from '../../vitest.ts'
import { Option, Schema } from 'effect'
import * as _ from '../../../src/ExternalInteractions/ContentfulPages/PrereviewId.ts'
import { Uuid } from '../../../src/types/index.ts'

describe('PrereviewIdFromUrl', () => {
  describe('decoding', () => {
    it.each([
      ['https://prereview.org/reviews/21780464', 21780464],
      ['https://prereview.org/reviews/21780464?foo=bar', 21780464],
      ['https://prereview.org/reviews/21780464#comments', 21780464],
      ['https://prereview.org/reviews/1d1731cb-e9b9-4bb4-b636-98c235379cc6', '1d1731cb-e9b9-4bb4-b636-98c235379cc6'],
    ])('decodes %s', (url, expected) => {
      expect(Schema.decodeUnknownOption(_.PrereviewIdFromUrl)(url)).toStrictEqual(Option.some(expected))
    })

    it.each([
      'https://prereview.org/',
      'https://prereview.org/reviews',
      'https://prereview.org/reviews/',
      'https://prereview.org/reviews/21780464/write-a-comment',
      'https://prereview.org/reviews/not-an-id',
      'https://prereview.org/reviews/1d1731cb-e9b9-4bb4-b636',
      'https://prereview.org/reviews/1e3',
      'https://prereview.org/preprints/doi-10.1101-2022.01.13.476201',
      'http://prereview.org/reviews/21780464',
      'https://www.prereview.org/reviews/21780464',
      'https://example.com/reviews/21780464',
      '/reviews/21780464',
      'not a url',
    ])('fails to decode %s', url => {
      expect(Schema.decodeUnknownOption(_.PrereviewIdFromUrl)(url)).toStrictEqual(Option.none())
    })
  })

  describe('encoding', () => {
    it.each([
      [21780464, 'https://prereview.org/reviews/21780464'],
      [
        Uuid.Uuid('1d1731cb-e9b9-4bb4-b636-98c235379cc6'),
        'https://prereview.org/reviews/1d1731cb-e9b9-4bb4-b636-98c235379cc6',
      ],
    ])('encodes %s', (id, expected) => {
      expect(Schema.encodeSync(_.PrereviewIdFromUrl)(id)).toStrictEqual(expected)
    })
  })
})
