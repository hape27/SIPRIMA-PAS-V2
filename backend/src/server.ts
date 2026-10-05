import 'dotenv/config';
import express from 'express'; import cors from 'cors'; import helmet from 'helmet'; import rateLimit from 'express-rate-limit'; import bcrypt from 'bcryptjs'; import jwt from 'jsonwebtoken'; import multer from 'multer'; import crypto from 'crypto'; import XLSX from 'xlsx';
import { detectType as detectReportType, previewWorkbook as previewImportWorkbook, runImport, persistUpload } from './importer/engine';
import { PrismaClient, RoleName, ValidationStatus, ImportStatus, SubmissionStatus, CaseStatus } from '@prisma/client';
const requiredEnv=['DATABASE_URL','JWT_SECRET','CORS_ORIGIN']; for(const k of requiredEnv){if(!process.env[k]) throw new Error(`Environment variable ${k} wajib diisi.`);} if((process.env.JWT_SECRET||'').length<32) throw new Error('JWT_SECRET minimal 32 karakter.');
const db=new PrismaClient(); const app=express(); const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:25*1024*1024}}); const SECRET=process.env.JWT_SECRET!;
function escapeHtml(value: unknown){return String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));}
const allowedOrigins=(process.env.CORS_ORIGIN||'').split(',').map(x=>x.trim()).filter(Boolean);
app.use(helmet()); app.use(cors({origin:(origin,cb)=>{if(!origin||allowedOrigins.includes(origin)) return cb(null,true); cb(new Error('Origin tidak diizinkan.'));}})); app.use(express.json({limit:'2mb'})); app.use('/api',rateLimit({windowMs:15*60*1000,max:600,standardHeaders:true,legacyHeaders:false})); app.use('/api/auth/login',rateLimit({windowMs:15*60*1000,max:20,standardHeaders:true,legacyHeaders:false}));
type Req=express.Request & {user?:{id:string;role:RoleName}};
function auth(req:Req,res:express.Response,next:express.NextFunction){const h=req.headers.authorization||'';try{const p=jwt.verify(h.replace(/^Bearer /,''),SECRET) as any;req.user={id:p.id,role:p.role};next()}catch{res.status(401).json({message:'Sesi tidak valid.'})}}
function allow(...roles:RoleName[]){return (req:Req,res:express.Response,next:express.NextFunction)=>roles.includes(req.user!.role)?next():res.status(403).json({message:'Akses ditolak.'})}
function audit(req:Req,action:string,module:string,recordId?:string,metadata?:any){return db.auditLog.create({data:{userId:req.user?.id,action,module,recordId,ipAddress:req.ip,userAgent:req.get('user-agent'),metadata}})}
function normalize(s:any){return String(s??'').trim().replace(/\s+/g,' ')} function num(v:any){if(v===null||v===undefined||v==='')return null; const n=Number(String(v).replace(/[^0-9-]/g,'')); return Number.isFinite(n)?n:null}
function findHeader(rows:any[][],terms:string[]){for(let i=0;i<Math.min(rows.length,30);i++){const line=rows[i].map(normalize).join(' | ').toLowerCase(); if(terms.every(t=>line.includes(t.toLowerCase()))) return i;} return -1}
function periodMonthFromSheet(name:string){const m=name.match(/(januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember)/i); if(!m)return null; const names=['januari','februari','maret','april','mei','juni','juli','agustus','september','oktober','november','desember']; return names.indexOf(m[1].toLowerCase())+1}
function detectType(file:string){const f=file.toLowerCase(); if(f.includes('ptm'))return 'PTM'; if(f.includes('menular'))return 'INFECTIOUS'; if(f.includes('rujukan'))return 'REFERRAL'; if(f.includes('kematian'))return 'DEATH'; if(f.includes('bjmhs'))return 'BJMHS'; if(f.includes('hamil'))return 'MATERNAL'; if(f.includes('paliatif'))return 'PALLIATIVE'; if(f.includes('kie'))return 'KIE'; if(f.includes('sarpras'))return 'SARPRAS'; return null}
async function resolveUpt(name:string){const n=normalize(name).toLowerCase(); const all=await db.masterUPT.findMany(); return all.find(x=>n===x.namaUpt.toLowerCase()||n.includes(x.namaUpt.toLowerCase())||x.namaUpt.toLowerCase().includes(n))}
async function resolvePeriod(month:number,year=2026){return db.reportPeriod.findFirst({where:{tahun:year,bulan:month}})}
async function previewWorkbook(buf:Buffer, filename:string){const wb=XLSX.read(buf,{type:'buffer',cellDates:true}); const type=detectType(filename); const sheets=wb.SheetNames; const results:any[]=[]; for(const sn of sheets){const ws=wb.Sheets[sn]; const rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:null,raw:true}) as any[][]; const month=periodMonthFromSheet(sn); const sample=rows.slice(0,20); const headers=sample.find(r=>r.filter(Boolean).length>=3)||[]; results.push({sheet:sn,rows:rows.length,month,headers:headers.slice(0,25),preview:rows.slice(Math.max(0,(findHeader(rows,['no'])>=0?findHeader(rows,['no']):0)),Math.min(rows.length,10)).map(r=>r.slice(0,15))});} return {type,sheets:results}}
async function importPTM(buf:Buffer,filename:string,uptId:string,periodId:string,batchId:string){const wb=XLSX.read(buf,{type:'buffer',cellDates:true}); let count=0,warn=0,error=0; for(const sn of wb.SheetNames){const ws=wb.Sheets[sn]; const rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:null,raw:true}) as any[][]; if(!/lap /i.test(sn))continue; let header=findHeader(rows,['nama satker']); if(header<0)continue; const diseaseRow=header+1,statusRow=header+2; const satkerIdx=1; const dataStart=header+3; for(let r=dataStart;r<rows.length;r++){const row=rows[r]; const satker=normalize(row[satkerIdx]); if(!satker||satker.toLowerCase().includes('total'))continue; const rowUpt=await resolveUpt(satker)||{id:uptId}; for(let c=2;c<row.length;c++){const disease=normalize(rows[diseaseRow]?.[c]); const status=normalize(rows[statusRow]?.[c]).toUpperCase(); if(!disease||!['LAMA','BARU'].includes(status))continue; const value=num(row[c]); if(value===null){if(row[c]!==null&&row[c]!==''){warn++;}continue;} const sf=await db.sourceRecord.create({data:{sourceFileId:batchId,sheetName:sn,sourceRow:r+1,rawPayload:row as any,normalizedPayload:{disease,status,value},validationStatus:ValidationStatus.VALID}}); await db.ptmCaseSummary.create({data:{uptId:rowUpt.id,periodId,diseaseGroup:'Tidak ditentukan',diseaseName:disease,caseStatus:status as CaseStatus,caseCount:value,sourceRecordId:sf.id}}); count++; }} return {count,warn,error}}
}
app.get('/api/health',async(_q,res)=>{try{await db.$queryRaw`SELECT 1`;res.json({ok:true})}catch{res.status(503).json({ok:false})}});
app.post('/api/auth/login',async(req,res)=>{const {identifier,password}=req.body||{}; const u=await db.user.findFirst({where:{email:identifier,active:true}}); if(!u||!(await bcrypt.compare(password||'',u.passwordHash)))return res.status(401).json({message:'Email atau kata sandi tidak valid.'}); const token=jwt.sign({id:u.id,role:u.role},SECRET,{expiresIn:'8h'}); await db.auditLog.create({data:{userId:u.id,action:'LOGIN',module:'AUTH'}}); res.json({token,user:{id:u.id,name:u.name,email:u.email,role:u.role}})});
app.use('/api',auth);
app.get('/api/me',async(req:Req,res)=>res.json(await db.user.findUnique({where:{id:req.user!.id},select:{id:true,name:true,email:true,role:true}})));
app.get('/api/upts',async(_q,res)=>res.json(await db.masterUPT.findMany({where:{aktif:true},orderBy:{namaUpt:'asc'}})));
app.get('/api/periods',async(_q,res)=>res.json(await db.reportPeriod.findMany({orderBy:[{tahun:'desc'},{bulan:'desc'}],take:36})));
app.get('/api/report-types',async(_q,res)=>res.json(await db.reportType.findMany({orderBy:{name:'asc'}})));

