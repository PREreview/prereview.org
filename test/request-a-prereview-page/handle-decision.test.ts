import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { format } from 'fp-ts-routing'
import { Status } from 'hyper-ts'
import * as _ from '../../src/request-a-prereview-page/handle-decision.js'
import { requestAPrereviewMatch, requestReviewMatch } from '../../src/routes.js'
import * as fc from './fc.js'

describe('handleDecision', () => {
  test.prop([fc.reviewRequestPreprintId()])('with a BeginFlow decision', preprint => {
    const actual = _.handleDecision({ _tag: 'BeginFlow', preprint })

    expect(actual).toStrictEqual({
      _tag: 'RedirectResponse',
      status: Status.SeeOther,
      location: format(requestReviewMatch.formatter, { id: preprint }),
    })
  })

  test('with a DenyAccess decision', () => {
    const actual = _.handleDecision({ _tag: 'DenyAccess' })

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      status: Status.NotFound,
      title: expect.anything(),
      main: expect.anything(),
      skipToLabel: 'main',
      js: [],
    })
  })

  test('with a ShowError decision', () => {
    const actual = _.handleDecision({ _tag: 'ShowError' })

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      status: Status.ServiceUnavailable,
      title: expect.anything(),
      main: expect.anything(),
      skipToLabel: 'main',
      js: [],
    })
  })

  test('with a ShowNotAPreprint decision', () => {
    const actual = _.handleDecision({ _tag: 'ShowNotAPreprint' })

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      status: Status.BadRequest,
      title: expect.anything(),
      main: expect.anything(),
      skipToLabel: 'main',
      js: [],
    })
  })

  test.prop([fc.indeterminatePreprintId()])('with a ShowUnknownPreprint decision', preprint => {
    const actual = _.handleDecision({ _tag: 'ShowUnknownPreprint', preprint })

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      status: Status.BadRequest,
      title: expect.anything(),
      main: expect.anything(),
      skipToLabel: 'main',
      js: [],
    })
  })

  test.prop([fc.preprintId()])('with a ShowUnsupportedPreprint decision', preprint => {
    const actual = _.handleDecision({ _tag: 'ShowUnsupportedPreprint', preprint })

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      status: Status.BadRequest,
      title: expect.anything(),
      main: expect.anything(),
      skipToLabel: 'main',
      js: [],
    })
  })

  test('with a ShowUnsupportedDoi decision', () => {
    const actual = _.handleDecision({ _tag: 'ShowUnsupportedDoi' })

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      status: Status.BadRequest,
      title: expect.anything(),
      main: expect.anything(),
      skipToLabel: 'main',
      js: [],
    })
  })

  test('with a ShowUnsupportedUrl decision', () => {
    const actual = _.handleDecision({ _tag: 'ShowUnsupportedUrl' })

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      status: Status.BadRequest,
      title: expect.anything(),
      main: expect.anything(),
      skipToLabel: 'main',
      js: [],
    })
  })

  test.prop([fc.invalidForm()])('with an ShowFormWithErrors decision', form => {
    const actual = _.handleDecision({ _tag: 'ShowFormWithErrors', form })

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      canonical: format(requestAPrereviewMatch.formatter, {}),
      status: Status.BadRequest,
      title: expect.anything(),
      nav: expect.anything(),
      main: expect.anything(),
      skipToLabel: 'form',
      js: ['error-summary.js'],
    })
  })

  test('with an ShowEmptyForm decision', () => {
    const actual = _.handleDecision({ _tag: 'ShowEmptyForm' })

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      canonical: format(requestAPrereviewMatch.formatter, {}),
      status: Status.OK,
      title: expect.anything(),
      nav: expect.anything(),
      main: expect.anything(),
      skipToLabel: 'form',
      js: [],
    })
  })
})
