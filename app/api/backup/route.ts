import { bindings, currentUser, guardMutation } from "@/lib/server";

async function snapshot(userId: string) {
  const [projects, clips, transcripts, settings, studio, publications, revenue] = await Promise.all([
    bindings.DB.prepare("SELECT * FROM projects WHERE user_id=?").bind(userId).all(),
    bindings.DB.prepare("SELECT clips.* FROM clips JOIN projects ON projects.id=clips.project_id WHERE projects.user_id=?").bind(userId).all(),
    bindings.DB.prepare("SELECT transcripts.* FROM transcripts JOIN projects ON projects.id=transcripts.project_id WHERE projects.user_id=?").bind(userId).all(),
    bindings.DB.prepare("SELECT * FROM user_settings WHERE user_id=?").bind(userId).first(),
    bindings.DB.prepare("SELECT * FROM studio_preferences WHERE user_id=?").bind(userId).first(),
    bindings.DB.prepare("SELECT * FROM publications WHERE user_id=?").bind(userId).all(),
    bindings.DB.prepare("SELECT * FROM revenue_entries WHERE user_id=?").bind(userId).all(),
  ]);
  return { version: 1, createdAt: new Date().toISOString(), projects: projects.results, clips: clips.results, transcripts: transcripts.results, settings, studio, publications: publications.results, revenue: revenue.results };
}

export async function GET(request: Request) {
  const user = await currentUser();
  const url = new URL(request.url);
  if (url.searchParams.get("download") === "1") {
    const data = await snapshot(user.id);
    return new Response(JSON.stringify(data, null, 2), { headers: { "content-type": "application/json", "content-disposition": `attachment; filename="kliyu-backup-${new Date().toISOString().slice(0,10)}.json"` } });
  }
  const { results } = await bindings.DB.prepare("SELECT id,created_at,length(snapshot) AS bytes FROM workspace_backups WHERE user_id=? ORDER BY created_at DESC LIMIT 10").bind(user.id).all();
  return Response.json({ backups: results });
}

export async function POST(request: Request) {
  const guarded = guardMutation(request, "workspace-backup"); if (guarded) return guarded;
  const user = await currentUser(); const now = Date.now(); const id = crypto.randomUUID();
  const data = await snapshot(user.id);
  await bindings.DB.batch([
    bindings.DB.prepare("INSERT INTO workspace_backups (id,user_id,snapshot,created_at) VALUES (?,?,?,?)").bind(id,user.id,JSON.stringify(data),now),
    bindings.DB.prepare("INSERT INTO activity_logs (id,user_id,type,title,message,status,metadata,created_at) VALUES (?,?,?,?,?,?,?,?)").bind(crypto.randomUUID(),user.id,"backup","Backup workspace dibuat","Project, klip, transkrip, dan pengaturan diamankan.","success","{}",now),
  ]);
  await bindings.DB.prepare("DELETE FROM workspace_backups WHERE user_id=? AND id NOT IN (SELECT id FROM workspace_backups WHERE user_id=? ORDER BY created_at DESC LIMIT 10)").bind(user.id,user.id).run();
  return Response.json({ ok: true, id, createdAt: now });
}

