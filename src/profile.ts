import { Temporal } from '@js-temporal/polyfill'
import type { Doi } from 'doi-ts'
import { format } from 'fp-ts-routing'
import type { Reader } from 'fp-ts/Reader'
import * as RNEA from 'fp-ts/ReadonlyNonEmptyArray'
import { flow, pipe } from 'fp-ts/function'
import { Status, type StatusOpen } from 'hyper-ts'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import type { LanguageCode } from 'iso-639-1'
import { getLangDir } from 'rtl-detect'
import { match } from 'ts-pattern'
import { type Html, html, plainText, rawHtml, sendHtml } from './html'
import { page } from './page'
import type { PreprintId } from './preprint-id'
import { reviewMatch } from './routes'
import { renderDate } from './time'
import { type User, maybeGetUser } from './user'

import PlainDate = Temporal.PlainDate

type Prereviews = RNEA.ReadonlyNonEmptyArray<{
  readonly id: number
  readonly reviewers: RNEA.ReadonlyNonEmptyArray<string>
  readonly published: PlainDate
  readonly preprint: {
    readonly id: PreprintId
    readonly language: LanguageCode
    readonly title: Html
  }
}>

const hardcodedPrereviews = [
  {
    id: 6577344,
    reviewers: ['Ahmet Bakirbas', 'Allison Barnes', 'JOHN LILLY JIMMY', 'Daniela Saderi', 'ARPITA YADAV'],
    published: PlainDate.from('2022-05-24'),
    preprint: {
      id: { type: 'biorxiv', value: '10.1101/2021.06.10.447945' as Doi<'1101'> },
      language: 'en',
      title: html`Ovule siRNAs methylate protein-coding genes in <i>trans</i>`,
    },
  },
  {
    id: 6323771,
    reviewers: [
      'JOHN LILLY JIMMY',
      'Priyanka Joshi',
      'Dilip Kumar',
      'Neha Nandwani',
      'Ritam Neupane',
      'Ailis OCarroll',
      'Guto Rhys',
      'Javier Aguirre Rivera',
      'Daniela Saderi',
      'Mohammad Salehin',
      'Agata Witkowska',
    ],
    published: PlainDate.from('2022-03-02'),
    preprint: {
      id: { type: 'biorxiv', value: '10.1101/2021.11.05.467508' as Doi<'1101'> },
      language: 'en',
      title: html`Biochemical analysis of deacetylase activity of rice sirtuin OsSRT1, a class IV member in plants`,
    },
  },
  {
    id: 5767994,
    reviewers: [
      'Daniela Saderi',
      'Sonisilpa Mohapatra',
      'Nikhil Bhandarkar',
      'Antony Gruness',
      'Isha Soni',
      'Iratxe Puebla',
      'Jessica Polka',
    ],
    published: PlainDate.from('2021-12-08'),
    preprint: {
      id: { type: 'biorxiv', value: '10.1101/2021.10.21.465111' as Doi<'1101'> },
      language: 'en',
      title: html`Assessment of <i>Agaricus bisporus</i> Mushroom as Protective Agent Against Ultraviolet Exposure`,
    },
  },
  {
    id: 5551162,
    reviewers: [
      'Daniela Saderi',
      'Katrina Murphy',
      'Leire Abalde-Atristain',
      'Cole Brashaw',
      'Robin Elise Champieux',
      'PREreview.org community member',
    ],
    published: PlainDate.from('2021-10-05'),
    preprint: {
      id: { type: 'medrxiv', value: '10.1101/2021.07.28.21260814' as Doi<'1101'> },
      language: 'en',
      title: html`Influence of social determinants of health and county vaccination rates on machine learning models to
      predict COVID-19 case growth in Tennessee`,
    },
  },
  {
    id: 7621712,
    reviewers: ['Daniela Saderi'],
    published: PlainDate.from('2018-09-06'),
    preprint: {
      id: { type: 'biorxiv', value: '10.1101/410472' as Doi<'1101'> },
      language: 'en',
      title: html`EMT network-based feature selection improves prognosis prediction in lung adenocarcinoma`,
    },
  },
  {
    id: 7621012,
    reviewers: ['Daniela Saderi'],
    published: PlainDate.from('2017-09-28'),
    preprint: {
      id: { type: 'biorxiv', value: '10.1101/193268' as Doi<'1101'> },
      language: 'en',
      title: html`Age-related decline in behavioral discrimination of amplitude modulation frequencies compared to
      envelope-following responses`,
    },
  },
  {
    id: 7620977,
    reviewers: ['Daniela Saderi'],
    published: PlainDate.from('2017-04-10'),
    preprint: {
      id: { type: 'biorxiv', value: '10.1101/124750' as Doi<'1101'> },
      language: 'en',
      title: html`Cortical Representations of Speech in a Multi-talker Auditory Scene`,
    },
  },
] satisfies Prereviews

