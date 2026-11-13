import { Temporal } from '@js-temporal/polyfill'
import sanitize from 'sanitize-html'
import { NodeFileSystem } from '@effect/platform-node'
import {
  Array,
  Data,
  Effect,
  FileSystem,
  flow,
  Logger,
  Option,
  pipe,
  Record,
  Result,
  Schema,
  String,
  Struct,
} from 'effect'
import { DomUtils, ElementType, parseDocument } from 'htmlparser2'
import path from 'node:path'
import { match, P } from 'ts-pattern'
import { GetClubByName } from '../src/Domain/Clubs/GetClubByName.ts'
import { DefaultClubs } from '../src/Domain/Clubs/ClubDetails.ts'
import { translate, SupportedLocales, type SupportedLocale } from '../src/locales/index.ts'
import { PreprintReviewImported, type StructuredPrereviewSchema } from '../src/Domain/PreprintReviews/Events.ts'
import { Html } from '../src/html.ts'
import { fromUrl, parsePreprintDoi } from '../src/Preprints/index.ts'
import { Doi, OrcidId } from '../src/types/index.ts'
import { iso6393To1, iso6393Validate } from '../src/types/iso639.ts'
import { Name, NameSchema } from '../src/types/Name.ts'
import { isPseudonym, Pseudonym, PseudonymSchema } from '../src/types/Pseudonym.ts'

const inputDirectory = path.resolve(import.meta.dirname, '..', '.cache', 'zenodo-records')
const outputFile = path.resolve(import.meta.dirname, '..', '.cache', 'prereviews-to-import.json')

const ZenodoRecordSchema = Schema.Struct({
  id: Schema.Int,
  created: Schema.String,
  metadata: Schema.Struct({
    doi: Doi.DoiSchema,
    publication_date: Schema.String,
    creators: Schema.Array(
      Schema.Struct({ name: Schema.String, orcid: Schema.optional(Schema.NullOr(Schema.String)) }),
    ),
    contributors: Schema.optional(Schema.Array(Schema.Struct({ name: Schema.String }))),
    keywords: Schema.optional(Schema.Array(Schema.String)),
    language: Schema.optional(Schema.String),
    license: Schema.Struct({ id: Schema.String }),
    notes: Schema.optional(Schema.String),
    related_identifiers: Schema.optional(
      Schema.Array(
        Schema.Struct({
          identifier: Schema.String,
          relation: Schema.String,
          resource_type: Schema.optional(Schema.String),
          scheme: Schema.String,
        }),
      ),
    ),
  }),
})

type ZenodoRecord = typeof ZenodoRecordSchema.Type

const InputFileSchema = Schema.fromJsonString(Schema.Struct({ record: ZenodoRecordSchema, html: Schema.String }))

const PrereviewToImportSchema = Schema.Struct({
  ...Struct.omit(PreprintReviewImported.fields, ['_tag']),
  authors: Schema.NonEmptyArray(
    Schema.TaggedUnion({
      PublicPersona: { name: NameSchema, orcidId: OrcidId.OrcidIdSchema },
      PseudonymPersona: { pseudonym: PseudonymSchema },
      Unknown: { name: NameSchema },
    }),
  ),
})

class CannotConvertRecord extends Data.TaggedError('CannotConvertRecord')<{ reason: string; detail?: unknown }> {}

const normalize = (text: string) => text.replaceAll('’', "'").replaceAll(/\s+/g, ' ').trim().toLowerCase()

const locales = Array.fromIterable(SupportedLocales)

type WriteReviewTranslator = ReturnType<typeof translate<'write-review'>>

const textMatches = (getMessages: (t: WriteReviewTranslator) => ReadonlyArray<Html>) => {
  const texts = new Set(
    Array.flatMap(locales, (locale: SupportedLocale) =>
      Array.map(getMessages(translate(locale, 'write-review')), message =>
        normalize(DomUtils.textContent(parseDocument(message.toString()))),
      ),
    ),
  )

  return (text: string) => texts.has(normalize(text))
}

