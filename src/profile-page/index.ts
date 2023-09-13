import type { Reader } from 'fp-ts/Reader'
import { flow } from 'fp-ts/function'
import { Status, type StatusOpen } from 'hyper-ts'
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

const profileForPseudonym = flow(
  RM.fromReaderTaskEitherK(getPseudonymProfile),
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
