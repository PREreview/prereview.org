import { Array, flow, Match, Option, pipe } from 'effect'
import { format } from 'fp-ts-routing'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { match } from 'ts-pattern'
import { havingProblemsPage, pageNotFound } from '../../http-error.js'
import type { SupportedLocale } from '../../locales/index.js'
import { getPreprintTitle, type GetPreprintTitleEnv } from '../../preprint.js'
import type { IndeterminatePreprintId, PreprintTitle } from '../../Preprints/index.js'
import { type LogInResponse, type PageResponse, RedirectResponse, type StreamlinePageResponse } from '../../response.js'
import { writeReviewAddAuthorMatch, writeReviewMatch } from '../../routes.js'
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
    RTE.matchEW(
      Match.valueTags({
        PreprintIsNotFound: () => RT.of(pageNotFound(locale)),
        PreprintIsUnavailable: () => RT.of(havingProblemsPage(locale)),
      }),
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
              Option.filter(Array.isNonEmptyReadonlyArray),
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