const isCompetingInterestsHeading = textMatches(t => [t('competingInterests')()])
const isUseOfAiHeading = textMatches(t => [t('useOfAi')()])
const isNoCompetingInterests = textMatches(t => [t('competingInterestsNo')(), t('competingInterestsAuthorsNo')()])
const isAiIdeas = textMatches(t => [t('aiIdeasStatement')(), t('aiIdeasAuthorsStatement')()])
const isNoAiIdeas = textMatches(t => [t('noAiIdeasStatement')(), t('noAiIdeasAuthorsStatement')()])

type Node = ReturnType<typeof parseDocument>['children'][number]

const textOf = (nodes: Node | ReadonlyArray<Node>) => DomUtils.textContent(nodes as Node).trim()

type Element = Extract<Node, { name: string; children: unknown }>

const isElement = (node: Node | undefined, name?: RegExp): node is Element =>
  node?.type === ElementType.Tag && (name === undefined || name.test(node.name))

const isHeading = (node: Node) => isElement(node, /^h[1-6]$/)

const isBlank = (node: Node) => node.type === ElementType.Text && DomUtils.textContent(node).trim() === ''

const splitTrailingSections = (html: string) => {
  const nodes = parseDocument(html, { withStartIndices: true }).children
  const sections: Array<{ heading: string; nodes: ReadonlyArray<Node> }> = []
  let end = nodes.length

  for (let index = nodes.length - 1; index >= 0; index--) {
    const node = nodes[index]

    if (node === undefined || !isHeading(node)) {
      continue
    }

    const heading = textOf(node)
    const isSameSection = (section: (typeof sections)[number]) =>
      isCompetingInterestsHeading(section.heading) === isCompetingInterestsHeading(heading)

    if ((!isCompetingInterestsHeading(heading) && !isUseOfAiHeading(heading)) || Array.some(sections, isSameSection)) {
      break
    }

    sections.unshift({ heading, nodes: nodes.slice(index + 1, end).filter(node => !isBlank(node)) })
    end = index
  }

  return {
    body: nodes.slice(0, end),
    bodyHtml: html.slice(0, nodes[end]?.startIndex ?? html.length).trim(),
    sections,
  }
}

const getCompetingInterests = (sections: ReturnType<typeof splitTrailingSections>['sections']) =>
  pipe(
    Array.findFirst(sections, section => isCompetingInterestsHeading(section.heading)),
    Option.match({
      onNone: () => Effect.succeed({ _tag: 'NotAnswered' as const }),
      onSome: section => {
        const text = textOf(section.nodes)

        if (text === '') {
          return Effect.fail(new CannotConvertRecord({ reason: 'empty competing interests' }))
        }

        return Effect.succeed(
          isNoCompetingInterests(text) ? { _tag: 'No' as const } : { _tag: 'Yes' as const, comment: Option.some(text) },
        )
      },
    }),
  )

const getUseOfAi = (sections: ReturnType<typeof splitTrailingSections>['sections']) =>
  pipe(
    Array.findFirst(sections, section => isUseOfAiHeading(section.heading)),
    Option.match({
      onNone: () => Effect.succeed({ _tag: 'NotAnswered' as const }),
      onSome: ({ nodes: [statement, ...rest] }) => {
        const statementText = statement === undefined ? '' : textOf(statement)

        if (isNoAiIdeas(statementText) && rest.length === 0) {
          return Effect.succeed({ _tag: 'No' as const })
        }

        if (isAiIdeas(statementText)) {
          return Effect.succeed({
            _tag: 'Yes' as const,
            comment: Option.liftPredicate(textOf(rest), String.isNonEmpty),
          })
        }

        return Effect.fail(new CannotConvertRecord({ reason: 'unknown use of AI statement', detail: statementText }))
      },
    }),
  )

