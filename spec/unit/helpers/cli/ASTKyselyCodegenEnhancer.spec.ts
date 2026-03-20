// NOTE: since ASTKyselyCodegenEnhancer is responsible for enhancing types/db.ts,
// and ASTSchemaBuilder is responsible for writing types/dream.ts,
// we can examine these files to ensure that array types are properly readonly
import * as fs from 'node:fs'
import * as path from 'node:path'

describe('ASTKyselyCodegenEnhancer', () => {
  let dbFileContent: string

  beforeAll(() => {
    const dbPath = path.resolve(__dirname, '../../../../test-app/types/db.ts')
    dbFileContent = fs.readFileSync(dbPath, 'utf-8')
  })

  describe('makeArraysReadonly', () => {
    context('ArrayType and ArrayTypeImpl helper types', () => {
      it('makes ArrayType produce readonly arrays', () => {
        expect(dbFileContent).toContain('ArrayTypeImpl<T> extends readonly (infer U)[]')
        expect(dbFileContent).toContain('? readonly U[]')
      })

      it('makes ArrayTypeImpl produce readonly arrays', () => {
        expect(dbFileContent).toContain('ColumnType<readonly S[], readonly I[], readonly U[]>')
        expect(dbFileContent).toContain(': readonly T[]')
      })
    })

    context('direct array types in interface properties', () => {
      it('makes plain array types readonly', () => {
        expect(dbFileContent).toContain('favoriteBooleans: readonly boolean[] | null')
        expect(dbFileContent).toContain('favoriteCitexts: readonly string[] | null')
        expect(dbFileContent).toContain('favoriteIntegers: readonly number[] | null')
        expect(dbFileContent).toContain('favoriteTexts: readonly string[] | null')
        expect(dbFileContent).toContain('favoriteUuids: readonly string[] | null')
        expect(dbFileContent).toContain('nicknames: readonly string[] | null')
      })

      it('makes Generated-wrapped array types readonly', () => {
        expect(dbFileContent).toContain('requiredFavoriteBooleans: Generated<readonly boolean[]>')
        expect(dbFileContent).toContain('requiredFavoriteCitexts: Generated<readonly string[]>')
        expect(dbFileContent).toContain('requiredFavoriteIntegers: Generated<readonly number[]>')
        expect(dbFileContent).toContain('requiredFavoriteTexts: Generated<readonly string[]>')
        expect(dbFileContent).toContain('requiredNicknames: Generated<readonly string[]>')
      })

      it('makes ClockTime and ClockTimeTz array types use ArrayType wrapper', () => {
        expect(dbFileContent).toContain('times: ArrayType<ClockTime> | null')
        expect(dbFileContent).toContain('timesWithZone: ArrayType<ClockTimeTz> | null')
      })
    })

    context('no mutable arrays remain in interface properties', () => {
      it('does not contain mutable array types in property definitions', () => {
        // Match property-like patterns with mutable arrays (not preceded by "readonly ")
        const lines = dbFileContent.split('\n')

        const interfacePropertyWithMutableArray = lines.filter(line => {
          const trimmed = line.trim()
          // Only check lines that look like interface property definitions
          if (!trimmed.match(/^\w+.*:\s/)) return false
          // Check for T[] not preceded by "readonly "
          if (trimmed.match(/(?<!readonly )\b\w+\[\]/)) return true
          return false
        })

        expect(interfacePropertyWithMutableArray).toEqual([])
      })
    })
  })
})

describe('ASTSchemaBuilder', () => {
  let dreamFileContent: string

  beforeAll(() => {
    const dreamPath = path.resolve(__dirname, '../../../../test-app/types/dream.ts')
    dreamFileContent = fs.readFileSync(dreamPath, 'utf-8')
  })

  describe('readonly arrays in coercedType and enumArrayType', () => {
    context('enum array types', () => {
      it('makes enumArrayType readonly', () => {
        expect(dreamFileContent).toContain('enumArrayType: [] as readonly PetTreatsEnum[]')
        expect(dreamFileContent).toContain('enumArrayType: [] as readonly BalloonColorsEnum[]')
        expect(dreamFileContent).toContain('enumArrayType: [] as readonly SpeciesTypesEnum[]')
      })

      it('makes enum coercedType readonly', () => {
        expect(dreamFileContent).toContain('coercedType: {} as readonly PetTreatsEnum[] | null')
        expect(dreamFileContent).toContain('coercedType: {} as readonly BalloonColorsEnum[] | null')
      })
    })

    context('primitive array types', () => {
      it('makes numeric array coercedType readonly', () => {
        expect(dreamFileContent).toContain('coercedType: {} as readonly number[] | null')
      })

      it('makes string array coercedType readonly', () => {
        expect(dreamFileContent).toContain('coercedType: {} as readonly string[] | null')
      })

      it('makes boolean array coercedType readonly', () => {
        expect(dreamFileContent).toContain('coercedType: {} as readonly boolean[] | null')
      })
    })

    context('complex array types', () => {
      it('makes DateTime array coercedType readonly', () => {
        expect(dreamFileContent).toContain('coercedType: {} as readonly DateTime[] | null')
      })

      it('makes CalendarDate array coercedType readonly', () => {
        expect(dreamFileContent).toContain('coercedType: {} as readonly CalendarDate[] | null')
      })

      it('makes Json array coercedType readonly', () => {
        expect(dreamFileContent).toContain('coercedType: {} as readonly Json[] | null')
      })

      it('makes ClockTime array coercedType readonly', () => {
        expect(dreamFileContent).toContain('coercedType: {} as readonly ClockTime[] | null')
      })

      it('makes ClockTimeTz array coercedType readonly', () => {
        expect(dreamFileContent).toContain('coercedType: {} as readonly ClockTimeTz[] | null')
      })
    })

    context('no mutable arrays remain in coercedType or enumArrayType', () => {
      it('does not contain mutable array types', () => {
        const lines = dreamFileContent.split('\n')

        const mutableArrayLines = lines.filter(line => {
          const trimmed = line.trim()
          // Only check coercedType and enumArrayType lines
          if (!trimmed.match(/^(coercedType|enumArrayType):/)) return false
          // Check for T[] not preceded by "readonly "
          if (trimmed.match(/(?<!readonly )\b\w+\[\]/)) return true
          return false
        })

        expect(mutableArrayLines).toEqual([])
      })
    })
  })
})
