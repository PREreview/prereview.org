import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { format } from 'fp-ts-routing'
import { Status } from 'hyper-ts'
import * as _ from '../../src/request-a-prereview-page/handle-decision.js'
import { requestAPrereviewMatch, requestReviewMatch } from '../../src/routes.js'
import * as fc from './fc.js'

describe('handleDecision', () => {
  test.prop([fc.reviewRequestPreprintId(), fc.supportedLocale()])('with a BeginFlow decision', (preprint, locale) => {
    const actual = _.handleDecision({ _tag: 'BeginFlow', preprint }, locale)

    expect(actual).toStrictEqual({
      _tag: 'RedirectResponse',
      status: Status.SeeOther,
      location: format(requestReviewMatch.formatter, { id: preprint }),
    })
  })

  test.prop([fc.supportedLocale()])('with a ShowError decision', locale => {
    const actual = _.handleDecision({ _tag: 'ShowError' }, locale)

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      status: Status.ServiceUnavailable,
      title: expect.anything(),
      main: expect.anything(),
      skipToLabel: 'main',
      js: [],
    })
  })

  test.prop([fc.supportedLocale()])('with a ShowNotAPreprint decision', locale => {
    const actual = _.handleDecision({ _tag: 'ShowNotAPreprint' }, locale)

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      status: Status.BadRequest,
      title: expect.anything(),
      main: expect.anything(),
      skipToLabel: 'main',
      js: [],
    })
  })

  test.prop([fc.indeterminatePreprintId(), fc.supportedLocale()])(
    'with a ShowUnknownPreprint decision',
    (preprint, locale) => {
      const actual = _.handleDecision({ _tag: 'ShowUnknownPreprint', preprint }, locale)

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: Status.BadRequest,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    },
  )

  test.prop([fc.preprintId(), fc.supportedLocale()])('with a ShowUnsupportedPreprint decision', (preprint, locale) => {
    const actual = _.handleDecision({ _tag: 'ShowUnsupportedPreprint', preprint }, locale)

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      status: Status.BadRequest,
      title: expect.anything(),
      main: expect.anything(),
      skipToLabel: 'main',
      js: [],
    })
  })

  test.prop([fc.supportedLocale()])('with a ShowUnsupportedDoi decision', locale => {
    const actual = _.handleDecision({ _tag: 'ShowUnsupportedDoi' }, locale)

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      status: Status.BadRequest,
      title: expect.anything(),
      main: expect.anything(),
      skipToLabel: 'main',
      js: [],
    })
  })

  test.prop([fc.supportedLocale()])('with a ShowUnsupportedUrl decision', locale => {
    const actual = _.handleDecision({ _tag: 'ShowUnsupportedUrl' }, locale)

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      status: Status.BadRequest,
      title: expect.anything(),
      main: expect.anything(),
      skipToLabel: 'main',
      js: [],
    })
  })

  test.prop([fc.invalidForm(), fc.supportedLocale()])('with an ShowFormWithErrors decision', (form, locale) => {
    const actual = _.handleDecision({ _tag: 'ShowFormWithErrors', form }, locale)

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

  test.prop([fc.supportedLocale()])('with an ShowEmptyForm decision', locale => {
    const actual = _.handleDecision({ _tag: 'ShowEmptyForm' }, locale)

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
