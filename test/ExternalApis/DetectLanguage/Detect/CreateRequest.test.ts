import { HttpBody } from '@effect/platform'
import { describe, expect, it } from '@effect/vitest'
import * as _ from '../../../../src/ExternalApis/DetectLanguage/Detect/CreateRequest.ts'
import * as fc from '../../../fc.ts'

describe('CreateRequest', () => {
  it.prop('creates a POST request', [fc.string()], ([string]) => {
    const actual = _.CreateRequest(string)

    expect(actual.method).toStrictEqual('POST')
  })

  it.prop('sets the URL', [fc.string()], ([string]) => {
    const actual = _.CreateRequest(string)

    expect(actual.url).toStrictEqual('https://ws.detectlanguage.com/v3/detect')
  })

  it.prop('sets the body', [fc.string()], ([string]) => {
    const actual = _.CreateRequest(string)

    expect(actual.body).toStrictEqual(HttpBody.formDataRecord({ q: string }))
  })
})
