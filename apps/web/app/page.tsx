import { Button, Card, Badge, TwilightStripe, HeroBand } from "../components/ui";

export default function Home() {
  return (
    <>
      <HeroBand>
        <div className="text-center">
          <Badge variant="cream" className="mb-6">Twilight Design System</Badge>
          <h1 className="text-hero-display font-display text-on-primary mb-4">
            Your docs, your data, your edge.
          </h1>
          <p className="text-subtitle text-on-dark-muted max-w-xl mx-auto mb-8">
            Build custom RAG pipelines on your docs. Deploy in minutes.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Button variant="cream">Get Started</Button>
            <Button variant="secondary" className="text-on-primary border-on-dark-muted/30 hover:bg-white/10">Documentation</Button>
          </div>
        </div>
      </HeroBand>

      <section className="mx-auto max-w-7xl px-6 py-section">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card variant="feature">
            <h3 className="text-h4 text-ink mb-2">Connect</h3>
            <p className="text-body-md text-steel">Connect your data sources with one API key.</p>
          </Card>
          <Card variant="feature">
            <h3 className="text-h4 text-ink mb-2">Process</h3>
            <p className="text-body-md text-steel">Extract, chunk, and index your documents automatically.</p>
          </Card>
          <Card variant="feature">
            <h3 className="text-h4 text-ink mb-2">Deploy</h3>
            <p className="text-body-md text-steel">Deploy a chat interface on your docs in minutes.</p>
          </Card>
        </div>
      </section>

      <TwilightStripe />
    </>
  );
}
