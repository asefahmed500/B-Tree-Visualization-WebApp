"use client"

import { DialogDescription } from "@/components/ui/dialog"

import { useEffect, useRef, useState } from "react"
import { BPlusTree } from "@/lib/bplus-tree"
import { toast } from "@/components/ui/use-toast"
import {
  AlertTriangle,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RefreshCw,
  Plus,
  Trash2,
  Search,
  Shuffle,
  ChevronRight,
  ChevronDown,
  Info,
  Settings,
  HelpCircle,
  Link,
  Unlink,
  Zap,
  Save,
  FileUp,
  Download,
  RotateCcw,
  RotateCw,
  Layers,
  Database,
  ArrowRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"

// Define the types of visualization steps
type VisualizationStepType =
  | "initial"
  | "search"
  | "insert"
  | "split-leaf"
  | "split-internal"
  | "promote-key"
  | "delete"
  | "borrow"
  | "merge"
  | "final"
  | "range-search"

interface VisualizationStep {
  type: VisualizationStepType
  description: string
  treeState: any
  highlightedNodes?: string[] // Node IDs to highlight
  highlightedKeys?: number[] // Keys to highlight
  highlightedPaths?: string[] // Paths to highlight (node IDs)
  searchValue?: number // Value being searched
  insertValue?: number // Value being inserted
  deleteValue?: number // Value being deleted
  splitNode?: string // Node being split
  mergeNodes?: string[] // Nodes being merged
  borrowNodes?: string[] // Nodes involved in borrowing
  rangeStart?: number // Start of range search
  rangeEnd?: number // End of range search
  rangeResult?: number[] // Result of range search
  explanation: string[]
}

export default function BPlusTreeVisualizer() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [order, setOrder] = useState(4)
  const [orderInput, setOrderInput] = useState("4")
  const [tree, setTree] = useState<BPlusTree | null>(null)
  const [visualizationSteps, setVisualizationSteps] = useState<VisualizationStep[]>([])
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playSpeed, setPlaySpeed] = useState(1000)
  const [stats, setStats] = useState({
    nodeCount: 0,
    leafCount: 0,
    height: 0,
    dataCount: 0,
  })
  const [userInput, setUserInput] = useState("")
  const [singleValueInput, setSingleValueInput] = useState("")
  const [operationMode, setOperationMode] = useState<"insert" | "delete" | "example" | "range">("insert")
  const [detailedExplanation, setDetailedExplanation] = useState<string[]>([])
  const [showLeafLinks, setShowLeafLinks] = useState(true)
  const [randomCount, setRandomCount] = useState(10)
  const [randomMin, setRandomMin] = useState(1)
  const [randomMax, setRandomMax] = useState(100)
  const [rangeStart, setRangeStart] = useState("")
  const [rangeEnd, setRangeEnd] = useState("")
  const [treeValidationStatus, setTreeValidationStatus] = useState<boolean | null>(null)
  const [showExplanation, setShowExplanation] = useState(true)
  const [exportedTreeData, setExportedTreeData] = useState("")
  const [importTreeData, setImportTreeData] = useState("")
  const [showColorLegend, setShowColorLegend] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [showHelp, setShowHelp] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [autoPlay, setAutoPlay] = useState(false)
  const [showNodeValues, setShowNodeValues] = useState(true)
  const [animationEnabled, setAnimationEnabled] = useState(true)
  const [progressPercentage, setProgressPercentage] = useState(0)

  // Update the initial state values for bulk insertion to provide sensible defaults
  // Add these after the other state declarations (around line 80)
  const [bulkValues, setBulkValues] = useState("5,10,15,20")
  const [bulkInsertMode, setBulkInsertMode] = useState<"list" | "range">("list")
  const [rangeInsertStart, setRangeInsertStart] = useState(1)
  const [rangeInsertEnd, setRangeInsertEnd] = useState(10)
  const [rangeInsertStep, setRangeInsertStep] = useState(1)

  // Example values
  const exampleValues = [5, 6, 9, 12, 13, 34, 35, 45, 17, 8, 3]

  // Color legend for the visualization
  const colorLegend = [
    { color: "#e2f2ff", label: "Leaf Node" },
    { color: "#fff2e2", label: "Internal Node" },
    { color: "#fff9c4", label: "Highlighted Node" },
    { color: "#e1f5fe", label: "Path Node" },
    { color: "#ffcdd2", label: "Split Node" },
    { color: "#c8e6c9", label: "Merge Node" },
    { color: "#bbdefb", label: "Borrow Node" },
    { color: "#4caf50", label: "Insert Key" },
    { color: "#f44336", label: "Delete Key" },
    { color: "#2196f3", label: "Search Key" },
    { color: "#9c27b0", label: "Range Search Key" },
  ]

  // Help content
  const helpContent = [
    {
      title: "B+ Tree Basics",
      content:
        "A B+ tree is a self-balancing tree data structure that maintains sorted data and allows searches, sequential access, insertions, and deletions in logarithmic time. All values are stored in the leaf nodes, while internal nodes only store keys for navigation.",
    },
    {
      title: "Tree Order",
      content:
        "The order of a B+ tree determines the maximum number of children a node can have. A B+ tree of order m has at most m children per node and at most m-1 keys per node. The minimum number of keys in a node (except the root) is ⌈m/2⌉-1.",
    },
    {
      title: "Insertion",
      content:
        "When inserting a value, the tree is traversed to find the appropriate leaf node. If the leaf node has space, the value is inserted. If not, the node is split, and a key is promoted to the parent node. This process may propagate up to the root.",
    },
    {
      title: "Deletion",
      content:
        "When deleting a value, the tree is traversed to find the leaf node containing the value. After deletion, if the node has too few keys, it may borrow keys from siblings or merge with a sibling. This process may propagate up to the root.",
    },
    {
      title: "Range Search",
      content:
        "Range searches are efficient in B+ trees because all values are stored in leaf nodes, which are linked together. The search starts by finding the leaf node containing the start key, then traverses the linked leaf nodes until the end key is reached.",
    },
    {
      title: "Visualization Controls",
      content:
        "Use the playback controls to navigate through the steps of an operation. The speed slider adjusts the auto-play speed. You can also manually step through the visualization using the previous and next buttons.",
    },
  ]

  // Define the drawNode function first since drawTree depends on it
  const drawNode = (
    ctx: CanvasRenderingContext2D,
    node: any,
    x: number,
    y: number,
    width: number,
    nodeHeight: number,
    levelHeight: number,
    step: VisualizationStep,
    nodeId: string,
    childIndex: number,
  ) => {
    if (!node) {
      console.warn(`Attempted to draw null node with ID ${nodeId}`)
      return
    }

    try {
      // Make sure node has keys property and it's an array
      if (!node.keys || !Array.isArray(node.keys)) {
        console.warn(`Node at ${nodeId} has invalid keys property`, node)
        return
      }

      // Calculate node width based on number of keys (with minimum width)
      const nodeWidth = Math.max(100, Math.min(node.keys.length * 50 + 20, 200))
      const nodeX = x - nodeWidth / 2

      // Determine if this node should be highlighted
      const isHighlighted = step.highlightedNodes?.includes(nodeId)
      const isInPath = step.highlightedPaths?.includes(nodeId)
      const isSplitNode = step.splitNode === nodeId
      const isMergeNode = step.mergeNodes?.includes(nodeId)
      const isBorrowNode = step.borrowNodes?.includes(nodeId)

      // Apply zoom
      ctx.save()
      ctx.scale(zoomLevel, zoomLevel)

      // Draw node rectangle with shadow
      ctx.shadowColor = "rgba(0, 0, 0, 0.2)"
      ctx.shadowBlur = 5
      ctx.shadowOffsetX = 2
      ctx.shadowOffsetY = 2

      // Different colors for different node types and states
      if (isSplitNode) {
        ctx.fillStyle = "#ffcdd2" // Light red for split nodes
      } else if (isMergeNode) {
        ctx.fillStyle = "#c8e6c9" // Light green for merge nodes
      } else if (isBorrowNode) {
        ctx.fillStyle = "#bbdefb" // Light blue for borrow nodes
      } else if (isHighlighted) {
        ctx.fillStyle = "#fff9c4" // Light yellow for highlighted nodes
      } else if (isInPath) {
        ctx.fillStyle = "#e1f5fe" // Very light blue for path nodes
      } else {
        ctx.fillStyle = node.isLeaf ? "#e2f2ff" : "#fff2e2" // Default colors
      }

      ctx.strokeStyle = isHighlighted ? "#ff9800" : "#333"
      ctx.lineWidth = isHighlighted ? 2 : 1

      // Use rounded rectangle for better aesthetics
      ctx.beginPath()
      const radius = 5
      ctx.moveTo(nodeX + radius, y)
      ctx.lineTo(nodeX + nodeWidth - radius, y)
      ctx.quadraticCurveTo(nodeX + nodeWidth, y, nodeX + nodeWidth, y + radius)
      ctx.lineTo(nodeX + nodeWidth, y + nodeHeight - radius)
      ctx.quadraticCurveTo(nodeX + nodeWidth, y + nodeHeight, nodeX + nodeWidth - radius, y + nodeHeight)
      ctx.lineTo(nodeX + radius, y + nodeHeight)
      ctx.quadraticCurveTo(nodeX, y + nodeHeight, nodeX, y + nodeHeight - radius)
      ctx.lineTo(nodeX, y + radius)
      ctx.quadraticCurveTo(nodeX, y, nodeX + radius, y)
      ctx.fill()
      ctx.stroke()

      // Reset shadow
      ctx.shadowColor = "transparent"
      ctx.shadowBlur = 0
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = 0

      // Draw keys
      ctx.fillStyle = "#333"
      ctx.font = "14px Arial"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"

      const keyWidth = nodeWidth / (node.keys.length || 1)

      for (let i = 0; i < node.keys.length; i++) {
        const keyX = nodeX + keyWidth * (i + 0.5)
        const keyY = y + nodeHeight / 2
        const key = node.keys[i]

        // Highlight specific keys based on the operation
        const isHighlightedKey = step.highlightedKeys?.includes(key)
        const isInsertKey = step.insertValue === key && step.type === "insert"
        const isDeleteKey = step.deleteValue === key && step.type === "delete"
        const isSearchKey = step.searchValue === key && step.type === "search"
        const isInRangeKey =
          step.rangeStart !== undefined &&
          step.rangeEnd !== undefined &&
          key >= step.rangeStart &&
          key <= step.rangeEnd &&
          step.type === "range-search"

        if (isHighlightedKey || isInsertKey || isDeleteKey || isSearchKey || isInRangeKey) {
          let circleColor = "#ff5722" // Default highlight color

          if (isInsertKey) {
            circleColor = "#4caf50" // Green for insert
          } else if (isDeleteKey) {
            circleColor = "#f44336" // Red for delete
          } else if (isSearchKey) {
            circleColor = "#2196f3" // Blue for search
          } else if (isInRangeKey) {
            circleColor = "#9c27b0" // Purple for range search
          }

          // Draw glow effect for highlighted keys
          const glowRadius = animationEnabled ? 15 + Math.sin(Date.now() / 200) * 2 : 15 // Pulsing effect if animation enabled

          ctx.fillStyle = circleColor
          ctx.beginPath()
          ctx.arc(keyX, keyY, glowRadius, 0, Math.PI * 2)
          ctx.fill()

          // Add outer glow
          ctx.strokeStyle = circleColor
          ctx.lineWidth = 2
          ctx.globalAlpha = 0.5
          ctx.beginPath()
          ctx.arc(keyX, keyY, glowRadius + 3, 0, Math.PI * 2)
          ctx.stroke()
          ctx.globalAlpha = 1

          ctx.fillStyle = "#fff" // White text for contrast
        }

        // Draw the key text
        if (showNodeValues) {
          ctx.fillText(key.toString(), keyX, keyY)
        }

        // Draw separator
        if (i < node.keys.length - 1) {
          ctx.beginPath()
          ctx.moveTo(nodeX + keyWidth * (i + 1), y)
          ctx.lineTo(nodeX + keyWidth * (i + 1), y + nodeHeight)
          ctx.stroke()
        }

        // Reset fill style
        ctx.fillStyle = "#333"
      }

      // Draw node type indicator
      const nodeTypeLabel = node.isLeaf ? "Leaf" : "Internal"
      ctx.font = "10px Arial"
      ctx.fillStyle = "#666"
      ctx.fillText(nodeTypeLabel, nodeX + nodeWidth - 20, y + 10)

      // Draw children
      if (!node.isLeaf && node.children && Array.isArray(node.children) && node.children.length > 0) {
        const childWidth = width / node.children.length

        for (let i = 0; i < node.children.length; i++) {
          if (!node.children[i]) {
            console.warn(`Child at index ${i} is undefined for node ${nodeId}`)
            continue
          }

          const childX = x - width / 2 + childWidth * (i + 0.5)
          const childY = y + levelHeight
          const childNodeId = `${nodeId}-${i}`

          // Determine if this connection should be highlighted
          const isPathConnection =
            step.highlightedPaths?.includes(nodeId) && step.highlightedPaths?.includes(childNodeId)

          // Draw line to child with appropriate highlighting
          ctx.beginPath()
          ctx.strokeStyle = isPathConnection ? "#ff9800" : "#666"
          ctx.lineWidth = isPathConnection ? 2 : 1

          // Draw curved connection line for better aesthetics
          const startX = nodeX + nodeWidth / 2
          const startY = y + nodeHeight
          const endX = childX
          const endY = childY

          // Control points for the curve
          const controlY = startY + (endY - startY) / 2

          ctx.beginPath()
          ctx.moveTo(startX, startY)
          ctx.bezierCurveTo(startX, controlY, endX, controlY, endX, endY)
          ctx.stroke()

          // Draw arrow at the end of the line
          const arrowSize = 5
          const angle = Math.atan2(endY - controlY, endX - startX)
          ctx.beginPath()
          ctx.moveTo(endX, endY)
          ctx.lineTo(endX - arrowSize * Math.cos(angle - Math.PI / 6), endY - arrowSize * Math.sin(angle - Math.PI / 6))
          ctx.lineTo(endX - arrowSize * Math.cos(angle + Math.PI / 6), endY - arrowSize * Math.sin(angle + Math.PI / 6))
          ctx.closePath()
          ctx.fillStyle = isPathConnection ? "#ff9800" : "#666"
          ctx.fill()

          ctx.strokeStyle = "#333"
          ctx.lineWidth = 1

          // Draw child node
          drawNode(ctx, node.children[i], childX, childY, childWidth, nodeHeight, levelHeight, step, childNodeId, i)
        }
      }

      // Draw leaf node links if this is a leaf and showLeafLinks is true
      if (node.isLeaf && showLeafLinks) {
        // Draw a right-pointing arrow to indicate leaf node links
        ctx.strokeStyle = "#4caf50"
        ctx.setLineDash([5, 3])

        // Only draw if this isn't the rightmost leaf
        if (node.next) {
          ctx.beginPath()
          ctx.moveTo(nodeX + nodeWidth, y + nodeHeight / 2)
          ctx.lineTo(nodeX + nodeWidth + 20, y + nodeHeight / 2)
          ctx.stroke()

          // Draw arrowhead
          ctx.beginPath()
          ctx.moveTo(nodeX + nodeWidth + 20, y + nodeHeight / 2)
          ctx.lineTo(nodeX + nodeWidth + 15, y + nodeHeight / 2 - 5)
          ctx.lineTo(nodeX + nodeWidth + 15, y + nodeHeight / 2 + 5)
          ctx.fill()
        }

        ctx.setLineDash([])
        ctx.strokeStyle = "#333"
      }

      ctx.restore()
    } catch (error) {
      console.error(`Error drawing node ${nodeId}:`, error)
    }
  }

  // Define the drawTree function before it's used in useEffect
  const drawTree = (step: VisualizationStep) => {
    if (!canvasRef.current) return

    try {
      const canvas = canvasRef.current
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      // Set canvas size
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width
      canvas.height = rect.height

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      if (!step || !step.treeState) {
        console.warn("Step or tree state is undefined in drawTree")
        return
      }

      // Create a temporary tree to visualize
      const tempTree = new BPlusTree(order)
      tempTree.import(step.treeState)

      // Get the root node
      const root = tempTree.getRoot()
      if (!root) {
        console.warn("Root node is undefined in drawTree")
        return
      }

      // Apply pan and zoom transformations
      ctx.save()
      ctx.translate(canvas.width / 2, 0) // Center the tree horizontally

      // Draw tree with appropriate highlighting based on step type
      drawNode(ctx, root, 0, 50, canvas.width * 0.8, 40, 80, step, "root", 0)

      ctx.restore()

      // Draw color legend if enabled
      if (showColorLegend) {
        drawColorLegend(ctx, canvas.width, canvas.height)
      }

      // Draw current step information
      drawStepInfo(ctx, step, canvas.width)
    } catch (error) {
      console.error("Error drawing tree:", error)
    }
  }

  // Draw color legend
  const drawColorLegend = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const legendWidth = 150
    const legendHeight = colorLegend.length * 25 + 40
    const padding = 10
    const x = width - legendWidth - padding
    const y = padding

    // Draw legend background
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)"
    ctx.strokeStyle = "#ccc"
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.roundRect(x, y, legendWidth, legendHeight, 5)
    ctx.fill()
    ctx.stroke()

    // Draw legend title
    ctx.fillStyle = "#333"
    ctx.font = "bold 14px Arial"
    ctx.textAlign = "center"
    ctx.fillText("Color Legend", x + legendWidth / 2, y + 20)

    // Draw legend items
    ctx.font = "12px Arial"
    ctx.textAlign = "left"

    colorLegend.forEach((item, index) => {
      const itemY = y + 35 + index * 25

      // Draw color box
      ctx.fillStyle = item.color
      ctx.strokeStyle = "#666"
      ctx.beginPath()
      ctx.rect(x + 10, itemY, 15, 15)
      ctx.fill()
      ctx.stroke()

      // Draw label
      ctx.fillStyle = "#333"
      ctx.fillText(item.label, x + 35, itemY + 12)
    })
  }

  // Draw current step information
  const drawStepInfo = (ctx: CanvasRenderingContext2D, step: VisualizationStep, width: number) => {
    const padding = 10
    const y = 10

    ctx.fillStyle = "#333"
    ctx.font = "bold 14px Arial"
    ctx.textAlign = "left"
    ctx.fillText(`Step: ${step.description}`, padding, y + 14)
  }

  const updateStats = (treeState: any) => {
    try {
      if (!treeState) {
        console.warn("Tree state is undefined in updateStats")
        return
      }

      setStats({
        nodeCount: treeState.nodeCount || 0,
        leafCount: treeState.leafCount || 0,
        height: treeState.height || 1,
        dataCount: treeState.dataCount || 0,
      })
    } catch (error) {
      console.error("Error updating stats:", error)
    }
  }

  // Initialize tree
  useEffect(() => {
    initializeTree()
  }, [order])

  // Handle auto-play
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null

    if (isPlaying && currentStepIndex < visualizationSteps.length - 1) {
      timer = setTimeout(() => {
        setCurrentStepIndex((prev) => prev + 1)
      }, playSpeed)
    } else if (currentStepIndex >= visualizationSteps.length - 1) {
      setIsPlaying(false)
    }

    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [isPlaying, currentStepIndex, visualizationSteps, playSpeed])

  // Draw tree when step changes
  useEffect(() => {
    if (visualizationSteps.length > 0 && currentStepIndex >= 0 && currentStepIndex < visualizationSteps.length) {
      const step = visualizationSteps[currentStepIndex]
      drawTree(step)
      updateStats(step.treeState)
      setDetailedExplanation(step.explanation)

      // Update progress percentage
      const percentage = visualizationSteps.length > 1 ? (currentStepIndex / (visualizationSteps.length - 1)) * 100 : 0
      setProgressPercentage(percentage)
    }
  }, [
    currentStepIndex,
    visualizationSteps,
    showLeafLinks,
    zoomLevel,
    showColorLegend,
    showNodeValues,
    animationEnabled,
  ])

  // Animation frame for continuous updates if animation is enabled
  useEffect(() => {
    let animationFrameId: number

    if (animationEnabled) {
      const animate = () => {
        if (visualizationSteps.length > 0 && currentStepIndex >= 0 && currentStepIndex < visualizationSteps.length) {
          drawTree(visualizationSteps[currentStepIndex])
        }
        animationFrameId = requestAnimationFrame(animate)
      }

      animationFrameId = requestAnimationFrame(animate)
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
      }
    }
  }, [
    animationEnabled,
    visualizationSteps,
    currentStepIndex,
    showLeafLinks,
    zoomLevel,
    showColorLegend,
    showNodeValues,
  ])

  // Generate a unique ID for each node
  const generateNodeId = (node: any, parentId = "root", childIndex = 0): string => {
    return parentId === "root" ? "root" : `${parentId}-${childIndex}`
  }

  // Map all nodes to IDs for tracking
  const mapNodesToIds = (node: any, parentId = "root", childIndex = 0): Map<string, any> => {
    const map = new Map<string, any>()
    if (!node) return map

    const nodeId = generateNodeId(node, parentId, childIndex)
    map.set(nodeId, node)

    if (!node.isLeaf && node.children && Array.isArray(node.children)) {
      for (let i = 0; i < node.children.length; i++) {
        if (node.children[i]) {
          const childMap = mapNodesToIds(node.children[i], nodeId, i)
          childMap.forEach((value, key) => {
            map.set(key, value)
          })
        }
      }
    }

    return map
  }

  const generateInitialExplanation = (order: number) => {
    return [
      `Step 1: Creating a new empty B+ tree with order ${order}.`,
      `Step 2: Initializing the tree with a single empty leaf node as the root.`,
      `Step 3: Setting up B+ tree properties:`,
      `   - Maximum keys per node: ${order - 1}`,
      `   - Minimum keys per internal node: ${Math.ceil(order / 2) - 1}`,
      `   - Minimum children per internal node: ${Math.ceil(order / 2)}`,
      `   - Minimum keys per leaf node: ${Math.ceil(order / 2) - 1}`,
      `Step 4: The tree is now ready for insertions and deletions.`,
      `Final State: The tree has 1 node (the root), which is also a leaf node.`,
      `The tree height is 1, and it contains 0 keys.`,
      `B+ tree property check: All leaf nodes are at the same level (level 1).`,
    ]
  }

  const initializeTree = () => {
    try {
      const newTree = new BPlusTree(order)
      setTree(newTree)

      // Create initial visualization step
      const initialStep: VisualizationStep = {
        type: "initial",
        description: "Initial empty tree",
        treeState: newTree.export(),
        explanation: generateInitialExplanation(order),
      }

      setVisualizationSteps([initialStep])
      setCurrentStepIndex(0)
      setTreeValidationStatus(true)
    } catch (error) {
      console.error("Error initializing tree:", error)
      toast({
        title: "Initialization Error",
        description: "Failed to initialize the B+ tree. Please try again.",
        variant: "destructive",
      })
      setTreeValidationStatus(false)
    }
  }

  // Generate detailed visualization steps for an insertion
  const generateInsertVisualizationSteps = (tree: BPlusTree, value: number): VisualizationStep[] => {
    try {
      if (!tree) {
        throw new Error("Tree is undefined")
      }

      const steps: VisualizationStep[] = []
      const workingTree = tree.clone()

      if (!workingTree) {
        throw new Error("Failed to clone tree")
      }

      const initialState = workingTree.export()
      if (!initialState) {
        throw new Error("Failed to export tree state")
      }

      const root = workingTree.getRoot()
      if (!root) {
        throw new Error("Tree root is undefined")
      }

      // Map nodes to IDs for tracking
      const nodeMap = new Map<string, any>()

      // Recursively map all nodes with their IDs
      const mapAllNodes = (node: any, nodeId = "root"): void => {
        if (!node) return

        // Add this node to the map
        nodeMap.set(nodeId, node)

        // Map all children recursively
        if (!node.isLeaf && node.children && Array.isArray(node.children)) {
          for (let i = 0; i < node.children.length; i++) {
            if (node.children[i]) {
              mapAllNodes(node.children[i], `${nodeId}-${i}`)
            }
          }
        }
      }

      // Map all nodes in the tree
      mapAllNodes(root)

      // Step 1: Initial state
      steps.push({
        type: "initial",
        description: `Starting insertion of value ${value}`,
        treeState: initialState,
        explanation: [
          `Step 1: Starting insertion of value ${value} into the B+ tree of order ${workingTree.getOrder()}.`,
          `The tree currently has ${workingTree.getNodeCount()} nodes and ${workingTree.getDataCount()} keys.`,
          `We will now search for the appropriate leaf node to insert the value.`,
        ],
      })

      // Step 2: Search for the appropriate leaf node
      // Use direct traversal to find the leaf node
      let current = root
      const path = ["root"]

      // If root is already a leaf, we don't need to traverse
      if (!root.isLeaf) {
        let currentId = "root"

        // Traverse down to the leaf node
        while (!current.isLeaf) {
          let i = 0
          while (i < current.keys.length && value >= current.keys[i]) {
            i++
          }

          // Make sure the child exists
          if (!current.children || !current.children[i]) {
            throw new Error(`Child at index ${i} is missing for node ${currentId}`)
          }

          current = current.children[i]
          currentId = `${currentId}-${i}`
          path.push(currentId)
        }
      }

      // Now current is a leaf node
      const leafNodeId = path[path.length - 1]
      const leafNode = nodeMap.get(leafNodeId)

      if (!leafNode) {
        throw new Error(
          `Leaf node with ID ${leafNodeId} not found in node map. Available IDs: [${Array.from(nodeMap.keys()).join(", ")}]`,
        )
      }

      // Add intermediate search steps
      for (let i = 0; i < path.length - 1; i++) {
        const nodeId = path[i]
        const node = nodeMap.get(nodeId)

        if (!node) {
          console.warn(`Node with ID ${nodeId} not found in node map`)
          continue
        }

        steps.push({
          type: "search",
          description: `Searching for insertion position for ${value}`,
          treeState: initialState,
          highlightedNodes: [nodeId],
          highlightedPaths: path.slice(0, i + 1),
          searchValue: value,
          explanation: [
            `Step ${i + 2}: Searching for the appropriate position for value ${value}.`,
            `Currently examining node at path: ${nodeId}.`,
            node.isLeaf
              ? `This is a leaf node with keys: [${node.keys?.join(", ") || ""}].`
              : `This is an internal node with keys: [${node.keys?.join(", ") || ""}].`,
            `Comparing ${value} with the keys to determine where to go next.`,
          ],
        })
      }

      // Step 3: Found the leaf node
      steps.push({
        type: "search",
        description: `Found leaf node for inserting ${value}`,
        treeState: initialState,
        highlightedNodes: [leafNodeId],
        highlightedPaths: path,
        searchValue: value,
        explanation: [
          `Step ${path.length + 1}: Found the appropriate leaf node for inserting value ${value}.`,
          `This leaf node contains keys: [${leafNode.keys?.join(", ") || ""}].`,
          `We will now insert the value ${value} into this leaf node.`,
        ],
      })

      // Step 4: Insert the value
      workingTree.insert(value)
      const afterInsertState = workingTree.export()
      if (!afterInsertState) {
        throw new Error("Failed to export tree state after insertion")
      }

      // Check if a split occurred
      const splitOccurred = afterInsertState.nodeCount > initialState.nodeCount

      if (!splitOccurred) {
        // Simple insertion without split
        steps.push({
          type: "insert",
          description: `Inserted ${value} without splitting`,
          treeState: afterInsertState,
          highlightedNodes: [leafNodeId],
          insertValue: value,
          explanation: [
            `Step ${path.length + 2}: Inserting value ${value} into the leaf node.`,
            `The leaf node has enough space, so no splitting is required.`,
            `The value ${value} is inserted in the correct sorted position.`,
            `The tree structure remains unchanged with height ${workingTree.getHeight()}.`,
            `Final State: The tree now has ${workingTree.getNodeCount()} nodes and ${workingTree.getDataCount()} keys.`,
          ],
        })
      } else {
        // Insertion with split
        // First, show the insertion that would cause overflow
        steps.push({
          type: "insert",
          description: `Inserting ${value} will cause overflow`,
          treeState: initialState,
          highlightedNodes: [leafNodeId],
          insertValue: value,
          explanation: [
            `Step ${path.length + 2}: Inserting value ${value} into the leaf node.`,
            `The leaf node already has ${leafNode.keys?.length || 0} keys: [${leafNode.keys?.join(", ") || ""}].`,
            `Adding ${value} would exceed the maximum of ${order - 1} keys.`,
            `A node split will be required to maintain the B+ tree properties.`,
          ],
        })

        // Then show the split
        steps.push({
          type: "split-leaf",
          description: `Splitting leaf node after inserting ${value}`,
          treeState: afterInsertState,
          splitNode: leafNodeId,
          insertValue: value,
          explanation: [
            `Step ${path.length + 3}: Splitting the leaf node after inserting ${value}.`,
            `The keys are divided approximately in half between two leaf nodes.`,
            `The first key of the right node is promoted to the parent as a separator.`,
            `The leaf nodes are linked to maintain sequential access.`,
          ],
        })

        // If the height increased, show the root split
        if (afterInsertState.height > initialState.height) {
          steps.push({
            type: "split-internal",
            description: `Tree height increased after split`,
            treeState: afterInsertState,
            explanation: [
              `Step ${path.length + 4}: The split propagated up to the root.`,
              `A new root node is created with the promoted key.`,
              `The tree height increased from ${initialState.height} to ${afterInsertState.height}.`,
              `Final State: The tree now has ${workingTree.getNodeCount()} nodes and ${workingTree.getDataCount()} keys.`,
            ],
          })
        } else {
          steps.push({
            type: "promote-key",
            description: `Promoted key to parent after split`,
            treeState: afterInsertState,
            explanation: [
              `Step ${path.length + 4}: The parent node accommodated the promoted key.`,
              `No further splits were required.`,
              `The tree height remains at ${afterInsertState.height}.`,
              `Final State: The tree now has ${workingTree.getNodeCount()} nodes and ${workingTree.getDataCount()} keys.`,
            ],
          })
        }
      }

      // Validate the final tree state
      if (typeof workingTree.validate === "function" && !workingTree.validate()) {
        steps.push({
          type: "initial",
          description: "Warning: Invalid tree structure",
          treeState: afterInsertState,
          explanation: [
            "Warning: The tree structure after this operation is invalid.",
            "This may indicate a bug in the B+ tree implementation.",
            "Please reset the tree to avoid further issues.",
          ],
        })
        setTreeValidationStatus(false)
      } else {
        setTreeValidationStatus(true)
      }

      return steps
    } catch (error) {
      console.error("Error generating insert steps:", error)
      setTreeValidationStatus(false)
      // Return a single step with the error message
      return [
        {
          type: "initial",
          description: "Error occurred",
          treeState: tree ? tree.export() : { nodeCount: 0, leafCount: 0, height: 0, dataCount: 0 },
          explanation: [
            `An error occurred while generating visualization steps: ${error instanceof Error ? error.message : String(error)}`,
          ],
        },
      ]
    }
  }

  // Generate detailed visualization steps for a deletion
  const generateDeleteVisualizationSteps = (tree: BPlusTree, value: number): VisualizationStep[] => {
    try {
      if (!tree) {
        throw new Error("Tree is undefined")
      }

      const steps: VisualizationStep[] = []
      const workingTree = tree.clone()

      if (!workingTree) {
        throw new Error("Failed to clone tree")
      }

      const initialState = workingTree.export()
      if (!initialState) {
        throw new Error("Failed to export tree state")
      }

      const root = workingTree.getRoot()
      if (!root) {
        throw new Error("Tree root is undefined")
      }

      // Map nodes to IDs for tracking
      const nodeMap = new Map<string, any>()

      // Recursively map all nodes with their IDs
      const mapAllNodes = (node: any, nodeId = "root"): void => {
        if (!node) return

        // Add this node to the map
        nodeMap.set(nodeId, node)

        // Map all children recursively
        if (!node.isLeaf && node.children && Array.isArray(node.children)) {
          for (let i = 0; i < node.children.length; i++) {
            if (node.children[i]) {
              mapAllNodes(node.children[i], `${nodeId}-${i}`)
            }
          }
        }
      }

      // Map all nodes in the tree
      mapAllNodes(root)

      // Step 1: Initial state
      steps.push({
        type: "initial",
        description: `Starting deletion of value ${value}`,
        treeState: initialState,
        explanation: [
          `Step 1: Starting deletion of value ${value} from the B+ tree of order ${workingTree.getOrder()}.`,
          `The tree currently has ${workingTree.getNodeCount()} nodes and ${workingTree.getDataCount()} keys.`,
          `We will now search for the leaf node containing the value.`,
        ],
      })

      // Step 2: Search for the value - use direct traversal
      let current = root
      const path = ["root"]

      // If root is already a leaf, we don't need to traverse
      if (!root.isLeaf) {
        let currentId = "root"

        // Traverse down to the leaf node
        while (!current.isLeaf) {
          let i = 0
          while (i < current.keys.length && value >= current.keys[i]) {
            i++
          }

          // Make sure the child exists
          if (!current.children || !current.children[i]) {
            throw new Error(`Child at index ${i} is missing for node ${currentId}`)
          }

          current = current.children[i]
          currentId = `${currentId}-${i}`
          path.push(currentId)
        }
      }

      // Now current is a leaf node
      const leafNodeId = path[path.length - 1]
      const leafNode = current // We already have the node from traversal

      // Add intermediate search steps
      for (let i = 0; i < path.length - 1; i++) {
        const nodeId = path[i]
        const node = nodeMap.get(nodeId)

        if (!node) {
          console.warn(`Node with ID ${nodeId} not found in node map`)
          continue
        }

        steps.push({
          type: "search",
          description: `Searching for value ${value} to delete`,
          treeState: initialState,
          highlightedNodes: [nodeId],
          highlightedPaths: path.slice(0, i + 1),
          searchValue: value,
          explanation: [
            `Step ${i + 2}: Searching for value ${value} to delete.`,
            `Currently examining node at path: ${nodeId}.`,
            node.isLeaf
              ? `This is a leaf node with keys: [${node.keys?.join(", ") || ""}].`
              : `This is an internal node with keys: [${node.keys?.join(", ") || ""}].`,
            `Comparing ${value} with the keys to determine where to go next.`,
          ],
        })
      }

      // Step 3: Found the leaf node
      const valueExists = leafNode.keys && Array.isArray(leafNode.keys) && leafNode.keys.includes(value)

      if (!valueExists) {
        // Value not found
        steps.push({
          type: "search",
          description: `Value ${value} not found`,
          treeState: initialState,
          highlightedNodes: [leafNodeId],
          highlightedPaths: path,
          searchValue: value,
          explanation: [
            `Step ${path.length + 1}: Reached leaf node but value ${value} was not found.`,
            `This leaf node contains keys: [${leafNode.keys?.join(", ") || ""}].`,
            `The value ${value} is not present in this node or anywhere in the tree.`,
            `No changes will be made to the tree structure.`,
            `Final State: The tree remains unchanged with ${workingTree.getNodeCount()} nodes and ${workingTree.getDataCount()} keys.`,
          ],
        })

        return steps
      }

      // Value found
      steps.push({
        type: "search",
        description: `Found value ${value} in leaf node`,
        treeState: initialState,
        highlightedNodes: [leafNodeId],
        highlightedPaths: path,
        highlightedKeys: [value],
        searchValue: value,
        explanation: [
          `Step ${path.length + 1}: Found value ${value} in the leaf node.`,
          `This leaf node contains keys: [${leafNode.keys?.join(", ") || ""}].`,
          `We will now delete the value ${value} from this leaf node.`,
        ],
      })

      // Step 4: Delete the value
      const success = workingTree.remove(value)
      const afterDeleteState = workingTree.export()
      if (!afterDeleteState) {
        throw new Error("Failed to export tree state after deletion")
      }

      // Check if a merge or rebalance occurred
      const nodeMerged = afterDeleteState.nodeCount < initialState.nodeCount
      const heightDecreased = afterDeleteState.height < initialState.height

      if (!nodeMerged) {
        // Simple deletion without merge
        steps.push({
          type: "delete",
          description: `Deleted ${value} without rebalancing`,
          treeState: afterDeleteState,
          highlightedNodes: [leafNodeId],
          deleteValue: value,
          explanation: [
            `Step ${path.length + 2}: Deleting value ${value} from the leaf node.`,
            `The leaf node still has enough keys after deletion, so no rebalancing is required.`,
            `The tree structure remains unchanged with height ${workingTree.getHeight()}.`,
            `Final State: The tree now has ${workingTree.getNodeCount()} nodes and ${workingTree.getDataCount()} keys.`,
          ],
        })
      } else {
        // Deletion with merge or rebalance
        const minKeys = Math.ceil(workingTree.getOrder() / 2) - 1

        // First, show the deletion that would cause underflow
        steps.push({
          type: "delete",
          description: `Deleting ${value} will cause underflow`,
          treeState: initialState,
          highlightedNodes: [leafNodeId],
          deleteValue: value,
          explanation: [
            `Step ${path.length + 2}: Deleting value ${value} from the leaf node.`,
            `The leaf node has ${leafNode.keys?.length || 0} keys: [${leafNode.keys?.join(", ") || ""}].`,
            `Removing ${value} would result in fewer than the minimum required keys (${minKeys}).`,
            `Rebalancing will be required to maintain the B+ tree properties.`,
          ],
        })

        // Then show the merge or borrow
        steps.push({
          type: "merge",
          description: `Rebalancing after deleting ${value}`,
          treeState: afterDeleteState,
          deleteValue: value,
          explanation: [
            `Step ${path.length + 3}: Rebalancing the tree after deleting ${value}.`,
            `The node had too few keys after deletion.`,
            `Either keys were borrowed from a sibling node, or nodes were merged.`,
            heightDecreased
              ? `The rebalancing caused the tree height to decrease from ${initialState.height} to ${afterDeleteState.height}.`
              : `The tree height remains at ${afterDeleteState.height}.`,
            `Final State: The tree now has ${workingTree.getNodeCount()} nodes and ${workingTree.getDataCount()} keys.`,
          ],
        })
      }

      // Validate the final tree state
      if (typeof workingTree.validate === "function" && !workingTree.validate()) {
        steps.push({
          type: "initial",
          description: "Warning: Invalid tree structure",
          treeState: afterDeleteState,
          explanation: [
            "Warning: The tree structure after this operation is invalid.",
            "This may indicate a bug in the B+ tree implementation.",
            "Please reset the tree to avoid further issues.",
          ],
        })
        setTreeValidationStatus(false)
      } else {
        setTreeValidationStatus(true)
      }

      return steps
    } catch (error) {
      console.error("Error generating delete steps:", error)
      setTreeValidationStatus(false)
      // Return a single step with the error message
      return [
        {
          type: "initial",
          description: "Error occurred",
          treeState: tree ? tree.export() : { nodeCount: 0, leafCount: 0, height: 0, dataCount: 0 },
          explanation: [
            `An error occurred while generating visualization steps: ${error instanceof Error ? error.message : String(error)}`,
          ],
        },
      ]
    }
  }

  // Generate visualization steps for a range search
  const generateRangeSearchVisualizationSteps = (
    tree: BPlusTree,
    startKey: number,
    endKey: number,
  ): VisualizationStep[] => {
    try {
      if (!tree) {
        throw new Error("Tree is undefined")
      }

      const steps: VisualizationStep[] = []
      const workingTree = tree.clone()

      if (!workingTree) {
        throw new Error("Failed to clone tree")
      }

      const initialState = workingTree.export()
      if (!initialState) {
        throw new Error("Failed to export tree state")
      }

      const root = workingTree.getRoot()
      if (!root) {
        throw new Error("Tree root is undefined")
      }

      // Map nodes to IDs for tracking
      const nodeMap = new Map<string, any>()

      // Recursively map all nodes with their IDs
      const mapAllNodes = (node: any, nodeId = "root"): void => {
        if (!node) return

        // Add this node to the map
        nodeMap.set(nodeId, node)

        // Map all children recursively
        if (!node.isLeaf && node.children && Array.isArray(node.children)) {
          for (let i = 0; i < node.children.length; i++) {
            if (node.children[i]) {
              mapAllNodes(node.children[i], `${nodeId}-${i}`)
            }
          }
        }
      }

      // Map all nodes in the tree
      mapAllNodes(root)

      // Step 1: Initial state
      steps.push({
        type: "initial",
        description: `Starting range search from ${startKey} to ${endKey}`,
        treeState: initialState,
        explanation: [
          `Step 1: Starting range search for values between ${startKey} and ${endKey} in the B+ tree.`,
          `The tree currently has ${workingTree.getNodeCount()} nodes and ${workingTree.getDataCount()} keys.`,
          `We will first search for the leaf node containing the start key ${startKey}.`,
        ],
      })

      // Step 2: Search for the start key
      let current = root
      const path = ["root"]

      // If root is already a leaf, we don't need to traverse
      if (!root.isLeaf) {
        let currentId = "root"

        // Traverse down to the leaf node
        while (!current.isLeaf) {
          let i = 0
          while (i < current.keys.length && startKey >= current.keys[i]) {
            i++
          }

          // Make sure the child exists
          if (!current.children || !current.children[i]) {
            throw new Error(`Child at index ${i} is missing for node ${currentId}`)
          }

          current = current.children[i]
          currentId = `${currentId}-${i}`
          path.push(currentId)
        }
      }

      // Now current is a leaf node
      const startLeafNodeId = path[path.length - 1]
      const startLeafNode = current

      // Add intermediate search steps
      for (let i = 0; i < path.length - 1; i++) {
        const nodeId = path[i]
        const node = nodeMap.get(nodeId)

        if (!node) {
          console.warn(`Node with ID ${nodeId} not found in node map`)
          continue
        }

        steps.push({
          type: "search",
          description: `Searching for start key ${startKey}`,
          treeState: initialState,
          highlightedNodes: [nodeId],
          highlightedPaths: path.slice(0, i + 1),
          searchValue: startKey,
          explanation: [
            `Step ${i + 2}: Searching for the leaf node containing the start key ${startKey}.`,
            `Currently examining node at path: ${nodeId}.`,
            node.isLeaf
              ? `This is a leaf node with keys: [${node.keys?.join(", ") || ""}].`
              : `This is an internal node with keys: [${node.keys?.join(", ") || ""}].`,
            `Comparing ${startKey} with the keys to determine where to go next.`,
          ],
        })
      }

      // Step 3: Found the leaf node for the start key
      steps.push({
        type: "search",
        description: `Found leaf node for start key ${startKey}`,
        treeState: initialState,
        highlightedNodes: [startLeafNodeId],
        highlightedPaths: path,
        searchValue: startKey,
        explanation: [
          `Step ${path.length + 1}: Found the leaf node that should contain the start key ${startKey}.`,
          `This leaf node contains keys: [${startLeafNode.keys?.join(", ") || ""}].`,
          `We will now collect all keys in the range [${startKey}, ${endKey}] by traversing the leaf nodes.`,
        ],
      })

      // Step 4: Perform the range search
      const rangeResult = workingTree.rangeSearch(startKey, endKey)

      // Collect all leaf nodes that contain keys in the range
      const leafNodesInRange: string[] = []
      let currentLeaf = startLeafNode
      let currentLeafId = startLeafNodeId

      // Find the leaf node IDs by traversing from the start leaf
      while (currentLeaf) {
        let hasKeysInRange = false

        // Check if this leaf has any keys in the range
        for (const key of currentLeaf.keys) {
          if (key >= startKey && key <= endKey) {
            hasKeysInRange = true
            break
          }
        }

        if (hasKeysInRange) {
          leafNodesInRange.push(currentLeafId)
        }

        // If the largest key in this leaf is greater than the end key, we're done
        if (currentLeaf.keys.length > 0 && currentLeaf.keys[currentLeaf.keys.length - 1] > endKey) {
          break
        }

        // Move to the next leaf node
        if (!currentLeaf.next) {
          break
        }

        // Find the ID of the next leaf node
        // This is a simplification - in a real implementation, we would need to track the IDs properly
        currentLeaf = currentLeaf.next

        // Try to find the ID of the next leaf node in the node map
        let found = false
        for (const [id, node] of Array.from(nodeMap.entries())) {
          if (node === currentLeaf) {
            currentLeafId = id
            found = true
            break
          }
        }

        if (!found) {
          // If we can't find the ID, generate a placeholder
          currentLeafId = `leaf-${leafNodesInRange.length}`
        }
      }

      steps.push({
        type: "range-search",
        description: `Range search result for [${startKey}, ${endKey}]`,
        treeState: initialState,
        highlightedNodes: leafNodesInRange,
        rangeStart: startKey,
        rangeEnd: endKey,
        rangeResult: rangeResult,
        explanation: [
          `Step ${path.length + 2}: Performing range search for values between ${startKey} and ${endKey}.`,
          `Starting from the leaf node containing the smallest key >= ${startKey}.`,
          `Traversing leaf nodes using the next pointers to collect all keys in the range.`,
          `Found ${rangeResult.length} keys in the range: [${rangeResult.join(", ")}].`,
          `This demonstrates the efficiency of B+ trees for range queries, as all data is stored in leaf nodes.`,
          `The leaf nodes are linked, allowing for efficient sequential access without traversing the tree again.`,
        ],
      })

      return steps
    } catch (error) {
      console.error("Error generating range search steps:", error)
      // Return a single step with the error message
      return [
        {
          type: "initial",
          description: "Error occurred",
          treeState: tree ? tree.export() : { nodeCount: 0, leafCount: 0, height: 0, dataCount: 0 },
          explanation: [
            `An error occurred while generating visualization steps: ${error instanceof Error ? error.message : String(error)}`,
          ],
        },
      ]
    }
  }

  // Add this new function before handleSingleValueOperation
  // Handle bulk value insertion
  const handleBulkInsertion = () => {
    if (!tree) {
      toast({
        title: "Error",
        description: "Tree is not initialized",
        variant: "destructive",
      })
      return
    }

    try {
      // Clone the current tree
      const currentTree = tree.clone()
      if (!currentTree) {
        throw new Error("Failed to clone tree")
      }

      let valuesToInsert: number[] = []

      if (bulkInsertMode === "list") {
        // Check if the input is empty
        if (!bulkValues || bulkValues.trim() === "") {
          toast({
            title: "Empty Input",
            description: "Please enter comma-separated values to insert",
            variant: "destructive",
          })
          return
        }

        // Parse comma-separated values
        const parsedValues = bulkValues
          .split(",")
          .map((val) => val.trim())
          .filter((val) => val !== "")
          .map((val) => {
            const num = Number.parseInt(val, 10)
            if (isNaN(num)) {
              throw new Error(`Invalid value: ${val}`)
            }
            return num
          })

        if (parsedValues.length === 0) {
          toast({
            title: "Invalid Input",
            description: "No valid values found. Please enter comma-separated numbers.",
            variant: "destructive",
          })
          return
        }

        valuesToInsert = parsedValues
      } else {
        // Range mode
        const start = rangeInsertStart
        const end = rangeInsertEnd
        const step = rangeInsertStep

        if (isNaN(start) || isNaN(end) || isNaN(step)) {
          toast({
            title: "Invalid Range Parameters",
            description: "Start, end, and step must be valid numbers",
            variant: "destructive",
          })
          return
        }

        if (step <= 0) {
          toast({
            title: "Invalid Step Value",
            description: "Step must be greater than 0",
            variant: "destructive",
          })
          return
        }

        // Generate range of values
        if (start > end) {
          // Count down
          for (let i = start; i >= end; i -= step) {
            valuesToInsert.push(i)
          }
        } else {
          // Count up
          for (let i = start; i <= end; i += step) {
            valuesToInsert.push(i)
          }
        }

        if (valuesToInsert.length === 0) {
          toast({
            title: "Invalid Range",
            description: "The specified range did not generate any values",
            variant: "destructive",
          })
          return
        }
      }

      // Generate visualization steps for each insertion
      const newSteps: VisualizationStep[] = []
      for (const value of valuesToInsert) {
        const steps = generateInsertVisualizationSteps(currentTree, value)
        newSteps.push(...steps)
        currentTree.insert(value)
      }

      // Update the visualization steps
      setVisualizationSteps(newSteps)
      setCurrentStepIndex(0)

      // Auto-play if enabled
      if (autoPlay) {
        setIsPlaying(true)
      }

      toast({
        title: "Bulk Insertion Complete",
        description: `${valuesToInsert.length} values have been inserted into the tree.`,
      })
    } catch (error) {
      console.error("Error handling bulk insertion:", error)
      toast({
        title: "Bulk Insertion Failed",
        description: `${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive",
      })
    }
  }

  const handleSingleValueOperation = () => {
    if (!tree) {
      toast({
        title: "Error",
        description: "Tree is not initialized",
        variant: "destructive",
      })
      return
    }

    const value = Number.parseInt(singleValueInput, 10)
    if (isNaN(value)) {
      toast({
        title: "Invalid Input",
        description: "Please enter a valid number",
        variant: "destructive",
      })
      return
    }

    try {
      // Clone the current tree
      const currentTree = tree.clone()
      if (!currentTree) {
        throw new Error("Failed to clone tree")
      }

      // Generate visualization steps based on the operation mode
      let newSteps: VisualizationStep[] = []

      if (operationMode === "insert") {
        newSteps = generateInsertVisualizationSteps(currentTree, value)
        toast({
          title: "Insertion Complete",
          description: `Value ${value} has been inserted into the tree.`,
        })
      } else if (operationMode === "delete") {
        newSteps = generateDeleteVisualizationSteps(currentTree, value)
        toast({
          title: "Deletion Complete",
          description: `Value ${value} has been deleted from the tree.`,
        })
      }

      // Update the visualization steps
      setVisualizationSteps(newSteps)
      setCurrentStepIndex(0)

      // Auto-play if enabled
      if (autoPlay) {
        setIsPlaying(true)
      }
    } catch (error) {
      console.error("Error handling single value operation:", error)
      toast({
        title: "Operation Error",
        description: "Failed to perform the operation. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Handle range search operation
  const handleRangeSearchOperation = () => {
    if (!tree) {
      toast({
        title: "Error",
        description: "Tree is not initialized",
        variant: "destructive",
      })
      return
    }

    const startKey = Number.parseInt(rangeStart, 10)
    const endKey = Number.parseInt(rangeEnd, 10)

    if (isNaN(startKey) || isNaN(endKey)) {
      toast({
        title: "Invalid Input",
        description: "Please enter valid numbers for the range",
        variant: "destructive",
      })
      return
    }

    try {
      // Clone the current tree
      const currentTree = tree.clone()
      if (!currentTree) {
        throw new Error("Failed to clone tree")
      }

      // Generate visualization steps for range search
      const newSteps = generateRangeSearchVisualizationSteps(currentTree, startKey, endKey)

      // Update the visualization steps
      setVisualizationSteps(newSteps)
      setCurrentStepIndex(0)

      // Auto-play if enabled
      if (autoPlay) {
        setIsPlaying(true)
      }

      toast({
        title: "Range Search Started",
        description: `Searching for values between ${startKey} and ${endKey}.`,
      })
    } catch (error) {
      console.error("Error handling range search operation:", error)
      toast({
        title: "Operation Error",
        description: "Failed to perform the range search. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Handle order change
  const handleOrderChange = () => {
    const newOrder = Number.parseInt(orderInput, 10)
    if (isNaN(newOrder) || newOrder < 3) {
      toast({
        title: "Invalid Order",
        description: "Please enter a valid order (minimum 3)",
        variant: "destructive",
      })
      return
    }

    setOrder(newOrder)
    setOrderInput(newOrder.toString())
    toast({
      title: "Order Changed",
      description: `Tree order has been set to ${newOrder}.`,
    })
  }

  // Handle random insertion
  const handleRandomInsertion = () => {
    if (!tree) {
      toast({
        title: "Error",
        description: "Tree is not initialized",
        variant: "destructive",
      })
      return
    }

    const min = Number.parseInt(randomMin.toString(), 10)
    const max = Number.parseInt(randomMax.toString(), 10)
    const count = Number.parseInt(randomCount.toString(), 10)

    if (isNaN(min) || isNaN(max) || isNaN(count) || count < 1) {
      toast({
        title: "Invalid Input",
        description: "Please enter valid numbers for random insertion",
        variant: "destructive",
      })
      return
    }

    try {
      // Clone the current tree
      const currentTree = tree.clone()
      if (!currentTree) {
        throw new Error("Failed to clone tree")
      }

      // Generate random values within the specified range
      const randomValues = Array.from({ length: count }, () => Math.floor(Math.random() * (max - min + 1)) + min)

      // Generate visualization steps for each insertion
      const newSteps: VisualizationStep[] = []
      for (const value of randomValues) {
        const steps = generateInsertVisualizationSteps(currentTree, value)
        newSteps.push(...steps)
        currentTree.insert(value)
      }

      // Update the visualization steps
      setVisualizationSteps(newSteps)
      setCurrentStepIndex(0)

      // Auto-play if enabled
      if (autoPlay) {
        setIsPlaying(true)
      }

      toast({
        title: "Random Insertion Complete",
        description: `${count} random values between ${min} and ${max} have been inserted.`,
      })
    } catch (error) {
      console.error("Error handling random insertion:", error)
      toast({
        title: "Operation Error",
        description: "Failed to perform random insertion. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Handle example insertion
  const handleExampleInsertion = () => {
    if (!tree) {
      toast({
        title: "Error",
        description: "Tree is not initialized",
        variant: "destructive",
      })
      return
    }

    try {
      // Clone the current tree
      const currentTree = tree.clone()
      if (!currentTree) {
        throw new Error("Failed to clone tree")
      }

      // Generate visualization steps for each example value
      const newSteps: VisualizationStep[] = []
      for (const value of exampleValues) {
        const steps = generateInsertVisualizationSteps(currentTree, value)
        newSteps.push(...steps)
        currentTree.insert(value)
      }

      // Update the visualization steps
      setVisualizationSteps(newSteps)
      setCurrentStepIndex(0)

      // Auto-play if enabled
      if (autoPlay) {
        setIsPlaying(true)
      }

      toast({
        title: "Example Data Loaded",
        description: `${exampleValues.length} example values have been inserted.`,
      })
    } catch (error) {
      console.error("Error handling example insertion:", error)
      toast({
        title: "Operation Error",
        description: "Failed to perform example insertion. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Handle play button click
  const handlePlayClick = () => {
    setIsPlaying(!isPlaying)
  }

  // Handle previous step button click
  const handlePreviousStepClick = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1)
    }
  }

  // Handle next step button click
  const handleNextStepClick = () => {
    if (currentStepIndex < visualizationSteps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1)
    }
  }

  // Handle reset button click
  const handleResetClick = () => {
    initializeTree()
    toast({
      title: "Tree Reset",
      description: "The tree has been reset to its initial state.",
    })
  }

  // Handle range search
  const handleRangeSearch = () => {
    if (!tree) {
      toast({
        title: "Error",
        description: "Tree is not initialized",
        variant: "destructive",
      })
      return
    }

    try {
      const start = Number.parseInt(rangeStart, 10)
      const end = Number.parseInt(rangeEnd, 10)

      if (isNaN(start) || isNaN(end)) {
        toast({
          title: "Invalid Input",
          description: "Please enter valid numbers for the range",
          variant: "destructive",
        })
        return
      }

      if (start > end) {
        toast({
          title: "Invalid Range",
          description: "Start value must be less than or equal to end value",
          variant: "destructive",
        })
        return
      }

      // Clone the current tree
      const currentTree = tree.clone()
      if (!currentTree) {
        throw new Error("Failed to clone tree")
      }

      // Get the current tree state from the last visualization step
      if (visualizationSteps.length > 0) {
        currentTree.import(visualizationSteps[visualizationSteps.length - 1].treeState)
      }

      // Generate range search visualization steps
      const newSteps = generateRangeSearchVisualizationSteps(currentTree, start, end)

      setVisualizationSteps([...visualizationSteps, ...newSteps])
      setCurrentStepIndex(visualizationSteps.length) // Start at the first step of the new operation

      toast({
        title: "Range Search Completed",
        description: `Found ${newSteps[newSteps.length - 1].rangeResult?.length || 0} keys in the range [${start}, ${end}]`,
      })
    } catch (error) {
      console.error("Error in range search:", error)
      toast({
        title: "Range Search Failed",
        description: `An error occurred during the range search: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive",
      })
    }
  }

  // Export tree data
  const handleExportTree = () => {
    if (!tree) {
      toast({
        title: "Error",
        description: "Tree is not initialized",
        variant: "destructive",
      })
      return
    }

    try {
      const treeData = tree.export()
      const jsonData = JSON.stringify(treeData, null, 2)
      setExportedTreeData(jsonData)

      // Create a download link
      const blob = new Blob([jsonData], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `bplus-tree-order-${order}-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast({
        title: "Export Successful",
        description: "Tree data has been exported as JSON.",
      })
    } catch (error) {
      console.error("Error exporting tree:", error)
      toast({
        title: "Export Failed",
        description: "Failed to export tree data.",
        variant: "destructive",
      })
    }
  }

  // Import tree data
  const handleImportTree = () => {
    if (!tree) {
      toast({
        title: "Error",
        description: "Tree is not initialized",
        variant: "destructive",
      })
      return
    }

    try {
      const treeData = JSON.parse(importTreeData)

      // Validate the imported data
      if (!treeData || typeof treeData !== "object" || !treeData.order) {
        throw new Error("Invalid tree data format")
      }

      // Set the order to match the imported tree
      setOrder(treeData.order)
      setOrderInput(treeData.order.toString())

      // Import the tree data
      tree.import(treeData)

      // Create initial visualization step
      const initialStep: VisualizationStep = {
        type: "initial",
        description: "Imported tree",
        treeState: tree.export(),
        explanation: [
          `Successfully imported B+ tree with order ${treeData.order}.`,
          `The tree has ${treeData.nodeCount} nodes, ${treeData.leafCount} leaf nodes, and ${treeData.dataCount} keys.`,
          `The tree height is ${treeData.height}.`,
        ],
      }

      setVisualizationSteps([initialStep])
      setCurrentStepIndex(0)
      setTreeValidationStatus(true)

      toast({
        title: "Import Successful",
        description: "Tree data has been imported successfully.",
      })
    } catch (error) {
      console.error("Error importing tree:", error)
      toast({
        title: "Import Failed",
        description: `Failed to import tree data: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive",
      })
    }
  }

  // Reset zoom level
  const handleResetZoom = () => {
    setZoomLevel(1)
  }

  // Increase zoom level
  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 0.1, 2))
  }

  // Decrease zoom level
  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 0.1, 0.5))
  }

  return (
    <div className="flex flex-col w-full max-w-6xl mx-auto">
      {/* Header with Stats */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold">B+ Tree Visualization</h1>
          <p className="text-muted-foreground">An interactive visualization of B+ tree operations</p>
        </div>

        <div className="flex flex-wrap gap-2 mt-2 md:mt-0">
          <Badge variant="outline" className="flex items-center gap-1">
            <Database className="h-3 w-3" />
            Order: {order}
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <Layers className="h-3 w-3" />
            Nodes: {stats.nodeCount}
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <Database className="h-3 w-3" />
            Leaves: {stats.leafCount}
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <ArrowRight className="h-3 w-3" />
            Height: {stats.height}
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <Database className="h-3 w-3" />
            Keys: {stats.dataCount}
          </Badge>
        </div>
      </div>

      {/* Tree Visualization Canvas */}
      <Card className="mb-6">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <div>
            <CardTitle>Visualization</CardTitle>
            <CardDescription>{visualizationSteps[currentStepIndex]?.description || "Initial state"}</CardDescription>
          </div>

          <div className="flex items-center space-x-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={handleZoomOut}>
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Zoom Out</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Badge variant="outline">{Math.round(zoomLevel * 100)}%</Badge>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={handleZoomIn}>
                    <RotateCw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Zoom In</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={handleResetZoom}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Reset Zoom</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={showColorLegend ? "secondary" : "outline"}
                    size="icon"
                    onClick={() => setShowColorLegend(!showColorLegend)}
                  >
                    <Info className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Toggle Color Legend</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Dialog open={showHelp} onOpenChange={setShowHelp}>
              <DialogTrigger asChild>
                <Button variant="outline" size="icon">
                  <HelpCircle className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>B+ Tree Visualization Help</DialogTitle>
                  <DialogDescription>Learn about B+ trees and how to use this visualization tool</DialogDescription>
                </DialogHeader>

                <Accordion type="single" collapsible className="w-full">
                  {helpContent.map((item, index) => (
                    <AccordionItem key={index} value={`item-${index}`}>
                      <AccordionTrigger>{item.title}</AccordionTrigger>
                      <AccordionContent>{item.content}</AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </DialogContent>
            </Dialog>

            <Dialog open={showSettings} onOpenChange={setShowSettings}>
              <DialogTrigger asChild>
                <Button variant="outline" size="icon">
                  <Settings className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Visualization Settings</DialogTitle>
                  <DialogDescription>Customize the visualization experience</DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                  <div className="flex items-center justify-between">
                    <label htmlFor="showLeafLinks" className="text-sm font-medium">
                      Show Leaf Links
                    </label>
                    <Checkbox
                      id="showLeafLinks"
                      checked={showLeafLinks}
                      onCheckedChange={(checked) => setShowLeafLinks(checked === true)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <label htmlFor="showNodeValues" className="text-sm font-medium">
                      Show Node Values
                    </label>
                    <Checkbox
                      id="showNodeValues"
                      checked={showNodeValues}
                      onCheckedChange={(checked) => setShowNodeValues(checked === true)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <label htmlFor="animationEnabled" className="text-sm font-medium">
                      Enable Animations
                    </label>
                    <Checkbox
                      id="animationEnabled"
                      checked={animationEnabled}
                      onCheckedChange={(checked) => setAnimationEnabled(checked === true)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <label htmlFor="autoPlay" className="text-sm font-medium">
                      Auto-Play Operations
                    </label>
                    <Checkbox
                      id="autoPlay"
                      checked={autoPlay}
                      onCheckedChange={(checked) => setAutoPlay(checked === true)}
                    />
                  </div>

                  <div className="flex flex-col space-y-2">
                    <label htmlFor="playSpeed" className="text-sm font-medium">
                      Animation Speed: {playSpeed}ms
                    </label>
                    <Slider
                      id="playSpeed"
                      min={100}
                      max={3000}
                      step={100}
                      value={[playSpeed]}
                      onValueChange={(value) => setPlaySpeed(value[0])}
                    />
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative border rounded-md overflow-hidden bg-gray-50 dark:bg-gray-900">
            <canvas ref={canvasRef} className="w-full h-[400px]"></canvas>

            {treeValidationStatus === false && (
              <Alert variant="destructive" className="absolute bottom-2 right-2 w-auto max-w-md opacity-90">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Warning</AlertTitle>
                <AlertDescription>Tree structure may be invalid. Consider resetting the tree.</AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          {/* Playback Controls */}
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handlePreviousStepClick}
                      disabled={currentStepIndex <= 0}
                    >
                      <SkipBack className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Previous Step</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={isPlaying ? "secondary" : "default"}
                      size="icon"
                      onClick={handlePlayClick}
                      disabled={currentStepIndex >= visualizationSteps.length - 1}
                    >
                      {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{isPlaying ? "Pause" : "Play"}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleNextStepClick}
                      disabled={currentStepIndex >= visualizationSteps.length - 1}
                    >
                      <SkipForward className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Next Step</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <div className="flex items-center ml-4 space-x-2">
                <span className="text-sm text-muted-foreground">Speed:</span>
                <Slider
                  className="w-32"
                  min={100}
                  max={3000}
                  step={100}
                  value={[playSpeed]}
                  onValueChange={(value) => setPlaySpeed(value[0])}
                />
                <span className="text-sm text-muted-foreground">{playSpeed}ms</span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowLeafLinks(!showLeafLinks)}
                      className="flex items-center gap-1"
                    >
                      {showLeafLinks ? <Unlink className="h-4 w-4" /> : <Link className="h-4 w-4" />}
                      {showLeafLinks ? "Hide Links" : "Show Links"}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{showLeafLinks ? "Hide leaf node links" : "Show leaf node links"}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={handleResetClick}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Reset Tree
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Reset the tree to its initial state</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          {/* Step Progress */}
          <div className="w-full">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>
                Step {currentStepIndex + 1} of {visualizationSteps.length}
              </span>
              <span>{visualizationSteps[currentStepIndex]?.description || "Initial state"}</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
        </CardFooter>
      </Card>

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Tree Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Tree Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Input
                type="number"
                value={orderInput}
                onChange={(e) => setOrderInput(e.target.value)}
                placeholder="Order (min 3)"
                className="w-32"
                min={3}
              />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button onClick={handleOrderChange}>Set Order</Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Change the order of the B+ tree</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <div className="flex flex-col space-y-2">
              <div className="text-sm font-medium">Example Data</div>
              <Button variant="outline" onClick={handleExampleInsertion} className="w-full">
                <Zap className="h-4 w-4 mr-2" />
                Load Example Values
              </Button>
              <div className="text-xs text-muted-foreground">Example values: {exampleValues.join(", ")}</div>
            </div>

            <div className="border-t pt-4">
              <div className="text-sm font-medium mb-2">Import/Export</div>
              <div className="flex space-x-2">
                <Button variant="outline" onClick={handleExportTree} className="flex-1">
                  <Save className="h-4 w-4 mr-2" />
                  Export
                </Button>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="flex-1">
                      <FileUp className="h-4 w-4 mr-2" />
                      Import
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Import Tree Data</DialogTitle>
                      <DialogDescription>Paste the JSON data of a previously exported B+ tree</DialogDescription>
                    </DialogHeader>
                    <Textarea
                      value={importTreeData}
                      onChange={(e) => setImportTreeData(e.target.value)}
                      placeholder="Paste JSON data here..."
                      className="min-h-[200px]"
                    />
                    <Button onClick={handleImportTree} className="w-full">
                      <Download className="h-4 w-4 mr-2" />
                      Import Tree
                    </Button>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Operations */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Operations</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="insert" className="w-full">
              <TabsList className="grid grid-cols-3 mb-4">
                <TabsTrigger value="insert">Insert</TabsTrigger>
                <TabsTrigger value="delete">Delete</TabsTrigger>
                <TabsTrigger value="search">Range Search</TabsTrigger>
              </TabsList>

              <TabsContent value="insert" className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Input
                    type="number"
                    value={singleValueInput}
                    onChange={(e) => setSingleValueInput(e.target.value)}
                    placeholder="Value to insert"
                    className="flex-1"
                  />
                  <Button
                    onClick={() => {
                      setOperationMode("insert")
                      handleSingleValueOperation()
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Insert
                  </Button>
                </div>

                <div className="border-t pt-4">
                  <div className="text-sm font-medium mb-2">Bulk Insertion</div>
                  <Tabs defaultValue="list" onValueChange={(value) => setBulkInsertMode(value as "list" | "range")}>
                    <TabsList className="grid grid-cols-2 mb-2">
                      <TabsTrigger value="list">Custom List</TabsTrigger>
                      <TabsTrigger value="range">Range</TabsTrigger>
                    </TabsList>

                    <TabsContent value="list" className="space-y-2">
                      <Input
                        value={bulkValues}
                        onChange={(e) => setBulkValues(e.target.value)}
                        placeholder="Enter comma-separated values (e.g., 5,10,15,20)"
                      />
                      <div className="text-xs text-muted-foreground">
                        Enter multiple values separated by commas (e.g., 5,10,15,20)
                      </div>
                    </TabsContent>

                    <TabsContent value="range" className="space-y-2">
                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <label className="text-xs">Start</label>
                          <Input
                            type="number"
                            value={rangeInsertStart}
                            onChange={(e) => setRangeInsertStart(Number(e.target.value))}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs">End</label>
                          <Input
                            type="number"
                            value={rangeInsertEnd}
                            onChange={(e) => setRangeInsertEnd(Number(e.target.value))}
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs">Step</label>
                          <Input
                            type="number"
                            value={rangeInsertStep}
                            onChange={(e) => setRangeInsertStep(Number(e.target.value))}
                            min="1"
                          />
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Generate a sequence from Start to End with Step increment (e.g., 1 to 10 with step 1 creates
                        1,2,3,...,10)
                      </div>
                    </TabsContent>
                  </Tabs>

                  <Button variant="outline" onClick={handleBulkInsertion} className="w-full mt-2">
                    <Database className="h-4 w-4 mr-2" />
                    Insert Bulk Values
                  </Button>
                </div>

                <div className="border-t pt-4">
                  <div className="text-sm font-medium mb-2">Random Insertion</div>
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    <Input
                      type="number"
                      value={randomCount}
                      onChange={(e) => setRandomCount(Number(e.target.value))}
                      placeholder="Count"
                    />
                    <Input
                      type="number"
                      value={randomMin}
                      onChange={(e) => setRandomMin(Number(e.target.value))}
                      placeholder="Min"
                    />
                    <Input
                      type="number"
                      value={randomMax}
                      onChange={(e) => setRandomMax(Number(e.target.value))}
                      placeholder="Max"
                    />
                  </div>
                  <Button variant="outline" onClick={handleRandomInsertion} className="w-full">
                    <Shuffle className="h-4 w-4 mr-2" />
                    Insert Random Values
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="delete" className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Input
                    type="number"
                    value={singleValueInput}
                    onChange={(e) => setSingleValueInput(e.target.value)}
                    placeholder="Value to delete"
                    className="flex-1"
                  />
                  <Button
                    onClick={() => {
                      setOperationMode("delete")
                      handleSingleValueOperation()
                    }}
                    variant="destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="search" className="space-y-4">
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <Input
                    type="number"
                    value={rangeStart}
                    onChange={(e) => setRangeStart(e.target.value)}
                    placeholder="Start value"
                  />
                  <Input
                    type="number"
                    value={rangeEnd}
                    onChange={(e) => setRangeEnd(e.target.value)}
                    placeholder="End value"
                  />
                </div>
                <Button onClick={handleRangeSearchOperation} className="w-full" variant="secondary">
                  <Search className="h-4 w-4 mr-2" />
                  Search Range
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Explanation */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle>Explanation</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setShowExplanation(!showExplanation)} className="h-8 px-2">
            {showExplanation ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </CardHeader>
        {showExplanation && (
          <CardContent>
            <div className="bg-muted p-4 rounded-md max-h-60 overflow-y-auto">
              {detailedExplanation.map((step, index) => (
                <p key={index} className={`text-sm ${step.startsWith("Step") ? "font-medium mt-2" : "ml-4"}`}>
                  {step}
                </p>
              ))}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  )
}