app.get('/api/monitoring/matrix',async(req,res)=>{
  const periodId=String(req.query.periodId||'');
  const cutoffDay=Math.max(1,Math.min(31,Number(req.query.cutoffDay||25)));
  if(!periodId)return res.status(400).json({message:'periodId wajib diisi.'});
  const period=await db.reportPeriod.findUnique({where:{id:periodId}});
  if(!period)return res.status(404).json({message:'Periode tidak ditemukan.'});
  const monthlyTypes=await db.reportType.findMany({where:{periodicity:'MONTHLY'},orderBy:{name:'asc'}});
  const [upts,submissions]=await Promise.all([
    db.masterUPT.findMany({where:{aktif:true},orderBy:{namaUpt:'asc'}}),
    db.reportSubmission.findMany({where:{periodId},select:{uptId:true,reportTypeId:true,status:true,receivedAt:true,validatedAt:true,notes:true}})
  ]);
  const subMap=new Map(submissions.map(x=>[`${x.uptId}:${x.reportTypeId}`,x]));
  const cutoff=new Date(period.startDate); cutoff.setDate(cutoffDay); cutoff.setHours(23,59,59,999);
  const now=new Date();
  const isPastCutoff=now>cutoff;
  const matrix=upts.map(upt=>{
    const reports=monthlyTypes.map(type=>{
      const found=subMap.get(`${upt.id}:${type.id}`);
      let status=found?.status|| (isPastCutoff?SubmissionStatus.TERLAMBAT:SubmissionStatus.BELUM_MASUK);
      return {reportTypeId:type.id,code:type.code,name:type.name,status,receivedAt:found?.receivedAt||null,validatedAt:found?.validatedAt||null,notes:found?.notes||null};
    });
    const counts={total:reports.length,valid:0,warning:0,error:0,received:0,missing:0,late:0};
    for(const r of reports){
      if(r.status===SubmissionStatus.VALID||r.status===SubmissionStatus.DITERIMA) counts.valid++;
      if(r.status===SubmissionStatus.WARNING) counts.warning++;
      if(r.status===SubmissionStatus.ERROR) counts.error++;
      if(r.status!==SubmissionStatus.BELUM_MASUK&&r.status!==SubmissionStatus.TERLAMBAT) counts.received++;
      if(r.status===SubmissionStatus.BELUM_MASUK) counts.missing++;
      if(r.status===SubmissionStatus.TERLAMBAT) counts.late++;
    }
    const overall=counts.error>0?'ERROR':counts.missing>0?'BELUM_MASUK':counts.late>0?'TERLAMBAT':counts.warning>0?'WARNING':'LENGKAP';
    return {uptId:upt.id,kodeUpt:upt.kodeUpt,namaUpt:upt.namaUpt,reports,counts,overall};
  });
  const flat=matrix.flatMap(x=>x.reports);
  const summary={expected:flat.length,valid:flat.filter(x=>x.status==='VALID'||x.status==='DITERIMA').length,warning:flat.filter(x=>x.status==='WARNING').length,error:flat.filter(x=>x.status==='ERROR').length,received:flat.filter(x=>!['BELUM_MASUK','TERLAMBAT'].includes(x.status)).length,missing:flat.filter(x=>x.status==='BELUM_MASUK').length,late:flat.filter(x=>x.status==='TERLAMBAT').length};
  res.json({period:{id:period.id,label:period.label,cutoffDay,cutoffDate:cutoff.toISOString(),pastCutoff:isPastCutoff},reportTypes:monthlyTypes,matrix,summary});
});
app.get('/api/submissions',async(req,res)=>{const p=String(req.query.periodId||''); const where:any=p?{periodId:p}:{}; res.json(await db.reportSubmission.findMany({where,include:{upt:true,reportType:true,period:true},orderBy:{upt:{namaUpt:'asc'}}}))});
app.post('/api/import/preview',allow(RoleName.ADMIN,RoleName.OPERATOR),upload.single('file'),async(req:Req,res)=>{if(!req.file)return res.status(400).json({message:'File wajib dipilih.'}); try{res.json(await previewImportWorkbook(req.file.buffer,req.file.originalname));}catch(e:any){res.status(400).json({message:'Permintaan tidak valid atau data tidak dapat diproses.'})}});
app.post('/api/import/commit',allow(RoleName.ADMIN,RoleName.OPERATOR),upload.single('file'),async(req:Req,res)=>{
  if(!req.file)return res.status(400).json({message:'File wajib dipilih.'});
  const type=detectReportType(req.file.originalname, XLSX.read(req.file.buffer,{type:'buffer',bookProps:false})); if(!type)return res.status(400).json({message:'Jenis laporan belum dikenali. Gunakan nama file/template standar.'});
  const hash=crypto.createHash('sha256').update(req.file.buffer).digest('hex');
  const duplicate=await db.sourceFile.findFirst({where:{fileHash:hash}}); if(duplicate)return res.status(409).json({message:'File ini sudah pernah diimpor.',sourceFileId:duplicate.id});
  const uptId=String(req.body.uptId||''); const periodId=String(req.body.periodId||''); if(!uptId||!periodId)return res.status(400).json({message:'UPT dan periode wajib dipilih.'});
  let storedPath='';
  try{
    const stored=await persistUpload(req.file.buffer,req.file.originalname,process.env.UPLOAD_DIR||'./uploads'); storedPath=stored.path;
    const result=await db.$transaction(async tx=>{
      const batch=await tx.importBatch.create({data:{batchNumber:'IMP-'+Date.now(),uploadedBy:req.user!.id,uptId,periodId,status:ImportStatus.PROCESSING,totalFiles:1}});
      const sf=await tx.sourceFile.create({data:{importBatchId:batch.id,fileName:req.file!.originalname,fileType:req.file!.mimetype,fileSize:BigInt(req.file!.size),fileHash:hash,storagePath:stored.path,sourceReportType:type}});
      const r=await runImport(tx,{buf:req.file!.buffer,fileName:req.file!.originalname,fileId:sf.id,uptId,periodId,type});
      if(r.errors) throw Object.assign(new Error('Import gagal karena terdapat error validasi.'),{statusCode:422,details:r, batchId:batch.id,sourceFileId:sf.id});
      const status=r.warnings?SubmissionStatus.WARNING:SubmissionStatus.VALID;
      await tx.importBatch.update({where:{id:batch.id},data:{status:ImportStatus.SAVED,totalRows:r.valid+r.warnings+r.errors,validRows:r.valid,warningRows:r.warnings,errorRows:r.errors}});
      let rt=await tx.reportType.findUnique({where:{code:type}}); if(!rt) rt=await tx.reportType.create({data:{code:type,name:type==='MEDICINE'?'Manajemen Obat':'Laporan '+type,periodicity:'MONTHLY'}});
      await tx.reportSubmission.upsert({where:{uptId_periodId_reportTypeId:{uptId,periodId,reportTypeId:rt.id}},update:{status,receivedAt:new Date(),validatedAt:new Date(),importBatchId:batch.id},create:{uptId,periodId,reportTypeId:rt.id,status,receivedAt:new Date(),validatedAt:new Date(),importBatchId:batch.id}});
      return {batchId:batch.id,sourceFileId:sf.id,result:r};
    },{timeout:120000});
    await audit(req,'IMPORT_SAVED','IMPORT',result.batchId,{type,filename:req.file.originalname,hash,issues:result.result.issues.length});
    res.json({batchId:result.batchId,sourceFileId:result.sourceFileId,type,fileHash:hash,...result.result});
  }catch(e:any){
    if(e?.statusCode===422) return res.status(422).json({message:'Import gagal karena terdapat error validasi.',batchId:e.batchId,sourceFileId:e.sourceFileId,...e.details});
    if(storedPath){try{await import('node:fs/promises').then(fs=>fs.unlink(storedPath).catch(()=>{}));}catch{}}
    res.status(500).json({message:'Import gagal dan seluruh perubahan dibatalkan.'});
  }
});

