import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import * as E from 'fp-ts/Either'
import Keyv from 'keyv'
import * as _ from '../src/keyv'
import * as fc from './fc'

describe('getCareerStage', () => {
  test.todo('when the key contains a career stage')

  test.todo('when the key contains something other than career stage')

  test.todo('when the key is not found')

  test.prop([fc.orcid(), fc.anything()])('when the key cannot be accessed', async (orcid, error) => {
    const store = new Keyv()
    store.get = () => Promise.reject(error)

    const actual = await _.getCareerStage(orcid)({ careerStageStore: store })()

    expect(actual).toStrictEqual(E.left('unavailable'))
  })
})
