import type { Reader } from 'fp-ts/lib/Reader.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { flow } from 'fp-ts/lib/function.js'
import { match } from 'ts-pattern'
import { havingProblemsPage, pageNotFound } from '../http-error.js'
import type { ProfileId } from '../types/profile-id.js'
import { createPage } from './create-page.js'
import { getOrcidProfile } from './orcid-profile.js'
import { getPseudonymProfile } from './pseudonym-profile.js'

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
