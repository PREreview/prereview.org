import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import * as TE from 'fp-ts/lib/TaskEither.js'
import { MediaType, Status } from 'hyper-ts'
import * as M from 'hyper-ts/lib/Middleware.js'
import Keyv from 'keyv'
import {
  UnverifiedContactEmailAddress,
  type SaveContactEmailAddressEnv,
  type VerifyContactEmailAddressForReviewEnv,
} from '../../src/contact-email-address.js'
import type { TemplatePageEnv } from '../../src/page.js'
import { PreprintIsNotFound, PreprintIsUnavailable } from '../../src/preprint.js'
import { writeReviewMatch, writeReviewNeedToVerifyEmailAddressMatch } from '../../src/routes.js'
import { FormC, formKey } from '../../src/write-review/form.js'
import * as _ from '../../src/write-review/index.js'
import { runMiddleware } from '../middleware.js'
import { shouldNotBeCalled } from '../should-not-be-called.js'
import * as fc from './fc.js'

describe('writeReviewEnterEmailAddress', () => {
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
        _.writeReviewEnterEmailAddress(preprintId)({
          formStore,
          generateUuid: shouldNotBeCalled,
          getContactEmailAddress: () => TE.right(contactEmailAddress),
          getPreprintTitle: () => TE.right(preprintTitle),
          getUser: () => M.of(user),
          locale,
          saveContactEmailAddress: shouldNotBeCalled,
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
    fc.either(fc.constant('not-found'), fc.unverifiedContactEmailAddress()),
    fc.html(),
  ])(
    'when the user needs to verify their email address',
    async (preprintId, preprintTitle, connection, newReview, user, locale, contactEmailAddress, page) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))
      const templatePage = jest.fn<TemplatePageEnv['templatePage']>(_ => page)

      const actual = await runMiddleware(
        _.writeReviewEnterEmailAddress(preprintId)({
          formStore,
          generateUuid: shouldNotBeCalled,
          getContactEmailAddress: () => TE.fromEither(contactEmailAddress),
          getPreprintTitle: () => TE.right(preprintTitle),
          getUser: () => M.of(user),
          locale,
          saveContactEmailAddress: shouldNotBeCalled,
          templatePage,
          verifyContactEmailAddressForReview: shouldNotBeCalled,
        }),
        connection,
      )()

      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.OK },
          { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
          { type: 'setBody', body: page.toString() },
        ]),
      )
      expect(templatePage).toHaveBeenCalledWith({
        title: expect.anything(),
        content: expect.anything(),
        skipLinks: [[expect.anything(), '#form']],
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
    fc
      .emailAddress()
      .chain(emailAddress =>
        fc.tuple(
          fc.connection({ body: fc.constant({ emailAddress }), method: fc.constant('POST') }),
          fc.constant(emailAddress),
        ),
      ),
    fc.uuid(),
    fc.user(),
    fc.supportedLocale(),
    fc.either(fc.constant('not-found'), fc.unverifiedContactEmailAddress()),
    fc.form(),
  ])(
    'when an email address is given',
    async (
      preprintId,
      preprintTitle,
      [connection, emailAddress],
      verificationToken,
      user,
      locale,
      contactEmailAddress,
      newReview,
    ) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))
      const saveContactEmailAddress = jest.fn<SaveContactEmailAddressEnv['saveContactEmailAddress']>(_ =>
        TE.right(undefined),
      )
      const verifyContactEmailAddressForReview = jest.fn<
        VerifyContactEmailAddressForReviewEnv['verifyContactEmailAddressForReview']
      >(_ => TE.right(undefined))

      const actual = await runMiddleware(
        _.writeReviewEnterEmailAddress(preprintId)({
          formStore,
          getContactEmailAddress: () => TE.fromEither(contactEmailAddress),
          generateUuid: () => verificationToken,
          getPreprintTitle: () => TE.right(preprintTitle),
          getUser: () => M.of(user),
          locale,
          saveContactEmailAddress,
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
          { type: 'endResponse' },
        ]),
      )
      expect(saveContactEmailAddress).toHaveBeenCalledWith(
        user.orcid,
        new UnverifiedContactEmailAddress({ value: emailAddress, verificationToken }),
      )
      expect(verifyContactEmailAddressForReview).toHaveBeenCalledWith(
        user,
        new UnverifiedContactEmailAddress({ value: emailAddress, verificationToken }),
        preprintTitle.id,
      )
    },
  )

  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc.connection({
      body: fc.record({
        emailAddress: fc
          .string()
          .filter(string => !string.includes('.') || !string.includes('@') || string === '' || /\s/g.test(string)),
      }),
      method: fc.constant('POST'),
    }),
    fc.uuid(),
    fc.user(),
    fc.supportedLocale(),
    fc.form(),
    fc.html(),
  ])(
    "when an email address isn't given",
    async (preprintId, preprintTitle, connection, verificationToken, user, locale, newReview, page) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))
      const templatePage = jest.fn<TemplatePageEnv['templatePage']>(_ => page)

      const actual = await runMiddleware(
        _.writeReviewEnterEmailAddress(preprintId)({
          formStore,
          getContactEmailAddress: () => TE.left('not-found'),
          generateUuid: () => verificationToken,
          getPreprintTitle: () => TE.right(preprintTitle),
          getUser: () => M.of(user),
          locale,
          saveContactEmailAddress: shouldNotBeCalled,
          templatePage,
          verifyContactEmailAddressForReview: shouldNotBeCalled,
        }),
        connection,
      )()

      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.BadRequest },
          { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
          { type: 'setBody', body: page.toString() },
        ]),
      )
      expect(templatePage).toHaveBeenCalledWith({
        title: expect.anything(),
        content: expect.anything(),
        skipLinks: [[expect.anything(), '#form']],
        js: ['error-summary.js'],
        type: 'streamline',
        locale,
        user,
      })
    },
  )

  test.prop([fc.indeterminatePreprintId(), fc.preprintTitle(), fc.connection(), fc.user(), fc.supportedLocale()])(
    'when there is no form',
    async (preprintId, preprintTitle, connection, user, locale) => {
      const actual = await runMiddleware(
        _.writeReviewEnterEmailAddress(preprintId)({
          formStore: new Keyv(),
          getContactEmailAddress: shouldNotBeCalled,
          generateUuid: shouldNotBeCalled,
          getPreprintTitle: () => TE.right(preprintTitle),
          getUser: () => M.of(user),
          locale,
          saveContactEmailAddress: shouldNotBeCalled,
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
        _.writeReviewEnterEmailAddress(preprintId)({
          formStore: new Keyv(),
          getContactEmailAddress: shouldNotBeCalled,
          generateUuid: shouldNotBeCalled,
          getPreprintTitle: () => TE.left(new PreprintIsUnavailable({})),
          getUser: () => M.of(user),
          locale,
          saveContactEmailAddress: shouldNotBeCalled,
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
        _.writeReviewEnterEmailAddress(preprintId)({
          formStore: new Keyv(),
          getContactEmailAddress: shouldNotBeCalled,
          generateUuid: shouldNotBeCalled,
          getPreprintTitle: () => TE.left(new PreprintIsNotFound({})),
          getUser: () => M.of(user),
          locale,
          saveContactEmailAddress: shouldNotBeCalled,
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
        _.writeReviewEnterEmailAddress(preprintId)({
          formStore: new Keyv(),
          getContactEmailAddress: shouldNotBeCalled,
          generateUuid: shouldNotBeCalled,
          getPreprintTitle: () => TE.right(preprintTitle),
          getUser: () => M.left('no-session'),
          locale,
          saveContactEmailAddress: shouldNotBeCalled,
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
