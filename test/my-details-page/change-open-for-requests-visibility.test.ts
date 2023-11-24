import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/TaskEither'
import { Status } from 'hyper-ts'
import * as _ from '../../src/my-details-page/change-open-for-requests-visibility'
import { changeOpenForRequestsVisibilityMatch, myDetailsMatch } from '../../src/routes'
import * as fc from '../fc'
import { shouldNotBeCalled } from '../should-not-be-called'

describe('changeOpenForRequestsVisibility', () => {
  test.prop([
    fc.anything(),
    fc.string().filter(method => method !== 'POST'),
    fc.user(),
    fc.isOpenForRequestsVisibility(),
  ])('when there is a logged in user', async (body, method, user, visibility) => {
    const actual = await _.changeOpenForRequestsVisibility({ body, method, user })({
      isOpenForRequests: () => TE.of({ value: true, visibility }),
      saveOpenForRequests: shouldNotBeCalled,
    })()

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      canonical: format(changeOpenForRequestsVisibilityMatch.formatter, {}),
      status: Status.OK,
      title: expect.stringContaining('requests'),
      nav: expect.stringContaining('Back'),
      main: expect.stringContaining('requests'),
      skipToLabel: 'form',
      js: [],
    })
  })

  test.prop([fc.isOpenForRequestsVisibility(), fc.user(), fc.isOpenForRequestsVisibility()])(
    'when the form has been submitted',
    async (visibility, user, existingVisibility) => {
      const saveOpenForRequests = jest.fn<_.Env['saveOpenForRequests']>(_ => TE.right(undefined))

      const actual = await _.changeOpenForRequestsVisibility({
        body: { openForRequestsVisibility: visibility },
        method: 'POST',
        user,
      })({
        isOpenForRequests: () => TE.right({ value: true, visibility: existingVisibility }),
        saveOpenForRequests,
      })()

      expect(actual).toStrictEqual({
        _tag: 'RedirectResponse',
        status: Status.SeeOther,
        location: format(myDetailsMatch.formatter, {}),
      })
      expect(saveOpenForRequests).toHaveBeenCalledWith(user.orcid, { value: true, visibility })
    },
  )

  test.prop([
    fc.record({ openForRequestsVisibility: fc.isOpenForRequestsVisibility() }),
    fc.user(),
    fc.isOpenForRequestsVisibility(),
  ])('when the form has been submitted but the visibility cannot be saved', async (body, user, visibility) => {
    const actual = await _.changeOpenForRequestsVisibility({ body, method: 'POST', user })({
      isOpenForRequests: () => TE.of({ value: true, visibility }),
      saveOpenForRequests: () => TE.left('unavailable'),
    })()

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      status: Status.ServiceUnavailable,
      title: expect.stringContaining('problems'),
      main: expect.stringContaining('problems'),
      skipToLabel: 'main',
      js: [],
    })
  })

  test.prop([
    fc.record({ openForRequestsVisibility: fc.string() }, { withDeletedKeys: true }),
    fc.user(),
    fc.isOpenForRequestsVisibility(),
  ])('when the form has been submitted without setting visibility', async (body, user, visibility) => {
    const saveOpenForRequests = jest.fn<_.Env['saveOpenForRequests']>(_ => TE.right(undefined))

    const actual = await _.changeOpenForRequestsVisibility({ body, method: 'POST', user })({
      isOpenForRequests: () => TE.of({ value: true, visibility }),
      saveOpenForRequests,
    })()

    expect(actual).toStrictEqual({
      _tag: 'RedirectResponse',
      status: Status.SeeOther,
      location: format(myDetailsMatch.formatter, {}),
    })
    expect(saveOpenForRequests).toHaveBeenCalledWith(user.orcid, { value: true, visibility: 'restricted' })
  })

  test.prop([fc.anything(), fc.string(), fc.user()])('when not open to requests', async (body, method, user) => {
    const actual = await _.changeOpenForRequestsVisibility({ body, method, user })({
      isOpenForRequests: () => TE.right({ value: false }),
      saveOpenForRequests: shouldNotBeCalled,
    })()

    expect(actual).toStrictEqual({
      _tag: 'RedirectResponse',
      status: Status.SeeOther,
      location: format(myDetailsMatch.formatter, {}),
    })
  })

  test.prop([fc.anything(), fc.string(), fc.user()])("there isn't open to requests", async (body, method, user) => {
    const actual = await _.changeOpenForRequestsVisibility({ body, method, user })({
      isOpenForRequests: () => TE.left('not-found'),
      saveOpenForRequests: shouldNotBeCalled,
    })()

    expect(actual).toStrictEqual({
      _tag: 'RedirectResponse',
      status: Status.SeeOther,
      location: format(myDetailsMatch.formatter, {}),
    })
  })

  test.prop([fc.anything(), fc.string()])('when the user is not logged in', async (body, method) => {
    const actual = await _.changeOpenForRequestsVisibility({ body, method, user: undefined })({
      isOpenForRequests: shouldNotBeCalled,
      saveOpenForRequests: shouldNotBeCalled,
    })()

    expect(actual).toStrictEqual({
      _tag: 'LogInResponse',
      location: format(myDetailsMatch.formatter, {}),
    })
  })
})
