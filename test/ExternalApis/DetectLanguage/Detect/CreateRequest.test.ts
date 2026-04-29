import { HttpBody } from '@effect/platform'
import { test } from '@fast-check/vitest'
import { describe, expect } from 'vitest'
import * as _ from '../../../../src/ExternalApis/DetectLanguage/Detect/CreateRequest.ts'
import * as fc from '../../../fc.ts'

describe('CreateRequest', () => {
  test.prop([fc.string()])('creates a POST request', string => {
    const actual = _.CreateRequest(string)

    expect(actual.method).toStrictEqual('POST')
  })

  test.prop([fc.string()])('sets the URL', string => {
    const actual = _.CreateRequest(string)

    expect(actual.url).toStrictEqual('https://ws.detectlanguage.com/v3/detect')
  })

  test.prop([fc.string()])('sets the body', string => {
    const actual = _.CreateRequest(string)

    expect(actual.body).toStrictEqual(HttpBody.formDataRecord({ q: string }))
  })
})
