import Dream from '../../Dream.js'
import { RECURSIVE_SERIALIZATION_MAX_REPEATS } from '../../constants.js'
import MissingSerializersDefinition from '../../errors/serializers/MissingSerializersDefinition.js'
import compact from '../../helpers/compact.js'
import DreamSerializerBuilder from '../../serializer/builders/DreamSerializerBuilder.js'
import { inferSerializersFromDreamClassOrViewModelClass } from '../../serializer/helpers/inferSerializerFromDreamOrViewModel.js'
import { DreamClassAndAssociationNameTuple } from '../../types/recursiveSerialization.js'
import {
  DreamModelSerializerType,
  InternalAnyRendersOneOrManyOpts,
  InternalAnyTypedSerializerDelegatedAttribute,
  InternalAnyTypedSerializerRendersMany,
  InternalAnyTypedSerializerRendersOne,
  SimpleObjectSerializerType,
} from '../../types/serializer.js'
import buildAssociationPaths, { AssociationPathEdge } from './buildAssociationPaths.js'

type SerializerTraversalNode = {
  dreamClass: typeof Dream
  serializer: DreamModelSerializerType | SimpleObjectSerializerType
}

export default function buildSerializerPreloadPaths(
  dreamClass: typeof Dream,
  serializerKey?: string
): DreamClassAndAssociationNameTuple[][] {
  const key = serializerKey || 'default'
  const serializer = inferSerializersFromDreamClassOrViewModelClass(dreamClass, key)[0] ?? null
  if (!serializer) throw new Error(`unable to find serializer with key: ${key}`)

  const paths = buildAssociationPaths<SerializerTraversalNode>(
    {
      dreamClass,
      serializer,
    },
    {
      getKey: node => node.dreamClass.globalName,
      getEdges: serializerNodeToEdges,
      maxRepeats: RECURSIVE_SERIALIZATION_MAX_REPEATS,
    }
  )

  const dedupedPaths = new Map<string, DreamClassAndAssociationNameTuple[]>()
  for (const path of paths) {
    dedupedPaths.set(
      path
        .map(([pathDreamClass, associationName]) => `${pathDreamClass.globalName}:${associationName}`)
        .join('|'),
      path
    )
  }

  return [...dedupedPaths.values()]
}

function serializerNodeToEdges({
  dreamClass,
  serializer,
}: SerializerTraversalNode): AssociationPathEdge<SerializerTraversalNode>[] {
  const serializerBuilder = serializer(undefined as any, undefined as any) as DreamSerializerBuilder<any, any>
  const serializerAssociations = serializerBuilder['attributes'].filter(attribute =>
    ['rendersOne', 'rendersMany', 'delegatedAttribute'].includes(attribute.type as string)
  ) as (
    | InternalAnyTypedSerializerRendersMany<any>
    | InternalAnyTypedSerializerRendersOne<any>
    | InternalAnyTypedSerializerDelegatedAttribute
  )[]

  return serializerAssociations.flatMap<AssociationPathEdge<SerializerTraversalNode>>(
    serializerAssociation => {
      const serializerAssociationName =
        (serializerAssociation as InternalAnyTypedSerializerDelegatedAttribute).targetName ??
        serializerAssociation.name

      const association = dreamClass['getAssociationMetadata'](serializerAssociationName)
      if (!association) return []

      const tuple: DreamClassAndAssociationNameTuple = [dreamClass, association.as]

      if (serializerAssociation.type === 'delegatedAttribute') {
        return [{ nextNode: null, tuple }]
      }

      const maybeAssociatedClasses = association.modelCB()
      if (!maybeAssociatedClasses)
        throw new Error(
          `No class defined on ${serializerAssociationName} association on ${dreamClass.sanitizedName}`
        )

      const associatedClasses = Array.isArray(maybeAssociatedClasses)
        ? maybeAssociatedClasses
        : [maybeAssociatedClasses]

      const associatedClassSerializerTuples: SerializerTraversalNode[] = associatedClasses.flatMap(
        associatedClass => {
          let serializers: (DreamModelSerializerType | SimpleObjectSerializerType)[] = []

          try {
            serializers = (serializerAssociation.options as InternalAnyRendersOneOrManyOpts).serializer
              ? compact([(serializerAssociation.options as InternalAnyRendersOneOrManyOpts).serializer])
              : compact(
                  inferSerializersFromDreamClassOrViewModelClass(
                    associatedClass,
                    (serializerAssociation.options as InternalAnyRendersOneOrManyOpts).serializerKey
                  )
                )
          } catch (error) {
            if (!(error instanceof MissingSerializersDefinition)) throw error
            serializers = []
          }

          return serializers.map(associatedSerializer => ({
            dreamClass: associatedClass,
            serializer: associatedSerializer,
          }))
        }
      )

      if (associatedClassSerializerTuples.length === 0) {
        return [{ nextNode: null, tuple }]
      }

      return associatedClassSerializerTuples.map(nextNode => ({
        nextNode,
        tuple,
      }))
    }
  )
}