const questions = {
  introductionMatches: {
    question: textMatches(t => [t('doesIntroductionExplain')()]),
    answers: {
      yes: textMatches(t => [t('yes')()]),
      partly: textMatches(t => [t('partly')()]),
      no: textMatches(t => [t('no')()]),
      skip: textMatches(t => [t('iDoNotKnow')()]),
    },
  },
  methodsAppropriate: {
    question: textMatches(t => [t('methodsWellSuited')()]),
    answers: {
      'highly-inappropriate': textMatches(t => [t('methodsHighlyInappropriate')()]),
      'somewhat-inappropriate': textMatches(t => [t('methodsSomewhatInappropriate')()]),
      neither: textMatches(t => [t('methodsNeitherAppropriateNorInappropriate')()]),
      'somewhat-appropriate': textMatches(t => [t('methodsSomewhatAppropriate')()]),
      'highly-appropriate': textMatches(t => [t('methodsHighlyAppropriate')()]),
      skip: textMatches(t => [t('iDoNotKnow')()]),
    },
  },
  conclusionsSupported: {
    question: textMatches(t => [t('conclusionsSupported')()]),
    answers: {
      'highly-unsupported': textMatches(t => [t('conclusionsHighlyUnsupported')()]),
      'somewhat-unsupported': textMatches(t => [t('conclusionsSomewhatUnsupported')()]),
      neither: textMatches(t => [t('conclusionsNeitherSupportedNorUnsupported')()]),
      'somewhat-supported': textMatches(t => [t('conclusionsSomewhatSupported')()]),
      'highly-supported': textMatches(t => [t('conclusionsHighlySupported')()]),
      skip: textMatches(t => [t('iDoNotKnow')()]),
    },
  },
  dataPresentation: {
    question: textMatches(t => [t('dataPresentationWellSuited')()]),
    answers: {
      'highly-inappropriate-or-unclear': textMatches(t => [t('highlyInappropriate')()]),
      'somewhat-inappropriate-or-unclear': textMatches(t => [t('somewhatInappropriate')()]),
      neither: textMatches(t => [t('neitherAppropriateOrClear')()]),
      'somewhat-appropriate-and-clear': textMatches(t => [t('somewhatAppropriate')()]),
      'highly-appropriate-and-clear': textMatches(t => [t('highlyAppropriateAndClear')()]),
      skip: textMatches(t => [t('iDoNotKnow')()]),
    },
  },
  findingsNextSteps: {
    question: textMatches(t => [t('clearDiscussion')()]),
    answers: {
      'very-unclearly': textMatches(t => [t('veryUnclearly')()]),
      'somewhat-unclearly': textMatches(t => [t('somewhatUnclearly')()]),
      neither: textMatches(t => [t('neitherClearlyNorUnclearly')()]),
      'somewhat-clearly': textMatches(t => [t('somewhatClearly')()]),
      'very-clearly': textMatches(t => [t('veryClearly')()]),
      skip: textMatches(t => [t('iDoNotKnow')()]),
    },
  },
  advancingKnowledge: {
    question: textMatches(t => [t('advanceKnowledge')()]),
    answers: {
      'not-at-all': textMatches(t => [t('advanceKnowledgeNotAtAllLikely')()]),
      not: textMatches(t => [t('advanceKnowledgeNotLikely')()]),
      moderately: textMatches(t => [t('advanceKnowledgeModeratelyLikely')()]),
      somewhat: textMatches(t => [t('advanceKnowledgeSomewhatLikely')()]),
      highly: textMatches(t => [t('advanceKnowledgeHighlyLikely')()]),
      skip: textMatches(t => [t('iDoNotKnow')()]),
    },
  },
  languageEditing: {
    question: textMatches(t => [t('benefitFromEditing')()]),
    answers: {
      no: textMatches(t => [t('no')()]),
      yes: textMatches(t => [t('yes')()]),
    },
  },
  wouldRecommend: {
    question: textMatches(t => [t('wouldRecommend')()]),
    answers: {
      no: textMatches(t => [t('wouldRecommendNo')()]),
      'yes-but': textMatches(t => [t('wouldRecommendYesImproved')()]),
      yes: textMatches(t => [t('wouldRecommendYes')()]),
    },
  },
  readyForAttention: {
    question: textMatches(t => [t('readyForAttention')()]),
    answers: {
      'no-need-major-revision': textMatches(t => [t('readyForAttentionNo')()]),
      'yes-needs-minor-changes': textMatches(t => [t('readyForAttentionMinorChanges')()]),
      'yes-as-is': textMatches(t => [t('readyForAttentionYes')()]),
    },
  },
} satisfies Record<keyof typeof StructuredPrereviewSchema.fields, unknown>

