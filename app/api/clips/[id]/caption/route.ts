import { generateSocialCaption } from "@/lib/kliyu-ai";
import { aiProvider, bindings, currentUser, jsonError } from "@/lib/server";

export async function POST(_:Request,{params}:{params:Promise<{id:string}>}){
  const user=await currentUser(),{id}=await params;
  const provider=aiProvider();
  if(provider==="openai"&&!bindings.OPENAI_API_KEY)return jsonError("AI Caption belum aktif. Tambahkan OPENAI_API_KEY atau gunakan AI lokal.",503);
  const clip=await bindings.DB.prepare("SELECT c.*,t.text transcript FROM clips c JOIN projects p ON p.id=c.project_id LEFT JOIN transcripts t ON t.project_id=p.id WHERE c.id=? AND p.user_id=?").bind(id,user.id).first<Record<string,unknown>>();
  if(!clip)return jsonError("Clip tidak ditemukan",404);
  try{
    const result=await generateSocialCaption({provider,apiKey:bindings.OPENAI_API_KEY,model:provider==="ollama"?bindings.OLLAMA_MODEL:bindings.OPENAI_MODEL,baseUrl:bindings.OLLAMA_BASE_URL,safetyIdentifier:user.id,title:String(clip.title),hook:String(clip.hook),category:String(clip.category||""),transcript:String(clip.transcript||"")});
    await bindings.DB.prepare("UPDATE clips SET post_caption=?,post_cta=?,post_hashtags=?,updated_at=? WHERE id=?").bind(`${result.hook}\n\n${result.caption}`,result.cta,JSON.stringify(result.hashtags),Date.now(),id).run();
    return Response.json(result);
  }catch(error){return jsonError(error instanceof Error?error.message:"AI Caption gagal",502)}
}