app.get('/api/dashboard',async(req,res)=>{const periodId=String(req.query.periodId||''); const where=periodId?{periodId}:{}; const [ptm,ref,death,bjmhs,kie,pall,maternal,infectious,submissions,upts]=await Promise.all([db.ptmCaseSummary.aggregate({where,_sum:{caseCount:true}}),db.referral.count({where}),db.deathRecord.count({where}),db.bjmhsScreening.count({where}),db.kieActivitySummary.aggregate({where,_sum:{participantCount:true}}),db.palliativeRecord.count({where}),db.maternalRecord.count({where}),db.infectiousDiseaseSummary.aggregate({where,_sum:{value:true}}),db.reportSubmission.findMany({where,include:{upt:true,reportType:true}}),db.masterUPT.count({where:{aktif:true}})]); res.json({kpi:{ptm:ptm._sum.caseCount||0,referrals:ref,deaths:death,bjmhs,kieParticipants:kie._sum.participantCount||0,palliative:pall,maternal,infectious:infectious._sum.value||0},monitoring:{upts,submissions}})});
app.get('/api/recap/upt',async(req,res)=>{
  const periodId=String(req.query.periodId||'');
  const [upts,ptm,infectious,referrals,deaths,bjmhs,kie]=await Promise.all([
    db.masterUPT.findMany({where:{aktif:true},orderBy:{namaUpt:'asc'}}),
    db.ptmCaseSummary.groupBy({by:['uptId'],where:periodId?{periodId}:{},_sum:{caseCount:true}}),
    db.infectiousDiseaseSummary.groupBy({by:['uptId'],where:periodId?{periodId}:{},_sum:{value:true}}),
    db.referral.groupBy({by:['uptId'],where:periodId?{periodId}:{},_count:{_all:true}}),
    db.deathRecord.groupBy({by:['uptId'],where:periodId?{periodId}:{},_count:{_all:true}}),
    db.bjmhsScreening.groupBy({by:['uptId'],where:periodId?{periodId}:{},_count:{_all:true}}),
    db.kieActivitySummary.groupBy({by:['uptId'],where:periodId?{periodId}:{},_sum:{participantCount:true}})
  ]);
  const map=new Map(upts.map(u=>[u.id,{uptId:u.id,namaUpt:u.namaUpt,ptm:0,infectious:0,referrals:0,deaths:0,bjmhs:0,kieParticipants:0}]));
  for(const r of ptm){const x=map.get(r.uptId);if(x)x.ptm=r._sum.caseCount||0}
  for(const r of infectious){const x=map.get(r.uptId);if(x)x.infectious=r._sum.value||0}
  for(const r of referrals){const x=map.get(r.uptId);if(x)x.referrals=r._count._all}
  for(const r of deaths){const x=map.get(r.uptId);if(x)x.deaths=r._count._all}
  for(const r of bjmhs){const x=map.get(r.uptId);if(x)x.bjmhs=r._count._all}
  for(const r of kie){const x=map.get(r.uptId);if(x)x.kieParticipants=r._sum.participantCount||0}
  res.json([...map.values()]);
});

app.get('/api/recap/report-types',async(req,res)=>{
  const periodId=String(req.query.periodId||'');
  const types=await db.reportType.findMany({orderBy:{name:'asc'}});
  const submissions=await db.reportSubmission.findMany({where:periodId?{periodId}:{},select:{reportTypeId:true,status:true}});
  const map=new Map<string,any>();
  for(const t of types)map.set(t.id,{id:t.id,code:t.code,name:t.name,total:0,valid:0,warning:0,error:0,terlambat:0});
  for(const s of submissions){const x=map.get(s.reportTypeId);if(!x)continue;x.total++;if(s.status==='VALID'||s.status==='DITERIMA')x.valid++;if(s.status==='WARNING')x.warning++;if(s.status==='ERROR')x.error++;if(s.status==='TERLAMBAT')x.terlambat++}
  res.json([...map.values()]);
});

app.get('/api/analysis/overview',async(req,res)=>{
  const periodId=String(req.query.periodId||'');
  if(!periodId)return res.status(400).json({message:'periodId wajib diisi.'});
  const period=await db.reportPeriod.findUnique({where:{id:periodId}});
  if(!period)return res.status(404).json({message:'Periode tidak ditemukan.'});
  const [ptm, infectious, referrals, deaths, bjmhs, kie, palliative, maternal]=await Promise.all([
    db.ptmCaseSummary.groupBy({by:['diseaseName'],where:{periodId},_sum:{caseCount:true}}),
    db.infectiousDiseaseSummary.groupBy({by:['program'],where:{periodId},_sum:{value:true}}),
    db.referral.count({where:{periodId}}), db.deathRecord.count({where:{periodId}}),
    db.bjmhsScreening.count({where:{periodId}}), db.kieActivitySummary.aggregate({where:{periodId},_sum:{participantCount:true}}),
    db.palliativeRecord.count({where:{periodId}}), db.maternalRecord.count({where:{periodId}})
  ]);
  const topPtm=ptm.map(x=>({name:x.diseaseName,value:x._sum.caseCount||0})).sort((a,b)=>b.value-a.value).slice(0,10);
  const infectiousByProgram=infectious.map(x=>({name:x.program,value:x._sum.value||0})).sort((a,b)=>b.value-a.value);
  res.json({period,topPtm,infectiousByProgram,kpi:{referrals,deaths,bjmhs,kieParticipants:kie._sum.participantCount||0,palliative,maternal}});
});
app.get('/api/analysis/trend',async(req,res)=>{
  const year=Number(req.query.year||new Date().getFullYear());
  const periods=await db.reportPeriod.findMany({where:{tahun:year,tipePeriode:'BULANAN'},orderBy:{bulan:'asc'}});
  const out=[];
  for(const p of periods){
    const [ptm,inf,ref,death,bjmhs,kie]=await Promise.all([
      db.ptmCaseSummary.aggregate({where:{periodId:p.id},_sum:{caseCount:true}}),
      db.infectiousDiseaseSummary.aggregate({where:{periodId:p.id},_sum:{value:true}}),
      db.referral.count({where:{periodId:p.id}}),db.deathRecord.count({where:{periodId:p.id}}),
      db.bjmhsScreening.count({where:{periodId:p.id}}),db.kieActivitySummary.aggregate({where:{periodId:p.id},_sum:{participantCount:true}})
    ]);
    out.push({periodId:p.id,label:p.label,bulan:p.bulan,ptm:ptm._sum.caseCount||0,infectious:inf._sum.value||0,referrals:ref,deaths:death,bjmhs,kieParticipants:kie._sum.participantCount||0});
  }
  res.json(out);
});

function optionalInt(v:any){if(v===null||v===undefined||v==='')return null;const n=Number(v);return Number.isInteger(n)?n:null}
function optionalDecimal(v:any){if(v===null||v===undefined||v==='')return null;const n=Number(v);return Number.isFinite(n)?n:null}
function optionalDate(v:any){if(v===null||v===undefined||v==='')return null;const d=new Date(v);return Number.isNaN(d.getTime())?null:d}
function healthExamPayload(b:any){return {
  examinationDate:optionalDate(b.examinationDate), systolic:optionalInt(b.systolic), diastolic:optionalInt(b.diastolic), pulse:optionalInt(b.pulse),
  temperature:optionalDecimal(b.temperature), heightCm:optionalDecimal(b.heightCm), weightKg:optionalDecimal(b.weightKg), waistCm:optionalDecimal(b.waistCm),
  bloodSugar:optionalDecimal(b.bloodSugar), totalCholesterol:optionalDecimal(b.totalCholesterol), hdl:optionalDecimal(b.hdl), ldl:optionalDecimal(b.ldl),
  triglycerides:optionalDecimal(b.triglycerides), uricAcid:optionalDecimal(b.uricAcid), hemoglobin:optionalDecimal(b.hemoglobin),
  oxygenSaturation:optionalDecimal(b.oxygenSaturation), respiratoryRate:optionalInt(b.respiratoryRate), complaints:normalize(b.complaints)||null,
  diseaseHistory:normalize(b.diseaseHistory)||null, currentMedication:normalize(b.currentMedication)||null, examinerName:normalize(b.examinerName)||null,
  conclusion:normalize(b.conclusion)||null, notes:normalize(b.notes)||null
}}
function healthDiff(before:any,after:any){const keys=['name','nik','address','phone','birthPlace','birthDate','sex','bloodType','email','examinationDate','systolic','diastolic','pulse','temperature','heightCm','weightKg','waistCm','bloodSugar','totalCholesterol','hdl','ldl','triglycerides','uricAcid','hemoglobin','oxygenSaturation','respiratoryRate','complaints','diseaseHistory','currentMedication','examinerName','conclusion','notes'];const changes:any[]=[];for(const k of keys){const a=before?.[k] instanceof Date?before[k].toISOString():before?.[k];const b=after?.[k] instanceof Date?after[k].toISOString():after?.[k];if(String(a??'')!==String(b??''))changes.push({field:k,before:a??null,after:b??null})}return changes}

/**
 * Unified operational read API for the 19-menu UI.
 * Keeps each domain in its own Prisma model while exposing one
 * consistent, filterable shape for operational pages.
 */
