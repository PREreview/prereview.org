import { it } from '@effect/vitest'
import { Effect, Tuple } from 'effect'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import Keyv from 'keyv'
import { describe, expect, vi } from 'vitest'
import {
  UnverifiedContactEmailAddress,
  type SaveContactEmailAddressEnv,
  type VerifyContactEmailAddressForReviewEnv,
} from '../../../src/contact-email-address.ts'
import { PreprintIsNotFound, PreprintIsUnavailable } from '../../../src/Preprints/index.ts'
import { writeReviewMatch, writeReviewNeedToVerifyEmailAddressMatch } from '../../../src/routes.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import { FormC, formKey } from '../../../src/WebApp/write-review/form.ts'
import * as _ from '../../../src/WebApp/write-review/index.ts'
import { shouldNotBeCalled } from '../../should-not-be-called.ts'
import * as fc from './fc.ts'

describe('writeReviewEnterEmailAddress', () => {
  it.effect.prop(
    'when the user has a verified email address',
    [
      fc.indeterminatePreprintId(),
      fc.preprintTitle(),
      fc.anything(),
      fc.string(),
      fc.form(),
      fc.user(),
      fc.supportedLocale(),
      fc.verifiedContactEmailAddress(),
    ],
    ([preprintId, preprintTitle, body, method, newReview, user, locale, contactEmailAddress]) =>
      Effect.gen(function* () {
        const formStore = new Keyv()
        yield* Effect.promise(() => formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview)))

        const actual = yield* Effect.promise(
          _.writeReviewEnterEmailAddress({ body, id: preprintId, method, locale, user })({
            formStore,
            generateUuid: shouldNotBeCalled,
            getContactEmailAddress: () => TE.right(contactEmailAddress),
            getPreprintTitle: () => TE.right(preprintTitle),
            getPublicPersona: shouldNotBeCalled,
            saveContactEmailAddress: shouldNotBeCalled,
            verifyContactEmailAddressForReview: shouldNotBeCalled,
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SeeOther,
          location: expect.stringContaining(`${format(writeReviewMatch.formatter, { id: preprintTitle.id })}/`),
        })
      }),
  )

  it.effect.prop(
    'when the user needs to verify their email address',
    [
      fc.indeterminatePreprintId(),
      fc.preprintTitle(),
      fc.anything(),
      fc.requestMethod().filter(method => method !== 'POST'),
      fc.form(),
      fc.user(),
      fc.supportedLocale(),
      fc.either(fc.constant('not-found'), fc.unverifiedContactEmailAddress()),
    ],
    ([preprintId, preprintTitle, body, method, newReview, user, locale, contactEmailAddress]) =>
      Effect.gen(function* () {
        const formStore = new Keyv()
        yield* Effect.promise(() => formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview)))

        const actual = yield* Effect.promise(
          _.writeReviewEnterEmailAddress({ body, id: preprintId, method, locale, user })({
            formStore,
            generateUuid: shouldNotBeCalled,
            getContactEmailAddress: () => TE.fromEither(contactEmailAddress),
            getPreprintTitle: () => TE.right(preprintTitle),
            getPublicPersona: shouldNotBeCalled,
            saveContactEmailAddress: shouldNotBeCalled,
            verifyContactEmailAddressForReview: shouldNotBeCalled,
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'StreamlinePageResponse',
          status: StatusCodes.OK,
          title: expect.anything(),
          nav: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'form',
          js: [],
        })
      }),
  )

  it.effect.prop(
    'when an email address is given',
    [
      fc.indeterminatePreprintId(),
      fc.preprintTitle(),
      fc.emailAddress().map(emailAddress => Tuple.make({ emailAddress }, emailAddress)),
      fc.uuid(),
      fc.user(),
      fc.publicPersona(),
      fc.supportedLocale(),
      fc.either(fc.constant('not-found'), fc.unverifiedContactEmailAddress()),
      fc.form(),
    ],
    ([
      preprintId,
      preprintTitle,
      [body, emailAddress],
      verificationToken,
      user,
      publicPersona,
      locale,
      contactEmailAddress,
      newReview,
    ]) =>
      Effect.gen(function* () {
        const formStore = new Keyv()
        yield* Effect.promise(() => formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview)))
        const saveContactEmailAddress = vi.fn<SaveContactEmailAddressEnv['saveContactEmailAddress']>(_ =>
          TE.right(undefined),
        )
        const verifyContactEmailAddressForReview = vi.fn<
          VerifyContactEmailAddressForReviewEnv['verifyContactEmailAddressForReview']
        >(_ => TE.right(undefined))

        const actual = yield* Effect.promise(
          _.writeReviewEnterEmailAddress({ body, id: preprintId, method: 'POST', locale, user })({
            formStore,
            getContactEmailAddress: () => TE.fromEither(contactEmailAddress),
            generateUuid: () => verificationToken,
            getPreprintTitle: () => TE.right(preprintTitle),
            getPublicPersona: () => TE.right(publicPersona),
            saveContactEmailAddress,
            verifyContactEmailAddressForReview,
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SeeOther,
          location: format(writeReviewNeedToVerifyEmailAddressMatch.formatter, { id: preprintTitle.id }),
        })
        expect(saveContactEmailAddress).toHaveBeenCalledWith(
          user.orcid,
          new UnverifiedContactEmailAddress({ value: emailAddress, verificationToken }),
        )
        expect(verifyContactEmailAddressForReview).toHaveBeenCalledWith(
          publicPersona.name,
          new UnverifiedContactEmailAddress({ value: emailAddress, verificationToken }),
          preprintTitle.id,
        )
      }),
  )

  it.effect.prop(
    "when an email address isn't given",
    [
      fc.indeterminatePreprintId(),
      fc.preprintTitle(),
      fc.record({
        emailAddress: fc
          .string()
          .filter(string => !string.includes('.') || !string.includes('@') || string === '' || /\s/g.test(string)),
      }),
      fc.uuid(),
      fc.user(),
      fc.supportedLocale(),
      fc.form(),
    ],
    ([preprintId, preprintTitle, body, verificationToken, user, locale, newReview]) =>
      Effect.gen(function* () {
        const formStore = new Keyv()
        yield* Effect.promise(() => formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview)))

        const actual = yield* Effect.promise(
          _.writeReviewEnterEmailAddress({ body, id: preprintId, method: 'POST', locale, user })({
            formStore,
            getContactEmailAddress: () => TE.left('not-found'),
            generateUuid: () => verificationToken,
            getPreprintTitle: () => TE.right(preprintTitle),
            getPublicPersona: shouldNotBeCalled,
            saveContactEmailAddress: shouldNotBeCalled,
            verifyContactEmailAddressForReview: shouldNotBeCalled,
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'StreamlinePageResponse',
          status: StatusCodes.BadRequest,
          title: expect.anything(),
          nav: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'form',
          js: ['error-summary.js'],
        })
      }),
  )

  it.effect.prop(
    'when there is no form',
    [fc.indeterminatePreprintId(), fc.preprintTitle(), fc.anything(), fc.string(), fc.user(), fc.supportedLocale()],
    ([preprintId, preprintTitle, body, method, user, locale]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.writeReviewEnterEmailAddress({ body, id: preprintId, method, locale, user })({
            formStore: new Keyv(),
            getContactEmailAddress: shouldNotBeCalled,
            generateUuid: shouldNotBeCalled,
            getPreprintTitle: () => TE.right(preprintTitle),
            getPublicPersona: shouldNotBeCalled,
            saveContactEmailAddress: shouldNotBeCalled,
            verifyContactEmailAddressForReview: shouldNotBeCalled,
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SeeOther,
          location: format(writeReviewMatch.formatter, { id: preprintTitle.id }),
        })
      }),
  )

  it.effect.prop(
    'when the preprint cannot be loaded',
    [fc.indeterminatePreprintId(), fc.anything(), fc.string(), fc.user(), fc.supportedLocale()],
    ([preprintId, body, method, user, locale]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.writeReviewEnterEmailAddress({ body, id: preprintId, method, locale, user })({
            formStore: new Keyv(),
            getContactEmailAddress: shouldNotBeCalled,
            generateUuid: shouldNotBeCalled,
            getPreprintTitle: () => TE.left(new PreprintIsUnavailable({})),
            getPublicPersona: shouldNotBeCalled,
            saveContactEmailAddress: shouldNotBeCalled,
            verifyContactEmailAddressForReview: shouldNotBeCalled,
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: StatusCodes.ServiceUnavailable,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      }),
  )

  it.effect.prop(
    'when the preprint cannot be found',
    [fc.indeterminatePreprintId(), fc.anything(), fc.string(), fc.user(), fc.supportedLocale()],
    ([preprintId, body, method, user, locale]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.writeReviewEnterEmailAddress({ body, id: preprintId, method, locale, user })({
            formStore: new Keyv(),
            getContactEmailAddress: shouldNotBeCalled,
            generateUuid: shouldNotBeCalled,
            getPreprintTitle: () => TE.left(new PreprintIsNotFound({})),
            getPublicPersona: shouldNotBeCalled,
            saveContactEmailAddress: shouldNotBeCalled,
            verifyContactEmailAddressForReview: shouldNotBeCalled,
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: StatusCodes.NotFound,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      }),
  )

  it.effect.prop(
    "when there isn't a session",
    [fc.indeterminatePreprintId(), fc.preprintTitle(), fc.anything(), fc.string(), fc.supportedLocale()],
    ([preprintId, preprintTitle, body, method, locale]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.writeReviewEnterEmailAddress({ body, id: preprintId, method, locale, user: undefined })({
            formStore: new Keyv(),
            getContactEmailAddress: shouldNotBeCalled,
            generateUuid: shouldNotBeCalled,
            getPreprintTitle: () => TE.right(preprintTitle),
            getPublicPersona: shouldNotBeCalled,
            saveContactEmailAddress: shouldNotBeCalled,
            verifyContactEmailAddressForReview: shouldNotBeCalled,
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SeeOther,
          location: format(writeReviewMatch.formatter, { id: preprintTitle.id }),
        })
      }),
  )
})
