import type { Reader } from 'fp-ts/Reader'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { flow } from 'fp-ts/function'
import { match } from 'ts-pattern'
import { havingProblemsPage, pageNotFound } from '../http-error'
import type { ProfileId } from '../types/profile-id'
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
  getOrcidProfile,
  RTE.match(
    error =>
      match(error)
        .with('not-found', () => pageNotFound)
        .with('unavailable', () => havingProblemsPage)
        .exhaustive(),
    createPage,
  ),
)

const profileForPseudonym = flow(
  getPseudonymProfile,
  RTE.match(
    error =>
      match(error)
        .with('unavailable', () => havingProblemsPage)
        .exhaustive(),
    createPage,
  ),
)

type EnvFor<T> = T extends Reader<infer R, unknown> ? R : never
