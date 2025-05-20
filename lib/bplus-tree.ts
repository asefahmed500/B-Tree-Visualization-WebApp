// B+ Tree implementation

interface TreeNode {
  isLeaf: boolean
  keys: number[]
  children?: TreeNode[]
  next?: TreeNode
  values?: number[][]
}

export class BPlusTree {
  private root: TreeNode
  private order: number
  private nodeCount = 0
  private leafCount = 0
  private dataCount = 0
  private height = 1

  constructor(order = 4) {
    this.order = Math.max(3, order) // Minimum order is 3
    this.root = this.createLeafNode()
    this.nodeCount = 1
    this.leafCount = 1
  }

  private createLeafNode(): TreeNode {
    return {
      isLeaf: true,
      keys: [],
      values: [],
    }
  }

  private createInternalNode(): TreeNode {
    return {
      isLeaf: false,
      keys: [],
      children: [],
    }
  }

  // Clone the tree
  public clone(): BPlusTree {
    const newTree = new BPlusTree(this.order)
    const data = this.export()
    newTree.import(data)
    return newTree
  }

  // Insert a key-value pair into the tree
  public insert(key: number): void {
    this.insertRecursive(this.root, key, null)
    this.dataCount++
    this.updateHeight()
  }

  private insertRecursive(node: TreeNode, key: number, parent: TreeNode | null): void {
    if (node.isLeaf) {
      // Insert into leaf node
      const insertIndex = this.findInsertPosition(node.keys, key)

      // Check if key already exists
      if (insertIndex < node.keys.length && node.keys[insertIndex] === key) {
        // Key exists, add value to existing key's value array
        node.values![insertIndex].push(key)
        return
      }

      // Insert new key and value
      node.keys.splice(insertIndex, 0, key)
      node.values!.splice(insertIndex, 0, [key])

      // Split if necessary
      if (node.keys.length >= this.order) {
        this.splitLeafNode(node, parent)
      }
    } else {
      // Find child node to insert into
      const childIndex = this.findChildIndex(node.keys, key)

      // Ensure child exists
      if (!node.children || !node.children[childIndex]) {
        throw new Error(`Child at index ${childIndex} does not exist in node with keys [${node.keys.join(", ")}]`)
      }

      this.insertRecursive(node.children![childIndex], key, node)
    }
  }

  // Split a leaf node that has reached maximum capacity
  private splitLeafNode(node: TreeNode, parent: TreeNode | null): void {
    const midIndex = Math.floor(node.keys.length / 2)

    // Create new leaf node
    const newNode: TreeNode = this.createLeafNode()
    this.leafCount++
    this.nodeCount++

    // Move half of the keys and values to the new node
    newNode.keys = node.keys.splice(midIndex)
    newNode.values = node.values!.splice(midIndex)

    // Update leaf node links
    newNode.next = node.next
    node.next = newNode

    // In B+ trees, we promote the first key of the right node as separator
    const promotedKey = newNode.keys[0]

    if (parent === null) {
      // Create new root
      const newRoot = this.createInternalNode()
      this.nodeCount++

      newRoot.keys = [promotedKey]
      newRoot.children = [node, newNode]

      this.root = newRoot
    } else {
      // Insert into parent
      const insertIndex = this.findInsertPosition(parent.keys, promotedKey)

      parent.keys.splice(insertIndex, 0, promotedKey)
      parent.children!.splice(insertIndex + 1, 0, newNode)

      // Split parent if necessary
      if (parent.keys.length >= this.order) {
        this.splitInternalNode(parent)
      }
    }
  }

