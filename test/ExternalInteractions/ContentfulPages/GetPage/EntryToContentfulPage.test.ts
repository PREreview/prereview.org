import { FileSystem } from '@effect/platform'
import { NodeFileSystem } from '@effect/platform-node'
import { expect, it } from '@effect/vitest'
import { assertEquals } from '@effect/vitest/utils'
import resolveResponse from 'contentful-resolve-response'
import { Array, Effect, Layer, pipe, Schema, Struct } from 'effect'
import { Locale } from '../../../../src/Context.ts'
import { Entries } from '../../../../src/ExternalApis/Contentful/index.ts'
import { DynamicEmbedder } from '../../../../src/ExternalInteractions/ContentfulPages/DynamicEmbedder.ts'
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
      title: html`How we’re funded`,
      html: html`
        <h1><span>Fiscal Sponsor</span></h1>
        <img
          src="https://images.ctfassets.net/dapbmjoaf8gb/I28uS78afIF2uFWUkoKD7/b1f93b4b5f4efc1cf8df24e9db60f1b1/CSandSSquare5.svg"
          width="800"
          height="800"
          alt=""
        />
        <p>
          <span>
            PREreview operates as a non-profit as a fiscally sponsored project of
            <a href="https://codeforscience.org/">Code for Science &amp; Society (CS&amp;S)</a>. CS&amp;S is a 501(c)(3)
            nonprofit registered in the United States. CS&amp;S provides administrative and strategic resources to
            project leads to support them in developing innovative technologies that benefit humanity. CS&amp;S supports
            PREreview by assisting in building relationships with funding agencies, in connecting us with the larger
            public interest tech community, as well as in hiring and management of staff.
          </span>
        </p>
      `,
      locale: DefaultLocale,
    }),
  },
  {
    response: 'pages-unordered-list-table',
    index: 0,
    expected: new ContentfulPage({
      title: html`Trainings`,
      html: html`
        <p><span>
          Peer review plays a pivotal role in determining which research projects receive funding, which findings get
          published, and ultimately, which knowledge is disseminated and utilized by the scientific community and the
          broader public. Despite its critical importance, reviewers often undergo minimal training for this crucial
          task. Furthermore, that training rarely focuses on mitigating the biases that are ingrained in the peer review
          process. Hence, new generations of reviewers often lack the frameworks to address their biases leading to a
          perpetuation of the current problems of inequities in scholarly publishing. At PREreview we offer two kinds of
          peer review training workshops centered on issues of equity, diversity, and inclusion:
          <b>PREreview Open Reviewers</b>, focused on research manuscripts’ review, and
          <b>PREreview Open Grant Reviewers</b>, focused on grant applications’ review.
        </span></p>
        <p><span>
          We work with organizations, institutions, and funding agencies that want to offer their communities the
          opportunity to challenge their beliefs and learn from one another how to recognize and mitigate the impact of
          bias in research evaluation.
        </span></p>
        <p><span>
          Our workshops are designed for safe and inclusive delivery - both online and in-person - by providing clear
          guidelines ahead of time and by accommodating participants’ different communication and participation styles.
          Our content is intentionally interactive and is presented to participants using collaborative note-taking and
          other supporting tools, such as Mentimeter. Contact us at
          <a href="mailto:community@prereview.org">community@prereview.org</a> to discuss which type of workshop is best
          for your organization and options for tailoring our workshop content for your organization’s needs.
        </span></p>
        <p><span>
          Note: we also run 2-hour community workshops every quarter of the year which are open to individual sign-ups.
          Read below for more information on the next available workshop and how to register.
        </span></p>
        <h1><span>PREreview Open Reviewers</span></h1>
        <p><span>
          The Open Reviewers Workshop is an interactive and hands-on training program designed for researchers at all
          career levels who are interested in engaging in ethical and constructive manuscript peer review. With a focus
          on promoting equity, diversity, and inclusion, the workshop provides participants with the necessary skills
          and knowledge to conduct equitable peer reviews with the use of materials from
          <a href="/resources">The Open Reviewers Toolkit</a>.
        </span></p>
        <h2><span>2-hour workshop</span></h2>
        <p><span>
          This stand-alone introductory workshop focuses on the basics of open, preprint peer review and becoming aware
          of biases present in the scholarly publication process.
        </span></p>
        <h3><span>Learning Objectives</span></h3>
        <ul>
          <li><span>A general understanding of journal-organized and independent review processes</li>
          <li><span>An introduction to how systems of oppression manifest in the manuscript review process</li>
          <li><span>An introduction to strategies to self-assess and mitigate bias in the context of manuscript review</li>
        </ul>
        <h2><span>Multi-session workshops</span></h2>
        <p><span>
          These multi-session training run for 4-6 hours and offer greater opportunities for practical review experience
          following a structured approach to writing a review, keeping issues of bias and systemic oppression front of
          mind. These workshops culminate in a <a href="/live-reviews">Live Review</a> session facilitated by PREreview
          staff where participants select and review a preprint together.
        </span></p>
        <h3><span>Learning Objectives</span></h3>
        <ul>
          <li><span>A general understanding of journal-organized and independent review processes</li>
          <li><span>A detailed understanding of how systems of oppression manifest in the manuscript review process</li>
          <li><span>Strategies to self-assess and mitigate bias in the context of manuscript review</li>
          <li><span>
            An in-depth understanding of and practical experience with peer reviewing a manuscript in a way that
            minimizes bias, striving for constructive, clear, and actionable feedback
          </li>
          <li><span>
            An opportunity to put learning into practice by collaboratively reviewing a preprint and publishing the
            resulting preprint review on PREreview.org
          </li>
        </ul>
        <h1><span>PREreview Open Grant Reviewers</span></h1>
        <p><span>
          The PREreview Open Grant Reviewers workshop is designed to guide grant reviewers in the equitable assessment
          of grant applications. Our goal is to engage and train a pool of diverse, socially conscious grant reviewers.
        </span></p>
        <h2><span>2-hour workshop</span></h2>
        <p><span>
          Open Grant Reviewers is currently offered as a 2-hour workshop but can be modified to provide greater support
          and depth of learning. Throughout the workshop, reviewers are encouraged to identify and address biases in the
          grant review process using our <a href="/resources">training materials</a>, which include a Bias Reflection
          Guide. Our curriculum includes space for debate-based learning and open discussions among the reviewers.
        </span></p>
        <h3><span>Learning Objectives</span></h3>
        <ul>
          <li><span>
            A broad understanding of what systems of oppression are and how they manifest in the grant review process
          </li>
          <li><span>Strategies to recognize, self-assess, and address bias in the context of grant review</li>
          <li><span>
            How to review a grant in a way that minimizes bias, striving for constructive, clear, and actionable
            feedback
          </li>
          <li><span>
            Advice around best practices in creating rubrics and evaluation criteria that help reduce subjectivity, and
            bring greater transparency and equity into the review process
          </li>
        </ul>
        <h3><span>Pricing</span></h3>
        <p><span>
          The pricing across all our workshop offerings is as follows (in USD). Please note that these prices are for up
          to 30 participants but more can be added at an additional cost.
        </span></p>
        <table>
          <tr>
            <th><span>Criteria</span></th>
            <th><span>2 hours</span></th>
            <th><span>4 hours</span></th>
            <th><span>6 hours</span></th>
          </tr>
          <tr>
            <td><span>
              The annual revenue or expenses of your organization is &gt;$1.5 million USD, and/or you are based in a
              high-income country*
            </span></td>
            <td><span>$2,000</span></td>
            <td><span>$4,000</span></td>
            <td><span>$6,000</span></td>
          </tr>
          <tr>
            <td><span>
              The annual revenue or expenses of your organization is between $750,000 and $1.5 million USD, and/or you
              are based in an upper middle-income country*
            </span></td>
            <td><span>$1,000</span></td>
            <td><span>$2,000</span></td>
            <td><span>$3,000</span></td>
          </tr>
          <tr>
            <td><span>
              The annual revenue or expenses of your organization are between $250,000 and $750,00 USD, and/or you are
              based in a low or lower-middle-income country*
            </span></td>
            <td><span>$500</span></td>
            <td><span>$1,000</span></td>
            <td><span>$1,500</span></td>
          </tr>
          <tr>
            <td><span>
              The annual revenue or expenses of your organization is &lt;$250,000 USD, and/or you are based in an IDA
              (International Development Association) country*
            </span></td>
            <td><span>Free**</span></td>
            <td><span>Free**</span></td>
            <td><span>Free**</span></td>
          </tr>
        </table>
        <p><span>
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
        </span></p>
        <p><span>
          ** As we are a small team, we have limited slots for free workshops over the course of the year. For the 4 and
          6 hours workshop, we can work with the organization/group to find sponsorship support. We appreciate your
          understanding and flexibility in accommodating workshop requests.
        </span></p>
        <p><span>
          This equitable pricing plan has been developed with reference to criteria used by
          <a href="https://c4disc.org/members">C4DISC</a>,
          <a href="https://carpentries.org/workshops/">The Carpentries</a>, and
          <a href="https://www.crossref.org/gem/">Crossref’s GEM program</a>.
        </span></p>
        <h1><span>Past and present collaborators include</span></h1>
        <ul>
          <li><span><a href="https://info.africarxiv.org/">AfricArXiv</a></li>
          <li><span><a href="https://www.asu.edu/">Arizona State University</a></li>
          <li><span><a href="https://www.crohnscolitisfoundation.org/">Crohn&apos;s and Colitis Foundation</a></li>
          <li><span><a href="https://www.healthra.org/">Health Research Alliance</a></li>
          <li><span><a href="https://www.orfg.org/">Open Research Funders Group</a></li>
          <li><span><a href="https://www.ohsu.edu/">Oregon Health &amp; Science University</a></li>
          <li><span><a href="https://eiderafricaltd.org/">Eider Africa</a></li>
          <li><span><a href="https://elifesciences.org/">eLife</a></li>
          <li><span><a href="https://www.nccr-antiresist.ch/">NCCR AntiResist</a></li>
          <li><span><a href="https://www.acog.org/">The American College of Obstetricians and Gynecologists</a></li>
          <li><span><a href="https://www.tcc-africa.org/">Training Centre in Communication (TCC) Africa</a></li>
          <li><span><a href="https://www.exeter.ac.uk/">University of Exeter</a></li>
          <li><span><a href="https://www.icm.uu.se/">Uppsala University Department of Cell and Molecular Biology</a></li>
        </ul>
        <h1><span>PREreview Champions Program</span></h1>
        <p><span>
          The <a href="/champions-program">PREreview Champions Program</a> is a program designed to equip PREreview
          community members with the resources, skills, and support to facilitate the adaptation and adoption of open
          and equitable peer-review practices within their local communities.
        </span></p>
        <p><span>
          The program is offered yearly and was piloted in 2024. Past and future content related to the PREreview
          Champions Program can be found in
          <a href="https://content.prereview.org/tag/prereview-champion">this collection of blog posts</a> on our
          website.
        </span></p>
        <p><span>
          Please share your questions with us at <a href="mailto:community@prereview.org">community@prereview.org</a>.
        </span></p>
      `,
      locale: DefaultLocale,
    }),
  },
  {
    response: 'pages-cta-dynamic-embed',
    index: 0,
    expected: new ContentfulPage({
      title: html`Clubs`,
      html: html`
        <p>
          <span>
            PREreview Clubs are collaborative preprint reviewing groups around a shared affiliation, affinity, interest,
            location, or any other common cause. Club members work together to give preprint authors timely,
            constructive peer feedback.
          </span>
        </p>
        <h1><span>How can I start a PREreview Club?</span></h1>
        <p>
          <span>
            Anyone who wants to form a collaborative preprint reviewing group can ask to start a Club. While we plan to
            automate the process more in the future, PREreview Clubs are a concierge service. That means you should
            <a href="https://airtable.com/appNMgC4snjFIJQ0X/shrV1HBbujo5ZZbzN">complete this form</a> to start a
            PREreview Club. We’ll get back in touch with you by email to describe the next steps in the process and to
            make sure it’s a good fit for what you want to achieve.
          </span>
        </p>
        <p>
          <span>
            If everything seems right, we’ll set up your Clubs page and go through our workflow with you to ensure that
            your Club and all its participating authors are credited on the reviews you author together.
          </span>
        </p>
        <p>
          <span>
            You might start a PREreview Club based on affinity, geography, or language. You might also create a Club for
            your class, lab, institution, or organization. You might even start a Club for your friends who love
            collaborative preprint review!
          </span>
        </p>
        <p>
          <span>
            You can check out our
            <a href="https://zenodo.org/records/10210085">PREreview Clubs onboarding document</a> here to learn more.
          </span>
        </p>
        <p>
          <span>
            If you’re interested in starting a club after that,
            <a href="https://airtable.com/appNMgC4snjFIJQ0X/shrV1HBbujo5ZZbzN">complete this form</a>, and we&apos;ll
            contact you soon to begin the process.
          </span>
        </p>
        <a href="https://airtable.com/appNMgC4snjFIJQ0X/shrV1HBbujo5ZZbzN" class="button">
          <span>Start a Club!</span>
        </a>
        <h1><span>Can I join an existing PREreview Club?</span></h1>
        <p>
          <span>
            Yes, you can if the club is open to accepting new members. Some clubs are dedicated to particular groups or
            communities. Here is the list of active PREreview Clubs:
          </span>
        </p>
        {{list-of-active-clubs}}
        <p><span>Here is the list of inactive PREreview Clubs:</span></p>
        {{list-of-inactive-clubs}}
        <h1><span>Share your PREreview Clubs feedback</span></h1>
        <p>
          <span>
            If you have feedback to give about your PREreview Clubs experience, please feel welcome to schedule a user
            research interview with Head of Product Chad Sansing.
            <a href="https://calendar.app.google/DErAfj3kydB3BqDZ7">Click here to sign up for a chat</a>. If you can’t
            find a time that works for you, you can <a href="mailto:chad@prereview.org">email Chad</a> to arrange a
            call, as well. Whenever possible, we compensate interviewees.
          </span>
        </p>
        <h1><span>Join the PREreview community Slack</span></h1>
        <p>
          <span>
            The PREreview community is now on Slack! Join us to connect with like-minded peers and to continue
            conversations with colleagues and other participants from PREreview training workshops.
          </span>
        </p>
        <p>
          <span>
            <a href="https://bit.ly/PREreview-Slack">Sign up here</a> for your invitation to join us on Slack!
          </span>
        </p>
        <a href="https://bit.ly/PREreview-Slack" class="button">
          <span>Join our Slack</span>
        </a>
      `,
      locale: DefaultLocale,
    }),
  },
  {
    response: 'pages-media-profile-images',
    index: 0,
    expected: new ContentfulPage({
      title: html`People`,
      html: html`
        <p>
          <span>
            Our core team is currently composed of five full-time staff: <b>Vanessa Fairhurst</b>, Head of Community,
            <b>Daniela Saderi</b>, Executive Director, <b>Chad Sansing</b>, Head of Product, <b>María Pía Tavella</b>,
            Communications and Engagement Officer, and <b>Chris Wilkinson</b>, Head of Technology.
          </span>
        </p>
        <p>
          <span>
            We receive technical support from <b>Daniel Haarhoff</b>, Software Engineer at eLife, as part of an ongoing
            contract and collaboration between PREreview and eLife.
          </span>
        </p>
        <p>
          <span>
            We receive temporary support from <b>María Sol Ruiz</b>, part-time Champions Fellow, with the coordination
            of community-facing initiatives.
          </span>
        </p>
        <p>
          <span>
            We also rely on the wise advice and support of an Advisory Committee (AC), which currently includes
            <b>Monica Granados</b> (PREreview co-founder, AC Co-chair), <b>Samantha Hindle</b> (PREreview co-founder, AC
            Secretary), <b>Christopher Steven Marcum </b>(AC Chair),<b> Lamis Yahia Mohamed Elkheir</b>,
            <b>Aurelia Munene</b>,<b> Malvika Sharan</b>, and <b>Kirstie Whitaker </b>(AC Treasurer).
          </span>
        </p>
        <h1><span>Staff</span></h1>
        <h2><span>Vanessa Fairhurst (she/her) – Head of Community</span></h2>
        <img
          src="https://images.ctfassets.net/dapbmjoaf8gb/6IDInBIr6jbVwbQYjQD9bt/9305ded7186031a0b631a933c9c9961e/image-2.png"
          width="250"
          height="250"
          alt=""
        />
        <p>
          <span>
            Vanessa joined the PREreview team in November 2022. She studied her undergraduate in European Languages and
            Business Management before going onto study her Master’s in Applied and Professional Ethics. She began her
            career in academia working at international development organization INASP with a focus on improving access
            to scholarly information and research in developing countries. She then went on to support publishers around
            the world as Community Engagement Manager at Crossref building a global ambassador team and collaborating
            with others to ensure that scholarly research metadata is registered, linked, and distributed. Openness,
            accessibility, and equity have always been central to Vanessa’s work, and she greatly enjoys supporting and
            empowering researchers around the globe to improve the research process.
          </span>
        </p>
        <h2><span>Daniela Saderi, Ph.D. (she/her) – Executive Director, Co-Founder</span></h2>
        <img
          src="https://images.ctfassets.net/dapbmjoaf8gb/3IVE2OuH5vwEfPkqzeqh3Q/19170a355d75e21bddb7b1d26aaeb310/image-3.png"
          width="250"
          height="250"
          alt=""
        />
        <p>
          <span>
            Daniela is an Italian-born neuroscientist, community builder, and advocate for open and collaborative
            science. During her doctoral research, she discovered a passion for empowering early-career researchers and
            fostering cross-disciplinary collaboration, which led her to co-found PREreview. As a Mozilla Fellow for
            Science (2018/2019), Daniela worked to advance open practices, amplify marginalized voices in research, and
            create opportunities for inclusive collaboration.
          </span>
        </p>
        <p>
          <span>
            Her work focuses on facilitating transformative change by building trust with value-aligned organizations,
            breaking down silos, and fostering conversations that drive shared goals. Daniela thrives on surfacing
            innovative solutions, strengthening community networks, and enabling researchers to realize their full
            potential.
          </span>
        </p>
        <p><span>Outside of work, she enjoys reading and spending time with her family and friends.</span></p>
        <h2><span>Chad Sansing (he/him) – Head of Product</span></h2>
        <img
          src="https://images.ctfassets.net/dapbmjoaf8gb/7cOxbgJTA5aHAvOAF3mMms/f907cfeb048467d8753016ec3e5756a7/chad-sansing-pic-bw-250.png"
          width="250"
          height="250"
          alt=""
        />
        <p>
          <span>
            Chad joined the PREreview team in late October 2022. Prior to joining PREreview, he worked for the Mozilla
            Foundation in a variety of roles, most recently as a program manager on the MozFest team. While at Mozilla,
            Chad worked on several projects including its web literacy curriculum, Open Leadership Framework, Open
            Leaders program, and community and program management for the MozFest Trustworthy AI Working Group and the
            Facilitator and Volunteer communities at MozFest. Before that, Chad taught middle school for 14 years and
            helped found two small public schools for non-traditional learners. He is passionate about helping people
            discover their individual and shared capacities for social good and positive change. Outside work, you can
            find him reading, playing games, and hanging out with friends and family.
          </span>
        </p>
        <h2><span>María Pía Tavella, Ph.D. (she/her) - Communications and Engagement Officer</span></h2>
        <img
          src="https://images.ctfassets.net/dapbmjoaf8gb/69hG0LgJNaqAujlRdGkTYi/bc8669174601b05a2461c7cf99c764fd/pia-250.jpg"
          width="250"
          height="250"
          alt=""
        />
        <p>
          <span>
            Pía joined the PREreview team in December 2025. She is an Argentine anthropologist, science communicator and
            educator. While finishing her doctoral studies, she decided to cultivate her skills in science communication
            for diverse audiences, with the conviction that knowledge should be open, beneficial, and accessible for
            all. She went on to serve as Science Communication Professional for the Argentine research council CONICET,
            and completed the SAPIENS magazine Public Scholar Training Fellowship, gaining extensive experience in
            crafting science-related storytelling content for non-specialized audiences. Recently, she carried out a
            professional stay at the Museum of America in Spain, helping to communicate their decolonial initiatives.
          </span>
        </p>
        <p>
          <span>
            Pía is passionate about harnessing the power of compelling, strategic, and cross-cultural communications to
            advance meaningful, community-centered change. Outside work, she enjoys reading fiction, dancing, and
            immersing herself in nature.
          </span>
        </p>
        <h2><span>Chris Wilkinson (he/him) – Head of Technology</span></h2>
        <img
          src="https://images.ctfassets.net/dapbmjoaf8gb/3gNTZjNi1shtnoJc7MbOio/1fbfb72f89c7d6164c7dc8d2f2dad8d1/Chris-250.jpeg"
          width="250"
          height="250"
          alt=""
        />
        <p>
          <span>
            Chris joined PREreview as the Head of Technology in August 2024. Prior to that, he was Tech Lead Manager at
            eLife but working full time with the PREreview team since July 2021, helping us develop and maintain our
            preprint review platform. He started developing software professionally while working for the University of
            Cambridge, and began contributing to open-source software communities. Chris joined eLife in 2015, initially
            working on their internal publishing platform and open-source efforts. He later helped found Sciety and
            establish their remote-first ensemble-programming team. Before joining PREreview, he also worked with
            Knowledge Futures to create the DocMaps framework. Chris is a keen advocate for sustainable and accessible
            web-based software, iteratively developed in close collaboration with the wider team.
          </span>
        </p>
        <h2><span>Daniel Haarhoff – Software Engineer (eLife)</span></h2>
        <img
          src="https://images.ctfassets.net/dapbmjoaf8gb/UNYKBory9dn6gayYHGpeM/473958d6103608878bd7b7e70dc02b5a/cropped-bw-hff.jpg"
          width="250"
          height="250"
          alt=""
        />
        <p>
          <span>
            Daniel has been supporting Chris and the development of PREreview part-time since 2023. He has been part of
            the eLife tech team since 2020, working as part of the ensemble building Sciety. He is delighted to be
            helping to make science more equitable and transparent. In his spare time he has built
            <a href="https://freeyourscience.org/">FreeYourScience.org</a> to help scientists republish Open Access and
            volunteers and the Cambridge Makespace.
          </span>
        </p>
        <h2><span>María Sol Ruiz, Ph.D. (she/her) – Champion Fellow</span></h2>
        <img
          src="https://images.ctfassets.net/dapbmjoaf8gb/7oJ2Vtn4niB7Jd1w2quAp4/6ff20b029ca55e0850e526b5e27ead6c/sol-resized.png"
          width="250"
          height="250"
          alt=""
        />
        <p>
          <span>
            Sol joined the PREreview team as a part-time staff in January 2026 to provide support to the PREreview
            Champions programme and other community-facing initiatives. She is an Argentine biomedical scientist working
            at the University of Buenos Aires and the National Scientific Research Council in Argentina. Her research
            focuses on pediatric leukemias and molecular diagnostics. Adding to her experience, she is part of the
            teaching staff for Molecular Biology and Human Genetics at the University of Buenos Aires.
          </span>
        </p>
        <p>
          <span>
            Sol is an advocate for open and collaborative science, having participated in the eLife Ambassador and
            PREreview Champions programs. Throughout her career she has been part of diverse projects and teams that
            worked towards improving access to scientific resources and educational tools in disadvantaged groups.
          </span>
        </p>
        <h1><span>Advisory Committee</span></h1>
        <p>
          <span>
            PREreview’s Advisory Committee is responsible for hiring and evaluating the Executive Director, providing
            financial oversight, and advising on strategic planning, fundraising, and business models. Additionally,
            members of the AC serve as advocates and ambassadors for the organization, leveraging their networks to
            benefit the organization’s reputation and long-term financial sustainability. The AC executes these
            responsibilities through meetings, regular correspondence, and collaboration via email and online platforms.
          </span>
        </p>
        <h2><span>Samantha Hindle, Ph.D. (she/her) – Co-Founder, Advisory Committee Secretary</span></h2>
        <img
          src="https://images.ctfassets.net/dapbmjoaf8gb/2b9P62mj1ai5jTlINxgYoc/42e369e5df9251c5d7d15c7c1d0eb847/sam_bw_small-1.jpg"
          width="250"
          height="250"
          alt=""
        />
        <p>
          <span>
            Sam has a Ph.D. in Neuroscience where she characterized neurodegenerative disorders in <i>Drosophila</i>.
            During her postdoctoral position studying the <i>Drosophila</i> blood-brain barrier, she became increasingly
            passionate about open science and the potential for preprints to rewrite the way scientists disseminate
            their research. Following her passion for preprints, Sam became the Content Lead at
            <a href="https://www.biorxiv.org/">bioRxiv</a> and now manages the preprint content teams at CSHL. Her
            advocacy for the use of preprints began with her early engagement with the ASAPbio Ambassadors and Mozilla
            communities, paths that led her to co-found PREreview in 2017.
          </span>
        </p>
        <h2><span>Monica Granados, Ph.D. (she/her) – Co-Founder, Advisory Committee Co-Chair</span></h2>
        <img
          src="https://images.ctfassets.net/dapbmjoaf8gb/77lEV2ipgbkEEqyUEzsXxF/771d4aa7f6742554802d8bdbae3255dd/monica_bw_small-1.png"
          width="250"
          height="250"
          alt=""
        />
        <p>
          <span>
            Dr. Monica Granados is Director of Open Science at Creative Commons where she works on increasing the
            adoption of open licenses on research outputs and how open science is changing in the age of AI. She
            received her MSc from the University of Toronto and her PhD McGill University and has published several
            papers on open access and data. She is also has worked with NASA to develop their Transform to Open Science
            initiative and on Environment and Climate Change Canada’s Open Science Action Plan.
          </span>
        </p>
        <h2><span>Christopher Steven Marcum, Ph.D., F.G.S.A. (he/him/they/them) – Advisory Committee Chair</span></h2>
        <img
          src="https://images.ctfassets.net/dapbmjoaf8gb/42mYMlcNAjNXARJcS6LD9H/97f7ac31fa73dd86ae6c573e7f0aa18a/unnamed-2.jpg"
          width="250"
          height="250"
          alt=""
        />
        <p>
          <span>
            Dr. <a href="https://orcid.org/0000-0002-0899-6143">Christopher Steven Marcum</a> is an open science
            advocate, a Senior Fellow at the Data Foundation&apos;s Center for Data Policy, and is the Chair of
            PREreview&apos;s Advisory Committee. He has over a decade of public service as a social scientist in the
            federal government. His most recent roles were in the White House Office of Science and Technology Policy
            (OSTP) as Assistant Director for Open Science and Data Policy, and in the White House Office of Management
            and Budget (OMB) as Senior Statistician and Senior Scientist, where his portfolios included development and
            implementation of federal policies on public access to federally-funded research, open and confidential
            data, peer review, and scientific integrity.
          </span>
        </p>
        <p>
          <span>
            Dr. Marcum oversaw transformative science policies in his OSTP portfolio that led to the 2022 OSTP Public
            Access Memo, the 2023 Federal Scientific Integrity Framework, and the White House declaring 2023 as a Year
            of Open Science. In his OMB capacity, Dr. Marcum oversaw the Federal Statistical Research Data Centers as
            Chair of the Executive Committee and was a key contributor to major federal information policies, including
            the OMB implementation guidance on the Open Government Data Act. Dr. Marcum received his Ph.D. in sociology
            from the University of California, Irvine (UCI) in 2011. He is a fellow of the Gerontological Society of
            America, nominated by his peers for his research, training, and advocacy on issues related to aging and the
            life course. He has written over 80 scholarly articles and thought pieces.
          </span>
        </p>
        <h2>
          <span>
            Lamis Yahia Mohamed Elkheir, Ph.D. (she/her) - Director of Training &amp; Resource Development at African
            Reproducibility Network (AREN)
          </span>
        </h2>
        <img
          src="https://images.ctfassets.net/dapbmjoaf8gb/1I3JNZt7Pge1YVbj2cP47Q/60f1585ec7e34703d03694ec6bceac08/Lamis-headshot-250x250.png"
          width="250"
          height="250"
          alt=""
        />
        <p>
          <span>
            Dr. Lamis Elkheir is an open science leader and academic whose work focuses on shaping how open research
            practices are understood, adopted, and sustained across African research communities. She brings over a
            decade of experience working within universities and research networks, combining teaching, programme
            leadership, and community engagement to support more open, collaborative, and context-aware approaches to
            research.
          </span>
        </p>
        <p>
          <span>
            As Director of Training &amp; Resource Development at the
            <a href="https://africanrn.org/">African Reproducibility Network </a>(AREN) and Lecturer at the University
            of Khartoum, Lamis works at the intersection of global open science initiatives and local institutional
            realities. She designs and leads training programmes that centre the needs of early-career and
            underrepresented researchers. In addition, she serves as Co-Chair of Working Group 2 within the Open Science
            Monitoring Initiative (OSMI), where she co-leads international efforts to map and analyse open science
            monitoring frameworks and indicators. Across her work, she is particularly committed to ensuring that
            researchers in diverse and often resource-constrained contexts have both the voice and the agency to
            participate meaningfully in shaping research culture and evaluation.
          </span>
        </p>
        <h2><span>Aurelia Munene (she/her) – Founder and CEO at Eider Africa</span></h2>
        <img
          src="https://images.ctfassets.net/dapbmjoaf8gb/6iCPvoP1ELMnc8XZc8GilW/c8f6c365ed9afc4bee307377be33daf0/aurelia-250x250.png"
          width="250"
          height="250"
          alt=""
        />
        <p>
          <span>
            Aurelia Muthoni Munene is the Founder of <a href="https://eiderafricaltd.org/">Eider Africa</a>, and
            together with a team of dedicated African scholars, she designs and delivers research mentorship programs
            with and for early career researchers in Africa. The goal is to create a movement of researchers who are
            critical, responsible and collaborative. Aurelia is a board member of the Association of Faculty Enrichment
            in Teaching and Learning which trains faculty on transformative learning and teaching approaches including
            open peer review. Aurelia is also an Associate and Research Steward with INASP (AuthorAID) where she
            supports research mentorship activities for early career researchers and reviews AuthorAID courses to ensure
            they are aligned to Gender Responsive Pedagogy guidelines. She is a Personal Development Coach for the AMID
            Young Professionals Program of the Radboud University in the Netherlands partnering with University of
            Nairobi, Kenya. She is a member of the Research Data Share Kenya Collective.
          </span>
        </p>
        <p>
          <span>
            Aurelia is an international development consultant and researcher in areas of social policy, gender-based
            violence, sexual reproductive health, gender and social development with 17 years’ experience. Aurelia is
            also the Executive Director of Roots and Wings Research and Development Organisation. She has authored over
            40 reports, 2 book chapters and 5 Journal articles. Aurelia holds a Master of Arts in Development Studies
            majoring in Social Policy from the Erasmus University, International Institute of Social Studies,
            Netherlands, and she is currently pursuing a Second Master’s degree, MBA in Health Care Management at
            Strathmore University in Kenya.
          </span>
        </p>
        <h2>
          <span>
            Malvika Sharan, Ph.D. (she/her) - Senior Director of Data Science at St. Jude Children’s Research Hospital
          </span>
        </h2>
        <img
          src="https://images.ctfassets.net/dapbmjoaf8gb/134ZBeQJGlHrGNe1uOoDmE/021352bb9cbb0b08b9caedc975848a9b/Malvika-headshot-250x250.png"
          width="250"
          height="250"
          alt=""
        />
        <p>
          <span>
            Dr. Malvika Sharan is the Senior Director of Data Science at the newly established Office of Data Science at
            St. Jude Children’s Research Hospital. Previously, she held research and leadership roles at The Alan Turing
            Institute and European Molecular Biology Laboratory, where she led and scaled data science and
            bioinformatics community initiatives, notably The Turing Way and EMBL’s Bio-IT.
          </span>
        </p>
        <p>
          <span>
            An open source/science advocate, Malvika co-founded Open Life Science (OLS), an international training,
            mentoring and capacity building organisation, and recently established RCM Cooperative to mobilise and
            connect Research Community Managers from across organisations. She has advised initiatives like NASA Open
            Science, the Society of RSE, Open Bioinformatics Foundation and Data Science Without Borders.
          </span>
        </p>
        <p>
          <span>
            Malvika is a Mozilla Open Leaders Fellow, Software Sustainability Institute Fellow, and was named among the
            100 Brilliant Women in AI Ethics (2024). A lifelong learner, Malvika is dedicated to improving open
            research, community building, collaboration, governance, and ethical practices in data science and AI.
          </span>
        </p>
        <h2>
          <span>
            Kirstie Whitaker, Ph.D. (she/her) - Executive Director at Berkeley Institute for Data Science, Advisory
            Committee Treasurer
          </span>
        </h2>
        <img
          src="https://images.ctfassets.net/dapbmjoaf8gb/6xEO2yZgZyLetqkwJbaJVI/53e62918158c6c779294c5785566f0a3/Kirstie-headshot-250x250.png"
          width="250"
          height="250"
          alt=""
        />
        <p>
          <span>
            Dr. Kirstie Whitaker is the Executive Director at the
            <a href="https://bids.berkeley.edu/">Berkeley Institute for Data Science</a> (BIDS), where she supports the
            delivery of innovative open source software and infrastructure to benefit science and society, including
            through the Jupyter and Scientific Python ecosystems. She is the founder of The Turing Way, a community
            co-created Jupyter Book that enables leaders and practitioners to deliver open, collaborative, reproducible
            and inclusive data-intensive research.
          </span>
        </p>
        <p>
          <span>
            Prior to joining the BIDS in January 2025, Kirstie led the Tools, Practices and Systems research program at
            The Alan Turing Institute, the UK’s national institute for data science and artificial intelligence. She
            completed her Ph.D. at the Helen Wills Neuroscience Institute at UC Berkeley in 2012, where she held a
            Fulbright Scholarship and was a Mozilla Open Science Fellow in 2016/17. Kirstie advocates for equity,
            inclusion and justice as mechanisms to deliver the most impactful, ethical and efficient data science
            research and innovation.
          </span>
        </p>
        <h1><span>Former Staff</span></h1>
        <h2><span>Grace Park - Former Communications and Engagement Officer</span></h2>
        <img
          src="https://images.ctfassets.net/dapbmjoaf8gb/61bqShbwFWJ8WYBrEdXntm/39a14d510286f0e447c2f7b2119e7f43/grace-250.png"
          width="250"
          height="250"
          alt=""
        />
        <p>
          <span>
            Grace joined PREreview as the first Communications and Engagement Officer from December 2024 to June 2025.
            In this role, Grace helped the team manage communications and supported various programs, including the Live
            Review and the Champions program, championing the achievements and efforts of many community members.
          </span>
        </p>
        <h2><span>Arturo Garduño-Magaña (he/him) – Former Open Grant Reviewers Program Manager and Trainer</span></h2>
        <img
          src="https://images.ctfassets.net/dapbmjoaf8gb/4WXPBOm0QUXbULBRXLFPN8/d2e67272da17bf97fec8951fbdadd881/agm_250-wbg-1.JPG"
          width="250"
          height="250"
          alt=""
        />
        <p>
          <span>
            Arturo worked with PREreview from February 2022 to July 2023 as the Open Grant Reviewers Program Manager and
            Trainer. In that role, he led the design and delivery of Open Grant Reviewers, a program part of the
            <a href="https://www.openandequitable.org/">Open and Equitable Funding Model Program</a>, developed in close
            collaboration with the Open Research Founders Group and the Health Research Alliance. Arturo is working at
            DataCite as the Regional Engagement Specialist, Latin America.
          </span>
        </p>
        <h2><span>Antoinette Foster, Ph.D.(she/her) – Former Open Reviewers Program Manager</span></h2>
        <img
          src="https://images.ctfassets.net/dapbmjoaf8gb/7yOVIeLbKKEuprTqBbmSgR/e6c5703edd561130f0aa256e938d6704/NGP_Antionette_Foster_250.png"
          width="250"
          height="250"
          alt=""
        />
        <p>
          <span>
            Antoinette Foster has a Ph.D. in Neuroscience and is passionate about establishing racial equity within the
            scientific enterprise. Antoinette joined the PREreview team in January 2020 and was instrumental in creating
            the
            <a href="https://content.prereview.org/openreviewers"
              >PREreview Open Reviewers training and mentoring program</a
            >
            and running
            <a href="https://content.prereview.org/prereview-open-reviewers-pilot-announcement/">its pilot</a>, giving
            special attention to bringing an equity lens to the curriculum and format. Antoinette is now the Director of
            Community Transformation at Oregon Health and Science University, where she aims to directly impact
            internalized and interpersonal racism by empowering her community to become active agents of change.
          </span>
        </p>
        <h2><span>Katrina Murphy (she/her) – Former Project Manager</span></h2>
        <img
          src="https://images.ctfassets.net/dapbmjoaf8gb/5tkBquqVgG2x8JMmldE2AE/02ece46abf566a44061eb60cc1237331/KatrinaMurphy_Headshot_Square_250.jpg"
          width="250"
          height="250"
          alt=""
        />
        <p>
          <span>
            Katrina joined the PREreview team in April 2020 and stayed with us as PREreview Project Manager until
            October 2021. During her time with us, Katrina has not only helped our small team manage and deliver on the
            work we were set to do across programs and collaborations, but has also played a central role in organizing
            our <a href="https://content.prereview.org/prereview-open-reviewers-pilot-announcement">first cohort</a> of
            the
            <a href="https://content.prereview.org/openreviewers"
              >PREreview Open Reviewers training and mentoring program</a
            >. Katrina is also a yoga teacher and has now moved on to dedicate her full self to her life passion at the
            intersection of conventional and integrative healthcare practices.
          </span>
        </p>
        <h1><span>Former Advisory Committee Members</span></h1>
        <ul>
          <li>
            <span>
              Kristen Ratan (she/her) – Founder and Director at
              <a href="https://strategiesos.org/">Stratos</a> (09/2020-03/2026)
            </span>
          </li>
          <li><span>Sarah Greaves (she/her) – STM Publishing Consultant (12/2020-08/2024)</span></li>
          <li>
            <span>
              Lenny Teytelman, Ph.D. – CEO, Co-Founder,
              <a href="https://protocols.io/">protocols.io</a> (12/2019–07/2023)
            </span>
          </li>
          <li>
            <span>
              Georgia Bullen – Executive Director,
              <a href="https://superbloom.design/">Superbloom</a> (04/2020–10/2021)
            </span>
          </li>
          <li><span>Naomi Penfold, Ph.D. – Researcher | Data scientist (01/2020-10/2020) </span></li>
        </ul>
        <p><span>This page was last updated on 18 February 2026.</span></p>
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
      Effect.andThen(_.EntryToContentfulPage),
    )

    assertEquals(actual, expected)
  }).pipe(
    Effect.provide([
      Layer.mock(DynamicEmbedder, {
        listOfActiveClubs: Effect.succeed(html`{{list-of-active-clubs}}`),
        listOfInactiveClubs: Effect.succeed(html`{{list-of-inactive-clubs}}`),
      }),
      Layer.succeed(Locale, DefaultLocale),
      NodeFileSystem.layer,
    ]),
  ),
)

it.effect.each([['banners', 'blog-posts-multiple-authors', 'blog-posts-newsletter']])(
  "can't parse a record (%s)",
  ([response]) =>
    Effect.gen(function* () {
      const actual = yield* pipe(
        FileSystem.FileSystem,
        Effect.andThen(fs => fs.readFileString(`test/ExternalApis/Contentful/GetEntries/Samples/${response}.json`)),
        Effect.map(ResolveEntries),
        Effect.andThen(Schema.decodeUnknown(Entries)),
        Effect.andThen(Struct.get('items')),
        Effect.andThen(Array.map(item => _.EntryToContentfulPage(item))),
        Effect.andThen(Effect.allWith({ concurrency: 'unbounded', mode: 'either' })),
      )

      actual.forEach(result => {
        expect(result).toMatchObject({ _tag: 'Left' })
      })
    }).pipe(
      Effect.provide([Layer.mock(DynamicEmbedder, {}), Layer.succeed(Locale, DefaultLocale), NodeFileSystem.layer]),
    ),
)

const ResolveEntries = (response: string) => {
  const body = JSON.parse(response)

  return { ...body, items: resolveResponse(body) }
}
