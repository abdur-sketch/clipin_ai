import { bindings, currentUser, guardMutation } from "@/lib/server";

async function owned(projectId: string, userId: string) {
  return bindings.DB.prepare("SELECT id FROM projects WHERE id=? AND user_id=?").bind(projectId,userId).first();
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const guarded = guardMutation(request, "resumable-upload"); if (guarded) return guarded;
  const user = await currentUser(); const { id: projectId } = await context.params;
  if (!(await owned(projectId,user.id))) return Response.json({ error: "Project tidak ditemukan" }, { status: 404 });
  const body = await request.json() as { action?: string; sessionId?: string; filename?: string; contentType?: string; size?: number; parts?: Array<{ partNumber:number; etag:string }> };
  if (body.action === "complete" && body.sessionId) {
    const session = await bindings.DB.prepare("SELECT * FROM upload_sessions WHERE id=? AND user_id=? AND project_id=?").bind(body.sessionId,user.id,projectId).first<Record<string,unknown>>();
    if (!session) return Response.json({ error: "Sesi upload tidak ditemukan" }, { status: 404 });
    const upload = bindings.MEDIA.resumeMultipartUpload(String(session.storage_key), String(session.upload_id));
    await upload.complete(body.parts || JSON.parse(String(session.completed_parts || "[]")));
    const now=Date.now();
    await bindings.DB.batch([
      bindings.DB.prepare("UPDATE upload_sessions SET status='complete',updated_at=? WHERE id=?").bind(now,body.sessionId),
      bindings.DB.prepare("UPDATE projects SET storage_key=?,filename=?,content_type=?,status='uploaded',progress=30,updated_at=? WHERE id=?").bind(session.storage_key,session.filename,session.content_type,now,projectId),
      bindings.DB.prepare("INSERT INTO activity_logs (id,user_id,type,title,message,status,metadata,created_at) VALUES (?,?,?,?,?,?,?,?)").bind(crypto.randomUUID(),user.id,"upload","Upload video selesai",String(session.filename),"success",JSON.stringify({projectId}),now),
    ]);
    return Response.json({ ok:true });
  }
  const filename=String(body.filename||"video.mp4"); const contentType=String(body.contentType||"video/mp4");
  const key=`uploads/${user.id}/${projectId}/source`; const upload=await bindings.MEDIA.createMultipartUpload(key,{httpMetadata:{contentType}});
  const sessionId=crypto.randomUUID(); const now=Date.now();
  await bindings.DB.prepare("INSERT INTO upload_sessions (id,user_id,project_id,storage_key,upload_id,filename,content_type,size,completed_parts,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)").bind(sessionId,user.id,projectId,key,upload.uploadId,filename,contentType,Number(body.size||0),"[]","uploading",now,now).run();
  return Response.json({ sessionId, chunkSize: 8*1024*1024 });
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const guarded = guardMutation(request, "resumable-upload-part"); if (guarded) return guarded;
  const user=await currentUser(); const { id:projectId }=await context.params; const url=new URL(request.url);
  const sessionId=url.searchParams.get("sessionId")||""; const partNumber=Number(url.searchParams.get("partNumber"));
  const session=await bindings.DB.prepare("SELECT * FROM upload_sessions WHERE id=? AND user_id=? AND project_id=? AND status='uploading'").bind(sessionId,user.id,projectId).first<Record<string,unknown>>();
  if(!session || !Number.isInteger(partNumber) || partNumber<1) return Response.json({error:"Sesi atau bagian upload tidak valid"},{status:400});
  const upload=bindings.MEDIA.resumeMultipartUpload(String(session.storage_key),String(session.upload_id));
  const part=await upload.uploadPart(partNumber,request.body!);
  const parts=JSON.parse(String(session.completed_parts||"[]")) as Array<{partNumber:number;etag:string}>;
  const next=[...parts.filter((item)=>item.partNumber!==partNumber),part].sort((a,b)=>a.partNumber-b.partNumber);
  await bindings.DB.prepare("UPDATE upload_sessions SET completed_parts=?,updated_at=? WHERE id=?").bind(JSON.stringify(next),Date.now(),sessionId).run();
  return Response.json(part);
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const guarded=guardMutation(request,"resumable-upload-abort"); if(guarded)return guarded;
  const user=await currentUser(); const {id:projectId}=await context.params; const sessionId=new URL(request.url).searchParams.get("sessionId")||"";
  const session=await bindings.DB.prepare("SELECT * FROM upload_sessions WHERE id=? AND user_id=? AND project_id=?").bind(sessionId,user.id,projectId).first<Record<string,unknown>>();
  if(!session)return Response.json({error:"Sesi upload tidak ditemukan"},{status:404});
  await bindings.MEDIA.resumeMultipartUpload(String(session.storage_key),String(session.upload_id)).abort();
  await bindings.DB.prepare("UPDATE upload_sessions SET status='aborted',updated_at=? WHERE id=?").bind(Date.now(),sessionId).run();
  return Response.json({ok:true});
}
