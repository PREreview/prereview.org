import { describe, expect, it } from '@jest/globals'
import { Option } from 'effect'
import * as _ from '../../src/HttpMiddleware/DetectLocale.ts'

describe('detectLocale', () => {
  it.each([
    ['en-US,es;q=0.6,en;q=0.8,*;q=0.1', 'en-US'],
    ['en-US', 'en-US'],
    ['en-US-posix', 'en-US'],
    ['en', 'en-US'],
    ['en-GB', 'en-US'],
    ['en-GB,pt-BR', 'en-US'],
    ['es-AR', 'es-419'],
    ['es-AR,*', 'es-419'],
    ['*', 'en-US'],
    ['is,*', 'en-US'],
  ])('finds a match for %s', (input, expected) => {
    expect(_.detectLocale(input)).toStrictEqual(Option.some(expected))
  })

  it.each(['', ' ', 'foo', 'is', 'lol-US'])('finds no match for "%s"', input => {
    expect(_.detectLocale(input)).toStrictEqual(Option.none())
  })
})
