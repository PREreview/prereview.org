import { Temporal } from '@js-temporal/polyfill'
import type { Reader } from 'fp-ts/Reader'
import * as RTE from 'fp-ts/ReaderTaskEither'
import type * as RNEA from 'fp-ts/ReadonlyNonEmptyArray'
import type * as TE from 'fp-ts/TaskEither'
import { identity, pipe } from 'fp-ts/function'
import { Status, type StatusOpen } from 'hyper-ts'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import type { LanguageCode } from 'iso-639-1'
import type { Orcid } from 'orcid-id-ts'
import { P, match } from 'ts-pattern'
import { isLeadFor } from '../club-details'
import type { ClubId } from '../club-id'
import { type Html, sendHtml } from '../html'
import { notFound, serviceUnavailable } from '../middleware'
import { page } from '../page'
import type { PreprintId } from '../preprint-id'
import type { OrcidProfileId, ProfileId, PseudonymProfileId } from '../profile-id'
import { getResearchInterests } from '../research-interests'
import { getSlackUser } from '../slack-user'
import type { NonEmptyString } from '../string'
import { maybeGetUser } from '../user'
import { createPage } from './create-page'

import PlainDate = Temporal.PlainDate

export type Env = EnvFor<ReturnType<typeof profile>>

export type Prereviews = ReadonlyArray<{
  readonly id: number
  readonly club?: ClubId
  readonly reviewers: RNEA.ReadonlyNonEmptyArray<string>
  readonly published: PlainDate
  readonly preprint: {
    readonly id: PreprintId
    readonly language: LanguageCode
    readonly title: Html
  }
}>

interface GetPrereviewsEnv {
  getPrereviews: (profile: ProfileId) => TE.TaskEither<'unavailable', Prereviews>
}

interface GetNameEnv {
  getName: (orcid: Orcid) => TE.TaskEither<'not-found' | 'unavailable', NonEmptyString>
}

interface GetAvatarEnv {
  getAvatar: (orcid: Orcid) => TE.TaskEither<'not-found' | 'unavailable', URL>
}

const getPrereviews = (profile: ProfileId) =>
  pipe(
    RTE.ask<GetPrereviewsEnv>(),
    RTE.chainTaskEitherK(({ getPrereviews }) => getPrereviews(profile)),
  )

const getName = (orcid: Orcid) =>
  pipe(
    RTE.ask<GetNameEnv>(),
    RTE.chainTaskEitherK(({ getName }) => getName(orcid)),
  )

const getAvatar = (orcid: Orcid) =>
  pipe(
    RTE.ask<GetAvatarEnv>(),
    RTE.chainTaskEitherK(({ getAvatar }) => getAvatar(orcid)),
  )

export const profile = (profileId: ProfileId) =>
  match(profileId)
    .with({ type: 'orcid' }, profileForOrcid)
    .with({ type: 'pseudonym' }, profileForPseudonym)
    .exhaustive()

const profileForOrcid = (profile: OrcidProfileId) =>
  pipe(
    RM.fromReaderTaskEither(
      pipe(
        RTE.Do,
        RTE.let('type', () => 'orcid' as const),
        RTE.apS('prereviews', getPrereviews(profile)),
        RTE.apSW('name', getName(profile.value)),
        RTE.apSW(
          'researchInterests',
          pipe(
            getResearchInterests(profile.value),
            RTE.map(researchInterests =>
              match(researchInterests)
                .with({ visibility: 'public', value: P.select() }, identity)
                .with({ visibility: 'restricted' }, () => undefined)
                .exhaustive(),
            ),
            RTE.orElseW(error =>
              match(error)
                .with('not-found', () => RTE.of(undefined))
                .otherwise(RTE.left),
            ),
          ),
        ),
        RTE.apSW(
          'avatar',
          pipe(
            getAvatar(profile.value),
            RTE.orElseW(error =>
              match(error)
                .with('not-found', () => RTE.right(undefined))
                .with('unavailable', RTE.left)
                .exhaustive(),
            ),
          ),
        ),
        RTE.let('orcid', () => profile.value),
        RTE.let('clubs', () => isLeadFor(profile.value)),
        RTE.apSW(
          'slackUser',
          pipe(
            getSlackUser(profile.value),
            RTE.orElseW(error =>
              match(error)
                .with('not-found', () => RTE.right(undefined))
                .with('unavailable', RTE.left)
                .exhaustive(),
            ),
          ),
        ),
        RTE.let('isOpenForRequests', () => profile.value === '0000-0003-4921-6155'),
      ),
    ),
    RM.map(createPage),
    RM.apSW('user', maybeGetUser),
    chainReaderKW(page),
    RM.ichainFirst(() => RM.status(Status.OK)),
    RM.ichainMiddlewareKW(sendHtml),
    RM.orElseW(error =>
      match(error)
        .with('not-found', () => notFound)
        .with('unavailable', () => serviceUnavailable)
        .exhaustive(),
    ),
  )

const profileForPseudonym = (profileId: PseudonymProfileId) =>
  pipe(
    RM.of({ type: 'pseudonym' as const }),
    RM.apS('prereviews', RM.fromReaderTaskEither(getPrereviews(profileId))),
    RM.apS('name', RM.of(profileId.value)),
    RM.map(createPage),
    RM.apSW('user', maybeGetUser),
    chainReaderKW(page),
    RM.ichainFirst(() => RM.status(Status.OK)),
    RM.ichainMiddlewareKW(sendHtml),
    RM.orElseW(error =>
      match(error)
        .with('unavailable', () => serviceUnavailable)
        .exhaustive(),
    ),
  )

type EnvFor<T> = T extends Reader<infer R, unknown> ? R : never

// https://github.com/DenisFrezzato/hyper-ts/pull/85
function fromReaderK<R, A extends ReadonlyArray<unknown>, B, I = StatusOpen, E = never>(
  f: (...a: A) => Reader<R, B>,
): (...a: A) => RM.ReaderMiddleware<R, I, I, E, B> {
  return (...a) => RM.rightReader(f(...a))
}

// https://github.com/DenisFrezzato/hyper-ts/pull/85
function chainReaderKW<R2, A, B>(
  f: (a: A) => Reader<R2, B>,
): <R1, I, E>(ma: RM.ReaderMiddleware<R1, I, I, E, A>) => RM.ReaderMiddleware<R1 & R2, I, I, E, B> {
  return RM.chainW(fromReaderK(f))
}
