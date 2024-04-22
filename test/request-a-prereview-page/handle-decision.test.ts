import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { format } from 'fp-ts-routing'
import { Status } from 'hyper-ts'
import * as _ from '../../src/request-a-prereview-page/handle-decision'
import { requestAPrereviewMatch } from '../../src/routes'

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

  test('with a ShowForm decision', () => {
    const actual = _.handleDecision({ _tag: 'ShowForm' })

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