app.get('/api/module-data',async(req,res)=>{
  try{
    const module=String(req.query.module||'').toUpperCase();
    const uptId=String(req.query.uptId||'');
    const periodId=String(req.query.periodId||'');
    const startPeriodId=String(req.query.startPeriodId||'');
    const endPeriodId=String(req.query.endPeriodId||'');
    const search=normalize(req.query.search||'');
    let periodIds:string[]|undefined;
    if(startPeriodId||endPeriodId){
      const start=startPeriodId?await db.reportPeriod.findUnique({where:{id:startPeriodId},select:{startDate:true}}):null;
      const end=endPeriodId?await db.reportPeriod.findUnique({where:{id:endPeriodId},select:{endDate:true}}):null;
      if(start||end){
        const ps=await db.reportPeriod.findMany({
          where:{startDate:start?.startDate?{gte:start.startDate}:undefined,endDate:end?.endDate?{lte:end.endDate}:undefined},
          select:{id:true}
        });
        periodIds=ps.map(x=>x.id);
      }
    }else if(periodId) periodIds=[periodId];
    const base:any={...(uptId?{uptId}:{}),...(periodIds?{periodId:{in:periodIds}}:{})};
    let rows:any[]=[];
    let columns:string[]=[];
    switch(module){
      case 'KIE':
        rows=await db.kieActivitySummary.findMany({where:base,orderBy:{periodId:'desc'},take:2000});
        columns=['UPT','Periode','Topik','Peserta','Penyuluh','Nakes','Non-Nakes','Internal','Eksternal'];
        rows=rows.map(x=>({UPT:x.uptId,Periode:x.periodId,Topik:x.topic,Peserta:x.participantCount,Penyuluh:x.counselorCount,Nakes:x.medicalProfessionalCount,'Non-Nakes':x.nonMedicalProfessionalCount,Internal:x.internalInstitutionCount,Eksternal:x.externalInstitutionCount}));
        break;
      case 'INFECTIOUS':
        rows=await db.infectiousDiseaseSummary.findMany({where:base,orderBy:{periodId:'desc'},take:2000});
        columns=['UPT','Periode','Program','Indikator','Kategori','Nilai'];
        rows=rows.map(x=>({UPT:x.uptId,Periode:x.periodId,Program:x.program,Indikator:x.indicator,Kategori:x.category||'',Nilai:x.value}));
        break;
      case 'PTM':
        rows=await db.ptmCaseSummary.findMany({where:base,orderBy:{periodId:'desc'},take:2000});
        columns=['UPT','Periode','Kelompok Penyakit','Penyakit','Status','Jumlah'];
        rows=rows.map(x=>({UPT:x.uptId,Periode:x.periodId,'Kelompok Penyakit':x.diseaseGroup,Penyakit:x.diseaseName,Status:x.caseStatus,Jumlah:x.caseCount}));
        break;
      case 'PALLIATIVE':
        rows=await db.palliativeRecord.findMany({where:base,orderBy:{periodId:'desc'},take:2000});
        columns=['UPT','Periode','Nama','Jenis Kelamin','Usia','Diagnosis','Status Perawatan'];
        rows=rows.map(x=>({UPT:x.uptId,Periode:x.periodId,Nama:x.personName||'', 'Jenis Kelamin':x.sex||'',Usia:x.age??'',Diagnosis:x.diagnosis||'','Status Perawatan':x.careStatus||''}));
        break;
      case 'DEATH':
        rows=await db.deathRecord.findMany({where:base,orderBy:{deathDate:'desc'},take:2000});
        columns=['UPT','Periode','Nama','Jenis Kelamin','Tanggal Kematian','Usia','Diagnosis Utama','Catatan'];
        rows=rows.map(x=>({UPT:x.uptId,Periode:x.periodId,Nama:x.personName||'','Jenis Kelamin':x.sex||'','Tanggal Kematian':x.deathDate?.toISOString?.()||'',Usia:x.age??'','Diagnosis Utama':x.primaryDiagnosis||'',Catatan:x.notes||''}));
        break;
      case 'REFERRAL':
        rows=await db.referral.findMany({where:base,orderBy:{referralDate:'desc'},take:2000});
        columns=['UPT','Periode','Nama','Jenis Kelamin','Usia','Diagnosis','Jenis Rujukan','Tujuan','Tanggal Rujukan'];
        rows=rows.map(x=>({UPT:x.uptId,Periode:x.periodId,Nama:x.personName||'','Jenis Kelamin':x.sex||'',Usia:x.age??'',Diagnosis:x.diagnosis||'','Jenis Rujukan':x.referralType||'',Tujuan:x.destinationFacility||'','Tanggal Rujukan':x.referralDate?.toISOString?.()||''}));
        break;
      case 'KIA':
        rows=await db.maternalRecord.findMany({where:base,orderBy:{periodId:'desc'},take:2000});
        columns=['UPT','Periode','Nama','Usia','Kehamilan','Usia Kehamilan','Persalinan','Jenis Persalinan','Menyusui','Rujukan'];
        rows=rows.map(x=>({UPT:x.uptId,Periode:x.periodId,Nama:x.personName||'',Usia:x.age??'',Kehamilan:x.pregnancyStatus||'','Usia Kehamilan':x.gestationalAge||'',Persalinan:x.deliveryStatus||'','Jenis Persalinan':x.deliveryType||'',Menyusui:x.breastfeedingStatus||'',Rujukan:x.referralStatus||''}));
        break;
      case 'BJMHS':
        rows=await db.bjmhsScreening.findMany({where:base,orderBy:{periodId:'desc'},take:2000});
        columns=['UPT','Periode','Nama','Jenis Kelamin','Status WBP','Hasil Screening','Diagnosis','Tindak Lanjut'];
        rows=rows.map(x=>({UPT:x.uptId,Periode:x.periodId,Nama:x.personName||'','Jenis Kelamin':x.sex||'','Status WBP':x.legalStatus||'','Hasil Screening':x.screeningResult||'',Diagnosis:x.diagnosis||'','Tindak Lanjut':x.followUp||''}));
        break;
      case 'SARPRAS':
        rows=await db.clinicFacility.findMany({where:uptId?{uptId}:{},orderBy:[{year:'desc'},{semester:'desc'}],take:2000});
        if(periodIds?.length){
          const ps=await db.reportPeriod.findMany({where:{id:{in:periodIds}},select:{tahun:true,semester:true}});
          const keys=new Set(ps.map(x=>`${x.tahun}-${x.semester}`)); rows=rows.filter(x=>keys.has(`${x.year}-${x.semester}`));
        }
        columns=['UPT','Tahun','Semester','Kategori','Item','Jumlah','Kondisi','Ketersediaan','Catatan'];
        rows=rows.map(x=>({UPT:x.uptId,Tahun:x.year,Semester:x.semester,Kategori:x.category||'',Item:x.facilityItem,Jumlah:x.quantity,Kondisi:x.condition||'',Ketersediaan:x.availabilityStatus||'',Catatan:x.notes||''}));
        break;
      default:return res.status(400).json({message:'Modul tidak didukung.'});
    }
    if(search){
      const q=search.toLowerCase();
      rows=rows.filter(r=>Object.values(r).join(' ').toLowerCase().includes(q));
    }
    res.json({module,columns,rows,total:rows.length});
  }catch(e:any){res.status(500).json({message:'Gagal memuat data modul.'})}
});

