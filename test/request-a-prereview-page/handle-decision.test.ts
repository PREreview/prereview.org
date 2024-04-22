import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { format } from 'fp-ts-routing'
import { Status } from 'hyper-ts'
import * as _ from '../../src/request-a-prereview-page/handle-decision'
import { requestAPrereviewMatch } from '../../src/routes'
import * as fc from './fc'

describe('handleDecision', () => {
  test('with a DenyAccess decision', () => {
    const actual = _.handleDecision({ _tag: 'DenyAccess' })

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      status: Status.NotFound,
      title: expect.stringContaining('not found'),
      main: expect.stringContaining('not found'),
      skipToLabel: 'main',
      js: [],
    })
  })

  test('with a RequireLogIn decision', () => {
    const actual = _.handleDecision({ _tag: 'RequireLogIn' })

    expect(actual).toStrictEqual({
      _tag: 'LogInResponse',
      location: format(requestAPrereviewMatch.formatter, {}),
    })
  })

  test('with a ShowError decision', () => {
    const actual = _.handleDecision({ _tag: 'ShowError' })

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      status: Status.ServiceUnavailable,
      title: expect.stringContaining('problems'),
      main: expect.stringContaining('problems'),
      skipToLabel: 'main',
      js: [],
    })
  })

  test('with a ShowUnsupportedDoi decision', () => {
    const actual = _.handleDecision({ _tag: 'ShowUnsupportedDoi' })

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      status: Status.BadRequest,
      title: expect.stringContaining('support this DOI'),
      main: expect.stringContaining('support this DOI'),
      skipToLabel: 'main',
      js: [],
    })
  })

  test('with a ShowUnsupportedUrl decision', () => {
    const actual = _.handleDecision({ _tag: 'ShowUnsupportedUrl' })

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      status: Status.BadRequest,
      title: expect.stringContaining('support this URL'),
      main: expect.stringContaining('support this URL'),
      skipToLabel: 'main',
      js: [],
    })
  })

  describe('with a ShowForm decision', () => {
    test.prop([fc.invalidForm()])('with an InvalidForm', form => {
      const actual = _.handleDecision({ _tag: 'ShowForm', form })

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        canonical: format(requestAPrereviewMatch.formatter, {}),
        status: Status.BadRequest,
        title: expect.stringContaining('Error: Which preprint'),
        main: expect.stringContaining('Which preprint'),
        skipToLabel: 'form',
        js: ['error-summary.js'],
      })
    })

    test('with an UnsubmittedForm', () => {
      const actual = _.handleDecision({ _tag: 'ShowForm', form: { _tag: 'UnsubmittedForm' } })

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        canonical: format(requestAPrereviewMatch.formatter, {}),
        status: Status.OK,
        title: expect.stringContaining('Which preprint'),
        main: expect.stringContaining('Which preprint'),
        skipToLabel: 'form',
        js: [],
      })
    })
  })
})
