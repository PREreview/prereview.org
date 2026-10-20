import { Effect, Match, flow, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { P, match } from 'ts-pattern'
import { type ClubName, Clubs } from '../../../Clubs/index.ts'
import { type ContactEmailAddress, ContactEmailAddresses } from '../../../ContactEmailAddresses/index.ts'
import type { Locale } from '../../../Context.ts'
import type { LanguageDetection } from '../../../ExternalInteractions/index.ts'
import { FeatureFlags } from '../../../FeatureFlags.ts'
import type { SupportedLocale } from '../../../locales/index.ts'
import {
  type CompletedForm,
  CompletedFormC,
  type Form,
  type FormStoreEnv,
  type NewPrereview,
  type PublishPrereviewEnv,
  completedFormToNewPrereview,
  deleteForm,
  getForm,
  nextFormPath,
  saveForm,
} from '../../../PreprintReviews/index.ts'
import {
  type IndeterminatePreprintId,
  type PreprintTitle,
  type Preprints,
  getPreprintTitle,
} from '../../../Preprints/index.ts'
import * as Prereviewers from '../../../Prereviewers/index.ts'
import { EffectToFpts } from '../../../RefactoringUtilities/index.ts'
import * as Routes from '../../../routes.ts'
import { writeReviewEnterEmailAddressMatch, writeReviewMatch, writeReviewPublishedMatch } from '../../../routes.ts'
import type { User } from '../../../user.ts'
import { havingProblemsPage, pageNotFound } from '../../http-error.ts'
import { RedirectResponse, type Response } from '../../Response/index.ts'
import type { AddToSessionEnv } from '../../session.ts'
import { storeInformationForWriteReviewPublishedPage } from '../published-review.ts'
import { failureMessage } from './failure-message.ts'
import { publishForm } from './publish-form.ts'

export const writeReviewPublish = ({
  id,
  locale,
  method,
  user,
}: {
  id: IndeterminatePreprintId
  locale: SupportedLocale
  method: string
  user?: User
}): RT.ReaderTask<
  FormStoreEnv &
    PublishPrereviewEnv &
    AddToSessionEnv &
    EffectToFpts.EffectEnv<
      | Clubs
      | ContactEmailAddresses
      | FeatureFlags
      | LanguageDetection.LanguageDetection
      | Locale
      | Prereviewers.Prereviewers
      | Preprints
    >,
  Response
> =>
  pipe(
    EffectToFpts.toReaderTaskEither(getPreprintTitle(id)),
    RTE.matchEW(
      Match.valueTags({
        PreprintIsNotFound: () => RT.of(pageNotFound(locale)),
        PreprintIsUnavailable: () => RT.of(havingProblemsPage(locale)),
      }),
      preprint =>
        pipe(
          RTE.Do,
          RTE.let('preprint', () => preprint),
          RTE.apS('user', pipe(RTE.fromNullable('no-session' as const)(user))),
          RTE.let('locale', () => locale),
          RTE.bindW('originalForm', ({ user }) => getForm(user.orcid, preprint.id)),
          RTE.let('form', ({ originalForm }) => CompletedFormC.decode(originalForm)),
          RTE.let('method', () => method),
          RTE.bindW(
            'contactEmailAddress',
            EffectToFpts.toReaderTaskEitherK(
              Effect.fnUntraced(
                function* ({ user }) {
                  const contactEmailAddresses = yield* ContactEmailAddresses
                  return yield* contactEmailAddresses.getContactEmailAddress(user.orcid)
                },
                Effect.catchTag('ContactEmailAddressIsNotFound', () => Effect.succeed(undefined)),
              ),
            ),
          ),
          RTE.bindW(
            'club',
            EffectToFpts.toReaderTaskEitherK(
              Effect.fnUntraced(function* ({ form }) {
                const clubs = yield* Clubs

                if (E.isLeft(form)) {
                  return
                }

                if (typeof form.right.club !== 'string') {
                  return form.right.club
                }

                return yield* clubs.getClubName(form.right.club)
              }),
            ),
          ),
          RTE.apSW(
            'canClubLeadsAddReviewsToClubs',
            EffectToFpts.toReaderTaskEither(
              Effect.gen(function* () {
                const featureFlags = yield* FeatureFlags

                return featureFlags.canClubLeadsAddReviewsToClubs
              }),
            ),
          ),
          RTE.bindW(
            'isClubLead',
            EffectToFpts.toReaderTaskEitherK(
              Effect.fnUntraced(function* ({ canClubLeadsAddReviewsToClubs, user }) {
                const clubs = yield* Clubs

                if (!canClubLeadsAddReviewsToClubs) {
                  return
                }

                return yield* clubs.isPrereviewerAClubLead(user.orcid)
              }),
            ),
          ),
          RTE.matchEW(
            error =>
              RT.of(
                match(error)
                  .with('no-form', 'no-session', () =>
                    RedirectResponse({ location: format(writeReviewMatch.formatter, { id: preprint.id }) }),
                  )
                  .with('form-unavailable', P.instanceOf(Error), 'unavailable', () => havingProblemsPage(locale))
                  .exhaustive(),
              ),
            decideNextStep,
          ),
        ),
    ),
  )

const decideNextStep = (state: {
  contactEmailAddress?: ContactEmailAddress
  form: E.Either<unknown, CompletedForm>
  club: ClubName | null | undefined
  canClubLeadsAddReviewsToClubs: boolean
  isClubLead: boolean | undefined
  originalForm: Form
  preprint: PreprintTitle
  user: User
  locale: SupportedLocale
}) =>
  match(state)
    .with(
      P.union({ form: P.when(E.isLeft) }, { originalForm: { alreadyWritten: P.optional(undefined) } }),
      ({ originalForm, preprint }) =>
        RT.of(RedirectResponse({ location: nextFormPath({ form: originalForm, preprintId: preprint.id }) })),
    )
    .with({ canClubLeadsAddReviewsToClubs: true, isClubLead: true, club: P.optional(undefined) }, () =>
      RT.of(RedirectResponse({ location: Routes.ReviewAPreprintAddToAClub.href({ preprintId: state.preprint.id }) })),
    )
    .with({ contactEmailAddress: P.optional({ _tag: 'UnverifiedContactEmailAddress' }) }, () =>
      RT.of(
        RedirectResponse({ location: format(writeReviewEnterEmailAddressMatch.formatter, { id: state.preprint.id }) }),
      ),
    )
    .with({ method: 'POST', form: P.when(E.isRight) }, ({ form, ...state }) =>
      handlePublishForm({ ...state, form: form.right }),
    )
    .with({ form: P.when(E.isRight) }, ({ form, ...state }) =>
      pipe(
        EffectToFpts.toReaderTaskEither(
          Prereviewers.getPersona({ orcidId: state.user.orcid, persona: form.right.persona }),
        ),
        RTE.matchW(
          () => failureMessage(state.locale),
          persona =>
            showPublishForm({
              ...state,
              persona,
              form: form.right,
            }),
        ),
      ),
    )
    .exhaustive()

const handlePublishForm = ({
  form,
  locale,
  originalForm,
  preprint,
  user,
}: {
  form: CompletedForm
  locale: SupportedLocale
  originalForm: Form
  preprint: PreprintTitle
  user: User
}) =>
  pipe(
    deleteForm(user.orcid, preprint.id),
    RTE.chainW(() => completedFormToNewPrereview({ form, preprint, orcidId: user.orcid })),
    RTE.chainW(
      flow(
        publishPrereview,
        RTE.orElseFirstW(error =>
          match(error)
            .with('unavailable', () => saveForm(user.orcid, preprint.id)(originalForm))
            .exhaustive(),
        ),
      ),
    ),
    RTE.chainFirstW(([doi, id]) =>
      storeInformationForWriteReviewPublishedPage(
        doi,
        form.moreAuthors,
        form.moreAuthors === 'yes' ? form.otherAuthors.length : 0,
        form.persona,
        id,
      ),
    ),
    RTE.matchW(
      () => failureMessage(locale),
      () => RedirectResponse({ location: format(writeReviewPublishedMatch.formatter, { id: preprint.id }) }),
    ),
  )

const showPublishForm = ({
  form,
  club,
  preprint,
  persona,
  locale,
}: {
  form: CompletedForm
  club: ClubName | null | undefined
  preprint: PreprintTitle
  persona: Prereviewers.Persona
  locale: SupportedLocale
}) => publishForm(preprint, form, club, persona, locale)

const publishPrereview = (newPrereview: NewPrereview) =>
  RTE.asksReaderTaskEither(
    RTE.fromTaskEitherK(({ publishPrereview }: PublishPrereviewEnv) => publishPrereview(newPrereview)),
  )
