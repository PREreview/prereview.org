import { test } from '@fast-check/jest'
import { expect } from '@jest/globals'
import * as E from 'fp-ts/Either'
import * as _ from '../src/orcid'

test('getNameFromOrcid', async () => {
  const actual = await _.getNameFromOrcid()()

  expect(actual).toStrictEqual(E.right('Daniela Saderi'))
})
