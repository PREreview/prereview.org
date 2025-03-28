import { expect } from '@jest/globals'
import { Array, Either } from 'effect'

export type CommandHandlerSpecfication<Command, Event, Error> = (...givenEvents: ReadonlyArray<Event>) => {
  when: (command: Command) => {
    then: (...expectedEvents: Array.NonEmptyReadonlyArray<Event>) => void
    thenNothing: () => void
    thenError: (expectedError: Error) => void
  }
}

export const CommandHandlerSpecification = {
  for:
    <Command, Event, State, Error>({
      decide,
      evolve,
      initialState,
    }: {
      decide: (state: State) => (command: Command) => Either.Either<ReadonlyArray<Event>, Error>
      evolve: (state: State) => (event: Event) => State
      initialState: State
    }): CommandHandlerSpecfication<Command, Event, Error> =>
    (...givenEvents: ReadonlyArray<Event>) => {
      return {
        when: command => {
          const state = Array.reduce(givenEvents, initialState, (state, event) => evolve(state)(event))

          const result = decide(state)(command)

          return {
            then: (...expectedEvents) => {
              expect(result).toStrictEqual(Either.right(expectedEvents))
            },
            thenNothing: () => {
              expect(result).toStrictEqual(Either.right([]))
            },
            thenError: expectedError => {
              expect(result).toStrictEqual(Either.left(expectedError))
            },
          }
        },
      }
    },
}