app.get('/api/health/profiles',async(req,res)=>{const search=normalize(req.query.search||'');const where:any=search?{OR:[{name:{contains:search}},{nik:{contains:search}},{phone:{contains:search}}]}:{};const rows=await db.healthProfile.findMany({where,include:{createdBy:{select:{id:true,name:true}},lastUpdatedBy:{select:{id:true,name:true}},_count:{select:{exams:true}}},orderBy:{updatedAt:'desc'},take:200});res.json(rows)});
app.post('/api/health/profiles',allow(RoleName.ADMIN,RoleName.OPERATOR),async(req:Req,res)=>{const b=req.body||{};const name=normalize(b.name);if(!name)return res.status(400).json({message:'Nama wajib diisi.'});const item=await db.healthProfile.create({data:{name,nik:normalize(b.nik)||null,address:normalize(b.address)||null,phone:normalize(b.phone)||null,birthPlace:normalize(b.birthPlace)||null,birthDate:optionalDate(b.birthDate),sex:normalize(b.sex)||null,bloodType:normalize(b.bloodType)||null,email:normalize(b.email)||null,createdById:req.user!.id,lastUpdatedById:req.user!.id}});await audit(req,'CREATE','HEALTH_PROFILE',item.id,{changes:[{field:'record',before:null,after:'created'}]});res.status(201).json(item)});
app.patch('/api/health/profiles/:id',allow(RoleName.ADMIN,RoleName.OPERATOR),async(req:Req,res)=>{try{const id=String(req.params.id);const before=await db.healthProfile.findUnique({where:{id}});if(!before)return res.status(404).json({message:'Data pegawai/pasien tidak ditemukan.'});const b=req.body||{};const reason=normalize(b.changeReason);if(!reason)return res.status(400).json({message:'Alasan perubahan wajib diisi saat mengedit data.'});const data:any={name:b.name!==undefined?normalize(b.name):undefined,nik:b.nik!==undefined?(normalize(b.nik)||null):undefined,address:b.address!==undefined?(normalize(b.address)||null):undefined,phone:b.phone!==undefined?(normalize(b.phone)||null):undefined,birthPlace:b.birthPlace!==undefined?(normalize(b.birthPlace)||null):undefined,birthDate:b.birthDate!==undefined?optionalDate(b.birthDate):undefined,sex:b.sex!==undefined?(normalize(b.sex)||null):undefined,bloodType:b.bloodType!==undefined?(normalize(b.bloodType)||null):undefined,email:b.email!==undefined?(normalize(b.email)||null):undefined,lastUpdatedById:req.user!.id};if(data.name==='')return res.status(400).json({message:'Nama wajib diisi.'});const item=await db.healthProfile.update({where:{id},data});const changes=healthDiff(before,item);if(changes.length)await audit(req,'UPDATE','HEALTH_PROFILE',id,{reason,changes});res.json(item)}catch(e:any){res.status(400).json({message:'Permintaan tidak valid atau data tidak dapat diproses.'})}});
app.get('/api/health/profiles/:id',async(req,res)=>{
  const id=String(req.params.id);
  const item=await db.healthProfile.findUnique({
    where:{id},
    include:{
      createdBy:{select:{id:true,name:true}},
      lastUpdatedBy:{select:{id:true,name:true}},
      exams:{
        include:{
          createdBy:{select:{id:true,name:true}},
          lastUpdatedBy:{select:{id:true,name:true}},
          medications:{include:{medicine:{select:{id:true,code:true,name:true,unit:true}}}}
        },
        orderBy:{examinationDate:'desc'}
      }
    }
  });
  if(!item)return res.status(404).json({message:'Data tidak ditemukan.'});
  res.json(item)
});
app.post('/api/health/profiles/:id/exams',allow(RoleName.ADMIN,RoleName.OPERATOR),async(req:Req,res)=>{try{const profileId=String(req.params.id);const profile=await db.healthProfile.findUnique({where:{id:profileId}});if(!profile)return res.status(404).json({message:'Pegawai/pasien tidak ditemukan.'});const b=req.body||{};const payload=healthExamPayload(b);const meds=Array.isArray(b.medications)?b.medications.filter((m:any)=>normalize(m?.medicineName)).map((m:any)=>({medicineId:m.medicineId||null,medicineName:normalize(m.medicineName),quantity:optionalInt(m.quantity),unit:normalize(m.unit)||null,notes:normalize(m.notes)||null})):[];const exam=await db.healthExam.create({data:{...payload,profileId,createdById:req.user!.id,lastUpdatedById:req.user!.id,medications:{create:meds}},include:{medications:true}});await db.healthProfile.update({where:{id:profileId},data:{lastUpdatedById:req.user!.id}});await audit(req,'CREATE','HEALTH_EXAM',exam.id,{profileId,changes:[{field:'record',before:null,after:'created'}],medications:meds});res.status(201).json(exam)}catch(e:any){res.status(400).json({message:'Permintaan tidak valid atau data tidak dapat diproses.'})}});
app.patch('/api/health/exams/:id',allow(RoleName.ADMIN,RoleName.OPERATOR),async(req:Req,res)=>{try{const id=String(req.params.id);const before=await db.healthExam.findUnique({where:{id},include:{medications:true}});if(!before)return res.status(404).json({message:'Pemeriksaan tidak ditemukan.'});const body=req.body||{};const reason=normalize(body.changeReason);if(!reason)return res.status(400).json({message:'Alasan perubahan wajib diisi saat mengedit pemeriksaan.'});const data=healthExamPayload(body);const item=await db.healthExam.update({where:{id},data:{...data,lastUpdatedById:req.user!.id}});const changes=healthDiff(before,item);if(changes.length)await audit(req,'UPDATE','HEALTH_EXAM',id,{reason,changes});res.json(item)}catch(e:any){res.status(400).json({message:'Permintaan tidak valid atau data tidak dapat diproses.'})}});
app.get('/api/health/exams/:id/audit',async(req,res)=>{const id=String(req.params.id);const logs=await db.auditLog.findMany({where:{recordId:id,module:{in:['HEALTH_EXAM','HEALTH_PROFILE']}},include:{user:{select:{id:true,name:true,email:true}}},orderBy:{createdAt:'desc'},take:200});res.json(logs)});
app.get('/api/health/profiles/:id/audit',async(req,res)=>{const id=String(req.params.id);const examIds=(await db.healthExam.findMany({where:{profileId:id},select:{id:true}})).map(x=>x.id);const ids=[id,...examIds];const logs=await db.auditLog.findMany({where:{recordId:{in:ids},module:{in:['HEALTH_EXAM','HEALTH_PROFILE']}},include:{user:{select:{id:true,name:true,email:true}}},orderBy:{createdAt:'desc'},take:500});res.json(logs)});
app.get('/api/medicines',async(req,res)=>{
  const uptId=String(req.query.uptId||'');
  const where:any={active:true}; if(uptId) where.OR=[{uptId},{uptId:null}];
  const medicines=await db.medicineMaster.findMany({where,orderBy:{name:'asc'}});
  res.json(medicines);
});
app.post('/api/medicines',allow(RoleName.ADMIN,RoleName.OPERATOR),async(req:Req,res)=>{
  const b=req.body||{};
  if(!b.code||!b.name||!b.unit)return res.status(400).json({message:'Kode, nama obat, dan satuan wajib diisi.'});
  const min=Number(b.minStock||0), max=b.maxStock==null||b.maxStock===''?null:Number(b.maxStock);
  if(!Number.isInteger(min)||min<0|| (max!==null && (!Number.isInteger(max)||max<min)))return res.status(400).json({message:'Stok minimum/maksimum tidak valid.'});
  try{const item=await db.medicineMaster.create({data:{code:normalize(b.code),name:normalize(b.name),dosageForm:normalize(b.dosageForm)||null,strength:normalize(b.strength)||null,unit:normalize(b.unit),groupName:normalize(b.groupName)||null,category:normalize(b.category)||null,minStock:min,maxStock:max,uptId:b.uptId||null}});
  await audit(req,'CREATE','MEDICINE_MASTER',item.id,{code:item.code}); res.status(201).json(item);}catch(e:any){console.error(e);res.status(400).json({message:'Permintaan tidak valid atau data tidak dapat diproses.'})}
});
app.patch('/api/medicines/:id',allow(RoleName.ADMIN,RoleName.OPERATOR),async(req:Req,res)=>{try{const b=req.body||{}, current=await db.medicineMaster.findUnique({where:{id:Array.isArray(req.params.id)?req.params.id[0]:req.params.id}});if(!current)return res.status(404).json({message:'Obat tidak ditemukan.'});const min=b.minStock!==undefined?Number(b.minStock):current.minStock;const max=b.maxStock===null||b.maxStock===''?null:(b.maxStock!==undefined?Number(b.maxStock):current.maxStock);if(!Number.isInteger(min)||min<0||(max!==null&&(!Number.isInteger(max)||max<min)))return res.status(400).json({message:'Stok minimum/maksimum tidak valid.'});if(b.uptId){const u=await db.masterUPT.findUnique({where:{id:b.uptId}});if(!u?.aktif)return res.status(400).json({message:'UPT tidak aktif.'});}const item=await db.medicineMaster.update({where:{id:String(req.params.id)},data:{name:b.name!==undefined?normalize(b.name):undefined,dosageForm:b.dosageForm!==undefined?(normalize(b.dosageForm)||null):undefined,strength:b.strength!==undefined?(normalize(b.strength)||null):undefined,unit:b.unit!==undefined?normalize(b.unit):undefined,groupName:b.groupName!==undefined?(normalize(b.groupName)||null):undefined,category:b.category!==undefined?(normalize(b.category)||null):undefined,minStock:min,maxStock:max,active:b.active!==undefined?Boolean(b.active):undefined,uptId:b.uptId!==undefined?(b.uptId||null):undefined}});await audit(req,'UPDATE','MEDICINE_MASTER',item.id);res.json(item)}catch(e:any){res.status(400).json({message:'Permintaan tidak valid atau data tidak dapat diproses.'})}});

