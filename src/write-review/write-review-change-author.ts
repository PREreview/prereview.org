import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import * as O from 'fp-ts/Option'
import { Reader } from 'fp-ts/Reader'
import * as RA from 'fp-ts/ReadonlyArray'
import { constUndefined, flow, pipe } from 'fp-ts/function'
import { Status, StatusOpen } from 'hyper-ts'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import * as D from 'io-ts/Decoder'
import { Orcid, parse } from 'orcid-id-ts'
import { get } from 'spectacles-ts'
import { P, match } from 'ts-pattern'
import { canAddAuthors } from '../feature-flags'
import { InvalidE, MissingE, getInput, hasAnError, invalidE, missingE } from '../form'
import { html, plainText, rawHtml, sendHtml } from '../html'
import { getMethod, notFound, seeOther, serviceUnavailable } from '../middleware'
import { page } from '../page'
import { PreprintId } from '../preprint-id'
import { writeReviewAddAuthorsMatch, writeReviewChangeAuthorMatch, writeReviewMatch } from '../routes'
import { NonEmptyString, NonEmptyStringC } from '../string'
import { User, getUserFromSession } from '../user'
import { Form, getForm, saveForm, updateForm } from './form'
import { Preprint, getPreprint } from './preprint'

export const writeReviewChangeAuthor = (doi: PreprintId['doi'], index: number) =>
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
            .with({ form: { moreAuthors: 'yes' }, method: 'POST' }, handleChangeAuthorForm)
            .with({ form: { moreAuthors: 'yes' } }, showChangeAuthorForm)
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

const showChangeAuthorForm = flow(
  fromReaderK(({ preprint, author }: { preprint: Preprint; author: Author }) =>
    changeAuthorForm(preprint, author, { name: E.right(author.name), orcid: E.right(author.orcid) }),
  ),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareK(sendHtml),
)

const showChangeAuthorErrorForm = (preprint: Preprint, author: Author) =>
  flow(
    fromReaderK((form: ChangeAuthorForm) => changeAuthorForm(preprint, author, form)),
    RM.ichainFirst(() => RM.status(Status.BadRequest)),
    RM.ichainMiddlewareK(sendHtml),
  )

