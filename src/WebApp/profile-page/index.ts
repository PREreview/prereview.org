import { flow } from 'effect'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { match } from 'ts-pattern'
import type { EnvFor } from '../../Fpts.ts'
import type { SupportedLocale } from '../../locales/index.ts'
import { ProfileId } from '../../types/index.ts'
import { havingProblemsPage, pageNotFound } from '../http-error.ts'
import { createPage } from './create-page.ts'
import { getOrcidProfile } from './orcid-profile.ts'
import { getPseudonymProfile } from './pseudonym-profile.ts'

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
          .with('unavailable', () => havingProblemsPage(locale))
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
          .with('unavailable', () => havingProblemsPage(locale))
          .exhaustive(),
      profile => createPage(profile, locale),
    ),
  )
