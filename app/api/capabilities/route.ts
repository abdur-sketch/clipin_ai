import { bindings, currentUser } from "@/lib/server";

export async function GET() {
  await currentUser();
  return Response.json({
    transcription: Boolean(bindings.OPENAI_API_KEY),
    momentDetection: Boolean(bindings.OPENAI_API_KEY),
    mp4Export: Boolean(bindings.RENDER_SERVICE_URL),
    billing: Boolean(bindings.BILLING_SERVICE_URL),
    storage: Boolean(bindings.MEDIA),
    database: Boolean(bindings.DB),
  });
}