  private splitInternalNode(node: TreeNode): void {
    const midIndex = Math.floor(node.keys.length / 2)
    const midKey = node.keys[midIndex]

    // Create new internal node
    const newNode = this.createInternalNode()
    this.nodeCount++

    // Move half of the keys and children to the new node
    newNode.keys = node.keys.splice(midIndex + 1)
    newNode.children = node.children!.splice(midIndex + 1)

    // Remove the middle key (it goes up to the parent)
    node.keys.splice(midIndex, 1)

    if (node === this.root) {
      // Create new root
      const newRoot = this.createInternalNode()
      this.nodeCount++

      newRoot.keys = [midKey]
      newRoot.children = [node, newNode]

      this.root = newRoot
    } else {
      // Find parent
      const parent = this.findParent(this.root, node)

      if (parent) {
        // Insert into parent
        const insertIndex = this.findInsertPosition(parent.keys, midKey)

        parent.keys.splice(insertIndex, 0, midKey)
        parent.children!.splice(insertIndex + 1, 0, newNode)

        // Split parent if necessary
        if (parent.keys.length >= this.order) {
          this.splitInternalNode(parent)
        }
      }
    }
  }

  private findParent(node: TreeNode, target: TreeNode): TreeNode | null {
    if (node.isLeaf || !node.children) {
      return null
    }

    // Check if any child is the target
    for (let i = 0; i < node.children.length; i++) {
      if (node.children[i] === target) {
        return node
      }
    }

    // Recursively search in children
    for (let i = 0; i < node.children.length; i++) {
      const parent = this.findParent(node.children[i], target)
      if (parent) {
        return parent
      }
    }

    return null
  }

  // Remove a key from the tree
  public remove(key: number): boolean {
    if (!this.root) {
      return false
    }

    const result = this.removeRecursive(this.root, key, null, 0)
    if (result) {
      this.dataCount--
      this.updateHeight()

      // Check if root is an internal node with only one child
      if (!this.root.isLeaf && this.root.children && this.root.children.length === 1 && this.root.keys.length === 0) {
        this.root = this.root.children[0]
        this.nodeCount--
      }
    }
    return result
  }

  private removeRecursive(node: TreeNode, key: number, parent: TreeNode | null, index: number): boolean {
    if (node.isLeaf) {
      // Find key in leaf node
      const keyIndex = node.keys.indexOf(key)

      if (keyIndex === -1) {
        return false // Key not found
      }

      // Remove key and value
      node.keys.splice(keyIndex, 1)
      node.values!.splice(keyIndex, 1)

      // Handle underflow
      if (node !== this.root && node.keys.length < Math.ceil(this.order / 2) - 1) {
        this.handleLeafUnderflow(node, parent!, index)
      } else if (node === this.root && node.keys.length === 0) {
        // Root is empty, tree is empty
        this.nodeCount--
        this.leafCount--
      }

      return true
    } else {
      // Find child node to remove from
      const childIndex = this.findChildIndex(node.keys, key)

      // Ensure child exists
      if (!node.children || !node.children[childIndex]) {
        return false // Child doesn't exist, key can't be found
      }

      const result = this.removeRecursive(node.children![childIndex], key, node, childIndex)

      // Update keys if necessary (if we removed from a leaf and it was the first key)
      if (result && childIndex > 0 && node.children![childIndex].isLeaf && node.children![childIndex].keys.length > 0) {
        // In B+ trees, internal nodes store separators
        // Update the separator to be the first key of the right node
        node.keys[childIndex - 1] = node.children![childIndex].keys[0]
      }

      return result
    }
  }

