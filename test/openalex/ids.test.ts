import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import * as O from 'fp-ts/Option'
import { not } from 'fp-ts/Predicate'
import * as _ from '../../src/openalex/ids'
import { isFieldId } from '../../src/types/field'
import * as fc from './fc'

describe('fieldIdFromOpenAlexId', () => {
  test.prop([fc.fieldId().map(fieldId => [new URL(`https://openalex.org/fields/${fieldId}`), fieldId] as const)])(
    'when it is a valid field ID',
    ([input, expected]) => {
      const actual = _.fieldIdFromOpenAlexId(input)

      expect(actual).toStrictEqual(O.some(expected))
    },
  )

  test.prop([
    fc.oneof(
      fc
        .string()
        .filter(not(isFieldId))
        .map(fieldId => new URL(`https://openalex.org/fields/${fieldId}`)),
      fc.url().filter(not(url => url.href.startsWith('https://openalex.org/fields/'))),
    ),
  ])('when it is not a valid field ID', input => {
    const actual = _.fieldIdFromOpenAlexId(input)

    expect(actual).toStrictEqual(O.none)
  })
})