export const profile = pipe(
  RM.of(hardcodedPrereviews),
  RM.bindTo('prereviews'),
  RM.apS('user', maybeGetUser),
  chainReaderKW(createPage),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareKW(sendHtml),
)

function createPage({ prereviews, user }: { prereviews: Prereviews; user?: User }) {
  return page({
    title: plainText`Daniela Saderi’s PREreviews`,
    content: html`
      <main id="main-content">
        <h1>Daniela Saderi’s PREreviews</h1>

        <ol class="cards">
          ${prereviews.map(
            prereview => html`
              <li>
                <article>
                  <a href="${format(reviewMatch.formatter, { id: prereview.id })}">
                    ${formatList('en')(prereview.reviewers)} reviewed
                    <cite dir="${getLangDir(prereview.preprint.language)}" lang="${prereview.preprint.language}"
                      >${prereview.preprint.title}</cite
                    >
                  </a>

                  <dl>
                    <dt>Review published</dt>
                    <dd>${renderDate(prereview.published)}</dd>
                    <dt>Preprint server</dt>
                    <dd>
                      ${match(prereview.preprint.id.type)
                        .with('africarxiv', () => 'AfricArXiv Preprints')
                        .with('arxiv', () => 'arXiv')
                        .with('biorxiv', () => 'bioRxiv')
                        .with('chemrxiv', () => 'ChemRxiv')
                        .with('eartharxiv', () => 'EarthArXiv')
                        .with('ecoevorxiv', () => 'EcoEvoRxiv')
                        .with('edarxiv', () => 'EdArXiv')
                        .with('engrxiv', () => 'engrXiv')
                        .with('medrxiv', () => 'medRxiv')
                        .with('metaarxiv', () => 'MetaArXiv')
                        .with('osf', () => 'OSF Preprints')
                        .with('philsci', () => 'PhilSci-Archive')
                        .with('preprints.org', () => 'Preprints.org')
                        .with('psyarxiv', () => 'PsyArXiv')
                        .with('research-square', () => 'Research Square')
                        .with('scielo', () => 'SciELO Preprints')
                        .with('science-open', () => 'ScienceOpen Preprints')
                        .with('socarxiv', () => 'SocArXiv')
                        .with('zenodo', () => 'Zenodo')
                        .exhaustive()}
                    </dd>
                  </dl>
                </article>
              </li>
            `,
          )}
        </ol>
      </main>
    `,
    skipLinks: [[html`Skip to main content`, '#main-content']],
    user,
  })
}

function formatList(
  ...args: ConstructorParameters<typeof Intl.ListFormat>
): (list: RNEA.ReadonlyNonEmptyArray<Html | string>) => Html {
  const formatter = new Intl.ListFormat(...args)

  return flow(
    RNEA.map(item => html`<b>${item}</b>`.toString()),
    list => formatter.format(list),
    rawHtml,
  )
}

// https://github.com/DenisFrezzato/hyper-ts/pull/85
function fromReaderK<R, A extends ReadonlyArray<unknown>, B, I = StatusOpen, E = never>(
  f: (...a: A) => Reader<R, B>,
): (...a: A) => RM.ReaderMiddleware<R, I, I, E, B> {
  return (...a) => RM.rightReader(f(...a))
}

// https://github.com/DenisFrezzato/hyper-ts/pull/85
function chainReaderKW<R2, A, B>(
  f: (a: A) => Reader<R2, B>,
): <R1, I, E>(ma: RM.ReaderMiddleware<R1, I, I, E, A>) => RM.ReaderMiddleware<R1 & R2, I, I, E, B> {
  return RM.chainW(fromReaderK(f))
}