  private handleLeafUnderflow(node: TreeNode, parent: TreeNode, index: number): void {
    const minKeys = Math.ceil(this.order / 2) - 1

    // Try to borrow from left sibling
    if (index > 0) {
      const leftSibling = parent.children![index - 1]

      if (leftSibling.keys.length > minKeys) {
        // Borrow from left sibling
        node.keys.unshift(leftSibling.keys.pop()!)
        node.values!.unshift(leftSibling.values!.pop()!)

        // Update parent key - in B+ trees, parent key should be the first key of the right node
        parent.keys[index - 1] = node.keys[0]

        return
      }
    }

    // Try to borrow from right sibling
    if (index < parent.children!.length - 1) {
      const rightSibling = parent.children![index + 1]

      if (rightSibling.keys.length > minKeys) {
        // Borrow from right sibling
        node.keys.push(rightSibling.keys.shift()!)
        node.values!.push(rightSibling.values!.shift()!)

        // Update parent key - should be the first key of the right sibling
        parent.keys[index] = rightSibling.keys[0]

        return
      }
    }

    // Merge with sibling
    if (index > 0) {
      // Merge with left sibling
      const leftSibling = parent.children![index - 1]

      leftSibling.keys = [...leftSibling.keys, ...node.keys]
      leftSibling.values = [...leftSibling.values!, ...node.values!]

      // Update leaf node links
      leftSibling.next = node.next

      // Remove parent key and child pointer
      parent.keys.splice(index - 1, 1)
      parent.children!.splice(index, 1)

      this.nodeCount--
      this.leafCount--
    } else {
      // Merge with right sibling
      const rightSibling = parent.children![index + 1]

      node.keys = [...node.keys, ...rightSibling.keys]
      node.values = [...node.values!, ...rightSibling.values!]

      // Update leaf node links
      node.next = rightSibling.next

      // Remove parent key and child pointer
      parent.keys.splice(index, 1)
      parent.children!.splice(index + 1, 1)

      this.nodeCount--
      this.leafCount--
    }

    // Handle parent underflow
    if (parent !== this.root && parent.keys.length < Math.ceil(this.order / 2) - 1) {
      const grandParent = this.findParent(this.root, parent)
      if (!grandParent) {
        return // Safety check
      }
      const parentIndex = grandParent.children!.indexOf(parent)
      if (parentIndex === -1) {
        return // Safety check
      }

      this.handleInternalUnderflow(parent, grandParent, parentIndex)
    } else if (parent === this.root && parent.keys.length === 0) {
      // Root is empty, make the only child the new root
      if (parent.children && parent.children.length > 0) {
        this.root = parent.children[0]
        this.nodeCount--
      }
    }
  }

  private handleInternalUnderflow(node: TreeNode, parent: TreeNode, index: number): void {
    const minKeys = Math.ceil(this.order / 2) - 1

    // Try to borrow from left sibling
    if (index > 0) {
      const leftSibling = parent.children![index - 1]

      if (leftSibling.keys.length > minKeys) {
        // Borrow from left sibling
        node.keys.unshift(parent.keys[index - 1])
        parent.keys[index - 1] = leftSibling.keys.pop()!

        // Move child pointer
        if (leftSibling.children && leftSibling.children.length > 0) {
          node.children!.unshift(leftSibling.children.pop()!)
        }

        return
      }
    }

    // Try to borrow from right sibling
    if (index < parent.children!.length - 1) {
      const rightSibling = parent.children![index + 1]

      if (rightSibling.keys.length > minKeys) {
        // Borrow from right sibling
        node.keys.push(parent.keys[index])
        parent.keys[index] = rightSibling.keys.shift()!

        // Move child pointer
        if (rightSibling.children && rightSibling.children.length > 0) {
          node.children!.push(rightSibling.children.shift()!)
        }

        return
      }
    }

    // Merge with sibling
    if (index > 0) {
      // Merge with left sibling
      const leftSibling = parent.children![index - 1]

      leftSibling.keys = [...leftSibling.keys, parent.keys[index - 1], ...node.keys]

      if (node.children) {
        leftSibling.children = [...leftSibling.children!, ...node.children]
      }

      // Remove parent key and child pointer
      parent.keys.splice(index - 1, 1)
      parent.children!.splice(index, 1)

      this.nodeCount--
    } else {
      // Merge with right sibling
      const rightSibling = parent.children![index + 1]

      node.keys = [...node.keys, parent.keys[index], ...rightSibling.keys]

      if (rightSibling.children) {
        node.children = [...node.children!, ...rightSibling.children]
      }

      // Remove parent key and child pointer
      parent.keys.splice(index, 1)
      parent.children!.splice(index + 1, 1)

      this.nodeCount--
    }

    // Handle parent underflow
    if (parent !== this.root && parent.keys.length < Math.ceil(this.order / 2) - 1) {
      const grandParent = this.findParent(this.root, parent)
      if (!grandParent) {
        return // Safety check
      }
      const parentIndex = grandParent.children!.indexOf(parent)
      if (parentIndex === -1) {
        return // Safety check
      }

      this.handleInternalUnderflow(parent, grandParent, parentIndex)
    } else if (parent === this.root && parent.keys.length === 0) {
      // Root is empty, make the only child the new root
      this.root = parent.children![0]
      this.nodeCount--
    }
  }

