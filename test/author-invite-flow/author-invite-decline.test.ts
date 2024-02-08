import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/TaskEither'
import { Status } from 'hyper-ts'
import type { SaveAuthorInviteEnv } from '../../src/author-invite'
import * as _ from '../../src/author-invite-flow'
import { authorInviteDeclineMatch } from '../../src/routes'
import * as fc from '../fc'
import { shouldNotBeCalled } from '../should-not-be-called'

describe('authorInviteDecline', () => {
  test.prop([fc.uuid(), fc.declinedAuthorInvite()])('when the invite has been declined', async (inviteId, invite) => {
    const actual = await _.authorInviteDecline({ id: inviteId })({
      getAuthorInvite: () => TE.right(invite),
      saveAuthorInvite: shouldNotBeCalled,
    })()

    expect(actual).toStrictEqual({
      _tag: 'StreamlinePageResponse',
      canonical: format(authorInviteDeclineMatch.formatter, { id: inviteId }),
      status: Status.OK,
      title: expect.stringContaining('Invitation declined'),
      main: expect.stringContaining('Invitation declined'),
      skipToLabel: 'main',
      js: [],
    })
  })

  describe('when the invite is open', () => {
    test.prop([fc.uuid(), fc.openAuthorInvite()])('when the invite can be saved', async (inviteId, invite) => {
      const saveAuthorInvite = jest.fn<SaveAuthorInviteEnv['saveAuthorInvite']>(_ => TE.right(undefined))

      const actual = await _.authorInviteDecline({ id: inviteId })({
        getAuthorInvite: () => TE.right(invite),
        saveAuthorInvite,
      })()

      expect(actual).toStrictEqual({
        _tag: 'StreamlinePageResponse',
        canonical: format(authorInviteDeclineMatch.formatter, { id: inviteId }),
        status: Status.OK,
        title: expect.stringContaining('Invitation declined'),
        main: expect.stringContaining('Invitation declined'),
        skipToLabel: 'main',
        js: [],
      })
      expect(saveAuthorInvite).toHaveBeenCalledWith(inviteId, { status: 'declined', review: invite.review })
    })

    test.prop([fc.uuid(), fc.openAuthorInvite()])("when the invite can't be saved", async (inviteId, invite) => {
      const saveAuthorInvite = jest.fn<SaveAuthorInviteEnv['saveAuthorInvite']>(_ => TE.left('unavailable'))

      const actual = await _.authorInviteDecline({ id: inviteId })({
        getAuthorInvite: () => TE.right(invite),
        saveAuthorInvite,
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: Status.ServiceUnavailable,
        title: expect.stringContaining('problems'),
        main: expect.stringContaining('problems'),
        skipToLabel: 'main',
        js: [],
      })
      expect(saveAuthorInvite).toHaveBeenCalledWith(inviteId, { status: 'declined', review: invite.review })
    })
  })

  test.prop([fc.uuid(), fc.authorInvite().filter(invite => invite.status !== 'open' && invite.status !== 'declined')])(
    'when the invite is not open or declined',
    async (inviteId, invite) => {
      const actual = await _.authorInviteDecline({ id: inviteId })({
        getAuthorInvite: () => TE.right(invite),
        saveAuthorInvite: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: Status.NotFound,
        title: expect.stringContaining('not found'),
        main: expect.stringContaining('not found'),
        skipToLabel: 'main',
        js: [],
      })
    },
  )

  test.prop([fc.uuid()])('when the invite is not found', async inviteId => {
    const actual = await _.authorInviteDecline({ id: inviteId })({
      getAuthorInvite: () => TE.left('not-found'),
      saveAuthorInvite: shouldNotBeCalled,
    })()

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      status: Status.NotFound,
      title: expect.stringContaining('not found'),
      main: expect.stringContaining('not found'),
      skipToLabel: 'main',
      js: [],
    })
  })
})
