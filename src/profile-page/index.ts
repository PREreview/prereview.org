import type { Reader } from 'fp-ts/Reader'
import { flow } from 'fp-ts/function'
import { Status } from 'hyper-ts'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import { match } from 'ts-pattern'
import { sendHtml } from '../html'
import { notFound, serviceUnavailable } from '../middleware'
import { page } from '../page'
import type { ProfileId } from '../profile-id'
import { maybeGetUser } from '../user'
import { createPage } from './create-page'
import { getOrcidProfile } from './orcid-profile'
import { getPseudonymProfile } from './pseudonym-profile'

export type Env = EnvFor<ReturnType<typeof profile>>

export const profile = (profileId: ProfileId) =>
  match(profileId)
    .with({ type: 'orcid' }, profileForOrcid)
    .with({ type: 'pseudonym' }, profileForPseudonym)
    .exhaustive()

const profileForOrcid = flow(
  RM.fromReaderTaskEitherK(getOrcidProfile),
  RM.map(createPage),
  RM.apSW('user', maybeGetUser),
  RM.chainReaderKW(page),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareKW(sendHtml),
  RM.orElseW(error =>
    match(error)
      .with('not-found', () => notFound)
      .with('unavailable', () => serviceUnavailable)
      .exhaustive(),
  ),
)

const profileForPseudonym = flow(
  RM.fromReaderTaskEitherK(getPseudonymProfile),
  RM.map(createPage),
  RM.apSW('user', maybeGetUser),
  RM.chainReaderKW(page),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareKW(sendHtml),
  RM.orElseW(error =>
    match(error)
      .with('unavailable', () => serviceUnavailable)
      .exhaustive(),
  ),
)

type EnvFor<T> = T extends Reader<infer R, unknown> ? R : never