  // Search for a key in the tree
  public search(key: number): number[] {
    if (!this.root) {
      return []
    }

    // Find the leaf node that should contain the key
    let node = this.root
    while (!node.isLeaf) {
      if (!node.children || node.children.length === 0) {
        return [] // Safety check
      }

      let i = 0
      while (i < node.keys.length && key >= node.keys[i]) {
        i++
      }

      node = node.children[i]
    }

    // Search in the leaf node
    for (let i = 0; i < node.keys.length; i++) {
      if (node.keys[i] === key) {
        return node.values![i]
      }
    }

    return [] // Key not found
  }

  // Range search - find all keys in a given range
  public rangeSearch(startKey: number, endKey: number): number[] {
    if (!this.root) {
      return []
    }

    // Find the leaf node that should contain the start key
    let node = this.root
    while (!node.isLeaf) {
      if (!node.children || node.children.length === 0) {
        return [] // Safety check
      }

      let i = 0
      while (i < node.keys.length && startKey >= node.keys[i]) {
        i++
      }

      node = node.children[i]
    }

    // Collect all keys in the range
    const result: number[] = []

    // Traverse leaf nodes using the next pointers
    while (node) {
      for (let i = 0; i < node.keys.length; i++) {
        if (node.keys[i] >= startKey && node.keys[i] <= endKey) {
          result.push(node.keys[i])
        }

        // If we've passed the end key, we're done
        if (node.keys[i] > endKey) {
          return result
        }
      }

      // Move to the next leaf node
      node = node.next!

      // If there's no next node, we're done
      if (!node) {
        break
      }
    }

    return result
  }

  // Helper methods
  private findChildIndex(keys: number[], key: number): number {
    // Handle empty keys array
    if (keys.length === 0) {
      return 0
    }

    let i = 0
    // Find the first key greater than the target key
    while (i < keys.length && key >= keys[i]) {
      i++
    }

    return i
  }

  private findInsertPosition(keys: number[], key: number): number {
    let left = 0
    let right = keys.length - 1

    while (left <= right) {
      const mid = Math.floor((left + right) / 2)

      if (keys[mid] === key) {
        return mid
      } else if (keys[mid] < key) {
        left = mid + 1
      } else {
        right = mid - 1
      }
    }

    return left
  }

  // Update the height of the tree
  private updateHeight(): void {
    this.height = this.calculateHeight(this.root)
  }

  private calculateHeight(node: TreeNode): number {
    if (node.isLeaf) {
      return 1
    }

    // Ensure children exist
    if (!node.children || node.children.length === 0) {
      return 1 // Safety check
    }

    return 1 + this.calculateHeight(node.children[0])
  }

  // Get tree statistics
  public getNodeCount(): number {
    return this.nodeCount
  }

  public getLeafCount(): number {
    return this.leafCount
  }

  public getDataCount(): number {
    return this.dataCount
  }

  public getHeight(): number {
    return this.height
  }

  // Get the order of the tree
  public getOrder(): number {
    return this.order
  }

  // Get the root node (for visualization)
  public getRoot(): TreeNode {
    return this.root
  }

  // Export tree data
  public export(): any {
    return {
      order: this.order,
      root: this.exportNode(this.root),
      nodeCount: this.nodeCount,
      leafCount: this.leafCount,
      dataCount: this.dataCount,
      height: this.height,
    }
  }

  private exportNode(node: TreeNode): any {
    const result: any = {
      isLeaf: node.isLeaf,
      keys: [...node.keys],
    }

    if (node.isLeaf) {
      result.values = node.values!.map((arr) => [...arr])
    } else {
      result.children = node.children!.map((child) => this.exportNode(child))
    }

    return result
  }

  // Import tree data
  public import(data: any): void {
    this.order = data.order || this.order
    this.nodeCount = data.nodeCount || 1
    this.leafCount = data.leafCount || 1
    this.dataCount = data.dataCount || 0
    this.height = data.height || 1

    if (data.root) {
      this.root = this.importNode(data.root)
      // Rebuild leaf node links
      this.rebuildLeafLinks(this.root)
    }
  }

