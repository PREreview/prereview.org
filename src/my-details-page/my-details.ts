import { Option, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { match } from 'ts-pattern'
import type { EnvFor } from '../Fpts.js'
import { maybeGetAvatar } from '../avatar.js'
import { maybeGetCareerStage } from '../career-stage.js'
import { maybeGetContactEmailAddress } from '../contact-email-address.js'
import { havingProblemsPage } from '../http-error.js'
import { maybeIsOpenForRequests } from '../is-open-for-requests.js'
import { maybeGetLanguages } from '../languages.js'
import type { SupportedLocale } from '../locales/index.js'
import { maybeGetLocation } from '../location.js'
import { maybeGetOrcidToken } from '../orcid-token.js'
import { maybeGetResearchInterests } from '../research-interests.js'
import { LogInResponse } from '../response.js'
import { myDetailsMatch } from '../routes.js'
import { maybeGetSlackUser } from '../slack-user.js'
import { getUserOnboarding, saveUserOnboarding } from '../user-onboarding.js'
import type { User } from '../user.js'
import { createPage } from './my-details-page.js'

export type Env = EnvFor<typeof myDetails>

export const myDetails = ({ locale, user }: { locale: SupportedLocale; user?: User }) =>
  pipe(
    RTE.fromNullable('no-session' as const)(user),
    RTE.chainW(user =>
      pipe(
        RTE.Do,
        RTE.let('user', () => user),
        RTE.let('locale', () => locale),
        RTE.apSW('userOnboarding', getUserOnboarding(user.orcid)),
        RTE.apSW('orcidToken', pipe(maybeGetOrcidToken(user.orcid), RTE.map(Option.fromNullable))),
        RTE.apSW('avatar', pipe(maybeGetAvatar(user.orcid), RTE.map(Option.fromNullable))),
        RTE.apSW('slackUser', pipe(maybeGetSlackUser(user.orcid), RTE.map(Option.fromNullable))),
        RTE.apSW('contactEmailAddress', pipe(maybeGetContactEmailAddress(user.orcid), RTE.map(Option.fromNullable))),
        RTE.apSW('openForRequests', pipe(maybeIsOpenForRequests(user.orcid), RTE.map(Option.fromNullable))),
        RTE.apSW('careerStage', pipe(maybeGetCareerStage(user.orcid), RTE.map(Option.fromNullable))),
        RTE.apSW('researchInterests', pipe(maybeGetResearchInterests(user.orcid), RTE.map(Option.fromNullable))),
        RTE.apSW('location', pipe(maybeGetLocation(user.orcid), RTE.map(Option.fromNullable))),
        RTE.apSW('languages', pipe(maybeGetLanguages(user.orcid), RTE.map(Option.fromNullable))),
      ),
    ),
    RTE.chainFirstW(({ user, userOnboarding }) =>
      userOnboarding.seenMyDetailsPage
        ? RTE.of(undefined)
        : saveUserOnboarding(user.orcid, { seenMyDetailsPage: true }),
    ),
    RTE.match(
      error =>
        match(error)
          .with('no-session', () => LogInResponse({ location: format(myDetailsMatch.formatter, {}) }))
          .with('unavailable', () => havingProblemsPage(locale))
          .exhaustive(),
      createPage,
    ),
  )
