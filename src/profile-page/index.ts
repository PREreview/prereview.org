import type { Types } from 'effect'
import type { Reader } from 'fp-ts/lib/Reader.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { flow } from 'fp-ts/lib/function.js'
import { match } from 'ts-pattern'
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

type EnvFor<T> = Types.UnionToIntersection<T extends Reader<infer R, unknown> ? R : never>
