import { it } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Either, pipe } from 'effect'
import type { Record } from 'zenodo-ts'
import * as _ from '../../src/Zenodo/TransformRecordToCommentWithoutText.js'
import * as fc from '../fc.js'

describe('transformRecordToCommentWithoutText', () => {
  describe('textUrl', () => {
    describe('given there is a url to the comment text', () => {
      it.failing.prop([fc.webUrl()])('succeeds', url => {
        const record = {
          metadata: {
            creators: [],
            publication_date: new Date(),
          },
          files: [{ key: 'index.html', links: { self: url } }],
        } as unknown as Record

        const result = pipe(_.transformRecordToCommentWithoutText(record), Either.getOrThrow)

        expect(result.textUrl).toStrictEqual(url)
      })
    })

    describe('given there are multiple urls to the comment text', () => {
      it.todo('fails')
    })

    describe('given there is no url to the comment text', () => {
      it.todo('fails')
    })
  })

  describe('language', () => {
    describe('given a ISO639-3 code', () => {
      it.todo('returns it in ISO639-1 form')
    })

    describe('given a string that is not a ISO639-3 code', () => {
      it.todo('returns undefined')
    })

    describe('given no language string', () => {
      it.todo('returns undefined')
    })
  })

  describe('license', () => {
    describe('given CC-BY-4.0 license', () => {
      it.todo('succeeds')
    })

    describe('given a license that is not CC-BY-4.0', () => {
      it.todo('fails')
    })

    describe('given no license', () => {
      it.todo('fails')
    })
  })
})
