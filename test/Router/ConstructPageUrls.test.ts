import { describe, expect, it } from '@jest/globals'
import { HashMap, HashSet } from 'effect'
import { constructPageUrls } from '../../src/Router/ConstructPageUrls.js'
import { SupportedLocales } from '../../src/locales/index.js'
import type { PageResponse } from '../../src/response.js'

describe('constructPageUrls', () => {
  describe('localeUrls', () => {
    it.failing('constructs a url for each supported locale', () => {
      const pageUrls = constructPageUrls({} as unknown as PageResponse, '', '/')

      expect(HashMap.size(pageUrls.localeUrls)).toBe(HashSet.size(SupportedLocales))
      expect(HashMap.unsafeGet(pageUrls.localeUrls, 'en-US').pathname).toStrictEqual(expect.stringMatching(/^\/en-us/))
      expect(HashMap.unsafeGet(pageUrls.localeUrls, 'pt-BR').pathname).toStrictEqual(expect.stringMatching(/^\/pt-br/))
    })
  })
})
