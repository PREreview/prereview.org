import { Arbitrary, Either, Number, Option, pipe, Schema, type Brand } from 'effect'
import * as C from 'io-ts/lib/Codec.js'
import * as D from 'io-ts/lib/Decoder.js'
import { EffectToFpts } from '../RefactoringUtilities/index.ts'
import { NonEmptyStringSchema, type NonEmptyString } from './NonEmptyString.ts'

const PseudonymBrand: unique symbol = Symbol.for('Pseudonym')

export type Pseudonym = NonEmptyString & Brand.Brand<typeof PseudonymBrand>

export const PseudonymC = C.fromDecoder(
  pipe(
    D.string,
    D.parse(s =>
      EffectToFpts.either(
        Either.try({
          try: () => PseudonymSchema.make(s),
          catch: () => D.error(s, 'Pseudonym'),
        }),
      ),
    ),
  ),
)

const Color = Schema.Literal(
  'Aliceblue',
  'Amber',
  'Amthyst', // [sic]
  'Beige',
  'Black',
  'Blue',
  'Bronze',
  'Brown',
  'Chocolate',
  'Crimson',
  'Cyan',
  'Darkcyan',
  'Darkblue',
  'Darkgray',
  'Darkgreen',
  'Darkmagenta',
  'Darkorange',
  'Darkred',
  'Darkviolet',
  'Ebony',
  'Emerald',
  'Forestgreen',
  'Gold',
  'Graphite',
  'Gray',
  'Green',
  'Greenyellow',
  'Ghostwhite',
  'Hickory',
  'Hotpink',
  'Indigo',
  'Ink',
  'Ivory',
  'Jade',
  'Khaki',
  'Lawngreen',
  'Lightblue',
  'Lightgray',
  'Lightpink',
  'Lilac',
  'Lime',
  'Limegreen',
  'Magenta',
  'Midnight',
  'Mistyrose',
  'Navyblue',
  'Obsidian',
  'Orange',
  'Pink',
  'Purple',
  'Rainbow',
  'Red',
  'Rose',
  'Rosewood',
  'Ruby',
  'Sapphire',
  'Seagreen',
  'Sepia',
  'Shadow',
  'Silver',
  'Skyblue',
  'Slategray',
  'Steelblue',
  'Teal',
  'Turquoise',
  'Ultramarine',
  'Umber',
  'Vanilla',
  'Violet',
  'White',
  'Yellow',
  'Yellowgreen',
)

const Animal = Schema.Literal(
  'Albatross',
  'Ant',
  'Ape',
  'Bat',
  'Bear',
  'Beaver',
  'Bee',
  'Bird',
  'Bison',
  'Boar',
  'Buffalo',
  'Butterfly',
  'Cat',
  'Chameleon',
  'Cheetah',
  'Chicken',
  'Chinchilla',
  'Cobra',
  'Coyote',
  'Crab',
  'Crocodile',
  'Crow',
  'Deer',
  'Dog',
  'Dolphin',
  'Donkey',
  'Dragonfly',
  'Duck',
  'Eagle',
  'Elephant',
  'Falcon',
  'Fish',
  'Fox',
  'Frog',
  'Gecko',
  'Giraffe',
  'Goat',
  'Gorilla',
  'Grasshopper',
  'Hamster',
  'Hawk',
  'Hedgehog',
  'Hornet',
  'Horse',
  'Hummingbird',
  'Jaguar',
  'Jellyfish',
  'Kangaroo',
  'Koala',
  'Lemur',
  'Leopard',
  'Lion',
  'Lizard',
  'Llama',
  'Lobster',
  'Mammoth',
  'Mole',
  'Mongoose',
  'Monkey',
  'Moose',
  'Mouse',
  'Octopus',
  'Otter',
  'Owl',
  'Panther',
  'Parrot',
  'Panda',
  'Pelican',
  'Penguin',
  'Rabbit',
  'Raccoon',
  'Ram',
  'Raven',
  'Salamander',
  'Seal',
  'Shark',
  'Sheep',
  'Snake',
  'Spider',
  'Squid',
  'Squirrel',
  'Starfish',
  'Swan',
  'Tiger',
  'Turtle',
  'Wasp',
  'Wolf',
  'Yak',
  'Zebra',
)

export const PseudonymSchema = pipe(
  NonEmptyStringSchema,
  Schema.filter(isPseudonym, { message: () => 'not a pseudonym' }),
  Schema.brand(PseudonymBrand),
).annotations({
  arbitrary: () => fc =>
    fc
      .record(
        {
          color: Arbitrary.make(Color),
          animal: Arbitrary.make(Animal),
          number: Arbitrary.make(Schema.NonNegativeInt),
        },
        { requiredKeys: ['color', 'animal'] },
      )
      .map(({ color, animal, number }) =>
        number === undefined ? (`${color} ${animal}` as Pseudonym) : (`${color} ${animal} ${number}` as Pseudonym),
      ),
})

export function isPseudonym(value: string): value is Pseudonym {
  const parts = value.split(' ', 3)

  if (typeof parts[0] !== 'string' || typeof parts[1] !== 'string') {
    return false
  }

  if (typeof parts[2] === 'string') {
    const number = Option.getOrUndefined(Number.parse(parts[2]))

    if (!Schema.is(Schema.NonNegativeInt)(number)) {
      return false
    }

    if (`${parts[0]} ${parts[1]} ${number}` !== value) {
      return false
    }
  }

  return Schema.is(Color)(parts[0]) && Schema.is(Animal)(parts[1])
}

export const Pseudonym = (pseudonym: string) => PseudonymSchema.make(pseudonym)
