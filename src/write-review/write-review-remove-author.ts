import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import * as O from 'fp-ts/Option'
import { Reader } from 'fp-ts/Reader'
import * as RA from 'fp-ts/ReadonlyArray'
import { flow, pipe } from 'fp-ts/function'
import { Status, StatusOpen } from 'hyper-ts'
import * as M from 'hyper-ts/lib/Middleware'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import * as D from 'io-ts/Decoder'
import { get } from 'spectacles-ts'
import { P, match } from 'ts-pattern'
import { canAddAuthors } from '../feature-flags'
import { MissingE, hasAnError, missingE } from '../form'
import { html, plainText, rawHtml, sendHtml } from '../html'
import { getMethod, notFound, seeOther, serviceUnavailable } from '../middleware'
import { page } from '../page'
import { PreprintId } from '../preprint-id'
import {
  writeReviewAddAuthorsMatch,
  writeReviewAuthorsMatch,
  writeReviewMatch,
  writeReviewRemoveAuthorMatch,
} from '../routes'
import { NonEmptyString } from '../string'
import { User, getUserFromSession } from '../user'
import { Form, getForm, saveForm, updateForm } from './form'
import { Preprint, getPreprint } from './preprint'

export const writeReviewRemoveAuthor = (doi: PreprintId['doi'], index: number) =>
  pipe(
    RM.fromReaderTaskEither(getPreprint(doi)),
    RM.ichainW(preprint =>
      pipe(
        RM.right({ preprint }),
        RM.apS('user', getUserFromSession()),
        RM.bindW(
          'canAddAuthors',
          fromReaderK(({ user }) => canAddAuthors(user)),
        ),
        RM.filterOrElseW(
          ({ canAddAuthors }) => canAddAuthors,
          () => 'not-found',
        ),
        RM.bindW('form', ({ user }) => RM.rightReaderTask(getForm(user.orcid, preprint.doi))),
        RM.bindW('author', ({ form }) =>
          RM.fromEither(
            pipe(
              form.otherAuthors ?? [],
              E.fromOptionK(() => 'not-found')(RA.lookup(index)),
              E.let('index', () => index),
            ),
          ),
        ),
        RM.apSW('method', RM.fromMiddleware(getMethod)),
        RM.ichainW(state =>
          match(state)
            .with({ form: { moreAuthors: 'yes' }, method: 'POST' }, handleRemoveAuthorForm)
            .with({ form: { moreAuthors: 'yes' } }, showRemoveAuthorForm)
            .otherwise(() => notFound),
        ),
        RM.orElseW(error =>
          match(error)
            .with('not-found', () => notFound)
            .otherwise(() => RM.fromMiddleware(seeOther(format(writeReviewMatch.formatter, { doi: preprint.doi })))),
        ),
      ),
    ),
    RM.orElseW(error =>
      match(error)
        .with('not-found', () => notFound)
        .with('unavailable', () => serviceUnavailable)
        .exhaustive(),
    ),
  )

const showRemoveAuthorForm = flow(
  fromReaderK(({ preprint, author }: { preprint: Preprint; author: Author }) =>
    removeAuthorForm(preprint, author, { removeAuthor: E.right(undefined) }),
  ),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareK(sendHtml),
)

const showRemoveAuthorErrorForm = (preprint: Preprint, author: Author) =>
  flow(
    fromReaderK((form: RemoveAuthorForm) => removeAuthorForm(preprint, author, form)),
    RM.ichainFirst(() => RM.status(Status.BadRequest)),
    RM.ichainMiddlewareK(sendHtml),
  )

const handleRemoveAuthorForm = ({
  form,
  preprint,
  author,
  user,
}: {
  form: Form
  preprint: Preprint
  author: Author
  user: User
}) =>
  pipe(
    RM.decodeBody(body => E.right({ removeAuthor: pipe(RemoveAuthorFieldD.decode(body), E.mapLeft(missingE)) })),
    RM.chainEitherK(fields =>
      pipe(
        E.Do,
        E.apS('removeAuthor', fields.removeAuthor),
        E.mapLeft(() => fields),
      ),
    ),
    RM.ichainW(state =>
      match(state)
        .with({ removeAuthor: 'yes' }, () =>
          pipe(
            RM.of({
              otherAuthors: pipe(
                form.otherAuthors ?? [],
                RA.deleteAt(author.index),
                O.getOrElse(() => form.otherAuthors),
              ),
            }),
            RM.map(updateForm(form)),
            RM.chainFirstReaderTaskK(saveForm(user.orcid, preprint.doi)),
            RM.ichainMiddlewareK(form =>
              match(form)
                .with({ otherAuthors: P.optional([]) }, () =>
                  seeOther(format(writeReviewAuthorsMatch.formatter, { doi: preprint.doi })),
                )
                .otherwise(() => seeOther(format(writeReviewAddAuthorsMatch.formatter, { doi: preprint.doi }))),
            ),
          ),
        )
        .with(
          { removeAuthor: 'no' },
          fromMiddlewareK(() => seeOther(format(writeReviewAddAuthorsMatch.formatter, { doi: preprint.doi }))),
        )
        .exhaustive(),
    ),
    RM.orElseW(showRemoveAuthorErrorForm(preprint, author)),
  )

