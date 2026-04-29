import { it } from '@effect/vitest'
import { Tuple } from 'effect'
import { describe, expect } from 'vitest'
import * as _ from '../../../../src/ExternalApis/Philsci/GetEprint/CreateRequest.ts'
import * as fc from '../../../fc.ts'

describe('CreateRequest', () => {
  it.prop(
    'sets the URL',
    [
      fc
        .integer()
        .map(id =>
          Tuple.make(id, `https://philsci-archive.pitt.edu/cgi/export/eprint/${id}/JSON/pittphilsci-eprint-${id}.json`),
        ),
    ],
    ([[eprintId, expected]]) => {
      const actual = _.CreateRequest(eprintId)

      expect(actual.url).toStrictEqual(expected)
    },
    {
      fastCheck: {
        examples: [
          [[23254, 'https://philsci-archive.pitt.edu/cgi/export/eprint/23254/JSON/pittphilsci-eprint-23254.json']],
        ],
      },
    },
  )

  it.prop('sets the Accept header', [fc.integer()], ([eprintId]) => {
    const actual = _.CreateRequest(eprintId)

    expect(actual.headers['accept']).toStrictEqual('application/json')
  })
})