const getStructuredContent = (body: ReadonlyArray<Node>) =>
  Effect.gen(function* () {
    const [list, ...rest] = body.filter(node => !isBlank(node))

    if (!isElement(list, /^dl$/) || rest.length > 0) {
      return yield* new CannotConvertRecord({ reason: 'structured review is not a single dl' })
    }

    const items = Array.map(
      DomUtils.getElementsByTagName('div', list.children, false),
      item =>
        [
          textOf(DomUtils.getElementsByTagName('dt', item.children, false)),
          Array.map(DomUtils.getElementsByTagName('dd', item.children, false), dd => textOf(dd)),
        ] as const,
    )

    const content: Record<string, unknown> = {}

    for (const [key, { question, answers }] of Object.entries(questions)) {
      const item = Array.findFirst(items, ([dt]) => question(dt))

      if (Option.isNone(item)) {
        return yield* new CannotConvertRecord({ reason: 'missing structured question', detail: key })
      }

      const [, [answerText, comment, ...others]] = item.value

      const answer = Array.findFirst(Object.entries(answers), ([, isAnswer]) => isAnswer(answerText ?? ''))

      if (Option.isNone(answer) || others.length > 0) {
        return yield* new CannotConvertRecord({ reason: 'unknown structured answer', detail: { key, answerText } })
      }

      content[key] = { answer: answer.value[0], comment: Option.liftPredicate(comment ?? '', String.isNonEmpty) }
    }

    if (items.length !== Object.keys(questions).length) {
      return yield* new CannotConvertRecord({ reason: 'unexpected structured questions' })
    }

    return { _tag: 'Structured' as const, ...(content as typeof StructuredPrereviewSchema.Type) }
  })

export function sanitizeHtml(html: string, { allowBlockLevel = true, trusted = false } = {}) {
  return sanitize(html, {
    allowedTags: [
      ...(allowBlockLevel ? ['dd', 'dl', 'dt', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'ol', 'p', 'ul'] : []),
      'a',
      'b',
      'br',
      'div',
      'span',
      'i',
      'sub',
      'sup',
      'math',
      'mi',
      'mn',
      'mo',
      'ms',
      'mspace',
      'mtext',
      'merror',
      'mfrac',
      'mpadded',
      'mphantom',
      'mroot',
      'mrow',
      'msqrt',
      'mmultiscripts',
      'mover',
      'mprescripts',
      'msub',
      'msubsup',
      'msup',
      'munder',
      'munderover',
      'mtable',
      'mtd',
      'mtr',
      'annotation',
      'semantics',
      ...(trusted ? ['img', 'span', 'table', 'colgroup', 'col', 'thead', 'tbody', 'tr', 'th', 'td'] : []),
    ],
    allowedAttributes: {
      '*': ['dir', 'displaystyle', 'lang', 'mathvariant', ...(trusted ? ['id'] : [])],
      a: ['href'],
      annotation: ['encoding'],
      col: ['span'],
      img: ['alt', 'height', 'src', 'width'],
      math: allowBlockLevel ? ['display'] : [],
      mo: [
        'fence',
        'largeop',
        'lspace',
        'maxsize',
        'minsize',
        'movablelimits',
        'rspace',
        'separator',
        'stretchy',
        'symmetric',
      ],
      mover: ['accent'],
      mfrac: ['linethickness'],
      mpadded: ['depth', 'height', 'lspace', 'voffset', 'width'],
      munder: ['accentunder'],
      munderover: ['accent', 'accentunder'],
      mspace: ['depth', 'height', 'width'],
      mtd: ['columnspan', 'rowspan'],
      td: ['colspan', 'rowspan'],
      th: ['colspan', 'rowspan'],
    },
    allowedClasses: {
      a: trusted ? ['button'] : [],
      td: trusted ? ['numeric'] : [],
    },
    transformTags: {
      a: (tagName, attribs) => {
        if (typeof attribs['href'] === 'string' && !/^[A-Za-z][A-Za-z0-9+\-.]*:/.test(attribs['href'])) {
          attribs['href'] = ''
        }

        if (trusted && typeof attribs['class'] === 'string' && attribs['class'].includes('kg-btn')) {
          attribs['class'] = 'button'
        }

        return {
          tagName,
          attribs,
        }
      },
      em: 'i',
      strong: 'b',
    },
    exclusiveFilter: frame =>
      ['a', 'b', 'em', 'i', 'strong', 'sub', 'sup'].includes(frame.tag) && frame.text.trim() === ''
        ? 'excludeTag'
        : ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'ol', 'p', 'ul'].includes(frame.tag) && frame.text.trim() === '',
    nonTextTags: ['style', 'script', 'textarea', 'option', 'annotation-xml'],
  })
}

