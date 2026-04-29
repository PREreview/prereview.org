import { it } from '@effect/vitest'
import { Option, pipe } from 'effect'
import { describe, expect } from 'vitest'
import * as _ from '../../../src/ExternalInteractions/ZenodoRecords/TransformRecordToCommentWithoutText.ts'
import * as fc from '../../fc.ts'

describe('pickOutTextUrl', () => {
  describe('given there is a url to the comment text', () => {
    it.prop('succeeds', [fc.url()], ([url]) => {
      const files = [{ key: 'index.html', links: { self: url } }] satisfies _.ZenodoRecordForAComment['files']

      const result = pipe(_.pickOutTextUrl(files), Option.getOrThrow)

      expect(result.href).toStrictEqual(url.href)
    })
  })

  describe('given there are multiple urls to the comment text', () => {
    it.prop('returns none', [fc.url(), fc.url()], ([url1, url2]) => {
      const files = [
        { key: 'index.html', links: { self: url1 } },
        { key: 'index2.html', links: { self: url2 } },
      ] satisfies _.ZenodoRecordForAComment['files']

      const result = _.pickOutTextUrl(files)

      expect(result).toStrictEqual(Option.none())
    })
  })

  describe('given there is no url to the comment text', () => {
    it.prop('returns none', [fc.url()], ([url]) => {
      const files = [{ key: 'index.txt', links: { self: url } }] satisfies _.ZenodoRecordForAComment['files']

      const result = _.pickOutTextUrl(files)

      expect(result).toStrictEqual(Option.none())
    })
  })
})