const handleChangeAuthorForm = ({
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
    RM.decodeBody(body =>
      E.right({
        name: pipe(NameFieldD.decode(body), E.mapLeft(missingE)),
        orcid: pipe(
          OrcidFieldD.decode(body),
          E.mapLeft(
            flow(
              getInput('orcid'),
              O.getOrElse(() => ''),
              invalidE,
            ),
          ),
        ),
      }),
    ),
    RM.chainEitherK(fields =>
      pipe(
        E.Do,
        E.apS('name', fields.name),
        E.apSW('orcid', fields.orcid),
        E.mapLeft(() => fields),
      ),
    ),
    RM.map(changedAuthor =>
      pipe(
        form.otherAuthors ?? [],
        RA.updateAt(author.index, changedAuthor.orcid ? changedAuthor : { name: changedAuthor.name }),
        O.getOrElse(() => form.otherAuthors ?? []),
        otherAuthors => ({ otherAuthors }),
        updateForm(form),
      ),
    ),
    RM.chainFirstReaderTaskK(saveForm(user.orcid, preprint.doi)),
    RM.ichainMiddlewareK(() => seeOther(format(writeReviewAddAuthorsMatch.formatter, { doi: preprint.doi }))),
    RM.orElseW(showChangeAuthorErrorForm(preprint, author)),
  )

type Author = {
  readonly name: NonEmptyString
  readonly orcid?: Orcid
  readonly index: number
}

const OrcidD = pipe(
  D.string,
  D.parse(s => E.fromOption(() => D.error(s, 'ORCID'))(parse(s))),
)

const NameFieldD = pipe(D.struct({ name: NonEmptyStringC }), D.map(get('name')))

const OrcidFieldD = pipe(
  D.struct({ orcid: D.union(OrcidD, pipe(D.literal(''), D.map(constUndefined))) }),
  D.map(get('orcid')),
)

type ChangeAuthorForm = {
  readonly name: E.Either<MissingE, NonEmptyString | undefined>
  readonly orcid: E.Either<InvalidE, Orcid | undefined>
}

function changeAuthorForm(preprint: Preprint, author: Author, form: ChangeAuthorForm) {
  const error = hasAnError(form)

  return page({
    title: plainText`${error ? 'Error: ' : ''}Change ${author.name} – PREreview of “${preprint.title}”`,
    content: html`
      <nav>
        <a href="${format(writeReviewAddAuthorsMatch.formatter, { doi: preprint.doi })}" class="back">Back</a>
      </nav>

      <main>
        <form
          method="post"
          action="${format(writeReviewChangeAuthorMatch.formatter, {
            doi: preprint.doi,
            index: author.index,
          })}"
          novalidate
        >
          ${error
            ? html`
                <error-summary aria-labelledby="error-summary-title" role="alert">
                  <h2 id="error-summary-title">There is a problem</h2>
                  <ul>
                    ${E.isLeft(form.name)
                      ? html`
                          <li>
                            <a href="#change-author-name">
                              ${match(form.name.left)
                                .with({ _tag: 'MissingE' }, () => 'Enter their name')
                                .exhaustive()}
                            </a>
                          </li>
                        `
                      : ''}
                    ${E.isLeft(form.orcid)
                      ? html`
                          <li>
                            <a href="#change-author-orcid">
                              ${match(form.orcid.left)
                                .with({ _tag: 'InvalidE' }, () => rawHtml('Enter their ORCID&nbsp;iD'))
                                .exhaustive()}
                            </a>
                          </li>
                        `
                      : ''}
                  </ul>
                </error-summary>
              `
            : ''}

          <h1>Change ${author.name}</h1>

          <div ${rawHtml(E.isLeft(form.name) ? 'class="error"' : '')}>
            <label for="change-author-name">Name</label>

            ${E.isLeft(form.name)
              ? html`
                  <div class="error-message" id="change-author-name-error">
                    <span class="visually-hidden">Error:</span>
                    ${match(form.name.left)
                      .with({ _tag: 'MissingE' }, () => 'Enter their name')
                      .exhaustive()}
                  </div>
                `
              : ''}

            <input
              id="change-author-name"
              name="name"
              type="text"
              spellcheck="false"
              ${match(form.name)
                .with(E.right(P.select(P.string)), value => html`value="${value}"`)
                .otherwise(() => '')}
              ${rawHtml(E.isLeft(form.name) ? 'aria-invalid="true" aria-errormessage="change-author-name-error"' : '')}
            />
          </div>

          <div ${rawHtml(E.isLeft(form.orcid) ? 'class="error"' : '')}>
            <label for="change-author-orcid">ORCID&nbsp;iD (optional)</label>

            ${E.isLeft(form.orcid)
              ? html`
                  <div class="error-message" id="change-author-orcid-error">
                    <span class="visually-hidden">Error:</span>

                    ${match(form.orcid.left)
                      .with({ _tag: 'InvalidE' }, () => rawHtml('Enter their ORCID&nbsp;iD'))
                      .exhaustive()}
                  </div>
                `
              : ''}

            <input
              id="change-author-orcid"
              name="orcid"
              class="orcid"
              type="text"
              size="19"
              autocomplete="off"
              spellcheck="false"
              ${match(form.orcid)
                .with(E.right(P.select(P.string)), value => html`value="${value}"`)
                .with(E.left({ actual: P.select() }), value => html`value="${value}"`)
                .otherwise(() => '')}
              ${rawHtml(
                E.isLeft(form.orcid) ? 'aria-invalid="true" aria-errormessage="change-author-orcid-error"' : '',
              )}
            />
          </div>

          <button>Save and continue</button>
        </form>
      </main>
    `,
    js: ['error-summary.js'],
  })
}

// https://github.com/DenisFrezzato/hyper-ts/pull/85
function fromReaderK<R, A extends ReadonlyArray<unknown>, B, I = StatusOpen, E = never>(
  f: (...a: A) => Reader<R, B>,
): (...a: A) => RM.ReaderMiddleware<R, I, I, E, B> {
  return (...a) => RM.rightReader(f(...a))
}