async function medicineStock(uptId?:string, periodId?:string){
  const period=periodId?await db.reportPeriod.findUnique({where:{id:periodId}}):null;
  const end=period?.endDate||new Date();
  const meds=await db.medicineMaster.findMany({where:{active:true},orderBy:{name:'asc'}});
  const result=[];
  const scopeUpts=uptId?[uptId]:(await db.masterUPT.findMany({where:{aktif:true},select:{id:true}})).map(x=>x.id);
  for(const m of meds){
    const rows=[]; let opening=0;
    for(const uid of scopeUpts){
      const op=await db.medicineStockOpening.findFirst({where:{medicineId:m.id,uptId:uid,asOfDate:{lte:end}},orderBy:{asOfDate:'desc'}}); const openingQty=op?.quantity||0;
      const [receipts,inbounds,distOut,distIn,issues]=await Promise.all([
        db.medicineReceipt.aggregate({where:{medicineId:m.id,uptId:uid,receiptDate:{lte:end}},_sum:{quantity:true}}),
        db.medicineInbound.aggregate({where:{medicineId:m.id,uptId:uid,inboundDate:{lte:end}},_sum:{quantity:true}}),
        db.medicineDistribution.aggregate({where:{medicineId:m.id,sourceUptId:uid,distributionDate:{lte:end}},_sum:{quantity:true}}),
        db.medicineDistribution.aggregate({where:{medicineId:m.id,destinationUptId:uid,distributionDate:{lte:end}},_sum:{quantity:true}}),
        db.medicineIssue.aggregate({where:{medicineId:m.id,uptId:uid,issueDate:{lte:end}},_sum:{quantity:true}})
      ]);
      const masuk=(receipts._sum.quantity||0)+(inbounds._sum.quantity||0)+(distIn._sum.quantity||0), keluar=(distOut._sum.quantity||0)+(issues._sum.quantity||0);
      rows.push({uptId:uid,opening:openingQty,receipt:receipts._sum.quantity||0,inbound:inbounds._sum.quantity||0,distributionIn:distIn._sum.quantity||0,distributionOut:distOut._sum.quantity||0,issue:issues._sum.quantity||0,totalIn:masuk,totalOut:keluar,stock:openingQty+masuk-keluar});
    }
    const aggregate=rows.reduce((a,x)=>({opening:a.opening+x.opening,receipt:a.receipt+x.receipt,inbound:a.inbound+x.inbound,distributionIn:a.distributionIn+x.distributionIn,distributionOut:a.distributionOut+x.distributionOut,issue:a.issue+x.issue,totalIn:a.totalIn+x.totalIn,totalOut:a.totalOut+x.totalOut,stock:a.stock+x.stock}),{opening:0,receipt:0,inbound:0,distributionIn:0,distributionOut:0,issue:0,totalIn:0,totalOut:0,stock:0});
    result.push({id:m.id,code:m.code,name:m.name,dosageForm:m.dosageForm,strength:m.strength,unit:m.unit,category:m.category,minStock:m.minStock,maxStock:m.maxStock,...aggregate,lowStock:aggregate.stock<=m.minStock});
  }
  return result;
}
app.get('/api/medicines/stock',async(req,res)=>{const uptId=String(req.query.uptId||'')||undefined;const periodId=String(req.query.periodId||'')||undefined;res.json(await medicineStock(uptId,periodId));});
app.get('/api/medicines/transactions',async(req,res)=>{const uptId=String(req.query.uptId||'');const limit=Math.min(200,Math.max(1,Number(req.query.limit||100)));const [receipts,inbounds,dist,issues]=await Promise.all([db.medicineReceipt.findMany({where:uptId?{uptId}:{},include:{medicine:true,upt:true},orderBy:{receiptDate:'desc'},take:limit}),db.medicineInbound.findMany({where:uptId?{uptId}:{},include:{medicine:true,upt:true},orderBy:{inboundDate:'desc'},take:limit}),db.medicineDistribution.findMany({where:uptId?{OR:[{sourceUptId:uptId},{destinationUptId:uptId}]}:{},include:{medicine:true,sourceUpt:true,destinationUpt:true},orderBy:{distributionDate:'desc'},take:limit}),db.medicineIssue.findMany({where:uptId?{uptId}:{},include:{medicine:true,upt:true},orderBy:{issueDate:'desc'},take:limit})]);res.json({receipts,inbounds,distributions:dist,issues});});
async function getMedicineContext(medicineId:string, uptId:string, unit:string){
  const [medicine,upt]=await Promise.all([db.medicineMaster.findUnique({where:{id:medicineId}}),db.masterUPT.findUnique({where:{id:uptId}})]);
  if(!medicine||!medicine.active) throw new Error('Obat tidak ditemukan atau berstatus nonaktif.');
  if(!upt||!upt.aktif) throw new Error('UPT tidak ditemukan atau tidak aktif.');
  if(normalize(unit)!==medicine.unit) throw new Error(`Satuan transaksi harus ${medicine.unit}.`);
  return {medicine,upt};
}
function positiveQty(v:any){const n=Number(v);return Number.isInteger(n)&&n>0?n:null;}
function validDate(v:any){const d=new Date(v);return Number.isNaN(d.getTime())?null:d;}
async function stockAt(medicineId:string,uptId:string,at:Date){
  const [op,rec,inn,outDist,inDist,issue]=await Promise.all([
    db.medicineStockOpening.findFirst({where:{medicineId,uptId,asOfDate:{lte:at}},orderBy:{asOfDate:'desc'}}),
    db.medicineReceipt.aggregate({where:{medicineId,uptId,receiptDate:{lte:at}},_sum:{quantity:true}}),
    db.medicineInbound.aggregate({where:{medicineId,uptId,inboundDate:{lte:at}},_sum:{quantity:true}}),
    db.medicineDistribution.aggregate({where:{medicineId,sourceUptId:uptId,distributionDate:{lte:at}},_sum:{quantity:true}}),
    db.medicineDistribution.aggregate({where:{medicineId,destinationUptId:uptId,distributionDate:{lte:at}},_sum:{quantity:true}}),
    db.medicineIssue.aggregate({where:{medicineId,uptId,issueDate:{lte:at}},_sum:{quantity:true}})
  ]); return Number(op?.quantity||0)+Number(rec._sum.quantity||0)+Number(inn._sum.quantity||0)+Number(inDist._sum.quantity||0)-Number(outDist._sum.quantity||0)-Number(issue._sum.quantity||0);
}
app.post('/api/medicines/receipts',allow(RoleName.ADMIN,RoleName.OPERATOR),async(req:Req,res)=>{try{const b=req.body||{},q=positiveQty(b.quantity),d=validDate(b.receiptDate);if(!b.medicineId||!b.uptId||!d||!q)return res.status(400).json({message:'Obat, UPT, tanggal valid, dan jumlah bulat > 0 wajib diisi.'});const {medicine}=await getMedicineContext(b.medicineId,b.uptId,normalize(b.unit));if(b.expiryDate&&validDate(b.expiryDate)!==null&&new Date(b.expiryDate)<d)return res.status(400).json({message:'Tanggal kedaluwarsa tidak boleh sebelum tanggal penerimaan.'});const x=await db.medicineReceipt.create({data:{medicineId:medicine.id,uptId:b.uptId,receiptDate:d,documentNumber:normalize(b.documentNumber)||null,source:normalize(b.source)||null,batchNumber:normalize(b.batchNumber)||null,expiryDate:b.expiryDate?validDate(b.expiryDate):null,quantity:q,unit:medicine.unit,price:b.price!==undefined&&b.price!==''?Number(b.price):null,notes:normalize(b.notes)||null}});await audit(req,'CREATE','MEDICINE_RECEIPT',x.id);res.status(201).json(x)}catch(e:any){res.status(400).json({message:'Permintaan tidak valid atau data tidak dapat diproses.'})}});
app.post('/api/medicines/inbounds',allow(RoleName.ADMIN,RoleName.OPERATOR),async(req:Req,res)=>{try{const b=req.body||{},q=positiveQty(b.quantity),d=validDate(b.inboundDate);if(!b.medicineId||!b.uptId||!d||!q)return res.status(400).json({message:'Obat, UPT, tanggal valid, dan jumlah bulat > 0 wajib diisi.'});const {medicine}=await getMedicineContext(b.medicineId,b.uptId,normalize(b.unit));if(b.expiryDate&&validDate(b.expiryDate)!==null&&new Date(b.expiryDate)<d)return res.status(400).json({message:'Tanggal kedaluwarsa tidak boleh sebelum tanggal obat masuk.'});const x=await db.medicineInbound.create({data:{medicineId:medicine.id,uptId:b.uptId,inboundDate:d,documentNumber:normalize(b.documentNumber)||null,batchNumber:normalize(b.batchNumber)||null,expiryDate:b.expiryDate?validDate(b.expiryDate):null,quantity:q,unit:medicine.unit,source:normalize(b.source)||null,notes:normalize(b.notes)||null}});await audit(req,'CREATE','MEDICINE_INBOUND',x.id);res.status(201).json(x)}catch(e:any){res.status(400).json({message:'Permintaan tidak valid atau data tidak dapat diproses.'})}});
app.post('/api/medicines/distributions',allow(RoleName.ADMIN,RoleName.OPERATOR),async(req:Req,res)=>{try{const b=req.body||{},q=positiveQty(b.quantity),d=validDate(b.distributionDate);if(!b.medicineId||!b.sourceUptId||!b.destinationUptId||!d||!q)return res.status(400).json({message:'Obat, UPT asal/tujuan, tanggal valid, dan jumlah bulat > 0 wajib diisi.'});if(b.sourceUptId===b.destinationUptId)return res.status(400).json({message:'UPT asal dan tujuan harus berbeda.'});const {medicine}=await getMedicineContext(b.medicineId,b.sourceUptId,normalize(b.unit));const dest=await db.masterUPT.findUnique({where:{id:b.destinationUptId}});if(!dest?.aktif)return res.status(400).json({message:'UPT tujuan tidak ditemukan atau tidak aktif.'});const x=await db.$transaction(async tx=>{const [op,rec,inn,outDist,inDist,issue]=await Promise.all([tx.medicineStockOpening.findFirst({where:{medicineId:medicine.id,uptId:b.sourceUptId,asOfDate:{lte:d}},orderBy:{asOfDate:'desc'}}),tx.medicineReceipt.aggregate({where:{medicineId:medicine.id,uptId:b.sourceUptId,receiptDate:{lte:d}},_sum:{quantity:true}}),tx.medicineInbound.aggregate({where:{medicineId:medicine.id,uptId:b.sourceUptId,inboundDate:{lte:d}},_sum:{quantity:true}}),tx.medicineDistribution.aggregate({where:{medicineId:medicine.id,sourceUptId:b.sourceUptId,distributionDate:{lte:d}},_sum:{quantity:true}}),tx.medicineDistribution.aggregate({where:{medicineId:medicine.id,destinationUptId:b.sourceUptId,distributionDate:{lte:d}},_sum:{quantity:true}}),tx.medicineIssue.aggregate({where:{medicineId:medicine.id,uptId:b.sourceUptId,issueDate:{lte:d}},_sum:{quantity:true}})]);const stock=Number(op?.quantity||0)+Number(rec._sum.quantity||0)+Number(inn._sum.quantity||0)+Number(inDist._sum.quantity||0)-Number(outDist._sum.quantity||0)-Number(issue._sum.quantity||0);if(stock<q)throw new Error(`Stok tidak cukup. Tersedia ${stock}, diminta ${q}.`);return tx.medicineDistribution.create({data:{medicineId:medicine.id,sourceUptId:b.sourceUptId,destinationUptId:b.destinationUptId,distributionDate:d,documentNumber:normalize(b.documentNumber)||null,batchNumber:normalize(b.batchNumber)||null,quantity:q,unit:medicine.unit,notes:normalize(b.notes)||null}})});await audit(req,'CREATE','MEDICINE_DISTRIBUTION',x.id);res.status(201).json(x)}catch(e:any){res.status(400).json({message:'Permintaan tidak valid atau data tidak dapat diproses.'})}});
app.post('/api/medicines/issues',allow(RoleName.ADMIN,RoleName.OPERATOR),async(req:Req,res)=>{try{const b=req.body||{},q=positiveQty(b.quantity),d=validDate(b.issueDate);if(!b.medicineId||!b.uptId||!d||!q)return res.status(400).json({message:'Obat, UPT, tanggal valid, dan jumlah bulat > 0 wajib diisi.'});const {medicine}=await getMedicineContext(b.medicineId,b.uptId,normalize(b.unit));const x=await db.$transaction(async tx=>{const [op,rec,inn,outDist,inDist,issue]=await Promise.all([tx.medicineStockOpening.findFirst({where:{medicineId:medicine.id,uptId:b.uptId,asOfDate:{lte:d}},orderBy:{asOfDate:'desc'}}),tx.medicineReceipt.aggregate({where:{medicineId:medicine.id,uptId:b.uptId,receiptDate:{lte:d}},_sum:{quantity:true}}),tx.medicineInbound.aggregate({where:{medicineId:medicine.id,uptId:b.uptId,inboundDate:{lte:d}},_sum:{quantity:true}}),tx.medicineDistribution.aggregate({where:{medicineId:medicine.id,sourceUptId:b.uptId,distributionDate:{lte:d}},_sum:{quantity:true}}),tx.medicineDistribution.aggregate({where:{medicineId:medicine.id,destinationUptId:b.uptId,distributionDate:{lte:d}},_sum:{quantity:true}}),tx.medicineIssue.aggregate({where:{medicineId:medicine.id,uptId:b.uptId,issueDate:{lte:d}},_sum:{quantity:true}})]);const stock=Number(op?.quantity||0)+Number(rec._sum.quantity||0)+Number(inn._sum.quantity||0)+Number(inDist._sum.quantity||0)-Number(outDist._sum.quantity||0)-Number(issue._sum.quantity||0);if(stock<q)throw new Error(`Stok tidak cukup. Tersedia ${stock}, diminta ${q}.`);return tx.medicineIssue.create({data:{medicineId:medicine.id,uptId:b.uptId,issueDate:d,batchNumber:normalize(b.batchNumber)||null,quantity:q,unit:medicine.unit,purpose:normalize(b.purpose)||null,notes:normalize(b.notes)||null}})});await audit(req,'CREATE','MEDICINE_ISSUE',x.id);res.status(201).json(x)}catch(e:any){res.status(400).json({message:'Permintaan tidak valid atau data tidak dapat diproses.'})}});
app.post('/api/medicines/openings',allow(RoleName.ADMIN,RoleName.OPERATOR),async(req:Req,res)=>{try{const b=req.body||{},q=Number(b.quantity),d=validDate(b.asOfDate);if(!b.medicineId||!b.uptId||!d||!Number.isInteger(q)||q<0)return res.status(400).json({message:'Obat, UPT, tanggal saldo awal valid, dan jumlah bulat >= 0 wajib diisi.'});const med=await db.medicineMaster.findUnique({where:{id:b.medicineId}}); if(!med||!med.active)return res.status(400).json({message:'Obat tidak ditemukan atau berstatus nonaktif.'}); const upt=await db.masterUPT.findUnique({where:{id:b.uptId}}); if(!upt?.aktif)return res.status(400).json({message:'UPT tidak ditemukan atau tidak aktif.'});const x=await db.medicineStockOpening.upsert({where:{medicineId_uptId_asOfDate:{medicineId:med.id,uptId:b.uptId,asOfDate:d}},create:{medicineId:med.id,uptId:b.uptId,asOfDate:d,quantity:q,notes:normalize(b.notes)||null},update:{quantity:q,notes:normalize(b.notes)||null}});await audit(req,'UPSERT','MEDICINE_OPENING',x.id);res.status(201).json(x)}catch(e:any){res.status(400).json({message:'Permintaan tidak valid atau data tidak dapat diproses.'})}});

