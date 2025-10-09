import { UrlParams } from '@effect/platform'
import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Tuple } from 'effect'
import * as _ from '../../../../src/ExternalApis/Crossref/GetWork/CreateRequest.ts'
import { Doi } from '../../../../src/types/index.js'
import * as fc from '../../../fc.ts'

describe('CreateRequest', () => {
  test.prop([fc.doi()])('creates a GET request', doi => {
    const actual = _.CreateRequest(doi)

    expect(actual.method).toStrictEqual('GET')
  })

  test.prop(
    [
      fc
        .doi()
        .map(doi => Tuple.make<[Doi.Doi, string]>(doi, `https://api.crossref.org/works/${encodeURIComponent(doi)}`)),
    ],
    {
      examples: [
        [[Doi.Doi('10.1101/2022.10.06.511170'), 'https://api.crossref.org/works/10.1101%2F2022.10.06.511170']],
        [
          [
            Doi.Doi('10.1002/(SICI)1521-3951(199911)216:1<135::AID-PSSB135>3.0.CO;2-#'),
            'https://api.crossref.org/works/10.1002%2F(SICI)1521-3951(199911)216%3A1%3C135%3A%3AAID-PSSB135%3E3.0.CO%3B2-%23',
          ],
        ],
      ],
    },
  )('sets the URL', ([doi, expectedUrl]) => {
    const actual = _.CreateRequest(doi)

    expect(actual.url).toStrictEqual(expectedUrl)
    expect(actual.urlParams).toStrictEqual(UrlParams.empty)
  })
})