const isEditorGarbage = (element: Element) =>
  element.name === 'input' ||
  element.name === 'grammarly-extension' ||
  element.name === 'deepl-inline-translate' ||
  element.name.startsWith('pwa') ||
  /\bql-(clipboard|tooltip|cursors)\b/.test(element.attribs['class'] ?? '')

const isEditorWrapper = (element: Element) => /\bql-editor\b/.test(element.attribs['class'] ?? '')

const blockElements = /^(address|article|aside|blockquote|dd|div|dl|dt|figure|h[1-6]|hr|li|ol|p|pre|section|table|ul)$/

const isBlock = (node: Node) => isElement(node, blockElements)

const unwrap = (element: Element) => {
  for (const child of element.children.slice()) {
    DomUtils.prepend(element, child)
  }

  DomUtils.removeElement(element)
}

const wrapInlineRunsInParagraphs = (div: Element) => {
  const runs: Array<Array<Node>> = [[]]

  for (const child of div.children) {
    if (isBlock(child) || isElement(child, /^br$/)) {
      runs.push([])
    } else {
      runs.at(-1)?.push(child)
    }
  }

  for (const run of runs) {
    const [first] = run

    if (first === undefined || textOf(run) === '') {
      continue
    }

    const paragraph = parseDocument('<p></p>').children[0] as Element
    DomUtils.prepend(first, paragraph)

    for (const node of run) {
      DomUtils.appendChild(paragraph, node)
    }
  }
}

const isInFlowContent = (element: Element): boolean => {
  const parent = DomUtils.getParent(element)

  return (
    parent === null ||
    parent.type === ElementType.Root ||
    (isElement(parent, /^(blockquote|dd|div|li|ol|ul)$/) && isInFlowContent(parent))
  )
}

const isEmpty = (element: Element) =>
  textOf(element) === '' && DomUtils.findOne(child => /^(br|math)$/.test(child.name), element.children) === null

const onlyContainsBlocks = (element: Element) =>
  element.children.every(child => isBlock(child) || (child.type === ElementType.Text && textOf(child) === ''))

const hasLanguageOrDirection = (element: Element) => 'lang' in element.attribs || 'dir' in element.attribs

const tidyUp = (html: string) => {
  const document = parseDocument(html)
  const elements = DomUtils.findAll(() => true, document.children) as ReadonlyArray<Element>

  for (const element of elements) {
    if (isEditorGarbage(element)) {
      DomUtils.removeElement(element)
    } else if (isEditorWrapper(element)) {
      unwrap(element)
    }
  }

  for (const div of DomUtils.getElementsByTagName('div', document.children).toReversed()) {
    if (!isInFlowContent(div)) {
      unwrap(div)
    } else if (DomUtils.getElementsByTagName('p', div.children).length === 0) {
      wrapInlineRunsInParagraphs(div)
    }
  }

  for (const element of DomUtils.findAll(
    element => /^(div|span)$/.test(element.name),
    document.children,
  ).toReversed()) {
    if (isEmpty(element)) {
      DomUtils.removeElement(element)
    } else if (element.name === 'div' ? onlyContainsBlocks(element) : !hasLanguageOrDirection(element)) {
      unwrap(element)
    }
  }

  return sanitizeHtml(DomUtils.getOuterHTML(document.children))
}

