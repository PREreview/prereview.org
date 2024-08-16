import type { Reader } from 'fp-ts/lib/Reader.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { flow } from 'fp-ts/lib/function.js'
import { match } from 'ts-pattern'
import { havingProblemsPage, pageNotFound } from '../http-error.js'
import type { SupportedLocale } from '../locales/index.js'
import type { ProfileId } from '../types/profile-id.js'
import { createPage } from './create-page.js'
import { getOrcidProfile } from './orcid-profile.js'
import { getPseudonymProfile } from './pseudonym-profile.js'

export type Env = EnvFor<ReturnType<typeof profile>>

export const profile = ({ locale, profile: profileId }: { profile: ProfileId; locale: SupportedLocale }) =>
  match(profileId)
    .with({ type: 'orcid' }, profileForOrcid(locale))
    .with({ type: 'pseudonym' }, profileForPseudonym(locale))
    .exhaustive()

const profileForOrcid = (locale: SupportedLocale) =>
  flow(
    getOrcidProfile,
    RTE.match(
      error =>
        match(error)
          .with('not-found', () => pageNotFound)
          .with('unavailable', () => havingProblemsPage)
          .exhaustive(),
      profile => createPage(profile, locale),
    ),
  )

const profileForPseudonym = (locale: SupportedLocale) =>
  flow(
    getPseudonymProfile,
    RTE.match(
      error =>
        match(error)
          .with('unavailable', () => havingProblemsPage)
          .exhaustive(),
      profile => createPage(profile, locale),
    ),
  )

type EnvFor<T> = T extends Reader<infer R, unknown> ? R : never
