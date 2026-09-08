import { FileSystem } from '@effect/platform'
import { NodeFileSystem } from '@effect/platform-node'
import { expect, it } from '@effect/vitest'
import { assertEquals } from '@effect/vitest/utils'
import resolveResponse from 'contentful-resolve-response'
import { Array, Effect, pipe, Schema, Struct } from 'effect'
import { Entries } from '../../../../src/ExternalApis/Contentful/index.ts'
import * as _ from '../../../../src/ExternalInteractions/ContentfulPages/GetPage/EntryToContentfulPage.ts'
import { ContentfulPage } from '../../../../src/ExternalInteractions/ContentfulPages/index.ts'
import { html } from '../../../../src/html.ts'
import { DefaultLocale } from '../../../../src/locales/index.ts'

it.effect.each<{
  response: string
  index: number
  expected: ContentfulPage
}>([
  {
    response: 'pages-assets',
    index: 0,
    expected: new ContentfulPage({
      html: html`
        <h1>Fiscal Sponsor</h1>
        <img
          src="https://images.ctfassets.net/dapbmjoaf8gb/I28uS78afIF2uFWUkoKD7/b1f93b4b5f4efc1cf8df24e9db60f1b1/CSandSSquare5.svg"
          width="800"
          height="800"
          alt=""
        />
        <p>
          PREreview operates as a non-profit as a fiscally sponsored project of
          <a href="https://codeforscience.org/">Code for Science &amp; Society (CS&amp;S)</a>. CS&amp;S is a 501(c)(3)
          nonprofit registered in the United States. CS&amp;S provides administrative and strategic resources to project
          leads to support them in developing innovative technologies that benefit humanity. CS&amp;S supports PREreview
          by assisting in building relationships with funding agencies, in connecting us with the larger public interest
          tech community, as well as in hiring and management of staff.
        </p>
      `,
      locale: DefaultLocale,
    }),
  },
  {
    response: 'pages-unordered-list-table',
    index: 0,
    expected: new ContentfulPage({
      html: html`
        <p>
          Peer review plays a pivotal role in determining which research projects receive funding, which findings get
          published, and ultimately, which knowledge is disseminated and utilized by the scientific community and the
          broader public. Despite its critical importance, reviewers often undergo minimal training for this crucial
          task. Furthermore, that training rarely focuses on mitigating the biases that are ingrained in the peer review
          process. Hence, new generations of reviewers often lack the frameworks to address their biases leading to a
          perpetuation of the current problems of inequities in scholarly publishing. At PREreview we offer two kinds of
          peer review training workshops centered on issues of equity, diversity, and inclusion:
          <b>PREreview Open Reviewers</b>, focused on research manuscripts’ review, and
          <b>PREreview Open Grant Reviewers</b>, focused on grant applications’ review.
        </p>
        <p>
          We work with organizations, institutions, and funding agencies that want to offer their communities the
          opportunity to challenge their beliefs and learn from one another how to recognize and mitigate the impact of
          bias in research evaluation.
        </p>
        <p>
          Our workshops are designed for safe and inclusive delivery - both online and in-person - by providing clear
          guidelines ahead of time and by accommodating participants’ different communication and participation styles.
          Our content is intentionally interactive and is presented to participants using collaborative note-taking and
          other supporting tools, such as Mentimeter. Contact us at
          <a href="mailto:community@prereview.org">community@prereview.org</a> to discuss which type of workshop is best
          for your organization and options for tailoring our workshop content for your organization’s needs.
        </p>
        <p>
          Note: we also run 2-hour community workshops every quarter of the year which are open to individual sign-ups.
          Read below for more information on the next available workshop and how to register.
        </p>
        <h1>PREreview Open Reviewers</h1>
        <p>
          The Open Reviewers Workshop is an interactive and hands-on training program designed for researchers at all
          career levels who are interested in engaging in ethical and constructive manuscript peer review. With a focus
          on promoting equity, diversity, and inclusion, the workshop provides participants with the necessary skills
          and knowledge to conduct equitable peer reviews with the use of materials from
          <a href="/resources">The Open Reviewers Toolkit</a>.
        </p>
        <h2>2-hour workshop</h2>
        <p>
          This stand-alone introductory workshop focuses on the basics of open, preprint peer review and becoming aware
          of biases present in the scholarly publication process.
        </p>
        <h3>Learning Objectives</h3>
        <ul>
          <li>A general understanding of journal-organized and independent review processes</li>
          <li>An introduction to how systems of oppression manifest in the manuscript review process</li>
          <li>An introduction to strategies to self-assess and mitigate bias in the context of manuscript review</li>
        </ul>
        <h2>Multi-session workshops</h2>
        <p>
          These multi-session training run for 4-6 hours and offer greater opportunities for practical review experience
          following a structured approach to writing a review, keeping issues of bias and systemic oppression front of
          mind. These workshops culminate in a <a href="/live-reviews">Live Review</a> session facilitated by PREreview
          staff where participants select and review a preprint together.
        </p>
        <h3>Learning Objectives</h3>
        <ul>
          <li>A general understanding of journal-organized and independent review processes</li>
          <li>A detailed understanding of how systems of oppression manifest in the manuscript review process</li>
          <li>Strategies to self-assess and mitigate bias in the context of manuscript review</li>
          <li>
            An in-depth understanding of and practical experience with peer reviewing a manuscript in a way that
            minimizes bias, striving for constructive, clear, and actionable feedback
          </li>
          <li>
            An opportunity to put learning into practice by collaboratively reviewing a preprint and publishing the
            resulting preprint review on PREreview.org
          </li>
        </ul>
        <h1>PREreview Open Grant Reviewers</h1>
        <p>
          The PREreview Open Grant Reviewers workshop is designed to guide grant reviewers in the equitable assessment
          of grant applications. Our goal is to engage and train a pool of diverse, socially conscious grant reviewers.
        </p>
        <h2>2-hour workshop</h2>
        <p>
          Open Grant Reviewers is currently offered as a 2-hour workshop but can be modified to provide greater support
          and depth of learning. Throughout the workshop, reviewers are encouraged to identify and address biases in the
          grant review process using our <a href="/resources">training materials</a>, which include a Bias Reflection
          Guide. Our curriculum includes space for debate-based learning and open discussions among the reviewers.
        </p>
        <h3>Learning Objectives</h3>
        <ul>
          <li>
            A broad understanding of what systems of oppression are and how they manifest in the grant review process
          </li>
          <li>Strategies to recognize, self-assess, and address bias in the context of grant review</li>
          <li>
            How to review a grant in a way that minimizes bias, striving for constructive, clear, and actionable
            feedback
          </li>
          <li>
            Advice around best practices in creating rubrics and evaluation criteria that help reduce subjectivity, and
            bring greater transparency and equity into the review process
          </li>
        </ul>
        <h3>Pricing</h3>
        <p>
          The pricing across all our workshop offerings is as follows (in USD). Please note that these prices are for up
          to 30 participants but more can be added at an additional cost.
        </p>
        <table>
          <tr>
            <th>Criteria</th>
            <th>2 hours</th>
            <th>4 hours</th>
            <th>6 hours</th>
          </tr>
          <tr>
            <td>
              The annual revenue or expenses of your organization is &gt;$1.5 million USD, and/or you are based in a
              high-income country*
            </td>
            <td>$2,000</td>
            <td>$4,000</td>
            <td>$6,000</td>
          </tr>
          <tr>
            <td>
              The annual revenue or expenses of your organization is between $750,000 and $1.5 million USD, and/or you
              are based in an upper middle-income country*
            </td>
            <td>$1,000</td>
            <td>$2,000</td>
            <td>$3,000</td>
          </tr>
          <tr>
            <td>
              The annual revenue or expenses of your organization are between $250,000 and $750,00 USD, and/or you are
              based in a low or lower-middle-income country*
            </td>
            <td>$500</td>
            <td>$1,000</td>
            <td>$1,500</td>
          </tr>
          <tr>
            <td>
              The annual revenue or expenses of your organization is &lt;$250,000 USD, and/or you are based in an IDA
              (International Development Association) country*
            </td>
            <td>Free**</td>
            <td>Free**</td>
            <td>Free**</td>
          </tr>
        </table>
        <p>
          *Country classifications are as defined by the
          <a href="https://datatopics.worldbank.org/world-development-indicators/the-world-by-income-and-region.html"
            >World Bank categorization</a
          >. Please refer to the
          <a
            href="https://datahelpdesk.worldbank.org/knowledgebase/articles/906519-world-bank-country-and-lending-groups"
            >International Development Association</a
          >
          page for a list of eligible countries. The IDA is part of the World Bank. Its criteria are more nuanced than
          ‘low income’ or ‘lower-middle income’ as it takes into account GNI per capita as well as creditworthiness,
          which is especially important in countries where the gap between rich and poor is very large.
        </p>
        <p>
          ** As we are a small team, we have limited slots for free workshops over the course of the year. For the 4 and
          6 hours workshop, we can work with the organization/group to find sponsorship support. We appreciate your
          understanding and flexibility in accommodating workshop requests.
        </p>
        <p>
          This equitable pricing plan has been developed with reference to criteria used by
          <a href="https://c4disc.org/members">C4DISC</a>,
          <a href="https://carpentries.org/workshops/">The Carpentries</a>, and
          <a href="https://www.crossref.org/gem/">Crossref’s GEM program</a>.
        </p>
        <h1>Past and present collaborators include</h1>
        <ul>
          <li><a href="https://info.africarxiv.org/">AfricArXiv</a></li>
          <li><a href="https://www.asu.edu/">Arizona State University</a></li>
          <li><a href="https://www.crohnscolitisfoundation.org/">Crohn&apos;s and Colitis Foundation</a></li>
          <li><a href="https://www.healthra.org/">Health Research Alliance</a></li>
          <li><a href="https://www.orfg.org/">Open Research Funders Group</a></li>
          <li><a href="https://www.ohsu.edu/">Oregon Health &amp; Science University</a></li>
          <li><a href="https://eiderafricaltd.org/">Eider Africa</a></li>
          <li><a href="https://elifesciences.org/">eLife</a></li>
          <li><a href="https://www.nccr-antiresist.ch/">NCCR AntiResist</a></li>
          <li><a href="https://www.acog.org/">The American College of Obstetricians and Gynecologists</a></li>
          <li><a href="https://www.tcc-africa.org/">Training Centre in Communication (TCC) Africa</a></li>
          <li><a href="https://www.exeter.ac.uk/">University of Exeter</a></li>
          <li><a href="https://www.icm.uu.se/">Uppsala University Department of Cell and Molecular Biology</a></li>
        </ul>
        <h1>PREreview Champions Program</h1>
        <p>
          The <a href="/champions-program">PREreview Champions Program</a> is a program designed to equip PREreview
          community members with the resources, skills, and support to facilitate the adaptation and adoption of open
          and equitable peer-review practices within their local communities.
        </p>
        <p>
          The program is offered yearly and was piloted in 2024. Past and future content related to the PREreview
          Champions Program can be found in
          <a href="https://content.prereview.org/tag/prereview-champion">this collection of blog posts</a> on our
          website.
        </p>
        <p>
          Please share your questions with us at <a href="mailto:community@prereview.org">community@prereview.org</a>.
        </p>
      `,
      locale: DefaultLocale,
    }),
  },
  {
    response: 'pages-cta-dynamic-embed',
    index: 0,
    expected: new ContentfulPage({
      html: html`
        <p>
          PREreview Clubs are collaborative preprint reviewing groups around a shared affiliation, affinity, interest,
          location, or any other common cause. Club members work together to give preprint authors timely, constructive
          peer feedback.
        </p>
        <h1>How can I start a PREreview Club?</h1>
        <p>
          Anyone who wants to form a collaborative preprint reviewing group can ask to start a Club. While we plan to
          automate the process more in the future, PREreview Clubs are a concierge service. That means you should
          <a href="https://airtable.com/appNMgC4snjFIJQ0X/shrV1HBbujo5ZZbzN">complete this form</a> to start a PREreview
          Club. We’ll get back in touch with you by email to describe the next steps in the process and to make sure
          it’s a good fit for what you want to achieve.
        </p>
        <p>
          If everything seems right, we’ll set up your Clubs page and go through our workflow with you to ensure that
          your Club and all its participating authors are credited on the reviews you author together.
        </p>
        <p>
          You might start a PREreview Club based on affinity, geography, or language. You might also create a Club for
          your class, lab, institution, or organization. You might even start a Club for your friends who love
          collaborative preprint review!
        </p>
        <p>
          You can check out our
          <a href="https://zenodo.org/records/10210085">PREreview Clubs onboarding document</a> here to learn more.
        </p>
        <p>
          If you’re interested in starting a club after that,
          <a href="https://airtable.com/appNMgC4snjFIJQ0X/shrV1HBbujo5ZZbzN">complete this form</a>, and we&apos;ll
          contact you soon to begin the process.
        </p>
        <a href="https://airtable.com/appNMgC4snjFIJQ0X/shrV1HBbujo5ZZbzN" class="button">Start a Club!</a>
        <h1>Can I join an existing PREreview Club?</h1>
        <p>
          Yes, you can if the club is open to accepting new members. Some clubs are dedicated to particular groups or
          communities. Here is the list of active PREreview Clubs:
        </p>
        {{list-of-active-clubs}}
        <p>Here is the list of inactive PREreview Clubs:</p>
        {{list-of-inactive-clubs}}
        <h1>Share your PREreview Clubs feedback</h1>
        <p>
          If you have feedback to give about your PREreview Clubs experience, please feel welcome to schedule a user
          research interview with Head of Product Chad Sansing.
          <a href="https://calendar.app.google/DErAfj3kydB3BqDZ7">Click here to sign up for a chat</a>. If you can’t
          find a time that works for you, you can <a href="mailto:chad@prereview.org">email Chad</a> to arrange a call,
          as well. Whenever possible, we compensate interviewees.
        </p>
        <h1>Join the PREreview community Slack</h1>
        <p>
          The PREreview community is now on Slack! Join us to connect with like-minded peers and to continue
          conversations with colleagues and other participants from PREreview training workshops.
        </p>
        <p><a href="https://bit.ly/PREreview-Slack">Sign up here</a> for your invitation to join us on Slack!</p>
        <a href="https://bit.ly/PREreview-Slack" class="button">Join our Slack</a>
        <p></p>
      `,
      locale: DefaultLocale,
    }),
  },
])('can parse a record ($response $index)', ({ response, index, expected }) =>
  Effect.gen(function* () {
    const actual = yield* pipe(
      FileSystem.FileSystem,
      Effect.andThen(fs => fs.readFileString(`test/ExternalApis/Contentful/GetEntries/Samples/${response}.json`)),
      Effect.map(ResolveEntries),
      Effect.andThen(Schema.decodeUnknown(Entries)),
      Effect.andThen(Struct.get('items')),
      Effect.andThen(Array.get(index)),
      Effect.andThen(Schema.decodeUnknown(_.EntryToContentfulPage)),
    )

    assertEquals(actual, expected)
  }).pipe(Effect.provide(NodeFileSystem.layer)),
)

it.effect.each([['banners']])("can't parse a record (%s)", ([response]) =>
  Effect.gen(function* () {
    const actual = yield* pipe(
      FileSystem.FileSystem,
      Effect.andThen(fs => fs.readFileString(`test/ExternalApis/Contentful/GetEntries/Samples/${response}.json`)),
      Effect.map(ResolveEntries),
      Effect.andThen(Schema.decodeUnknown(Entries)),
      Effect.andThen(Struct.get('items')),
      Effect.andThen(Array.map(item => Schema.decodeUnknown(_.EntryToContentfulPage)(item))),
      Effect.andThen(Effect.allWith({ concurrency: 'unbounded', mode: 'either' })),
    )

    actual.forEach(result => {
      expect(result).toMatchObject({ _tag: 'Left' })
    })
  }).pipe(Effect.provide(NodeFileSystem.layer)),
)

const ResolveEntries = (response: string) => {
  const body = JSON.parse(response)

  return { ...body, items: resolveResponse(body) }
}
