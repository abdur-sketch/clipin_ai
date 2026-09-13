import { currentUser } from "@/lib/server";
export async function GET() { return Response.json({ user: await currentUser() }); }
