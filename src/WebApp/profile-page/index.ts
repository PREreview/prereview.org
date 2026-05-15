import { Boolean, Match, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { match } from 'ts-pattern'
import type { EnvFor } from '../../Fpts.ts'
import type { SupportedLocale } from '../../locales/index.ts'
import * as Prereviewers from '../../Prereviewers/index.ts'
import { EffectToFpts } from '../../RefactoringUtilities/index.ts'
import { profileMatch } from '../../routes.ts'
import * as StatusCodes from '../../StatusCodes.ts'
import { ProfileId } from '../../types/index.ts'
import { havingProblemsPage, pageNotFound } from '../http-error.ts'
import { RedirectResponse, type Response } from '../Response/index.ts'
import { createPage } from './create-page.ts'
import { getOrcidProfile } from './orcid-profile.ts'
import { getPseudonymProfile } from './pseudonym-profile.ts'

export type Env = EnvFor<ReturnType<typeof profile>>

export const profile = ({ locale, profile: profileId }: { profile: ProfileId.ProfileId; locale: SupportedLocale }) =>
  ProfileId.match(profileId, {
    onOrcid: profileForOrcid(locale),
    onPseudonym: profileForPseudonym(locale),
  })

const profileForOrcid = (locale: SupportedLocale) => (profile: ProfileId.OrcidProfileId) =>
  pipe(
    EffectToFpts.toReaderTaskEither(Prereviewers.isRegistered(profile.orcid)),
    RTE.matchEW(
      () => RT.of(havingProblemsPage(locale)),
      Boolean.match({
        onFalse: () => RT.of(RedirectResponse({ location: new URL(`https://orcid.org/${profile.orcid}`) }) as Response),
        onTrue: () =>
          pipe(
            getOrcidProfile(profile),
            RTE.match(
              error =>
                match(error)
                  .with('not-found', () => pageNotFound(locale))
                  .with('unavailable', () => havingProblemsPage(locale))
                  .exhaustive(),
              profile => createPage(profile, locale),
            ),
          ),
      }),
    ),
  )

const profileForPseudonym = (locale: SupportedLocale) => (profile: ProfileId.PseudonymProfileId) =>
  pipe(
    EffectToFpts.toReaderTaskEither(Prereviewers.isPseudonymInUse(profile.pseudonym)),
    RTE.matchEW(
      () => RT.of(havingProblemsPage(locale)),
      Match.valueTags({
        PseudonymInUse: () =>
          pipe(
            getPseudonymProfile(profile),
            RTE.match(
              error =>
                match(error)
                  .with('unavailable', () => havingProblemsPage(locale))
                  .exhaustive(),
              (profile): Response => createPage(profile, locale),
            ),
          ),
        PseudonymNotInUse: () => RT.of(pageNotFound(locale)),
        PseudonymHasBeenReplaced: ({ replacedWith }) =>
          RT.of(
            RedirectResponse({
              location: format(profileMatch.formatter, { profile: ProfileId.forPseudonym(replacedWith) }),
              status: StatusCodes.MovedPermanently,
            }),
          ),
      }),
    ),
  )
