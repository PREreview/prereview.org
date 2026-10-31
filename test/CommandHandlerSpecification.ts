import { expect } from './vitest.ts'
import { Array, Result, Option } from 'effect'

export type CommandHandlerSpecfication<Command, Event, Error> = (...givenEvents: ReadonlyArray<Event>) => {
  when: (command: Command) => {
    then: (expectedEvent: Event) => void
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
      decide: (state: State) => (command: Command) => Result.Result<Option.Option<Event>, Error>
      evolve: (state: State) => (event: Event) => State
      initialState: State
    }): CommandHandlerSpecfication<Command, Event, Error> =>
    (...givenEvents: ReadonlyArray<Event>) => {
      return {
        when: command => {
          const state = Array.reduce(givenEvents, initialState, (state, event) => evolve(state)(event))

          const result = decide(state)(command)

          return {
            // oxlint-disable-next-line no-thenable
            then: expectedEvent => {
              expect(result).toStrictEqual(Result.succeed(Option.some(expectedEvent)))
            },
            thenNothing: () => {
              expect(result).toStrictEqual(Result.succeed(Option.none()))
            },
            thenError: expectedError => {
              expect(result).toStrictEqual(Result.fail(expectedError))
            },
          }
        },
      }
    },
}
