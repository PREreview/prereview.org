import { it } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Option, pipe } from 'effect'
import * as _ from '../../../src/ExternalInteractions/ZenodoRecords/TransformRecordToCommentWithoutText.ts'
import * as fc from '../../fc.ts'

describe('pickOutTextUrl', () => {
  describe('given there is a url to the comment text', () => {
    it.prop([fc.url()])('succeeds', url => {
      const files = [{ key: 'index.html', links: { self: url } }] satisfies _.ZenodoRecordForAComment['files']

      const result = pipe(_.pickOutTextUrl(files), Option.getOrThrow)

      expect(result.href).toStrictEqual(url.href)
    })
  })

  describe('given there are multiple urls to the comment text', () => {
    it.prop([fc.url(), fc.url()])('returns none', (url1, url2) => {
      const files = [
        { key: 'index.html', links: { self: url1 } },
        { key: 'index2.html', links: { self: url2 } },
      ] satisfies _.ZenodoRecordForAComment['files']

      const result = _.pickOutTextUrl(files)

      expect(result).toStrictEqual(Option.none())
    })
  })

  describe('given there is no url to the comment text', () => {
    it.prop([fc.url()])('returns none', url => {
      const files = [{ key: 'index.txt', links: { self: url } }] satisfies _.ZenodoRecordForAComment['files']

      const result = _.pickOutTextUrl(files)

      expect(result).toStrictEqual(Option.none())
    })
  })
})