const getContent = (record: ZenodoRecord, body: ReadonlyArray<Node>, text: string) => {
  if (record.metadata.keywords?.includes('Structured PREreview') === true) {
    return getStructuredContent(body)
  }

  const tidied = tidyUp(text).trim()

  if (tidied === '') {
    return Effect.fail(new CannotConvertRecord({ reason: 'empty review' }))
  }

  return Effect.succeed({ _tag: 'FreeText' as const, text: new Html({ value: tidied }) })
}

const getAuthors = (record: ZenodoRecord) => {
  const [named, last] = Array.match(record.metadata.creators, {
    onEmpty: () => [[], undefined] as const,
    onNonEmpty: creators => Array.unappend(creators),
  })

  const otherAuthors = pipe(
    Option.fromNullishOr(last),
    Option.flatMap(last => Option.fromNullishOr(/^([1-9][0-9]*) other authors?$/.exec(last.name)?.[1])),
    Option.map(number => parseInt(number, 10)),
  )

  const creators = Option.match(otherAuthors, {
    onNone: () => record.metadata.creators,
    onSome: () => named,
  })

  const authors = Array.map(creators, ({ name, orcid }) =>
    match({ name: name.trim(), orcid })
      .with({ orcid: P.string }, ({ name, orcid }) => ({
        _tag: 'PublicPersona' as const,
        name: Name(name),
        orcidId: OrcidId.OrcidId(orcid),
      }))
      .when(
        ({ name }) => isPseudonym(name),
        ({ name }) => ({ _tag: 'PseudonymPersona' as const, pseudonym: Pseudonym(name) }),
      )
      .otherwise(({ name }) => ({ _tag: 'Unknown' as const, name: Name(name) })),
  )

  return pipe(
    authors,
    Array.match({
      onEmpty: () => Effect.fail(new CannotConvertRecord({ reason: 'no authors' })),
      onNonEmpty: authors => Effect.succeed({ authors, otherAuthors: Option.getOrElse(otherAuthors, () => 0) }),
    }),
  )
}

const getClub = (record: ZenodoRecord) =>
  pipe(
    record.metadata.contributors ?? [],
    Array.map(Struct.get('name')),
    Array.dedupe,
    Array.map(name => GetClubByName(DefaultClubs)(Name(name))),
    Array.match({
      onEmpty: () => Effect.succeed(undefined),
      onNonEmpty: ([club, ...others]) =>
        others.length === 0 && Result.isSuccess(club)
          ? Effect.succeed(club.success.id)
          : Effect.fail(
              new CannotConvertRecord({
                reason: 'unknown club',
                detail: Array.map(record.metadata.contributors ?? [], Struct.get('name')),
              }),
            ),
    }),
  )

const getPreprint = (record: ZenodoRecord) =>
  pipe(
    record.metadata.related_identifiers ?? [],
    Array.filter(
      identifier => identifier.relation === 'reviews' && identifier.resource_type === 'publication-preprint',
    ),
    Array.filterMap(identifier =>
      match(identifier.scheme)
        .with('doi', () => Result.fromOption(parsePreprintDoi(identifier.identifier), () => undefined))
        .with('url', () =>
          pipe(
            URL.parse(identifier.identifier),
            Option.fromNullishOr,
            Option.map(fromUrl),
            Option.flatMap(Array.head),
            Result.fromOption(() => undefined),
          ),
        )
        .otherwise(() => Result.fail(undefined)),
    ),
    Array.head,
    Effect.fromOption,
    Effect.mapError(() => new CannotConvertRecord({ reason: 'no reviewed preprint' })),
  )