  private importNode(data: any): TreeNode {
    if (!data) return this.createLeafNode()

    const node: TreeNode = {
      isLeaf: data.isLeaf,
      keys: [...(data.keys || [])],
    }

    if (data.isLeaf) {
      node.values = (data.values || []).map((arr: number[]) => [...arr])
    } else {
      node.children = (data.children || []).map((child: any) => this.importNode(child))
    }

    return node
  }

  private rebuildLeafLinks(node: TreeNode): TreeNode[] {
    if (node.isLeaf) {
      return [node]
    }

    const leaves: TreeNode[] = []

    for (let i = 0; i < (node.children || []).length; i++) {
      const childLeaves = this.rebuildLeafLinks(node.children![i])
      leaves.push(...childLeaves)
    }

    // Link leaves
    for (let i = 0; i < leaves.length - 1; i++) {
      leaves[i].next = leaves[i + 1]
    }

    return leaves
  }

  // Validate the B+ tree structure
  public validate(): boolean {
    if (!this.root) {
      return true
    }

    try {
      // Check if all leaf nodes are at the same level
      const leafDepths = this.getLeafDepths(this.root, 1)
      const uniqueDepths = new Set(leafDepths)

      if (uniqueDepths.size > 1) {
        console.error("Not all leaf nodes are at the same level:", Array.from(uniqueDepths))
        return false
      }

      // Validate the tree structure recursively
      return this.validateNode(this.root, null, null)
    } catch (error) {
      console.error("Error validating tree:", error)
      return false
    }
  }

  private getLeafDepths(node: TreeNode, depth: number): number[] {
    if (node.isLeaf) {
      return [depth]
    }

    const depths: number[] = []

    if (node.children) {
      for (const child of node.children) {
        depths.push(...this.getLeafDepths(child, depth + 1))
      }
    }

    return depths
  }

  private validateNode(node: TreeNode, min: number | null, max: number | null): boolean {
    // Check if keys are in ascending order
    for (let i = 1; i < node.keys.length; i++) {
      if (node.keys[i] <= node.keys[i - 1]) {
        console.error("Keys not in ascending order:", node.keys)
        return false
      }
    }

    // Check if keys are within range
    if (min !== null && node.keys.length > 0 && node.keys[0] < min) {
      console.error("Key below minimum:", node.keys[0], "min:", min)
      return false
    }

    if (max !== null && node.keys.length > 0 && node.keys[node.keys.length - 1] >= max) {
      console.error("Key above or equal to maximum:", node.keys[node.keys.length - 1], "max:", max)
      return false
    }

    // If leaf node, we're done
    if (node.isLeaf) {
      return true
    }

    // Check children count
    if (!node.children || node.children.length !== node.keys.length + 1) {
      console.error("Invalid children count:", node.children?.length, "expected:", node.keys.length + 1)
      return false
    }

    // Validate children recursively
    for (let i = 0; i < node.children.length; i++) {
      const childMin = i === 0 ? min : node.keys[i - 1]
      const childMax = i === node.keys.length ? max : node.keys[i]

      if (!this.validateNode(node.children[i], childMin, childMax)) {
        return false
      }
    }

    return true
  }

  // Print the tree structure (for debugging)
  public printTree(): void {
    console.log("B+ Tree (Order " + this.order + "):")
    this.printNode(this.root, 0)
    console.log("Node count:", this.nodeCount)
    console.log("Leaf count:", this.leafCount)
    console.log("Data count:", this.dataCount)
    console.log("Height:", this.height)
  }

  private printNode(node: TreeNode, level: number): void {
    const indent = "  ".repeat(level)

    if (node.isLeaf) {
      console.log(indent + "Leaf: " + node.keys.join(", "))
    } else {
      console.log(indent + "Internal: " + node.keys.join(", "))

      if (node.children) {
        for (const child of node.children) {
          this.printNode(child, level + 1)
        }
      }
    }
  }
}
