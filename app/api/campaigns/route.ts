import { bindings, currentUser, id, jsonError } from "@/lib/server";

export async function GET(request:Request){
  const user=await currentUser(); const url=new URL(request.url); const category=url.searchParams.get("category"); const search=url.searchParams.get("q")?.trim(); const mine=url.searchParams.get("mine")==="1";
  const clauses=[mine?"c.owner_user_id=?":"c.status='open'"]; const values:unknown[]=[...(mine?[user.id]:[])];
  if(category&&category!=="all"){clauses.push("c.category=?");values.push(category)} if(search){clauses.push("(c.title LIKE ? OR c.brand_name LIKE ?)");values.push(`%${search}%`,`%${search}%`)}
  const sql=`SELECT c.*, (SELECT COUNT(*) FROM campaign_participants p WHERE p.campaign_id=c.id) participant_count, (SELECT COUNT(*) FROM campaign_submissions s WHERE s.campaign_id=c.id) submission_count, EXISTS(SELECT 1 FROM campaign_participants p WHERE p.campaign_id=c.id AND p.user_id=?) joined FROM campaigns c WHERE ${clauses.join(" AND ")} ORDER BY c.created_at DESC LIMIT 100`;
  const {results}=await bindings.DB.prepare(sql).bind(user.id,...values).all(); return Response.json({campaigns:results});
}

export async function POST(request:Request){
  const user=await currentUser(); const body=await request.json() as Record<string,unknown>; const title=String(body.title||"").trim(),brand=String(body.brandName||"").trim(),description=String(body.description||"").trim();
  const rate=Math.round(Number(body.rate)),budget=Math.round(Number(body.totalBudget)); if(!title||!brand||!description)return jsonError("Judul, brand, dan deskripsi wajib diisi"); if(!Number.isFinite(rate)||rate<=0||!Number.isFinite(budget)||budget<rate)return jsonError("Rate dan total budget tidak valid");
  const platforms=Array.isArray(body.platforms)?body.platforms.map(String).filter(Boolean):[]; if(!platforms.length)return jsonError("Pilih minimal satu platform"); const now=Date.now(),campaignId=id("cmp");
  const safeUrl=(value:unknown)=>{if(!value)return null;try{const parsed=new URL(String(value));return parsed.protocol==="https:"?parsed.toString():null}catch{return null}};const briefUrl=safeUrl(body.briefUrl),assetUrl=safeUrl(body.assetUrl);if((body.briefUrl&&!briefUrl)||(body.assetUrl&&!assetUrl))return jsonError("Link brief dan asset harus berupa URL https yang valid");
  await bindings.DB.prepare("INSERT INTO campaigns (id,owner_user_id,title,brand_name,category,content_type,description,platforms,tags,brief_url,asset_url,payment_type,rate,total_budget,min_views,max_views,status,deadline,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(campaignId,user.id,title,brand,String(body.category||"Brand"),String(body.contentType||"Clipping Brand"),description,JSON.stringify(platforms),JSON.stringify(Array.isArray(body.tags)?body.tags:[]),briefUrl,assetUrl,String(body.paymentType)==="cpm"?"cpm":"per_video",rate,budget,Math.max(0,Number(body.minViews||0)),Math.max(0,Number(body.maxViews||0)),"open",body.deadline?new Date(String(body.deadline)).getTime():null,now,now).run();
  return Response.json({ok:true,id:campaignId},{status:201});
}
