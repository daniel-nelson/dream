import { DreamClassAndAssociationNameTuple } from '../../types/recursiveSerialization.js'

export interface AssociationPathEdge<NodeType> {
  nextNode: NodeType | null
  tuple: DreamClassAndAssociationNameTuple
}

export default function buildAssociationPaths<NodeType>(
  rootNode: NodeType,
  {
    getKey,
    getEdges,
    maxRepeats,
  }: {
    getKey: (node: NodeType) => string
    getEdges: (node: NodeType) => AssociationPathEdge<NodeType>[]
    maxRepeats: number
  }
): DreamClassAndAssociationNameTuple[][] {
  const paths: DreamClassAndAssociationNameTuple[][] = []

  function traverse(
    node: NodeType,
    currentPath: DreamClassAndAssociationNameTuple[],
    depthTracker: Record<string, number>
  ) {
    const trackerId = getKey(node)
    depthTracker[trackerId] ??= 0
    if (depthTracker[trackerId] + 1 > maxRepeats) {
      if (currentPath.length > 0) {
        paths.push([...currentPath])
      }
      return
    }
    depthTracker[trackerId]++

    const edges = getEdges(node)

    if (edges.length === 0) {
      if (currentPath.length > 0) {
        paths.push([...currentPath])
      }
      depthTracker[trackerId]--
      return
    }

    for (const edge of edges) {
      const newPath = [...currentPath, edge.tuple]

      if (!edge.nextNode) {
        paths.push(newPath)
        continue
      }

      traverse(edge.nextNode, newPath, depthTracker)
    }

    depthTracker[trackerId]--
  }

  traverse(rootNode, [], {})
  return paths
}
