import { flow, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { P, match } from 'ts-pattern'
import type { SupportedLocale } from '../../../locales/index.ts'
import { type GetPreprintTitleEnv, getPreprintTitle } from '../../../preprint.ts'
import type { IndeterminatePreprintId } from '../../../Preprints/index.ts'
import { EffectToFpts } from '../../../RefactoringUtilities/index.ts'
import * as ReviewRequests from '../../../ReviewRequests/index.ts'
import * as Routes from '../../../routes.ts'
import { requestReviewCheckMatch } from '../../../routes.ts'
import type { User } from '../../../user.ts'
import { havingProblemsPage, pageNotFound } from '../../http-error.ts'
import {
  LogInResponse,
  type PageResponse,
  RedirectResponse,
  type StreamlinePageResponse,
} from '../../Response/index.ts'
import * as ChooseYourPersonaForm from './ChooseYourPersonaForm.ts'
import { personaForm } from './persona-form.ts'

export const requestReviewPersona = ({
  preprint,
  user,
  locale,
}: {
  preprint: IndeterminatePreprintId
  user?: User
  locale: SupportedLocale
}): RT.ReaderTask<
  GetPreprintTitleEnv & EffectToFpts.EffectEnv<ReviewRequests.ReviewRequestQueries>,
  LogInResponse | PageResponse | RedirectResponse | StreamlinePageResponse
> =>
  pipe(
    RTE.Do,
    RTE.apS('user', RTE.fromNullable('no-session' as const)(user)),
    RTE.let('locale', () => locale),
    RTE.bindW('preprint', () =>
      pipe(
        getPreprintTitle(preprint),
        RTE.map(preprint => preprint.id),
      ),
    ),
    RTE.bindW(
      'reviewRequest',
      flow(({ user, preprint }) =>
        EffectToFpts.toReaderTaskEither(
          ReviewRequests.getPersonaChoice({ requesterId: user.orcid, preprintId: preprint }),
        ),
      ),
    ),
    RTE.matchEW(
      error =>
        RT.of(
          match(error)
            .with({ _tag: 'ReviewRequestHasBeenPublished' }, () =>
              RedirectResponse({ location: Routes.RequestAReviewPublished.href({ preprintId: preprint }) }),
            )
            .with('no-session', () =>
              LogInResponse({ location: Routes.RequestAReviewOfThisPreprint.href({ preprintId: preprint }) }),
            )
            .with({ _tag: P.union('PreprintIsNotFound', 'UnknownReviewRequest') }, () => pageNotFound(locale))
            .with({ _tag: P.union('PreprintIsUnavailable', 'UnableToQuery') }, 'unavailable', () =>
              havingProblemsPage(locale),
            )
            .exhaustive(),
        ),
      ({ preprint, reviewRequest, user, locale }) =>
        RT.of(
          personaForm({
            form: ChooseYourPersonaForm.fromPersonaChoice(reviewRequest.personaChoice),
            preprint,
            user,
            locale,
          }),
        ),
    ),
  )

export const requestReviewPersonaSubmission = ({
  body,
  preprint,
  user,
  locale,
}: {
  body: unknown
  preprint: IndeterminatePreprintId
  user?: User
  locale: SupportedLocale
}): RT.ReaderTask<
  GetPreprintTitleEnv &
    EffectToFpts.EffectEnv<ReviewRequests.ReviewRequestCommands | ReviewRequests.ReviewRequestQueries>,
  LogInResponse | PageResponse | RedirectResponse | StreamlinePageResponse
> =>
  pipe(
    RTE.Do,
    RTE.apS('user', RTE.fromNullable('no-session' as const)(user)),
    RTE.let('locale', () => locale),
    RTE.bindW('preprint', () =>
      pipe(
        getPreprintTitle(preprint),
        RTE.map(preprint => preprint.id),
      ),
    ),
    RTE.bindW(
      'reviewRequest',
      flow(({ user, preprint }) =>
        EffectToFpts.toReaderTaskEither(
          ReviewRequests.getPersonaChoice({ requesterId: user.orcid, preprintId: preprint }),
        ),
      ),
    ),
    RTE.let('body', () => body),
    RTE.matchEW(
      error =>
        RT.of(
          match(error)
            .with({ _tag: 'ReviewRequestHasBeenPublished' }, () =>
              RedirectResponse({ location: Routes.RequestAReviewPublished.href({ preprintId: preprint }) }),
            )
            .with('no-session', () =>
              LogInResponse({ location: Routes.RequestAReviewOfThisPreprint.href({ preprintId: preprint }) }),
            )
            .with({ _tag: P.union('PreprintIsNotFound', 'UnknownReviewRequest') }, () => pageNotFound(locale))
            .with({ _tag: P.union('PreprintIsUnavailable', 'UnableToQuery') }, 'unavailable', () =>
              havingProblemsPage(locale),
            )
            .exhaustive(),
        ),
      ({ preprint, reviewRequest, user, locale, body }) =>
        pipe(
          EffectToFpts.toReaderTaskEither(ChooseYourPersonaForm.fromBody(body)),
          RTE.filterOrElse(
            form => form._tag === 'CompletedForm',
            form => form as ChooseYourPersonaForm.InvalidForm,
          ),
          RTE.chainFirstW(form =>
            EffectToFpts.toReaderTaskEither(
              ReviewRequests.choosePersona({
                persona: form.chooseYourPersona,
                reviewRequestId: reviewRequest.reviewRequestId,
              }),
            ),
          ),
          RTE.matchW(
            error =>
              match(error)
                .with('unavailable', () => havingProblemsPage(locale))
                .with(
                  { _tag: P.union('UnknownReviewRequest', 'ReviewRequestHasBeenPublished', 'UnableToHandleCommand') },
                  () => havingProblemsPage(locale),
                )
                .with({ _tag: 'InvalidForm' }, form => personaForm({ form, preprint, user, locale }))
                .exhaustive(),
            () => RedirectResponse({ location: format(requestReviewCheckMatch.formatter, { id: preprint }) }),
          ),
        ),
    ),
  )