const getLicense = (record: ZenodoRecord) =>
  match(record.metadata.license.id.toLowerCase())
    .with('cc-by-4.0', () => Effect.succeed('CC-BY-4.0' as const))
    .with('cc-zero', () => Effect.succeed('CC0-1.0' as const))
    .otherwise(id => Effect.fail(new CannotConvertRecord({ reason: 'unknown license', detail: id })))

const getLanguage = (record: ZenodoRecord) =>
  pipe(
    Option.fromNullishOr(record.metadata.language),
    Option.filter(iso6393Validate),
    Option.map(iso6393To1),
    Effect.fromOption,
    Effect.mapError(() => new CannotConvertRecord({ reason: 'unknown language', detail: record.metadata.language })),
  )

const getPublished = (record: ZenodoRecord) => {
  const published = Temporal.PlainDate.from(record.metadata.publication_date)
  const created = Temporal.Instant.from(record.created)

  if (!created.toZonedDateTimeISO('UTC').toPlainDate().equals(published)) {
    return published
  }

  return created
}

const convertRecord = ({ record, html }: typeof InputFileSchema.Type) =>
  Effect.gen(function* () {
    const { body, bodyHtml, sections } = splitTrailingSections(html)

    const { authors, otherAuthors } = yield* getAuthors(record)

    return {
      addendum: pipe(
        Option.fromNullishOr(record.metadata.notes),
        Option.map(value => new Html({ value })),
        Option.getOrUndefined,
      ),
      authors,
      otherAuthors,
      club: yield* getClub(record),
      doi: record.metadata.doi,
      id: record.id,
      license: yield* getLicense(record),
      published: getPublished(record),
      preprint: yield* getPreprint(record),
      live: record.metadata.keywords?.includes('Live Review') === true,
      useOfAi: yield* getUseOfAi(sections),
      competingInterests: yield* getCompetingInterests(sections),
      language: yield* getLanguage(record),
      content: yield* getContent(record, body, bodyHtml),
    }
  })

const ConvertRecords = Effect.gen(function* () {
  const fileSystem = yield* FileSystem.FileSystem

  const files = Array.sort(
    Array.filter(yield* fileSystem.readDirectory(inputDirectory), String.endsWith('.json')),
    String.Order,
  )

  const results = yield* Effect.forEach(files, file =>
    pipe(
      fileSystem.readFileString(path.join(inputDirectory, file)),
      Effect.andThen(Schema.decodeUnknownEffect(InputFileSchema)),
      Effect.mapError(error => new CannotConvertRecord({ reason: 'unreadable record', detail: error.message })),
      Effect.andThen(convertRecord),
      Effect.andThen(
        flow(
          Schema.decodeUnknownEffect(Schema.toType(PrereviewToImportSchema)),
          Effect.mapError(error => new CannotConvertRecord({ reason: 'invalid prereview', detail: error.message })),
        ),
      ),
      Effect.tapError(error =>
        Effect.logWarning('Unable to convert record').pipe(
          Effect.annotateLogs({ file, reason: error.reason, detail: error.detail }),
        ),
      ),
      Effect.result,
    ),
  )

  const failures = Array.getFailures(results)
  const prereviews = Array.getSuccesses(results)

  yield* pipe(
    prereviews,
    Schema.encodeEffect(Schema.fromJsonString(Schema.Array(PrereviewToImportSchema), { space: 2 })),
    Effect.map(String.concat('\n')),
    Effect.andThen(content => fileSystem.writeFileString(outputFile, content)),
  )

  yield* Effect.logInfo('Converted records').pipe(
    Effect.annotateLogs({
      converted: prereviews.length,
      failed: failures.length,
      reasons: Record.map(Array.groupBy(failures, Struct.get('reason')), Array.length),
      outputFile,
    }),
  )
})

void pipe(
  ConvertRecords,
  Effect.provide(NodeFileSystem.layer),
  Effect.provide(Logger.layer([Logger.consolePretty()])),
  Effect.runPromise,
)
