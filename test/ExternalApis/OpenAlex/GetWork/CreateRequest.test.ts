import { UrlParams } from '@effect/platform'
import { describe, expect, it } from '@effect/vitest'
import { Tuple } from 'effect'
import * as _ from '../../../../src/ExternalApis/OpenAlex/GetWork/CreateRequest.ts'
import { Doi } from '../../../../src/types/index.ts'
import * as fc from '../../../fc.ts'

describe('CreateRequest', () => {
  it.prop('creates a GET request', [fc.doi()], ([doi]) => {
    const actual = _.CreateRequest(doi)

    expect(actual.method).toStrictEqual('GET')
  })

  it.prop(
    'sets the URL',
    [fc.doi().map(doi => Tuple.make<[Doi.Doi, string]>(doi, `https://api.openalex.org/works/${Doi.toUrl(doi).href}`))],
    ([[doi, expectedUrl]]) => {
      const actual = _.CreateRequest(doi)

      expect(actual.url).toStrictEqual(expectedUrl)
      expect(actual.urlParams).toStrictEqual(UrlParams.empty)
    },
    {
      fastCheck: {
        examples: [
          [
            [
              Doi.Doi('10.1101/2022.10.06.511170'),
              'https://api.openalex.org/works/https://doi.org/10.1101/2022.10.06.511170',
            ],
          ],
          [
            [
              Doi.Doi('10.1002/(SICI)1521-3951(199911)216:1<135::AID-PSSB135>3.0.CO;2-#'),
              'https://api.openalex.org/works/https://doi.org/10.1002/(SICI)1521-3951(199911)216:1%3C135::AID-PSSB135%3E3.0.CO;2-%23',
            ],
          ],
        ],
      },
    },
  )
})
