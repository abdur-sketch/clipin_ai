import { bindings, currentUser, id, jsonError } from "@/lib/server";

const demoMoments = [
  [3,37,94,"Jangan Memulai Bisnis Sebelum Tahu Ini","Kebanyakan pemula salah mulai dari sini."],
  [42,70,91,"Rahasia Menemukan Ide Bisnis yang Tepat","Ide bagus selalu meninggalkan satu petunjuk."],
  [78,120,87,"Kenapa Produk Bagus Tetap Bisa Gagal?","Produk bagus saja ternyata tidak cukup."],
  [130,161,83,"Validasi Ide Tanpa Keluar Banyak Modal","Jangan produksi sebelum melakukan ini."],
  [174,210,78,"Kesalahan Pertama Founder Pemula","Kesalahan ini kelihatan produktif, padahal mahal."],
  [220,245,74,"Mulai dari Masalah, Bukan Produk","Balik urutan berpikir Anda."],
] as const;

export async function POST(_:Request,{params}:{params:Promise<{id:string}>}) {
  const user=await currentUser(),{id:projectId}=await params;
  const project=await bindings.DB.prepare("SELECT * FROM projects WHERE id=? AND user_id=?").bind(projectId,user.id).first<{storage_key?:string;title:string}>(); if(!project)return jsonError("Project tidak ditemukan",404);
  await bindings.DB.prepare("UPDATE projects SET status='processing',progress=35,error=NULL,updated_at=? WHERE id=?").bind(Date.now(),projectId).run();
  try {
    let transcript="Banyak orang salah ketika memulai bisnis. Mereka langsung memikirkan produk, padahal hal pertama yang harus ditemukan adalah masalah pelanggan."; let provider="clipin-demo";
    if(bindings.OPENAI_API_KEY&&project.storage_key){
      const object=await bindings.MEDIA.get(project.storage_key); if(!object)throw new Error("Video sumber tidak ditemukan");
      const form=new FormData(); form.append("file",new File([await object.arrayBuffer()],"video.mp4",{type:object.httpMetadata?.contentType??"video/mp4"})); form.append("model","whisper-1"); form.append("response_format","verbose_json");
      const response=await fetch("https://api.openai.com/v1/audio/transcriptions",{method:"POST",headers:{Authorization:`Bearer ${bindings.OPENAI_API_KEY}`},body:form}); if(!response.ok)throw new Error(`Transkripsi gagal (${response.status})`);
      const data=await response.json() as {text:string}; transcript=data.text; provider="openai-whisper";
    }
    const now=Date.now(); const statements=[bindings.DB.prepare("DELETE FROM clips WHERE project_id=?").bind(projectId),bindings.DB.prepare("INSERT OR REPLACE INTO transcripts (project_id,text,segments,provider,created_at) VALUES (?,?,?, ?,?)").bind(projectId,transcript,"[]",provider,now)];
    for(const [start,end,score,title,hook] of demoMoments) statements.push(bindings.DB.prepare("INSERT INTO clips (id,project_id,start_time,end_time,score,title,hook,caption,subtitles,style,face_tracking,hook_overlay,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,'bold',1,1,'ready',?,?)").bind(id("clip"),projectId,start,end,score,title,hook,`${hook} ${transcript.slice(0,150)}`,JSON.stringify([{start,end,text:hook}]),now,now));
    statements.push(bindings.DB.prepare("UPDATE projects SET status='complete',progress=100,updated_at=? WHERE id=?").bind(now,projectId)); await bindings.DB.batch(statements);
    return Response.json({ok:true,provider,clips:demoMoments.length});
  } catch(error){const message=error instanceof Error?error.message:"Processing gagal";await bindings.DB.prepare("UPDATE projects SET status='failed',error=?,updated_at=? WHERE id=?").bind(message,Date.now(),projectId).run();return jsonError(message,500)}
}
