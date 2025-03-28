import { flow, Option, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import * as RNEA from 'fp-ts/lib/ReadonlyNonEmptyArray.js'
import { match } from 'ts-pattern'
import * as FptsToEffect from '../../FptsToEffect.js'
import { havingProblemsPage, pageNotFound } from '../../http-error.js'
import type { SupportedLocale } from '../../locales/index.js'
import { getPreprintTitle, type GetPreprintTitleEnv, type PreprintTitle } from '../../preprint.js'
import { type LogInResponse, type PageResponse, RedirectResponse, type StreamlinePageResponse } from '../../response.js'
import { writeReviewAddAuthorMatch, writeReviewMatch } from '../../routes.js'
import type { IndeterminatePreprintId } from '../../types/preprint-id.js'
import type { User } from '../../user.js'
import { type Form, type FormStoreEnv, getForm, nextFormMatch } from '../form.js'
import { addAuthorsForm } from './add-authors-form.js'

export const writeReviewAddAuthors = ({
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
  FormStoreEnv & GetPreprintTitleEnv,
  LogInResponse | PageResponse | RedirectResponse | StreamlinePageResponse
> =>
  pipe(
    getPreprintTitle(id),
    RTE.matchE(
      error =>
        RT.of(
          match(error)
            .with({ _tag: 'PreprintIsNotFound' }, () => pageNotFound(locale))
            .with({ _tag: 'PreprintIsUnavailable' }, () => havingProblemsPage(locale))
            .exhaustive(),
        ),
      preprint =>
        pipe(
          RTE.Do,
          RTE.apS('user', pipe(RTE.fromNullable('no-session' as const)(user))),
          RTE.apS('locale', RTE.of(locale)),
          RTE.let('preprint', () => preprint),
          RTE.let('method', () => method),
          RTE.bindW('form', ({ preprint, user }) => getForm(user.orcid, preprint.id)),
          RTE.let(
            'authors',
            flow(
              Option.liftNullable(({ form }) => form.otherAuthors),
              Option.flatMap(FptsToEffect.optionK(RNEA.fromReadonlyArray)),
            ),
          ),
          RTE.matchW(
            error =>
              match(error)
                .with('no-form', 'no-session', () =>
                  RedirectResponse({ location: format(writeReviewMatch.formatter, { id: preprint.id }) }),
                )
                .with('form-unavailable', () => havingProblemsPage(locale))
                .exhaustive(),
            state =>
              match(state)
                .with({ form: { moreAuthors: 'yes' }, authors: { _tag: 'None' } }, () =>
                  RedirectResponse({ location: format(writeReviewAddAuthorMatch.formatter, { id: preprint.id }) }),
                )
                .with({ form: { moreAuthors: 'yes' }, authors: { _tag: 'Some' }, method: 'POST' }, handleAddAuthorsForm)
                .with({ form: { moreAuthors: 'yes' }, authors: { _tag: 'Some' } }, state =>
                  addAuthorsForm({
                    ...state,
                    authors: state.authors.value,
                    locale: state.locale,
                  }),
                )
                .otherwise(({ locale }) => pageNotFound(locale)),
          ),
        ),
    ),
  )

const handleAddAuthorsForm = ({ form, preprint }: { form: Form; preprint: PreprintTitle }) =>
  RedirectResponse({
    location: format(nextFormMatch(form).formatter, { id: preprint.id }),
  })
