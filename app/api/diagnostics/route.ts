import { bindings, currentUser } from "@/lib/server";

export async function GET() {
  const user=await currentUser(); const started=Date.now();
  const checks:Array<{key:string;label:string;status:"ok"|"warning"|"error";detail:string;latency?:number}>=[];
  try{const before=Date.now();await bindings.DB.prepare("SELECT 1 AS ok").first();checks.push({key:"database",label:"Workspace database",status:"ok",detail:"D1 merespons normal",latency:Date.now()-before})}catch{checks.push({key:"database",label:"Workspace database",status:"error",detail:"Database tidak dapat diakses"})}
  try{const before=Date.now();await bindings.MEDIA.list({prefix:`uploads/${user.id}/`,limit:1});checks.push({key:"storage",label:"Media storage",status:"ok",detail:"R2 siap membaca dan menyimpan media",latency:Date.now()-before})}catch{checks.push({key:"storage",label:"Media storage",status:"error",detail:"Penyimpanan media tidak dapat diakses"})}
  checks.push({key:"cloudRender",label:"Background render",status:bindings.RENDER_SERVICE_URL?"ok":"warning",detail:bindings.RENDER_SERVICE_URL?"Cloud worker terhubung":"Render browser aktif; tab harus tetap terbuka"});
  checks.push({key:"publishing",label:"Social publishing",status:bindings.PUBLISH_SERVICE_URL?"ok":"warning",detail:bindings.PUBLISH_SERVICE_URL?"OAuth publisher siap":"Kredensial OAuth belum dikonfigurasi"});
  const failed=await bindings.DB.prepare("SELECT count(*) AS total FROM clips JOIN projects ON projects.id=clips.project_id WHERE projects.user_id=? AND (clips.render_error IS NOT NULL OR clips.status='rendering')").bind(user.id).first<{total:number}>();
  checks.push({key:"jobs",label:"Render recovery",status:Number(failed?.total||0)?"warning":"ok",detail:Number(failed?.total||0)?`${failed?.total} pekerjaan perlu diperiksa`:"Tidak ada pekerjaan bermasalah"});
  return Response.json({checks,checkedAt:Date.now(),latency:Date.now()-started});
}
