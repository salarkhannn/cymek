import { TwilightStripe } from "../ui/TwilightStripe";

function Footer() {
  return (
    <footer>
      <TwilightStripe />
      <div className="bg-footer-cream py-section">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <span className="text-h5 font-display text-primary">Cymek</span>
            <p className="text-body-sm text-steel max-w-md">
              Your docs, your data, your edge. Build custom RAG pipelines on your documents.
            </p>
            <p className="text-caption text-muted">
              &copy; {new Date().getFullYear()} Cymek. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

export { Footer };
