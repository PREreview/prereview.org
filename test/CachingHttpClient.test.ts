import { test } from '@fast-check/jest'
import { describe } from '@jest/globals'

describe('there is no cache entry', () => {
  describe('the request succeeds', () => {
    test.todo('able to cache it')

    test.todo('not able to cache it')
  })

  describe('the request fails', () => {
    test.todo('with a timeout')

    test.todo('with a network error')

    test.todo('with an unexpected response')
  })
})
