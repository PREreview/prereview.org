import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import * as TE from 'fp-ts/lib/TaskEither.js'
import { MediaType, Status } from 'hyper-ts'
import * as M from 'hyper-ts/lib/Middleware.js'
import Keyv from 'keyv'
import type { VerifyContactEmailAddressForReviewEnv } from '../../src/contact-email-address.js'
import type { TemplatePageEnv } from '../../src/page.js'
import { PreprintIsNotFound, PreprintIsUnavailable } from '../../src/preprint.js'
import {
  writeReviewEnterEmailAddressMatch,
  writeReviewMatch,
  writeReviewNeedToVerifyEmailAddressMatch,
} from '../../src/routes.js'
import { FormC, formKey } from '../../src/write-review/form.js'
import * as _ from '../../src/write-review/index.js'
import { runMiddleware } from '../middleware.js'
import { shouldNotBeCalled } from '../should-not-be-called.js'
import * as fc from './fc.js'

describe('writeReviewNeedToVerifyEmailAddress', () => {
  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc.connection(),
    fc.form(),
    fc.user(),
    fc.supportedLocale(),
    fc.verifiedContactEmailAddress(),
  ])(
    'when the user has a verified email address',
    async (preprintId, preprintTitle, connection, newReview, user, locale, contactEmailAddress) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))

      const actual = await runMiddleware(
        _.writeReviewNeedToVerifyEmailAddress(preprintId)({
          formStore,
          getContactEmailAddress: () => TE.right(contactEmailAddress),
          getPreprintTitle: () => TE.right(preprintTitle),
          getUser: () => M.of(user),
          getUserOnboarding: shouldNotBeCalled,
          locale,
          publicUrl: new URL('http://example.com'),
          templatePage: shouldNotBeCalled,
          verifyContactEmailAddressForReview: shouldNotBeCalled,
        }),
        connection,
      )()

      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.SeeOther },
          {
            type: 'setHeader',
            name: 'Location',
            value: expect.stringContaining(`${format(writeReviewMatch.formatter, { id: preprintTitle.id })}/`),
          },
          { type: 'endResponse' },
        ]),
      )
    },
  )

  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc.connection({ method: fc.requestMethod().filter(method => method !== 'POST') }),
    fc.form(),
    fc.user(),
    fc.supportedLocale(),
    fc.unverifiedContactEmailAddress(),
    fc.html(),
  ])(
    'when the user needs to verify their email address',
    async (preprintId, preprintTitle, connection, newReview, user, locale, contactEmailAddress, page) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))
      const templatePage = jest.fn<TemplatePageEnv['templatePage']>(_ => page)

      const actual = await runMiddleware(
        _.writeReviewNeedToVerifyEmailAddress(preprintId)({
          formStore,
          getContactEmailAddress: () => TE.right(contactEmailAddress),
          getPreprintTitle: () => TE.right(preprintTitle),
          getUser: () => M.of(user),
          getUserOnboarding: () => TE.left('unavailable'),
          locale,
          publicUrl: new URL('http://example.com'),
          templatePage,
          verifyContactEmailAddressForReview: shouldNotBeCalled,
        }),
        connection,
      )()

      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.OK },
          { type: 'setHeader', name: 'Cache-Control', value: 'no-cache, private' },
          { type: 'setHeader', name: 'Vary', value: 'Cookie' },
          { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
          { type: 'setBody', body: page.toString() },
        ]),
      )
      expect(templatePage).toHaveBeenCalledWith({
        title: expect.anything(),
        content: expect.anything(),
        skipLinks: [[expect.anything(), '#main']],
        js: [],
        type: 'streamline',
        locale,
        user,
      })
    },
  )

  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc.connection({ method: fc.constant('POST') }),
    fc.form(),
    fc.user(),
    fc.supportedLocale(),
    fc.unverifiedContactEmailAddress(),
  ])(
    'resending verification email',
    async (preprintId, preprintTitle, connection, newReview, user, locale, contactEmailAddress) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))
      const verifyContactEmailAddressForReview = jest.fn<
        VerifyContactEmailAddressForReviewEnv['verifyContactEmailAddressForReview']
      >(_ => TE.right(undefined))

      const actual = await runMiddleware(
        _.writeReviewNeedToVerifyEmailAddress(preprintId)({
          formStore,
          getContactEmailAddress: () => TE.right(contactEmailAddress),
          getPreprintTitle: () => TE.right(preprintTitle),
          getUser: () => M.of(user),
          getUserOnboarding: shouldNotBeCalled,
          locale,
          publicUrl: new URL('http://example.com'),
          templatePage: shouldNotBeCalled,
          verifyContactEmailAddressForReview,
        }),
        connection,
      )()

      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.SeeOther },
          {
            type: 'setHeader',
            name: 'Location',
            value: format(writeReviewNeedToVerifyEmailAddressMatch.formatter, { id: preprintTitle.id }),
          },
          { type: 'setHeader', name: 'Cache-Control', value: 'no-store, must-revalidate' },
          {
            type: 'setCookie',
            name: 'flash-message',
            options: { httpOnly: true },
            value: 'verify-contact-email-resend',
          },
          { type: 'endResponse' },
        ]),
      )
      expect(verifyContactEmailAddressForReview).toHaveBeenCalledWith(user, contactEmailAddress, preprintTitle.id)
    },
  )

  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc.connection(),
    fc.form(),
    fc.user(),
    fc.supportedLocale(),
  ])(
    'when the user needs to give their email address',
    async (preprintId, preprintTitle, connection, newReview, user, locale) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))

      const actual = await runMiddleware(
        _.writeReviewNeedToVerifyEmailAddress(preprintId)({
          formStore,
          getContactEmailAddress: () => TE.left('not-found'),
          getPreprintTitle: () => TE.right(preprintTitle),
          getUser: () => M.of(user),
          getUserOnboarding: shouldNotBeCalled,
          locale,
          publicUrl: new URL('http://example.com'),
          templatePage: shouldNotBeCalled,
          verifyContactEmailAddressForReview: shouldNotBeCalled,
        }),
        connection,
      )()

      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.SeeOther },
          {
            type: 'setHeader',
            name: 'Location',
            value: format(writeReviewEnterEmailAddressMatch.formatter, { id: preprintTitle.id }),
          },
          { type: 'endResponse' },
        ]),
      )
    },
  )

  test.prop([fc.indeterminatePreprintId(), fc.preprintTitle(), fc.connection(), fc.user(), fc.supportedLocale()])(
    'when there is no form',
    async (preprintId, preprintTitle, connection, user, locale) => {
      const actual = await runMiddleware(
        _.writeReviewNeedToVerifyEmailAddress(preprintId)({
          getContactEmailAddress: shouldNotBeCalled,
          getPreprintTitle: () => TE.right(preprintTitle),
          getUser: () => M.of(user),
          getUserOnboarding: shouldNotBeCalled,
          formStore: new Keyv(),
          locale,
          publicUrl: new URL('http://example.com'),
          templatePage: shouldNotBeCalled,
          verifyContactEmailAddressForReview: shouldNotBeCalled,
        }),
        connection,
      )()

      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.SeeOther },
          {
            type: 'setHeader',
            name: 'Location',
            value: format(writeReviewMatch.formatter, { id: preprintTitle.id }),
          },
          { type: 'endResponse' },
        ]),
      )
    },
  )

  test.prop([fc.indeterminatePreprintId(), fc.connection(), fc.user(), fc.supportedLocale(), fc.html()])(
    'when the preprint cannot be loaded',
    async (preprintId, connection, user, locale, page) => {
      const templatePage = jest.fn<TemplatePageEnv['templatePage']>(_ => page)

      const actual = await runMiddleware(
        _.writeReviewNeedToVerifyEmailAddress(preprintId)({
          formStore: new Keyv(),
          getContactEmailAddress: shouldNotBeCalled,
          getPreprintTitle: () => TE.left(new PreprintIsUnavailable({})),
          getUser: () => M.of(user),
          getUserOnboarding: shouldNotBeCalled,
          locale,
          publicUrl: new URL('http://example.com'),
          templatePage,
          verifyContactEmailAddressForReview: shouldNotBeCalled,
        }),
        connection,
      )()

      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.ServiceUnavailable },
          { type: 'setHeader', name: 'Cache-Control', value: 'no-store, must-revalidate' },
          { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
          { type: 'setBody', body: page.toString() },
        ]),
      )
      expect(templatePage).toHaveBeenCalledWith({
        title: expect.anything(),
        content: expect.anything(),
        skipLinks: [[expect.anything(), '#main-content']],
        locale,
        user,
      })
    },
  )

  test.prop([fc.indeterminatePreprintId(), fc.connection(), fc.user(), fc.supportedLocale(), fc.html()])(
    'when the preprint cannot be found',
    async (preprintId, connection, user, locale, page) => {
      const templatePage = jest.fn<TemplatePageEnv['templatePage']>(_ => page)

      const actual = await runMiddleware(
        _.writeReviewNeedToVerifyEmailAddress(preprintId)({
          formStore: new Keyv(),
          getContactEmailAddress: shouldNotBeCalled,
          getPreprintTitle: () => TE.left(new PreprintIsNotFound({})),
          getUser: () => M.of(user),
          getUserOnboarding: shouldNotBeCalled,
          locale,
          publicUrl: new URL('http://example.com'),
          templatePage,
          verifyContactEmailAddressForReview: shouldNotBeCalled,
        }),
        connection,
      )()

      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.NotFound },
          { type: 'setHeader', name: 'Cache-Control', value: 'no-store, must-revalidate' },
          { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
          { type: 'setBody', body: page.toString() },
        ]),
      )
      expect(templatePage).toHaveBeenCalledWith({
        title: expect.anything(),
        content: expect.anything(),
        skipLinks: [[expect.anything(), '#main-content']],
        locale,
        user,
      })
    },
  )

  test.prop([fc.indeterminatePreprintId(), fc.preprintTitle(), fc.connection(), fc.supportedLocale()])(
    "when there isn't a session",
    async (preprintId, preprintTitle, connection, locale) => {
      const actual = await runMiddleware(
        _.writeReviewNeedToVerifyEmailAddress(preprintId)({
          getContactEmailAddress: shouldNotBeCalled,
          getPreprintTitle: () => TE.right(preprintTitle),
          getUser: () => M.left('no-session'),
          getUserOnboarding: shouldNotBeCalled,
          formStore: new Keyv(),
          locale,
          publicUrl: new URL('http://example.com'),
          templatePage: shouldNotBeCalled,
          verifyContactEmailAddressForReview: shouldNotBeCalled,
        }),
        connection,
      )()

      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.SeeOther },
          {
            type: 'setHeader',
            name: 'Location',
            value: format(writeReviewMatch.formatter, { id: preprintTitle.id }),
          },
          { type: 'endResponse' },
        ]),
      )
    },
  )
})
