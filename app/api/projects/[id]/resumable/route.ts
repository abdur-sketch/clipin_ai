import { bindings, currentUser, guardMutation } from "@/lib/server";
import { firebasePatch } from "@/lib/firebase";

const CHUNK_SIZE = 8 * 1024 * 1024;
const MAX_VIDEO_SIZE = 4 * 1024 * 1024 * 1024;
const VIDEO_TYPES = new Set(["video/mp4", "video/quicktime", "video/webm", "video/x-m4v"]);

async function owned(projectId: string, userId: string) {
  return bindings.DB.prepare("SELECT id FROM projects WHERE id=? AND user_id=?").bind(projectId,userId).first();
}

export async function GET(request:Request,context:{params:Promise<{id:string}>}){
  const user=await currentUser();const {id:projectId}=await context.params;
  if(!(await owned(projectId,user.id)))return Response.json({error:"Project tidak ditemukan"},{status:404});
  const url=new URL(request.url),filename=url.searchParams.get("filename"),size=Number(url.searchParams.get("size")||0);
  const session=await bindings.DB.prepare("SELECT id,filename,size,completed_parts,updated_at FROM upload_sessions WHERE user_id=? AND project_id=? AND status='uploading' AND (? IS NULL OR filename=?) AND (?=0 OR size=?) ORDER BY updated_at DESC LIMIT 1").bind(user.id,projectId,filename,filename,size,size).first<Record<string,unknown>>();
  return Response.json({session:session?{sessionId:session.id,filename:session.filename,size:session.size,parts:JSON.parse(String(session.completed_parts||"[]")),updatedAt:session.updated_at,chunkSize:CHUNK_SIZE}:null});
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
    const completedParts=JSON.parse(String(session.completed_parts || "[]")) as Array<{partNumber:number;etag:string}>;
    const expectedParts=Math.ceil(Number(session.size||0)/CHUNK_SIZE);
    if(!completedParts.length||completedParts.length!==expectedParts)return Response.json({error:"Bagian upload belum lengkap"},{status:409});
    await upload.complete(completedParts);
    const now=Date.now();
    await bindings.DB.batch([
      bindings.DB.prepare("UPDATE upload_sessions SET status='complete',updated_at=? WHERE id=?").bind(now,body.sessionId),
      bindings.DB.prepare("UPDATE projects SET storage_key=?,filename=?,content_type=?,status='uploaded',progress=30,updated_at=? WHERE id=?").bind(session.storage_key,session.filename,session.content_type,now,projectId),
      bindings.DB.prepare("INSERT INTO activity_logs (id,user_id,type,title,message,status,metadata,created_at) VALUES (?,?,?,?,?,?,?,?)").bind(crypto.randomUUID(),user.id,"upload","Upload video selesai",String(session.filename),"success",JSON.stringify({projectId}),now),
    ]);
    await firebasePatch("projects",projectId,{storage_key:session.storage_key,filename:session.filename,content_type:session.content_type,status:"uploaded",progress:30,updated_at:now});
    return Response.json({ ok:true });
  }
  const filename=String(body.filename||"video.mp4").trim().slice(0,255); const contentType=String(body.contentType||"video/mp4").toLowerCase();const size=Number(body.size||0);
  if(!filename||!VIDEO_TYPES.has(contentType))return Response.json({error:"Gunakan video MP4, MOV, WebM, atau M4V"},{status:415});
  if(!Number.isFinite(size)||size<=0||size>MAX_VIDEO_SIZE)return Response.json({error:"Ukuran video harus antara 1 byte dan 4 GB"},{status:413});
  const key=`uploads/${user.id}/${projectId}/source`; const upload=await bindings.MEDIA.createMultipartUpload(key,{httpMetadata:{contentType}});
  const sessionId=crypto.randomUUID(); const now=Date.now();
  await bindings.DB.prepare("INSERT INTO upload_sessions (id,user_id,project_id,storage_key,upload_id,filename,content_type,size,completed_parts,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)").bind(sessionId,user.id,projectId,key,upload.uploadId,filename,contentType,size,"[]","uploading",now,now).run();
  return Response.json({ sessionId, chunkSize: CHUNK_SIZE });
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const guarded = guardMutation(request, "resumable-upload-part"); if (guarded) return guarded;
  const user=await currentUser(); const { id:projectId }=await context.params; const url=new URL(request.url);
  const sessionId=url.searchParams.get("sessionId")||""; const partNumber=Number(url.searchParams.get("partNumber"));
  const session=await bindings.DB.prepare("SELECT * FROM upload_sessions WHERE id=? AND user_id=? AND project_id=? AND status='uploading'").bind(sessionId,user.id,projectId).first<Record<string,unknown>>();
  if(!session || !Number.isInteger(partNumber) || partNumber<1) return Response.json({error:"Sesi atau bagian upload tidak valid"},{status:400});
  const expectedParts=Math.ceil(Number(session.size||0)/CHUNK_SIZE),partSize=Number(request.headers.get("content-length")||0);
  if(partNumber>expectedParts||!request.body)return Response.json({error:"Nomor bagian upload tidak valid"},{status:400});
  if(!Number.isFinite(partSize)||partSize<=0||partSize>CHUNK_SIZE)return Response.json({error:"Ukuran bagian upload tidak valid"},{status:413});
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
  const session=await bindings.DB.prepare("SELECT * FROM upload_sessions WHERE id=? AND user_id=? AND project_id=? AND status='uploading'").bind(sessionId,user.id,projectId).first<Record<string,unknown>>();
  if(!session)return Response.json({error:"Sesi upload tidak ditemukan"},{status:404});
  await bindings.MEDIA.resumeMultipartUpload(String(session.storage_key),String(session.upload_id)).abort();
  await bindings.DB.prepare("UPDATE upload_sessions SET status='aborted',updated_at=? WHERE id=?").bind(Date.now(),sessionId).run();
  return Response.json({ok:true});
}
