import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import * as E from 'fp-ts/Either'
import { Status } from 'hyper-ts'
import * as _ from '../src/prereview-coar-notify'
import * as fc from './fc'

describe('publishToPrereviewCoarNotifyInbox', () => {
  test.prop([fc.fetchResponse({ status: fc.constant(Status.Created) }), fc.uuid()])(
    'publishing succeeds',
    async (response, uuid) => {
      const result = await _.publishToPrereviewCoarNotifyInbox()({
        fetch: () => Promise.resolve(response),
        generateUuid: () => uuid,
      })()

      expect(result).toStrictEqual(E.right(undefined))
    },
  )

  describe('publishing fails', () => {
    test.todo('with a network error')

    test.todo('with an unexpected status')
  })
})
