import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { ATTACHMENT_MIME, MAX_UPLOAD_BYTES, UPLOAD_PREFIX } from "@/lib/atlas/attachments";
import { allow, clientIp } from "@/lib/ratelimit";

// Client uploads for chat attachments: @vercel/blob/client upload() trades a small JSON here for a token
// scoped to one file under atlas71/, then sends the bytes straight to Vercel Blob, so a 20 MB photo or PDF
// never passes through a function body (Vercel caps those at 4.5 MB). Without a Blob store the 503 tells
// the browser to read files itself and send them inline (see attachments.ts).
export const dynamic = "force-dynamic";

const UPLOADS_PER_HOUR = 60;

export async function POST(req: Request) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return Response.json({ error: "storage_not_configured" }, { status: 503 });

  let body: HandleUploadBody;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Expected a JSON body." }, { status: 400 });
  }
  // Only token requests count: Vercel Blob's upload-completed callback comes from Vercel's own servers.
  if (body?.type === "blob.generate-client-token" && !allow(`upload:${clientIp(req)}`, UPLOADS_PER_HOUR)) {
    return Response.json({ error: "Too many uploads from this network. Try again later." }, { status: 429 });
  }

  try {
    const json = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        if (!pathname.startsWith(UPLOAD_PREFIX) || pathname.includes("..") || pathname.length > 300) {
          throw new Error("Invalid upload path.");
        }
        return {
          allowedContentTypes: [...ATTACHMENT_MIME],
          maximumSizeInBytes: MAX_UPLOAD_BYTES,
          addRandomSuffix: true,
          // Each file is deleted once its turn is answered; a short CDN cache lets copies expire soon after.
          cacheControlMaxAge: 60,
          validUntil: Date.now() + 10 * 60 * 1000,
        };
      },
      // Nothing to record: the browser sends the URL with the message, and /api/agent deletes the blob.
      onUploadCompleted: async () => {},
    });
    return Response.json(json);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed.";
    console.error("Upload refused:", message);
    return Response.json({ error: message }, { status: 400 });
  }
}
