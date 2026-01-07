import { Option, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { match } from 'ts-pattern'
import { maybeGetAvatar } from '../../avatar.ts'
import { maybeGetCareerStage } from '../../career-stage.ts'
import { maybeGetContactEmailAddress } from '../../contact-email-address.ts'
import type { EnvFor } from '../../Fpts.ts'
import { maybeIsOpenForRequests } from '../../is-open-for-requests.ts'
import { maybeGetLanguages } from '../../languages.ts'
import type { SupportedLocale } from '../../locales/index.ts'
import { maybeGetLocation } from '../../location.ts'
import { maybeGetOrcidToken } from '../../orcid-token.ts'
import { maybeGetResearchInterests } from '../../research-interests.ts'
import { myDetailsMatch } from '../../routes.ts'
import { maybeGetSlackUser } from '../../slack-user.ts'
import type { KeywordId } from '../../types/Keyword.ts'
import { getUserOnboarding, saveUserOnboarding } from '../../user-onboarding.ts'
import type { User } from '../../user.ts'
import { havingProblemsPage } from '../http-error.ts'
import { LogInResponse } from '../Response/index.ts'
import { createPage } from './my-details-page.ts'

export type Env = EnvFor<typeof myDetails>

export const myDetails = ({
  subscribedKeywords,
  locale,
  user,
}: {
  subscribedKeywords?: ReadonlyArray<KeywordId>
  locale: SupportedLocale
  user?: User
}) =>
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
        RTE.let('subscribedKeywords', () => Option.fromNullable(subscribedKeywords)),
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
