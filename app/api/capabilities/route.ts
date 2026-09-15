import { aiProvider, bindings, currentUser } from "@/lib/server";
import { firebaseHealthcheck } from "@/lib/firebase";

export async function GET() {
  await currentUser();
  const provider = aiProvider();
  const firebase = await firebaseHealthcheck();
  const localConfigured = provider === "ollama" && Boolean(bindings.OLLAMA_BASE_URL) && Boolean(bindings.WHISPER_BASE_URL);
  return Response.json({
    aiProvider: provider,
    transcription: provider === "ollama" ? localConfigured : Boolean(bindings.OPENAI_API_KEY),
    momentDetection: provider === "ollama" ? localConfigured : Boolean(bindings.OPENAI_API_KEY),
    mp4Export: Boolean(bindings.LOCAL_RENDER_BASE_URL || bindings.RENDER_SERVICE_URL),
    billing: Boolean(bindings.BILLING_SERVICE_URL),
    storage: Boolean(bindings.MEDIA),
    database: firebase.connected || Boolean(bindings.DB),
    firebase: firebase.connected,
    firebaseConfigured: firebase.configured,
    dataBackend: firebase.connected ? "Firebase Firestore" : "D1 fallback",
  });
}
