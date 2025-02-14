import { describe, it } from '@jest/globals'

describe('getFromRedis', () => {
  describe('there is a value for a given key', () => {
    describe('the value can be read', () => {
      it.todo('succeeds')
    })

    describe('the value can not be read', () => {
      it.todo('returns not found')

      it.todo('removes the value')
    })
  })

  describe('there is no value for a given key', () => {
    it.todo('returns not found')
  })

  describe('redis is unreachable', () => {
    it.todo('returns an error')
  })

  describe('redis is slow', () => {
    it.todo('returns an error')
  })
})
