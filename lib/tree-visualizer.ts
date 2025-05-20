import type { BPlusTree } from "./bplus-tree"

interface NodePosition {
  x: number
  y: number
  width: number
  height: number
  node: any
}

export class TreeVisualizer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private tree: BPlusTree
  private nodePositions: NodePosition[] = []
  private highlightedKey: number | null = null
  private highlightedPath: number[] = []
  private panOffset = { x: 0, y: 0 }
  private isPanning = false
  private lastMousePos = { x: 0, y: 0 }
  private zoom = 1

  constructor(canvas: HTMLCanvasElement, tree: BPlusTree) {
    this.canvas = canvas
    this.ctx = canvas.getContext("2d")!
    this.tree = tree

    // Set canvas size
    this.resizeCanvas()

    // Add event listeners
    window.addEventListener("resize", this.resizeCanvas.bind(this))
    canvas.addEventListener("mousedown", this.handleMouseDown.bind(this))
    canvas.addEventListener("mousemove", this.handleMouseMove.bind(this))
    canvas.addEventListener("mouseup", this.handleMouseUp.bind(this))
    canvas.addEventListener("mouseleave", this.handleMouseUp.bind(this))
    canvas.addEventListener("wheel", this.handleWheel.bind(this))
  }

  private resizeCanvas(): void {
    const rect = this.canvas.getBoundingClientRect()
    this.canvas.width = rect.width
    this.canvas.height = rect.height
    this.draw()
  }

  public draw(): void {
    const root = (this.tree as any).getRoot()

    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    // Calculate tree dimensions
    const treeHeight = this.calculateTreeHeight(root)
    const treeWidth = this.calculateTreeWidth(root)

    // Reset node positions
    this.nodePositions = []

    // Draw tree
    this.ctx.save()

    // Apply zoom and pan
    this.ctx.translate(this.panOffset.x, this.panOffset.y)
    this.ctx.scale(this.zoom, this.zoom)

    const startX = this.canvas.width / (2 * this.zoom) - treeWidth / 2
    const startY = 50
    const levelHeight = 100

    this.drawNode(root, startX, startY, treeWidth, levelHeight, 0)

    // Draw connections between nodes
    this.drawConnections()

    // Draw leaf node links
    this.drawLeafLinks()

    this.ctx.restore()
  }

  private calculateTreeHeight(node: any): number {
    if (!node) return 0
    if (node.isLeaf) return 1

    let maxHeight = 0
    for (const child of node.children) {
      const height = this.calculateTreeHeight(child)
      maxHeight = Math.max(maxHeight, height)
    }

    return maxHeight + 1
  }

  private calculateTreeWidth(node: any): number {
    if (!node) return 0

    const leafCount = this.countLeaves(node)
    return leafCount * 200 // Approximate width based on number of leaves
  }

  private countLeaves(node: any): number {
    if (!node) return 0
    if (node.isLeaf) return 1

    let count = 0
    for (const child of node.children) {
      count += this.countLeaves(child)
    }

    return count
  }

  private drawNode(node: any, x: number, y: number, width: number, levelHeight: number, level: number): void {
    if (!node) return

    const nodeWidth = Math.min(node.keys.length * 50 + 20, 300)
    const nodeHeight = 40
    const nodeX = x + (width - nodeWidth) / 2

    // Store node position
    this.nodePositions.push({
      x: nodeX,
      y,
      width: nodeWidth,
      height: nodeHeight,
      node,
    })

    // Draw node rectangle with shadow
    this.ctx.shadowColor = "rgba(0, 0, 0, 0.2)"
    this.ctx.shadowBlur = 5
    this.ctx.shadowOffsetX = 2
    this.ctx.shadowOffsetY = 2

    // Different colors for internal vs leaf nodes
    this.ctx.fillStyle = node.isLeaf ? "#e2f2ff" : "#fff2e2"
    this.ctx.strokeStyle = "#333"
    this.ctx.lineWidth = 1
    this.ctx.beginPath()
    this.ctx.roundRect(nodeX, y, nodeWidth, nodeHeight, 5)
    this.ctx.fill()
    this.ctx.stroke()

    // Reset shadow
    this.ctx.shadowColor = "transparent"
    this.ctx.shadowBlur = 0
    this.ctx.shadowOffsetX = 0
    this.ctx.shadowOffsetY = 0

    // Draw keys
    this.ctx.fillStyle = "#333"
    this.ctx.font = "14px Arial"
    this.ctx.textAlign = "center"
    this.ctx.textBaseline = "middle"

    const keyWidth = nodeWidth / (node.keys.length + 1)

    for (let i = 0; i < node.keys.length; i++) {
      const keyX = nodeX + keyWidth * (i + 0.5)
      const keyY = y + nodeHeight / 2

      // Highlight key if it's in the search path
      if (this.highlightedKey !== null && node.keys[i] === this.highlightedKey) {
        // Draw highlight circle with animation effect
        this.ctx.fillStyle = "#ff5722"
        this.ctx.beginPath()
        this.ctx.arc(keyX, keyY, 15, 0, Math.PI * 2)
        this.ctx.fill()

        // Add glow effect
        this.ctx.strokeStyle = "#ff8a65"
        this.ctx.lineWidth = 2
        this.ctx.beginPath()
        this.ctx.arc(keyX, keyY, 18, 0, Math.PI * 2)
        this.ctx.stroke()

        this.ctx.fillStyle = "#fff"
      } else if (this.highlightedPath.includes(node.keys[i])) {
        this.ctx.fillStyle = "#4caf50"
        this.ctx.beginPath()
        this.ctx.arc(keyX, keyY, 15, 0, Math.PI * 2)
        this.ctx.fill()
        this.ctx.fillStyle = "#fff"
      }

      this.ctx.fillText(node.keys[i].toString(), keyX, keyY)

      // Draw separator
      if (i < node.keys.length - 1) {
        this.ctx.beginPath()
        this.ctx.moveTo(nodeX + keyWidth * (i + 1), y)
        this.ctx.lineTo(nodeX + keyWidth * (i + 1), y + nodeHeight)
        this.ctx.stroke()
      }

      // Reset fill style
      this.ctx.fillStyle = "#333"
    }

    // Draw children
    if (!node.isLeaf && node.children) {
      const childWidth = width / node.children.length

      for (let i = 0; i < node.children.length; i++) {
        const childX = x + childWidth * i
        const childY = y + levelHeight

        this.drawNode(node.children[i], childX, childY, childWidth, levelHeight, level + 1)
      }
    }
  }

  private drawConnections(): void {
    this.ctx.strokeStyle = "#666"
    this.ctx.lineWidth = 1.5

    for (const nodePos of this.nodePositions) {
      const node = nodePos.node

      if (!node.isLeaf && node.children) {
        const childPositions = this.nodePositions.filter((pos) => node.children.includes(pos.node))

        for (const childPos of childPositions) {
          // Draw curved line from parent to child
          this.ctx.beginPath()
          const startX = nodePos.x + nodePos.width / 2
          const startY = nodePos.y + nodePos.height
          const endX = childPos.x + childPos.width / 2
          const endY = childPos.y

          // Control points for curve
          const controlPointY = startY + (endY - startY) / 2

          this.ctx.moveTo(startX, startY)
          this.ctx.bezierCurveTo(startX, controlPointY, endX, controlPointY, endX, endY)
          this.ctx.stroke()
        }
      }
    }
  }

  private drawLeafLinks(): void {
    this.ctx.strokeStyle = "#4caf50"
    this.ctx.lineWidth = 1
    this.ctx.setLineDash([5, 3])

    const leafNodes = this.nodePositions.filter((pos) => pos.node.isLeaf)
    leafNodes.sort((a, b) => a.x - b.x)

    for (let i = 0; i < leafNodes.length - 1; i++) {
      const current = leafNodes[i]
      const next = leafNodes[i + 1]

      this.ctx.beginPath()
      this.ctx.moveTo(current.x + current.width, current.y + current.height / 2)
      this.ctx.lineTo(next.x, next.y + next.height / 2)
      this.ctx.stroke()
    }

    this.ctx.setLineDash([])
  }

  public highlightSearch(key: number, path: number[]): void {
    this.highlightedKey = key
    this.highlightedPath = path

    // Animate the search path
    let step = 0
    const totalSteps = path.length

    const animateStep = () => {
      if (step > totalSteps) {
        // Animation complete, keep final state for a while
        setTimeout(() => {
          this.highlightedKey = null
          this.highlightedPath = []
          this.draw()
        }, 2000)
        return
      }

      // Update highlighted path to show progression
      this.highlightedPath = path.slice(0, step)
      this.draw()

      step++
      setTimeout(animateStep, 300)
    }

    animateStep()
  }

  private handleMouseDown(e: MouseEvent): void {
    this.isPanning = true
    this.lastMousePos = { x: e.clientX, y: e.clientY }
    this.canvas.style.cursor = "grabbing"
  }

  private handleMouseMove(e: MouseEvent): void {
    if (!this.isPanning) return

    const dx = e.clientX - this.lastMousePos.x
    const dy = e.clientY - this.lastMousePos.y

    this.panOffset.x += dx
    this.panOffset.y += dy

    this.lastMousePos = { x: e.clientX, y: e.clientY }
    this.draw()
  }

  private handleMouseUp(): void {
    this.isPanning = false
    this.canvas.style.cursor = "move"
  }

  private handleWheel(e: WheelEvent): void {
    e.preventDefault()

    const rect = this.canvas.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    // Calculate point under mouse in world space
    const worldX = (mouseX - this.panOffset.x) / this.zoom
    const worldY = (mouseY - this.panOffset.y) / this.zoom

    // Adjust zoom
    const zoomDelta = -e.deltaY * 0.001
    const newZoom = Math.max(0.1, Math.min(2, this.zoom + zoomDelta))

    // Adjust pan offset to keep point under mouse
    if (this.zoom !== newZoom) {
      this.panOffset.x = mouseX - worldX * newZoom
      this.panOffset.y = mouseY - worldY * newZoom
      this.zoom = newZoom
      this.draw()
    }
  }

  public setZoom(zoom: number): void {
    this.zoom = zoom
  }

  public cleanup(): void {
    window.removeEventListener("resize", this.resizeCanvas.bind(this))
    this.canvas.removeEventListener("mousedown", this.handleMouseDown.bind(this))
    this.canvas.removeEventListener("mousemove", this.handleMouseMove.bind(this))
    this.canvas.removeEventListener("mouseup", this.handleMouseUp.bind(this))
    this.canvas.removeEventListener("mouseleave", this.handleMouseUp.bind(this))
    this.canvas.removeEventListener("wheel", this.handleWheel.bind(this))
  }
}
