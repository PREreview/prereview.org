import { format } from 'fp-ts-routing'
import * as O from 'fp-ts/Option'
import type { Reader } from 'fp-ts/Reader'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { pipe } from 'fp-ts/function'
import { match } from 'ts-pattern'
import { maybeGetCareerStage } from '../career-stage'
import { maybeGetContactEmailAddress } from '../contact-email-address'
import { havingProblemsPage } from '../http-error'
import { maybeIsOpenForRequests } from '../is-open-for-requests'
import { maybeGetLanguages } from '../languages'
import { maybeGetLocation } from '../location'
import { maybeGetResearchInterests } from '../research-interests'
import { LogInResponse } from '../response'
import { myDetailsMatch } from '../routes'
import { maybeGetSlackUser } from '../slack-user'
import type { User } from '../user'
import { getUserOnboarding, saveUserOnboarding } from '../user-onboarding'
import { createPage } from './my-details-page'

export type Env = EnvFor<typeof myDetails>

export const myDetails = ({ user }: { user?: User }) =>
  pipe(
    RTE.fromNullable('no-session' as const)(user),
    RTE.chainW(user =>
      pipe(
        RTE.Do,
        RTE.let('user', () => user),
        RTE.apSW('userOnboarding', getUserOnboarding(user.orcid)),
        RTE.apSW('slackUser', pipe(maybeGetSlackUser(user.orcid), RTE.map(O.fromNullable))),
        RTE.apSW('contactEmailAddress', pipe(maybeGetContactEmailAddress(user.orcid), RTE.map(O.fromNullable))),
        RTE.apSW('openForRequests', pipe(maybeIsOpenForRequests(user.orcid), RTE.map(O.fromNullable))),
        RTE.apSW('careerStage', pipe(maybeGetCareerStage(user.orcid), RTE.map(O.fromNullable))),
        RTE.apSW('researchInterests', pipe(maybeGetResearchInterests(user.orcid), RTE.map(O.fromNullable))),
        RTE.apSW('location', pipe(maybeGetLocation(user.orcid), RTE.map(O.fromNullable))),
        RTE.apSW('languages', pipe(maybeGetLanguages(user.orcid), RTE.map(O.fromNullable))),
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
          .with('unavailable', () => havingProblemsPage)
          .exhaustive(),
      createPage,
    ),
  )

type EnvFor<T> = T extends Reader<infer R, unknown> ? R : never
