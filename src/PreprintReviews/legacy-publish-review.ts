import { Effect, Option, pipe } from 'effect'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import * as TE from 'fp-ts/lib/TaskEither.js'
import type { LanguageCode } from 'iso-639-1'
import * as L from 'logger-fp-ts'
import { createAuthorInvite } from '../author-invite.ts'
import { Clubs } from '../Clubs/index.ts'
import type { Locale } from '../Context.ts'
import { Email, ZenodoRecords } from '../ExternalInteractions/index.ts'
import type { Html } from '../html.ts'
import type { SupportedLocale } from '../locales/index.ts'
import type { PreprintTitle } from '../Preprints/index.ts'
import * as Prereviewers from '../Prereviewers/index.ts'
import { EffectToFpts } from '../RefactoringUtilities/index.ts'
import type { Doi } from '../types/Doi.ts'
import type { EmailAddress } from '../types/EmailAddress.ts'
import type { OrcidId, Pseudonym } from '../types/index.ts'
import type { Name } from '../types/Name.ts'
import type { Uuid } from '../types/Uuid.ts'
import {
  NotifyCommunitySlackOfPreprintReview,
  NotifyPreprintServerOfReview,
  NotifyReviewRequestersOfReview,
} from './Workflows/index.ts'

export interface NewPrereview {
  conduct: 'yes'
  otherAuthors: ReadonlyArray<{ name: Name; emailAddress: EmailAddress }>
  persona: Prereviewers.Persona
  club: Option.Option<Uuid>
  preprint: PreprintTitle
  review: Html
  language: Option.Option<LanguageCode>
  license: 'CC0-1.0' | 'CC-BY-4.0'
  locale: SupportedLocale
  structured: boolean
  user: { orcidId: OrcidId.OrcidId; pseudonym: Pseudonym.Pseudonym }
}

export interface PublishPrereviewEnv {
  publishPrereview: (newPrereview: NewPrereview) => TE.TaskEither<'unavailable', [Doi, number]>
}

export const publishPrereview = (newPrereview: NewPrereview) =>
  pipe(
    EffectToFpts.toReaderTaskEither(
      Effect.gen(function* () {
        const clubs = yield* Clubs

        const club = yield* Effect.transposeOption(Option.map(newPrereview.club, clubs.getClubName))

        return { ...newPrereview, club }
      }).pipe(Effect.catchTag('ClubNotFound', () => Effect.fail('unavailable' as const))),
    ),
    RTE.chainW(ZenodoRecords.createRecordOnZenodo),
    RTE.chainFirstReaderTaskKW(([, review]) =>
      RT.asksReaderTaskW((env: EffectToFpts.EffectEnv<Locale | Email.Email> & L.LoggerEnv) =>
        pipe(
          newPrereview.otherAuthors,
          RT.traverseSeqArray(otherAuthor =>
            pipe(
              createAuthorInvite({ status: 'open', emailAddress: otherAuthor.emailAddress, review }),
              RTE.chainTaskEitherK(authorInviteId =>
                pipe(
                  EffectToFpts.toTaskEither(
                    Email.inviteAuthor({
                      person: otherAuthor,
                      authorInviteId,
                      newPrereview: {
                        ...newPrereview,
                        author: Prereviewers.getPersonaName(newPrereview.persona),
                      },
                    }),
                    env.runtime,
                  ),
                  TE.mapLeft(() => 'unavailable' as const),
                ),
              ),
              RTE.matchEW(
                () => RT.of(undefined),
                () => RT.fromReaderIO(L.error('Failed to invite author to a review')),
              ),
            ),
          ),
        ),
      ),
    ),
    RTE.chainFirstReaderTaskKW(([, reviewId]) =>
      EffectToFpts.toReaderTaskEither(
        Effect.all(
          [
            NotifyCommunitySlackOfPreprintReview.execute({ reviewId }, { discard: true }),
            NotifyPreprintServerOfReview.execute({ reviewId }, { discard: true }),
            NotifyReviewRequestersOfReview.execute({ reviewId }, { discard: true }),
          ],
          { concurrency: 'inherit' },
        ),
      ),
    ),
    RTE.chainFirstW(([, review]) =>
      EffectToFpts.toReaderTaskEither(
        ZenodoRecords.invalidatePrereviewInCache({
          prereviewId: review,
          preprintId: newPrereview.preprint.id,
          user: newPrereview.user,
        }),
      ),
    ),
  )
