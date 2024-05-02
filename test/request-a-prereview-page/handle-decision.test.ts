import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { format } from 'fp-ts-routing'
import { Status } from 'hyper-ts'
import * as _ from '../../src/request-a-prereview-page/handle-decision'
import { requestAPrereviewMatch, requestReviewMatch } from '../../src/routes'
import * as fc from './fc'

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
      title: expect.stringContaining('not found'),
      main: expect.stringContaining('not found'),
      skipToLabel: 'main',
      js: [],
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

  test('with a ShowNotAPreprint decision', () => {
    const actual = _.handleDecision({ _tag: 'ShowNotAPreprint' })

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      status: Status.BadRequest,
      title: expect.stringContaining('support preprints'),
      main: expect.stringContaining('support preprints'),
      skipToLabel: 'main',
      js: [],
    })
  })

  test.prop([fc.indeterminatePreprintId()])('with a ShowUnknownPreprint decision', preprint => {
    const actual = _.handleDecision({ _tag: 'ShowUnknownPreprint', preprint })

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      status: Status.BadRequest,
      title: expect.stringContaining('don’t know'),
      main: expect.stringContaining('don’t know'),
      skipToLabel: 'main',
      js: [],
    })
  })

  test.prop([fc.preprintId()])('with a ShowUnsupportedPreprint decision', preprint => {
    const actual = _.handleDecision({ _tag: 'ShowUnsupportedPreprint', preprint })

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      status: Status.BadRequest,
      title: expect.stringContaining('support requests'),
      main: expect.stringContaining('support requests'),
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

  test.prop([fc.invalidForm()])('with an ShowFormWithErrors decision', form => {
    const actual = _.handleDecision({ _tag: 'ShowFormWithErrors', form })

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      canonical: format(requestAPrereviewMatch.formatter, {}),
      status: Status.BadRequest,
      title: expect.stringContaining('Error: Which preprint'),
      nav: expect.stringContaining('Back'),
      main: expect.stringContaining('Which preprint'),
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
      title: expect.stringContaining('Which preprint'),
      nav: expect.stringContaining('Back'),
      main: expect.stringContaining('Which preprint'),
      skipToLabel: 'form',
      js: [],
    })
  })
})