const RemoveAuthorFieldD = pipe(
  D.struct({
    removeAuthor: D.literal('yes', 'no'),
  }),
  D.map(get('removeAuthor')),
)

type Author = {
  readonly name: NonEmptyString
  readonly index: number
}

type RemoveAuthorForm = {
  readonly removeAuthor: E.Either<MissingE, 'yes' | 'no' | undefined>
}

function removeAuthorForm(preprint: Preprint, author: Author, form: RemoveAuthorForm) {
  const error = hasAnError(form)

  return page({
    title: plainText`${error ? 'Error: ' : ''}Are you sure you want to remove ${author.name}? – PREreview of “${
      preprint.title
    }”`,
    content: html`
      <nav>
        <a href="${format(writeReviewAddAuthorsMatch.formatter, { doi: preprint.doi })}" class="back">Back</a>
      </nav>

      <main>
        <form
          method="post"
          action="${format(writeReviewRemoveAuthorMatch.formatter, { doi: preprint.doi, index: author.index })}"
          novalidate
        >
          ${error
            ? html`
                <error-summary aria-labelledby="error-summary-title" role="alert">
                  <h2 id="error-summary-title">There is a problem</h2>
                  <ul>
                    ${E.isLeft(form.removeAuthor)
                      ? html`
                          <li>
                            <a href="#remove-author-no">
                              ${match(form.removeAuthor.left)
                                .with({ _tag: 'MissingE' }, () => html`Select yes if you want to remove ${author.name}`)
                                .exhaustive()}
                            </a>
                          </li>
                        `
                      : ''}
                  </ul>
                </error-summary>
              `
            : ''}

          <div ${rawHtml(E.isLeft(form.removeAuthor) ? 'class="error"' : '')}>
            <fieldset
              role="group"
              ${rawHtml(
                E.isLeft(form.removeAuthor) ? 'aria-invalid="true" aria-errormessage="remove-author-error"' : '',
              )}
            >
              <legend>
                <h1>Are you sure you want to remove ${author.name}?</h1>
              </legend>

              ${E.isLeft(form.removeAuthor)
                ? html`
                    <div class="error-message" id="remove-author-error">
                      <span class="visually-hidden">Error:</span>
                      ${match(form.removeAuthor.left)
                        .with({ _tag: 'MissingE' }, () => html`Select yes if you want to remove ${author.name}`)
                        .exhaustive()}
                    </div>
                  `
                : ''}

              <ol>
                <li>
                  <label>
                    <input
                      name="removeAuthor"
                      id="remove-author-no"
                      type="radio"
                      value="no"
                      ${match(form.removeAuthor)
                        .with(E.right('no' as const), () => 'checked')
                        .otherwise(() => '')}
                    />
                    <span>No</span>
                  </label>
                </li>
                <li>
                  <label>
                    <input
                      name="removeAuthor"
                      type="radio"
                      value="yes"
                      ${match(form.removeAuthor)
                        .with(E.right('yes' as const), () => 'checked')
                        .otherwise(() => '')}
                    />
                    <span>Yes</span>
                  </label>
                </li>
              </ol>
            </fieldset>
          </div>

          <button>Save and continue</button>
        </form>
      </main>
    `,
    js: ['error-summary.js'],
  })
}

// https://github.com/DenisFrezzato/hyper-ts/pull/83
const fromMiddlewareK =
  <R, A extends ReadonlyArray<unknown>, B, I, O, E>(
    f: (...a: A) => M.Middleware<I, O, E, B>,
  ): ((...a: A) => RM.ReaderMiddleware<R, I, O, E, B>) =>
  (...a) =>
    RM.fromMiddleware(f(...a))

// https://github.com/DenisFrezzato/hyper-ts/pull/85
function fromReaderK<R, A extends ReadonlyArray<unknown>, B, I = StatusOpen, E = never>(
  f: (...a: A) => Reader<R, B>,
): (...a: A) => RM.ReaderMiddleware<R, I, I, E, B> {
  return (...a) => RM.rightReader(f(...a))
}
