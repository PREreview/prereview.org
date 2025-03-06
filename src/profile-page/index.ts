import { flow } from 'effect'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { match } from 'ts-pattern'
import type { EnvFor } from '../Fpts.js'
import { havingProblemsPage, pageNotFound } from '../http-error.js'
import type { SupportedLocale } from '../locales/index.js'
import { ProfileId } from '../types/index.js'
import { createPage } from './create-page.js'
import { getOrcidProfile } from './orcid-profile.js'
import { getPseudonymProfile } from './pseudonym-profile.js'

export type Env = EnvFor<ReturnType<typeof profile>>

export const profile = ({ locale, profile: profileId }: { profile: ProfileId.ProfileId; locale: SupportedLocale }) =>
  ProfileId.match(profileId, {
    onOrcid: profileForOrcid(locale),
    onPseudonym: profileForPseudonym(locale),
  })

const profileForOrcid = (locale: SupportedLocale) =>
  flow(
    getOrcidProfile,
    RTE.match(
      error =>
        match(error)
          .with('not-found', () => pageNotFound(locale))
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
