import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'API Documentation - MagnetLab',
};

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="bg-zinc-900 text-zinc-100 rounded-lg p-4 overflow-x-auto text-sm leading-relaxed">
      <code>{children}</code>
    </pre>
  );
}

function Endpoint({ method, path, description }: { method: string; path: string; description: string }) {
  const methodColors: Record<string, string> = {
    GET: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    POST: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    DELETE: 'bg-red-500/10 text-red-400 border-red-500/20',
  };
  return (
    <div className="flex items-start gap-3 mb-2">
      <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold border ${methodColors[method] || ''}`}>
        {method}
      </span>
      <div>
        <code className="text-sm font-mono text-zinc-200">{path}</code>
        <p className="text-sm text-zinc-400 mt-0.5">{description}</p>
      </div>
    </div>
  );
}

export default function DocsPage() {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-2">API Documentation</h1>
      <p className="text-zinc-400 mb-8">
        Programmatic access to MagnetLab for bulk operations and automation.
      </p>

      {/* Authentication */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4 border-b border-zinc-800 pb-2">Authentication</h2>
        <p className="text-zinc-300 mb-4">
          All API endpoints require authentication via an API key. Generate a key from{' '}
          <strong>Settings &gt; API Keys</strong>, then include it as a Bearer token:
        </p>
        <CodeBlock>{`curl -H "Authorization: Bearer ml_live_your_key_here" \\
  https://your-app.com/api/funnel/bulk`}</CodeBlock>
        <p className="text-zinc-400 text-sm mt-3">
          API keys provide the same access as your logged-in session. Keep them secret.
          Revoke compromised keys immediately from Settings.
        </p>
      </section>

      {/* API Keys */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4 border-b border-zinc-800 pb-2">API Key Management</h2>

        <Endpoint method="POST" path="/api/keys" description="Create a new API key. The raw key is returned once — save it." />
        <CodeBlock>{`curl -X POST https://your-app.com/api/keys \\
  -H "Authorization: Bearer ml_live_existing_key" \\
  -H "Content-Type: application/json" \\
  -d '{"name": "Import Script"}'

# Response:
{
  "id": "uuid",
  "key": "ml_live_abc123...",
  "name": "Import Script",
  "prefix": "...c123",
  "createdAt": "2025-02-01T00:00:00Z"
}`}</CodeBlock>

        <div className="mt-6">
          <Endpoint method="GET" path="/api/keys" description="List all API keys (prefix and metadata only, never the full key)." />
        </div>

        <div className="mt-6">
          <Endpoint method="DELETE" path="/api/keys/:id" description="Revoke an API key. Takes effect immediately." />
        </div>
      </section>

      {/* Bulk Create */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4 border-b border-zinc-800 pb-2">Bulk Page Creation</h2>

        <Endpoint method="POST" path="/api/funnel/bulk" description="Create multiple landing pages in one request (max 100)." />

        <h3 className="text-lg font-medium mt-6 mb-3">Request Body</h3>
        <CodeBlock>{`{
  "pages": [
    {
      "title": "LinkedIn Growth Playbook",
      "slug": "linkedin-growth-playbook",
      "optinHeadline": "Get the Playbook",
      "optinSubline": "10 steps to 10k followers",
      "optinButtonText": "Download Now",
      "leadMagnetUrl": "https://example.com/playbook.pdf",
      "thankyouHeadline": "Check your inbox!",
      "thankyouSubline": "Here's what to do next",
      "autoPublish": false
    }
  ]
}`}</CodeBlock>

        <h3 className="text-lg font-medium mt-6 mb-3">Fields</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-left">
                <th className="py-2 pr-4 text-zinc-300">Field</th>
                <th className="py-2 pr-4 text-zinc-300">Required</th>
                <th className="py-2 text-zinc-300">Description</th>
              </tr>
            </thead>
            <tbody className="text-zinc-400">
              <tr className="border-b border-zinc-800/50">
                <td className="py-2 pr-4 font-mono text-xs">title</td>
                <td className="py-2 pr-4 text-emerald-400">Yes</td>
                <td className="py-2">Lead magnet name (max 200 chars)</td>
              </tr>
              <tr className="border-b border-zinc-800/50">
                <td className="py-2 pr-4 font-mono text-xs">optinHeadline</td>
                <td className="py-2 pr-4 text-emerald-400">Yes</td>
                <td className="py-2">Main headline on the opt-in page (max 500 chars)</td>
              </tr>
              <tr className="border-b border-zinc-800/50">
                <td className="py-2 pr-4 font-mono text-xs">leadMagnetUrl</td>
                <td className="py-2 pr-4 text-emerald-400">Yes</td>
                <td className="py-2">URL to the hosted resource</td>
              </tr>
              <tr className="border-b border-zinc-800/50">
                <td className="py-2 pr-4 font-mono text-xs">slug</td>
                <td className="py-2 pr-4 text-zinc-500">No</td>
                <td className="py-2">URL path segment. Auto-generated from title if omitted.</td>
              </tr>
              <tr className="border-b border-zinc-800/50">
                <td className="py-2 pr-4 font-mono text-xs">optinSubline</td>
                <td className="py-2 pr-4 text-zinc-500">No</td>
                <td className="py-2">Supporting text below the headline</td>
              </tr>
              <tr className="border-b border-zinc-800/50">
                <td className="py-2 pr-4 font-mono text-xs">optinButtonText</td>
                <td className="py-2 pr-4 text-zinc-500">No</td>
                <td className="py-2">CTA button text (default: &quot;Get It Now&quot;)</td>
              </tr>
              <tr className="border-b border-zinc-800/50">
                <td className="py-2 pr-4 font-mono text-xs">thankyouHeadline</td>
                <td className="py-2 pr-4 text-zinc-500">No</td>
                <td className="py-2">Thank-you page headline</td>
              </tr>
              <tr className="border-b border-zinc-800/50">
                <td className="py-2 pr-4 font-mono text-xs">thankyouSubline</td>
                <td className="py-2 pr-4 text-zinc-500">No</td>
                <td className="py-2">Thank-you page supporting text</td>
              </tr>
              <tr className="border-b border-zinc-800/50">
                <td className="py-2 pr-4 font-mono text-xs">autoPublish</td>
                <td className="py-2 pr-4 text-zinc-500">No</td>
                <td className="py-2">Publish immediately (default: false)</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="text-lg font-medium mt-6 mb-3">Response</h3>
        <CodeBlock>{`{
  "created": 12,
  "failed": 1,
  "results": [
    { "index": 0, "status": "created", "id": "uuid", "slug": "linkedin-growth-playbook" },
    { "index": 5, "status": "failed", "error": "Slug \\"my-slug\\" already exists" }
  ]
}`}</CodeBlock>

        <h3 className="text-lg font-medium mt-6 mb-3">Theme</h3>
        <p className="text-zinc-400">
          Pages inherit your global theme settings (dark/light, primary color, background style, logo).
          Set these in <strong>Settings &gt; Theme Defaults</strong>.
        </p>
      </section>

      {/* Template */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4 border-b border-zinc-800 pb-2">Template</h2>
        <Endpoint method="GET" path="/api/funnel/bulk/template" description="Get an example payload with field descriptions." />
        <CodeBlock>{`curl https://your-app.com/api/funnel/bulk/template`}</CodeBlock>
      </section>

      {/* Errors */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4 border-b border-zinc-800 pb-2">Error Reference</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-left">
                <th className="py-2 pr-4 text-zinc-300">Status</th>
                <th className="py-2 pr-4 text-zinc-300">Code</th>
                <th className="py-2 text-zinc-300">Meaning</th>
              </tr>
            </thead>
            <tbody className="text-zinc-400">
              <tr className="border-b border-zinc-800/50">
                <td className="py-2 pr-4">400</td>
                <td className="py-2 pr-4 font-mono text-xs">VALIDATION_ERROR</td>
                <td className="py-2">Invalid request body. Check the details field for specifics.</td>
              </tr>
              <tr className="border-b border-zinc-800/50">
                <td className="py-2 pr-4">401</td>
                <td className="py-2 pr-4 font-mono text-xs">UNAUTHORIZED</td>
                <td className="py-2">Missing or invalid API key / session.</td>
              </tr>
              <tr className="border-b border-zinc-800/50">
                <td className="py-2 pr-4">409</td>
                <td className="py-2 pr-4 font-mono text-xs">CONFLICT</td>
                <td className="py-2">Resource already exists (e.g., duplicate slug).</td>
              </tr>
              <tr className="border-b border-zinc-800/50">
                <td className="py-2 pr-4">429</td>
                <td className="py-2 pr-4 font-mono text-xs">RATE_LIMITED</td>
                <td className="py-2">Too many requests. Back off and retry.</td>
              </tr>
              <tr className="border-b border-zinc-800/50">
                <td className="py-2 pr-4">500</td>
                <td className="py-2 pr-4 font-mono text-xs">INTERNAL_ERROR</td>
                <td className="py-2">Server error. Retry or contact support.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Full Example */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4 border-b border-zinc-800 pb-2">Full Example</h2>
        <CodeBlock>{`curl -X POST https://your-app.com/api/funnel/bulk \\
  -H "Authorization: Bearer ml_live_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "pages": [
      {
        "title": "LinkedIn Growth Playbook",
        "optinHeadline": "Get the Playbook That Grew My Network 10x",
        "optinSubline": "Step-by-step guide used by 500+ creators",
        "leadMagnetUrl": "https://drive.google.com/file/d/abc123/view",
        "autoPublish": true
      },
      {
        "title": "Cold Email Templates",
        "slug": "cold-email-templates",
        "optinHeadline": "47 Cold Email Templates That Get Replies",
        "optinButtonText": "Send Me the Templates",
        "leadMagnetUrl": "https://notion.so/cold-emails-xyz",
        "thankyouHeadline": "Templates are on the way!",
        "thankyouSubline": "Check your inbox in the next 2 minutes"
      }
    ]
  }'`}</CodeBlock>
      </section>
    </div>
  );
}
