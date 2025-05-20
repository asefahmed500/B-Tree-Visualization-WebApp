import BPlusTreeVisualizer from "@/components/b-plus-tree-visualizer"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-6">B+ Tree Visualization</h1>
      <p className="text-muted-foreground mb-8 max-w-2xl text-center">
        Visualize how a B+ tree is constructed step by step. Set the order and watch how the tree changes as values are
        inserted or deleted.
      </p>
      <BPlusTreeVisualizer />
    </main>
  )
}
