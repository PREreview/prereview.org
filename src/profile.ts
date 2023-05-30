import type { Reader } from 'fp-ts/Reader'
import { pipe } from 'fp-ts/function'
import { Status, type StatusOpen } from 'hyper-ts'
import * as RM from 'hyper-ts/lib/ReaderMiddleware'
import { html, plainText, sendHtml } from './html'
import { page } from './page'
import type { User } from './user'
import { maybeGetUser } from './user'

export const profile = pipe(
  maybeGetUser,
  chainReaderKW(createPage),
  RM.ichainFirst(() => RM.status(Status.OK)),
  RM.ichainMiddlewareKW(sendHtml),
)

function createPage(user?: User) {
  return page({
    title: plainText`Daniela Saderi’s PREreviews`,
    content: html`
      <main id="main-content">
        <h1>Daniela Saderi’s PREreviews</h1>

        <ol class="cards">
          <li>
            <article>
              <a href="https://beta.prereview.org/reviews/6577344">
                <b>Ahmet Bakirbas</b>, <b>Allison Barnes</b>, <b>JOHN LILLY JIMMY</b>, <b>Daniela Saderi</b>, and
                <b>ARPITA YADAV</b> reviewed
                <cite dir="ltr" lang="en">Ovule siRNAs methylate protein-coding genes in <i>trans</i></cite>
              </a>

              <dl>
                <dt>Review published</dt>
                <dd><time datetime="2022-05-24">May 24, 2022</time></dd>
                <dt>Preprint server</dt>
                <dd>bioRxiv</dd>
              </dl>
            </article>
          </li>

          <li>
            <article>
              <a href="https://beta.prereview.org/reviews/6323771">
                <b>JOHN LILLY JIMMY</b>, <b>Priyanka Joshi</b>, <b>Dilip Kumar</b>, <b>Neha Nandwani</b>,
                <b>Ritam Neupane</b>, <b>Ailis OCarroll</b>, <b>Guto Rhys</b>, <b>Javier Aguirre Rivera</b>,
                <b>Daniela Saderi</b>, <b>Mohammad Salehin</b>, and <b>Agata Witkowska</b> reviewed
                <cite dir="ltr" lang="en"
                  >Biochemical analysis of deacetylase activity of rice sirtuin OsSRT1, a class IV member in
                  plants</cite
                >
              </a>

              <dl>
                <dt>Review published</dt>
                <dd><time datetime="2022-03-02">March 2, 2022</time></dd>
                <dt>Preprint server</dt>
                <dd>bioRxiv</dd>
              </dl>
            </article>
          </li>

          <li>
            <article>
              <a href="https://beta.prereview.org/reviews/5767994">
                <b>Daniela Saderi</b>, <b>Sonisilpa Mohapatra</b>, <b>Nikhil Bhandarkar</b>, <b>Antony Gruness</b>,
                <b>Isha Soni</b>, <b>Iratxe Puebla</b>, and <b>Jessica Polka</b> reviewed
                <cite dir="ltr" lang="en"
                  >Assessment of <i>Agaricus bisporus</i> Mushroom as Protective Agent Against Ultraviolet
                  Exposure</cite
                >
              </a>

              <dl>
                <dt>Review published</dt>
                <dd><time datetime="2021-12-08">December 8, 2021</time></dd>
                <dt>Preprint server</dt>
                <dd>bioRxiv</dd>
              </dl>
            </article>
          </li>

          <li>
            <article>
              <a href="https://beta.prereview.org/reviews/5551162">
                <b>Daniela Saderi</b>, <b>Katrina Murphy</b>, <b>Leire Abalde-Atristain</b>, <b>Cole Brashaw</b>,
                <b>Robin Elise Champieux</b>, and <b>PREreview.org community member</b> reviewed
                <cite dir="ltr" lang="en"
                  >Influence of social determinants of health and county vaccination rates on machine learning models to
                  predict COVID-19 case growth in Tennessee</cite
                >
              </a>

              <dl>
                <dt>Review published</dt>
                <dd><time datetime="2021-10-05">October 5, 2021</time></dd>
                <dt>Preprint server</dt>
                <dd>medRxiv</dd>
              </dl>
            </article>
          </li>

          <li>
            <article>
              <a href="https://beta.prereview.org/reviews/7621712">
                <b>Daniela Saderi</b> reviewed
                <cite dir="ltr" lang="en"
                  >EMT network-based feature selection improves prognosis prediction in lung adenocarcinoma</cite
                >
              </a>

              <dl>
                <dt>Review published</dt>
                <dd><time datetime="2018-09-06">September 6, 2018</time></dd>
                <dt>Preprint server</dt>
                <dd>bioRxiv</dd>
              </dl>
            </article>
          </li>

          <li>
            <article>
              <a href="https://beta.prereview.org/reviews/7621012">
                <b>Daniela Saderi</b> reviewed
                <cite dir="ltr" lang="en"
                  >Age-related decline in behavioral discrimination of amplitude modulation frequencies compared to
                  envelope-following responses</cite
                >
              </a>

              <dl>
                <dt>Review published</dt>
                <dd><time datetime="2017-09-28">September 28, 2017</time></dd>
                <dt>Preprint server</dt>
                <dd>bioRxiv</dd>
              </dl>
            </article>
          </li>

          <li>
            <article>
              <a href="https://beta.prereview.org/reviews/7620977">
                <b>Daniela Saderi</b> reviewed
                <cite dir="ltr" lang="en">Cortical Representations of Speech in a Multi-talker Auditory Scene</cite>
              </a>

              <dl>
                <dt>Review published</dt>
                <dd><time datetime="2017-04-10">April 10, 2017</time></dd>
                <dt>Preprint server</dt>
                <dd>bioRxiv</dd>
              </dl>
            </article>
          </li>
        </ol>
      </main>
    `,
    skipLinks: [[html`Skip to main content`, '#main-content']],
    user,
  })
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
