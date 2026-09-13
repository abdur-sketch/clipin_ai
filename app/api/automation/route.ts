import { bindings, currentUser, id, jsonError } from "@/lib/server";

export async function GET() {
  const user=await currentUser();
  const [channels,rules,publications,notifications,referral]=await Promise.all([
    bindings.DB.prepare("SELECT * FROM channels WHERE user_id=? ORDER BY created_at DESC").bind(user.id).all(),
    bindings.DB.prepare("SELECT * FROM posting_rules WHERE user_id=?").bind(user.id).first(),
    bindings.DB.prepare("SELECT * FROM publications WHERE user_id=? ORDER BY scheduled_at DESC LIMIT 30").bind(user.id).all(),
    bindings.DB.prepare("SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 20").bind(user.id).all(),
    bindings.DB.prepare("SELECT * FROM referrals WHERE user_id=?").bind(user.id).first(),
  ]);
  return Response.json({channels:channels.results,rules,publications:publications.results,notifications:notifications.results,referral,providers:{youtube:Boolean(bindings.YOUTUBE_API_KEY),publishing:Boolean(bindings.PUBLISH_SERVICE_URL)}});
}

export async function POST(request:Request) {
  const user=await currentUser(); const body=await request.json() as Record<string,unknown>; const action=String(body.action??""); const now=Date.now();
  if(action==="connect-channel") { const url=String(body.url??"").trim(); if(!/^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(url))return jsonError("Masukkan URL channel YouTube yang valid"); const channelId=id("chn"); await bindings.DB.prepare("INSERT INTO channels (id,user_id,platform,name,external_id,status,watch_enabled,last_checked_at,created_at) VALUES (?,?,'youtube',?,?,'connected',1,?,?)").bind(channelId,user.id,String(body.name??"YouTube Channel"),url,now,now).run(); await notify(user.id,"channel","Channel Watch aktif","Video baru akan masuk ke antrean otomatis."); return Response.json({ok:true,id:channelId}); }
  if(action==="toggle-watch") { await bindings.DB.prepare("UPDATE channels SET watch_enabled=? WHERE id=? AND user_id=?").bind(body.enabled?1:0,String(body.id),user.id).run(); return Response.json({ok:true}); }
  if(action==="save-rules") { await bindings.DB.prepare("INSERT INTO posting_rules (user_id,mode,min_score,daily_limit,posting_times,platforms,updated_at) VALUES (?,?,?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET mode=excluded.mode,min_score=excluded.min_score,daily_limit=excluded.daily_limit,posting_times=excluded.posting_times,platforms=excluded.platforms,updated_at=excluded.updated_at").bind(user.id,String(body.mode??"approval"),Number(body.minScore??85),Number(body.dailyLimit??3),JSON.stringify(body.postingTimes??["12:00","19:00"]),JSON.stringify(body.platforms??["instagram","tiktok"]),now).run(); await notify(user.id,"rules","Aturan posting diperbarui","Autopilot akan mengikuti jadwal dan batas baru."); return Response.json({ok:true}); }
  if(action==="create-referral") { const existing=await bindings.DB.prepare("SELECT code FROM referrals WHERE user_id=?").bind(user.id).first(); if(existing)return Response.json({ok:true,referral:existing}); const code=`KLIYU${user.id.slice(0,6).toUpperCase()}`; await bindings.DB.prepare("INSERT INTO referrals (id,user_id,code,created_at) VALUES (?,?,?,?)").bind(id("ref"),user.id,code,now).run(); return Response.json({ok:true,referral:{code}}); }
  if(action==="mark-read") { await bindings.DB.prepare("UPDATE notifications SET read=1 WHERE user_id=?").bind(user.id).run(); return Response.json({ok:true}); }
  return jsonError("Action tidak dikenali");
}

async function notify(userId:string,type:string,title:string,message:string){await bindings.DB.prepare("INSERT INTO notifications (id,user_id,type,title,message,read,created_at) VALUES (?,?,?,?,?,0,?)").bind(id("ntf"),userId,type,title,message,Date.now()).run()}
