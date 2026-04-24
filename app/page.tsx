import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-4xl font-bold mb-4">ForesightTCG 🃏</h1>
      <p className="text-muted-foreground mb-6">Your Pokémon TCG match tracker</p>
      <Button>Get Started</Button>
    </main>
  );
}