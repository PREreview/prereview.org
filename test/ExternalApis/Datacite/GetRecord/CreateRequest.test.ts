import { UrlParams } from '@effect/platform'
import { it } from '@effect/vitest'
import { Tuple } from 'effect'
import { describe, expect } from 'vitest'
import * as _ from '../../../../src/ExternalApis/Datacite/GetRecord/CreateRequest.ts'
import { Doi } from '../../../../src/types/index.ts'
import * as fc from '../../../fc.ts'

describe('CreateRequest', () => {
  it.prop('creates a GET request', [fc.doi()], ([doi]) => {
    const actual = _.CreateRequest(doi)

    expect(actual.method).toStrictEqual('GET')
  })

  it.prop(
    'sets the URL',
    [
      fc
        .doi()
        .map(doi => Tuple.make<[Doi.Doi, string]>(doi, `https://api.datacite.org/dois/${encodeURIComponent(doi)}`)),
    ],
    ([[doi, expectedUrl]]) => {
      const actual = _.CreateRequest(doi)

      expect(actual.url).toStrictEqual(expectedUrl)
      expect(actual.urlParams).toStrictEqual(UrlParams.empty)
    },
    {
      fastCheck: {
        examples: [
          [[Doi.Doi('10.17605/OSF.IO/EQ8BK'), 'https://api.datacite.org/dois/10.17605%2FOSF.IO%2FEQ8BK']],
          [
            [
              Doi.Doi('10.1002/(SICI)1521-3951(199911)216:1<135::AID-PSSB135>3.0.CO;2-#'),
              'https://api.datacite.org/dois/10.1002%2F(SICI)1521-3951(199911)216%3A1%3C135%3A%3AAID-PSSB135%3E3.0.CO%3B2-%23',
            ],
          ],
        ],
      },
    },
  )
})
