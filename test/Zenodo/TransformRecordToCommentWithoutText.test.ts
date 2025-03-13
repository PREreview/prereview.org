import { it } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Option, pipe } from 'effect'
import * as _ from '../../src/Zenodo/TransformRecordToCommentWithoutText.js'
import * as fc from '../fc.js'

describe('pickOutTextUrl', () => {
  describe('given there is a url to the comment text', () => {
    it.prop([fc.url()])('succeeds', url => {
      const files = [{ key: 'index.html', links: { self: url } }] satisfies _.ZenodoRecordForAComment['files']

      const result = pipe(_.pickOutTextUrl(files), Option.getOrThrow)

      expect(result.href).toStrictEqual(url.href)
    })
  })

  describe('given there are multiple urls to the comment text', () => {
    it.todo('fails')
  })

  describe('given there is no url to the comment text', () => {
    it.todo('fails')
  })
})
