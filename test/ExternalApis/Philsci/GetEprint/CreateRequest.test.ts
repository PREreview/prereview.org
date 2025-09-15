import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Tuple } from 'effect'
import * as _ from '../../../../src/ExternalApis/Philsci/GetEprint/CreateRequest.js'
import * as fc from '../../../fc.js'

describe('CreateRequest', () => {
  test.prop(
    [
      fc
        .integer()
        .map(id =>
          Tuple.make(id, `https://philsci-archive.pitt.edu/cgi/export/eprint/${id}/JSON/pittphilsci-eprint-${id}.json`),
        ),
    ],
    {
      examples: [
        [[23254, 'https://philsci-archive.pitt.edu/cgi/export/eprint/23254/JSON/pittphilsci-eprint-23254.json']],
      ],
    },
  )('sets the URL', ([eprintId, expected]) => {
    const actual = _.CreateRequest(eprintId)

    expect(actual.url).toStrictEqual(expected)
  })

  test.prop([fc.integer()])('sets the Accept header', eprintId => {
    const actual = _.CreateRequest(eprintId)

    expect(actual.headers['accept']).toStrictEqual('application/json')
  })
})
