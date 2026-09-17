import { bindings, currentUser } from "@/lib/server";
import { firebaseHealthcheck } from "@/lib/firebase";

export async function GET() {
  await currentUser();
  const firebase = await firebaseHealthcheck();
  return Response.json({
    aiProvider: "browser",
    transcription: true,
    momentDetection: true,
    mp4Export: Boolean(bindings.RENDER_SERVICE_URL),
    billing: Boolean(bindings.BILLING_SERVICE_URL),
    storage: Boolean(bindings.MEDIA),
    database: firebase.connected || Boolean(bindings.DB),
    firebase: firebase.connected,
    firebaseConfigured: firebase.configured,
    dataBackend: firebase.connected ? "Firebase Firestore" : "D1 fallback",
  });
}
