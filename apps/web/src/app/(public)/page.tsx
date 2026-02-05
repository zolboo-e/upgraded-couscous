import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui";

export default function Home(): React.ReactElement {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome to Upgraded Couscous</CardTitle>
          <CardDescription>
            A Turborepo monorepo with Next.js, Hono.js, Tailwind CSS, shadcn/ui, Drizzle ORM, and
            Biome.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Button>Get Started</Button>
          <Button variant="outline">Learn More</Button>
        </CardContent>
      </Card>
    </div>
  );
}
