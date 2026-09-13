import { bindings, currentUser, jsonError } from "@/lib/server";

export async function POST(_:Request,{params}:{params:Promise<{id:string}>}){
  const user=await currentUser(),{id}=await params;
  if(!bindings.OPENAI_API_KEY)return jsonError("AI Caption belum aktif. Tambahkan OPENAI_API_KEY di environment produksi.",503);
  const clip=await bindings.DB.prepare("SELECT c.*,t.text transcript FROM clips c JOIN projects p ON p.id=c.project_id LEFT JOIN transcripts t ON t.project_id=p.id WHERE c.id=? AND p.user_id=?").bind(id,user.id).first<Record<string,unknown>>();
  if(!clip)return jsonError("Clip tidak ditemukan",404);
  const response=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{authorization:`Bearer ${bindings.OPENAI_API_KEY}`,"content-type":"application/json"},body:JSON.stringify({model:bindings.OPENAI_MODEL||"gpt-4o-mini",store:false,safety_identifier:user.id,instructions:"Anda adalah copywriter short-form Indonesia. Buat copy yang akurat terhadap isi video, ringkas, natural, tidak clickbait menyesatkan, dan tidak mengarang fakta.",input:`Judul: ${String(clip.title)}\nHook clip: ${String(clip.hook)}\nKategori: ${String(clip.category||"")}\nPotongan transkrip sumber:\n${String(clip.transcript||"").slice(0,12000)}`,text:{format:{type:"json_schema",name:"kliyu_social_caption",strict:true,schema:{type:"object",additionalProperties:false,required:["hook","caption","cta","hashtags"],properties:{hook:{type:"string",minLength:3,maxLength:180},caption:{type:"string",minLength:10,maxLength:1500},cta:{type:"string",minLength:3,maxLength:180},hashtags:{type:"array",minItems:3,maxItems:12,items:{type:"string",pattern:"^#[A-Za-z0-9_]+$"}}}}}}})});
  if(!response.ok)return jsonError(`OpenAI gagal membuat caption (${response.status})`,502);
  const data=await response.json() as {output_text?:string;output?:Array<{content?:Array<{type?:string;text?:string}>}>};const output=data.output_text||data.output?.flatMap(item=>item.content||[]).find(item=>item.type==="output_text")?.text;if(!output)return jsonError("OpenAI tidak mengembalikan caption",502);
  const result=JSON.parse(output) as {hook:string;caption:string;cta:string;hashtags:string[]};
  await bindings.DB.prepare("UPDATE clips SET post_caption=?,post_cta=?,post_hashtags=?,updated_at=? WHERE id=?").bind(`${result.hook.trim()}\n\n${result.caption.trim()}`,result.cta.trim(),JSON.stringify(result.hashtags),Date.now(),id).run();
  return Response.json(result);
}
