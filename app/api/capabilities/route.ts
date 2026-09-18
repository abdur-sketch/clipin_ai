import { bindings, currentUser } from "@/lib/server";
import { firebaseHealthcheck } from "@/lib/firebase";

export async function GET() {
  await currentUser();
  const firebase = await firebaseHealthcheck();
  return Response.json({
    aiProvider: "browser",
    transcription: true,
    momentDetection: true,
    browserRender: true,
    mp4Export: true,
    cloudRender: Boolean(bindings.RENDER_SERVICE_URL && bindings.RENDER_SERVICE_TOKEN),
    socialPublishing: Boolean(bindings.PUBLISH_SERVICE_URL && bindings.PUBLISH_SERVICE_TOKEN),
    youtubeWatch: Boolean(bindings.YOUTUBE_API_KEY),
    billing: Boolean(bindings.BILLING_SERVICE_URL),
    storage: Boolean(bindings.MEDIA),
    database: firebase.connected || Boolean(bindings.DB),
    firebase: firebase.connected,
    firebaseConfigured: firebase.configured,
    dataBackend: firebase.connected ? "Firebase Firestore" : "D1 fallback",
  });
}
