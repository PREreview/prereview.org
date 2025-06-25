import { Effect, flow, pipe, Redacted } from 'effect'
import * as P from 'fp-ts-routing'
import { concatAll } from 'fp-ts/lib/Monoid.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import type * as T from 'fp-ts/lib/Task.js'
import {
  authorInvite,
  authorInviteCheck,
  authorInviteDecline,
  authorInviteEnterEmailAddress,
  authorInviteNeedToVerifyEmailAddress,
  authorInvitePersona,
  authorInvitePublished,
  authorInviteStart,
  authorInviteVerifyEmailAddress,
} from '../../author-invite-flow/index.js'
import * as EffectToFpts from '../../EffectToFpts.js'
import { createContactEmailAddressVerificationEmailForInvitedAuthor, sendEmail } from '../../email.js'
import { withEnv } from '../../Fpts.js'
import * as Keyv from '../../keyv.js'
import { sendEmailWithNodemailer } from '../../nodemailer.js'
import * as Prereviews from '../../Prereviews/index.js'
import * as Routes from '../../routes.js'
import { Uuid } from '../../types/index.js'
import { addAuthorToRecordOnZenodo } from '../../zenodo.js'
import * as Zenodo from '../../Zenodo/index.js'
import type * as Response from '../Response.js'
import type { Env } from './index.js'

export const AuthorInviteFlowRouter = pipe(
  [
    pipe(
      Routes.authorInviteMatch.parser,
      P.map(
        ({ id }) =>
          (env: Env) =>
            authorInvite({ id, locale: env.locale, user: env.loggedInUser }),
      ),
    ),
    pipe(
      Routes.authorInviteDeclineMatch.parser,
      P.map(
        ({ id }) =>
          (env: Env) =>
            authorInviteDecline({ id, locale: env.locale, method: env.method }),
      ),
    ),
    pipe(
      Routes.authorInviteStartMatch.parser,
      P.map(
        ({ id }) =>
          (env: Env) =>
            authorInviteStart({ id, locale: env.locale, user: env.loggedInUser }),
      ),
    ),
    pipe(
      Routes.authorInviteEnterEmailAddressMatch.parser,
      P.map(
        ({ id }) =>
          (env: Env) =>
            authorInviteEnterEmailAddress({
              body: env.body,
              id,
              locale: env.locale,
              method: env.method,
              user: env.loggedInUser,
            }),
      ),
    ),
    pipe(
      Routes.authorInviteNeedToVerifyEmailAddressMatch.parser,
      P.map(
        ({ id }) =>
          (env: Env) =>
            authorInviteNeedToVerifyEmailAddress({ id, locale: env.locale, user: env.loggedInUser }),
      ),
    ),
    pipe(
      Routes.authorInviteVerifyEmailAddressMatch.parser,
      P.map(
        ({ id, verify }) =>
          (env: Env) =>
            authorInviteVerifyEmailAddress({ id, locale: env.locale, user: env.loggedInUser, verify }),
      ),
    ),
    pipe(
      Routes.authorInvitePersonaMatch.parser,
      P.map(
        ({ id }) =>
          (env: Env) =>
            authorInvitePersona({
              body: env.body,
              id,
              locale: env.locale,
              method: env.method,
              user: env.loggedInUser,
            }),
      ),
    ),
    pipe(
      Routes.authorInviteCheckMatch.parser,
      P.map(
        ({ id }) =>
          (env: Env) =>
            authorInviteCheck({ id, locale: env.locale, method: env.method, user: env.loggedInUser }),
      ),
    ),
    pipe(
      Routes.authorInvitePublishedMatch.parser,
      P.map(
        ({ id }) =>
          (env: Env) =>
            authorInvitePublished({ id, locale: env.locale, user: env.loggedInUser }),
      ),
    ),
  ],
  concatAll(P.getParserMonoid()),
  P.map(
    handler => (env: Env) =>
      handler(env)({
        addAuthorToPrereview: withEnv(
          (id, user, persona) =>
            pipe(
              addAuthorToRecordOnZenodo(id, user, persona),
              RTE.chainFirstTaskEitherKW(() =>
                EffectToFpts.toTaskEither(Zenodo.invalidatePrereviewInCache({ prereviewId: id, user }), env.runtime),
              ),
            ),
          {
            fetch: env.fetch,
            zenodoApiKey: Redacted.value(env.zenodoApiConfig.key),
            zenodoUrl: env.zenodoApiConfig.origin,
          },
        ),
        generateUuid: EffectToFpts.toIO(Uuid.generateUuid, env.runtime),
        getPrereview: EffectToFpts.toTaskEitherK(
          flow(
            Prereviews.getPrereview,
            Effect.catchTag('PrereviewIsNotFound', 'PrereviewIsUnavailable', 'PrereviewWasRemoved', () =>
              Effect.fail('unavailable' as const),
            ),
          ),
          env.runtime,
        ),
        getAuthorInvite: withEnv(Keyv.getAuthorInvite, {
          authorInviteStore: env.authorInviteStore,
          ...env.logger,
        }),
        getContactEmailAddress: withEnv(Keyv.getContactEmailAddress, {
          contactEmailAddressStore: env.users.contactEmailAddressStore,
          ...env.logger,
        }),
        saveAuthorInvite: withEnv(Keyv.saveAuthorInvite, {
          authorInviteStore: env.authorInviteStore,
          ...env.logger,
        }),
        saveContactEmailAddress: withEnv(Keyv.saveContactEmailAddress, {
          contactEmailAddressStore: env.users.contactEmailAddressStore,
          ...env.logger,
        }),
        verifyContactEmailAddressForInvitedAuthor: withEnv(
          flow(RTE.fromReaderK(createContactEmailAddressVerificationEmailForInvitedAuthor), RTE.chainW(sendEmail)),
          {
            locale: env.locale,
            publicUrl: env.publicUrl,
            sendEmail: withEnv(sendEmailWithNodemailer, { nodemailer: env.nodemailer, ...env.logger }),
          },
        ),
      }),
  ),
) satisfies P.Parser<(env: Env) => T.Task<Response.Response>>