export async function PUT(request:Request){
  const guarded=guardMutation(request,"workspace-restore");if(guarded)return guarded;
  const user=await currentUser();const declaredSize=Number(request.headers.get("content-length")||0);if(declaredSize>15*1024*1024)return Response.json({error:"Backup maksimum 15 MB"},{status:413});
  const bytes=await request.arrayBuffer();if(bytes.byteLength>15*1024*1024)return Response.json({error:"Backup maksimum 15 MB"},{status:413});
  let data:Record<string,unknown>;try{data=JSON.parse(new TextDecoder().decode(bytes)) as Record<string,unknown>}catch{return Response.json({error:"File backup bukan JSON yang valid"},{status:400})}if(Number(data.version)!==1||!Array.isArray(data.projects)||!Array.isArray(data.clips))return Response.json({error:"Format backup KLIYU tidak valid"},{status:400});
  const originalProjects=data.projects as Record<string,unknown>[],originalClips=data.clips as Record<string,unknown>[];
  const projectMap=new Map(originalProjects.filter((row)=>String(row.id||"")).map((row)=>[String(row.id),`restore_prj_${crypto.randomUUID()}`]));
  const clipMap=new Map(originalClips.filter((row)=>String(row.id||"")).map((row)=>[String(row.id),`restore_clip_${crypto.randomUUID()}`]));
  const projects=originalProjects.map((row)=>({...row,id:projectMap.get(String(row.id||"")),user_id:user.id,title:`${String(row.title||"Project") } (Restored)`,storage_key:null,status:"draft",progress:0,error:null}));
  const clips=originalClips.filter((row)=>projectMap.has(String(row.project_id||""))).map((row)=>({...row,id:clipMap.get(String(row.id||"")),project_id:projectMap.get(String(row.project_id||"")),rendered_key:null,render_job_id:null,status:"ready",render_progress:0,render_error:null}));
  const transcripts=(Array.isArray(data.transcripts)?data.transcripts as Record<string,unknown>[]:[]).filter((row)=>projectMap.has(String(row.project_id||""))).map((row)=>({...row,project_id:projectMap.get(String(row.project_id||""))}));
  const publications=(Array.isArray(data.publications)?data.publications as Record<string,unknown>[]:[]).filter((row)=>clipMap.has(String(row.clip_id||""))).map((row)=>({...row,id:`restore_pub_${crypto.randomUUID()}`,user_id:user.id,clip_id:clipMap.get(String(row.clip_id||"")),status:"draft",external_url:null}));
  const revenue=(Array.isArray(data.revenue)?data.revenue as Record<string,unknown>[]:[]).map((row)=>({...row,id:`restore_rev_${crypto.randomUUID()}`,user_id:user.id}));
  const settings=data.settings&&typeof data.settings==="object"?[{...(data.settings as Record<string,unknown>),user_id:user.id}]:[];
  const studio=data.studio&&typeof data.studio==="object"?[{...(data.studio as Record<string,unknown>),user_id:user.id}]:[];
  const tables:Array<{name:string;rows:Record<string,unknown>[];replace?:boolean}>= [{name:"projects",rows:projects},{name:"clips",rows:clips},{name:"transcripts",rows:transcripts},{name:"publications",rows:publications},{name:"revenue_entries",rows:revenue},{name:"user_settings",rows:settings,replace:true},{name:"studio_preferences",rows:studio,replace:true}];
  let restored=0;
  for(const table of tables){const schema=await bindings.DB.prepare(`PRAGMA table_info(${table.name})`).all<{name:string}>();const allowed=new Set(schema.results.map((column)=>column.name));const statements:D1PreparedStatement[]=[];for(const row of table.rows.slice(0,2000)){const columns=Object.keys(row).filter((key)=>allowed.has(key)&&/^[a-z_]+$/.test(key));if(!columns.length)continue;statements.push(bindings.DB.prepare(`${table.replace?"INSERT OR REPLACE":"INSERT"} INTO ${table.name} (${columns.join(",")}) VALUES (${columns.map(()=>"?").join(",")})`).bind(...columns.map((column)=>row[column]??null)));if(statements.length===80){await bindings.DB.batch(statements.splice(0));}restored++}if(statements.length)await bindings.DB.batch(statements)}
  const now=Date.now();await bindings.DB.prepare("INSERT INTO activity_logs (id,user_id,type,title,message,status,metadata,created_at) VALUES (?,?,?,?,?,?,?,?)").bind(crypto.randomUUID(),user.id,"restore","Backup workspace dipulihkan",`${restored} record dipulihkan`,"success","{}",now).run();return Response.json({ok:true,restored});
}