app.get('/api/medicines/summary',async(req,res)=>{const periodId=String(req.query.periodId||'')||undefined;const uptId=String(req.query.uptId||'')||undefined;const stock=await medicineStock(uptId,periodId);res.json({kpi:{types:stock.length,receipts:stock.reduce((a,x)=>a+x.receipt,0),inbound:stock.reduce((a,x)=>a+x.inbound,0),distributionIn:stock.reduce((a,x)=>a+x.distributionIn,0),distributionOut:stock.reduce((a,x)=>a+x.distributionOut,0),issue:stock.reduce((a,x)=>a+x.issue,0),stock:stock.reduce((a,x)=>a+x.stock,0),lowStock:stock.filter(x=>x.lowStock).length},stock:stock.slice().sort((a,b)=>a.stock-b.stock)});
});

app.get('/api/ptm/summary',async(req,res)=>{const periodId=String(req.query.periodId||''); const rows=await db.ptmCaseSummary.groupBy({by:['diseaseName','caseStatus'],where:periodId?{periodId}:{},_sum:{caseCount:true},orderBy:{diseaseName:'asc'}}); const map=new Map<string,any>(); for(const r of rows){const x=map.get(r.diseaseName)||{diseaseName:r.diseaseName,LAMA:0,BARU:0,total:0};x[r.caseStatus]=r._sum.caseCount||0;x.total=x.LAMA+x.BARU;map.set(r.diseaseName,x)} res.json([...map.values()].sort((a,b)=>b.total-a.total))});
app.get('/api/report/leadership',async(req,res)=>{
  const periodId=String(req.query.periodId||'');
  if(!periodId)return res.status(400).json({message:'periodId wajib diisi.'});
  const period=await db.reportPeriod.findUnique({where:{id:periodId}});
  if(!period)return res.status(404).json({message:'Periode tidak ditemukan.'});
  const [upts,ptm,infectious,referrals,deaths,bjmhs,kie,palliative,maternal,subs]=await Promise.all([
    db.masterUPT.findMany({where:{aktif:true},orderBy:{namaUpt:'asc'}}),
    db.ptmCaseSummary.aggregate({where:{periodId},_sum:{caseCount:true}}),
    db.infectiousDiseaseSummary.aggregate({where:{periodId},_sum:{value:true}}),
    db.referral.count({where:{periodId}}),db.deathRecord.count({where:{periodId}}),db.bjmhsScreening.count({where:{periodId}}),
    db.kieActivitySummary.aggregate({where:{periodId},_sum:{participantCount:true}}),db.palliativeRecord.count({where:{periodId}}),db.maternalRecord.count({where:{periodId}}),
    db.reportSubmission.findMany({where:{periodId},include:{upt:true,reportType:true}})
  ]);
  const rows=await Promise.all(upts.map(async u=>{
    const [a,b,c,d,e,f]=await Promise.all([
      db.ptmCaseSummary.aggregate({where:{periodId,uptId:u.id},_sum:{caseCount:true}}),db.infectiousDiseaseSummary.aggregate({where:{periodId,uptId:u.id},_sum:{value:true}}),db.referral.count({where:{periodId,uptId:u.id}}),db.deathRecord.count({where:{periodId,uptId:u.id}}),db.bjmhsScreening.count({where:{periodId,uptId:u.id}}),db.kieActivitySummary.aggregate({where:{periodId,uptId:u.id},_sum:{participantCount:true}})
    ]); return {kodeUpt:u.kodeUpt,namaUpt:u.namaUpt,ptm:a._sum.caseCount||0,infectious:b._sum.value||0,referrals:c,deaths:d,bjmhs:e,kieParticipants:f._sum.participantCount||0};
  }));
  const html=`<!doctype html><html lang="id"><head><meta charset="utf-8"><title>Laporan SIPRIMA PAS - ${escapeHtml(period.label)}</title><style>body{font-family:Arial,sans-serif;color:#111827;margin:32px}h1,h2{text-align:center}table{width:100%;border-collapse:collapse;margin:18px 0}th,td{border:1px solid #d1d5db;padding:7px;font-size:12px}th{background:#f3f4f6}.kpi{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.box{border:1px solid #d1d5db;padding:12px}.muted{color:#6b7280;font-size:12px}@media print{button{display:none}}</style></head><body><button onclick="window.print()">Cetak / Simpan PDF</button><h1>SI PRIMA PAS</h1><h2>Laporan Rekapitulasi Kesehatan Pemasyarakatan</h2><p class="muted">Periode: ${escapeHtml(period.label)}</p><div class="kpi"><div class="box"><b>PTM</b><br>${ptm._sum.caseCount||0}</div><div class="box"><b>Penyakit Menular</b><br>${infectious._sum.value||0}</div><div class="box"><b>Rujukan</b><br>${referrals}</div><div class="box"><b>Kematian</b><br>${deaths}</div><div class="box"><b>BJMHS</b><br>${bjmhs}</div><div class="box"><b>KIE</b><br>${kie._sum.participantCount||0}</div><div class="box"><b>Paliatif</b><br>${palliative}</div><div class="box"><b>KIA</b><br>${maternal}</div></div><h3>Rekap per UPT</h3><table><thead><tr><th>UPT</th><th>PTM</th><th>Menular</th><th>Rujukan</th><th>Kematian</th><th>BJMHS</th><th>KIE</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${escapeHtml(r.namaUpt)}</td><td>${r.ptm}</td><td>${r.infectious}</td><td>${r.referrals}</td><td>${r.deaths}</td><td>${r.bjmhs}</td><td>${r.kieParticipants}</td></tr>`).join('')}</tbody></table><p class="muted">Laporan dihasilkan oleh SIPRIMA PAS. Detail individu tidak ditampilkan dalam laporan pimpinan.</p></body></html>`;
  await audit(req,'REPORT_VIEW','REPORT',periodId,{format:'HTML_PRINT'}); res.type('html').send(html);
});
app.get('/api/report/leadership.xlsx',async(req,res)=>{
  const periodId=String(req.query.periodId||''); if(!periodId)return res.status(400).json({message:'periodId wajib diisi.'});
  const period=await db.reportPeriod.findUnique({where:{id:periodId}}); if(!period)return res.status(404).json({message:'Periode tidak ditemukan.'});
  const upts=await db.masterUPT.findMany({where:{aktif:true},orderBy:{namaUpt:'asc'}});
  const rows:any[]=[]; for(const u of upts){const [a,b,c,d,e,f]=await Promise.all([db.ptmCaseSummary.aggregate({where:{periodId,uptId:u.id},_sum:{caseCount:true}}),db.infectiousDiseaseSummary.aggregate({where:{periodId,uptId:u.id},_sum:{value:true}}),db.referral.count({where:{periodId,uptId:u.id}}),db.deathRecord.count({where:{periodId,uptId:u.id}}),db.bjmhsScreening.count({where:{periodId,uptId:u.id}}),db.kieActivitySummary.aggregate({where:{periodId,uptId:u.id},_sum:{participantCount:true}})]); rows.push({'Kode UPT':u.kodeUpt,'UPT':u.namaUpt,'PTM':a._sum.caseCount||0,'Penyakit Menular':b._sum.value||0,'Rujukan':c,'Kematian':d,'BJMHS':e,'Peserta KIE':f._sum.participantCount||0});}
  const total=(k:string)=>rows.reduce((n,r)=>n+Number(r[k]||0),0); rows.push({'Kode UPT':'TOTAL','UPT':'TOTAL KANWIL','PTM':total('PTM'),'Penyakit Menular':total('Penyakit Menular'),'Rujukan':total('Rujukan'),'Kematian':total('Kematian'),'BJMHS':total('BJMHS'),'Peserta KIE':total('Peserta KIE')});
  const wb=XLSX.utils.book_new(); const ws=XLSX.utils.json_to_sheet(rows); XLSX.utils.book_append_sheet(wb,ws,'Rekap UPT'); const summary=XLSX.utils.aoa_to_sheet([['SIPRIMA PAS','Laporan Rekapitulasi Kesehatan'],['Periode',period.label],[],['Indikator','Total'],['PTM',total('PTM')],['Penyakit Menular',total('Penyakit Menular')],['Rujukan',total('Rujukan')],['Kematian',total('Kematian')],['BJMHS',total('BJMHS')],['Peserta KIE',total('Peserta KIE')]]); XLSX.utils.book_append_sheet(wb,summary,'Ringkasan'); const out=XLSX.write(wb,{type:'buffer',bookType:'xlsx'}); await audit(req,'REPORT_EXPORT','REPORT',periodId,{format:'XLSX'}); res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'); res.setHeader('Content-Disposition',`attachment; filename="SIPRIMA-PAS-${period.label.replace(/[^A-Za-z0-9_-]+/g,'_')}.xlsx"`); res.send(out);
});
app.get('/api/admin/users',allow(RoleName.ADMIN),async(_q,res)=>res.json(await db.user.findMany({select:{id:true,name:true,email:true,role:true,active:true,createdAt:true},orderBy:{name:'asc'}})));
app.post('/api/admin/users',allow(RoleName.ADMIN),async(req,res)=>{const {name,email,password,role}=req.body||{}; if(!name||!email||!password||!['ADMIN','OPERATOR','LEADERSHIP'].includes(role))return res.status(400).json({message:'Nama, email, password, dan role wajib valid.'});if(typeof password!=='string'||password.length<12)return res.status(400).json({message:'Password minimal 12 karakter.'}); const u=await db.user.create({data:{name,email,passwordHash:await bcrypt.hash(password,12),role}}); await audit(req,'USER_CREATE','ADMIN',u.id,{role}); res.status(201).json({id:u.id,name:u.name,email:u.email,role:u.role,active:u.active});});
app.patch('/api/admin/users/:id',allow(RoleName.ADMIN),async(req,res)=>{const data:any={}; if(typeof req.body.name==='string')data.name=req.body.name;if(typeof req.body.active==='boolean')data.active=req.body.active;if(['ADMIN','OPERATOR','LEADERSHIP'].includes(req.body.role))data.role=req.body.role;if(req.body.password){if(typeof req.body.password!=='string'||req.body.password.length<12)return res.status(400).json({message:'Password minimal 12 karakter.'});data.passwordHash=await bcrypt.hash(req.body.password,12);} const u=await db.user.update({where:{id:Array.isArray(req.params.id)?req.params.id[0]:req.params.id},data,select:{id:true,name:true,email:true,role:true,active:true}}); await audit(req,'USER_UPDATE','ADMIN',u.id,data);res.json(u);});
app.get('/api/admin/upts',allow(RoleName.ADMIN),async(_q,res)=>res.json(await db.masterUPT.findMany({orderBy:{namaUpt:'asc'}})));
app.patch('/api/admin/upts/:id',allow(RoleName.ADMIN),async(req,res)=>{const data:any={}; for(const k of ['namaUpt','jenisUpt','kelasUpt','kabupatenKota','kanwil','alamat','kodeUpt'])if(req.body[k]!==undefined)data[k]=req.body[k];if(req.body.aktif!==undefined)data.aktif=!!req.body.aktif;const u=await db.masterUPT.update({where:{id:Array.isArray(req.params.id)?req.params.id[0]:req.params.id},data});await audit(req,'UPT_UPDATE','ADMIN',u.id,data);res.json(u);});
app.get('/api/audit',allow(RoleName.ADMIN),async(_q,res)=>res.json(await db.auditLog.findMany({include:{user:{select:{name:true,email:true}}},orderBy:{createdAt:'desc'},take:200})));
app.use((err:any,_req:any,res:any,_next:any)=>{console.error(err);res.status(500).json({message:'Server error'});});
app.listen(Number(process.env.PORT||4000),()=>console.log('SIPRIMA PAS API listening on '+(process.env.PORT||4000)));
