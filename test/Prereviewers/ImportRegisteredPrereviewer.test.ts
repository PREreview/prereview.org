import { expect, test } from '@jest/globals'
import { Temporal } from '@js-temporal/polyfill'
import { Either, Option } from 'effect'
import * as Events from '../../src/Events.ts'
import * as _ from '../../src/Prereviewers/ImportRegisteredPrereviewer.ts'
import { OrcidId } from '../../src/types/OrcidId.ts'
import { Pseudonym } from '../../src/types/Pseudonym.ts'

const input = {
  orcidId: OrcidId('0000-0002-1825-0097'),
  registeredAt: Temporal.Now.instant(),
  pseudonym: Pseudonym('Orange Panda'),
} satisfies _.Input

test.failing.each<
  [
    string,
    ReadonlyArray<Events.Event>,
    _.Input,
    Either.Either<Option.Option<Events.Event>, _.PseudonymAlreadyInUse | _.MismatchWithExistingDataForOrcid>,
  ]
>([['no events', [], input, Either.right(Option.some(new Events.RegisteredPrereviewerImported(input)))]])(
  '%s',
  (_name, events, input, expected) => {
    const { foldState, decide } = _.ImportRegisteredPrereviewer

    const state = foldState(events, input)

    const actual = decide(state, input)

    expect(actual).toStrictEqual(expected)
  },
)
