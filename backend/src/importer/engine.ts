import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import XLSX from 'xlsx';
import { PrismaClient, Prisma, CaseStatus, ValidationStatus } from '@prisma/client';

export type DetectedType = 'PTM'|'INFECTIOUS'|'REFERRAL'|'DEATH'|'BJMHS'|'MATERNAL'|'PALLIATIVE'|'KIE'|'SARPRAS'|'MEDICINE';
export type ImportIssue = { level:'WARNING'|'ERROR'; code:string; message:string; sheet?:string; row?:number };
export type ImportPreview = { type:DetectedType|null; fileHash:string; fileName:string; sheets:any[]; issues:ImportIssue[]; estimatedRows:number };

const MONTHS = ['januari','februari','maret','april','mei','juni','juli','agustus','september','oktober','november','desember'];
const norm=(v:any)=>String(v??'').trim().replace(/\s+/g,' ');
const key=(v:any)=>norm(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const int=(v:any)=>{ if(v===null||v===undefined||v==='') return null; if(typeof v==='number') return Number.isFinite(v)?Math.trunc(v):null; const s=String(v).replace(/\./g,'').replace(/,/g,'.').replace(/[^0-9.-]/g,''); const n=Number(s); return Number.isFinite(n)?Math.trunc(n):null; };
const text=(v:any)=>{const s=norm(v); return s||null};

export function detectType(fileName:string, workbook?:XLSX.WorkBook):DetectedType|null {
  const f=key(fileName);
  if(f.includes('ptm')||f.includes('penyakit tidak menular')) return 'PTM';
  if(f.includes('menular')||f.includes('infectious')) return 'INFECTIOUS';
  if(f.includes('rujukan')) return 'REFERRAL';
  if(f.includes('kematian')) return 'DEATH';
  if(f.includes('bjmhs')) return 'BJMHS';
  if(f.includes('hamil')||f.includes('melahirkan')||f.includes('menyusui')) return 'MATERNAL';
  if(f.includes('paliatif')) return 'PALLIATIVE';
  if(f.includes('kie')) return 'KIE';
  if(f.includes('sarpras')||f.includes('sarana prasarana')) return 'SARPRAS';
  if(f.includes('obat')||f.includes('medicine')||f.includes('manajemen obat')) return 'MEDICINE';
  if(workbook){
    const joined=workbook.SheetNames.map(key).join(' ');
    if(joined.includes('bjmhs')) return 'BJMHS';
    if(joined.includes('tbc')||joined.includes('hiv')||joined.includes('infeksi menular')) return 'INFECTIOUS';
    if(joined.includes('master_obat')||joined.includes('penerimaan')&&joined.includes('obat_masuk')||joined.includes('distribusi')&&joined.includes('obat_keluar')) return 'MEDICINE';
  }
  return null;
}

function monthFromSheet(sheet:string){ const s=key(sheet); const idx=MONTHS.findIndex(m=>s.includes(m)); return idx>=0?idx+1:null; }
function findHeader(rows:any[][], required:string[], max=40){
  for(let i=0;i<Math.min(rows.length,max);i++){
    const line=rows[i].map(key).join(' | ');
    if(required.every(t=>line.includes(key(t)))) return i;
  }
  return -1;
}
function headersAt(rows:any[][], idx:number){ const h=rows[idx]||[]; const map=new Map<string,number>(); h.forEach((v:any,i:number)=>{const k=key(v); if(k && !map.has(k)) map.set(k,i)}); return map; }
function col(map:Map<string,number>, terms:string[]){ for(const [h,i] of map){ if(terms.some(t=>h.includes(key(t)))) return i; } return -1; }
function excelDate(v:any):Date|null {
  if(v instanceof Date && !Number.isNaN(v.getTime())) return v;
  if(typeof v==='number'){ const d=XLSX.SSF.parse_date_code(v); if(d) return new Date(Date.UTC(d.y,d.m-1,d.d,d.H||0,d.M||0,d.S||0)); }
  const s=norm(v); if(!s) return null; const d=new Date(s); return Number.isNaN(d.getTime())?null:d;
}
function rowsForSheet(wb:XLSX.WorkBook, sn:string){ return XLSX.utils.sheet_to_json(wb.Sheets[sn],{header:1,defval:null,raw:true}) as any[][]; }

export async function previewWorkbook(buf:Buffer,fileName:string):Promise<ImportPreview>{
  const wb=XLSX.read(buf,{type:'buffer',cellDates:true,cellNF:false});
  const type=detectType(fileName,wb); const fileHash=crypto.createHash('sha256').update(buf).digest('hex');
  const issues:ImportIssue[]=[]; let estimatedRows=0;
  const sheets=wb.SheetNames.map(sn=>{
    const rows=rowsForSheet(wb,sn); const month=monthFromSheet(sn); const headerCandidates=[];
    for(let i=0;i<Math.min(rows.length,35);i++){ const nonEmpty=rows[i].filter((x:any)=>norm(x)).length; if(nonEmpty>=3) headerCandidates.push({row:i+1,values:rows[i].slice(0,20)}); }
    const dataLike=Math.max(0,rows.length-(headerCandidates[0]?.row||1)); estimatedRows+=dataLike;
    return {sheet:sn,rowCount:rows.length,month,headerCandidates:headerCandidates.slice(0,6),isReference:/petunjuk|validasi|daftar list|format laporan/i.test(sn)};
  });
  if(!type) issues.push({level:'ERROR',code:'E002',message:'Jenis laporan tidak dapat dideteksi dari nama file atau struktur workbook.'});
  if(!wb.SheetNames.length) issues.push({level:'ERROR',code:'E003',message:'Workbook tidak memiliki sheet.'});
  return {type,fileHash,fileName,sheets,issues,estimatedRows};
}

function jsonSafe(v:any):any { if(v instanceof Date) return v.toISOString(); if(Array.isArray(v)) return v.map(jsonSafe); if(v && typeof v==='object') return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,jsonSafe(x)])); return v; }
function baseSource(fileId:string,sheet:string,row:number,raw:any[],normalized:any,status:ValidationStatus=ValidationStatus.VALID,message?:string){
  return {sourceFileId:fileId,sheetName:sheet,sourceRow:row,rawPayload:jsonSafe(raw) as any,normalizedPayload:jsonSafe(normalized) as any,validationStatus:status,validationMessage:message};
}

type DbClient = PrismaClient | Prisma.TransactionClient;

function findTemplateHeader(rows:any[][], terms:string[]){
  return findHeader(rows, terms, 20);
}

async function medicineStockBefore(db:DbClient, medicineId:string, uptId:string, at:Date){
  const [opening,receipt,inbound,outDist,inDist,issue] = await Promise.all([
    db.medicineStockOpening.findFirst({where:{medicineId,uptId,asOfDate:{lte:at}},orderBy:{asOfDate:'desc'}}),
    db.medicineReceipt.aggregate({where:{medicineId,uptId,receiptDate:{lte:at}},_sum:{quantity:true}}),
    db.medicineInbound.aggregate({where:{medicineId,uptId,inboundDate:{lte:at}},_sum:{quantity:true}}),
    db.medicineDistribution.aggregate({where:{medicineId,sourceUptId:uptId,distributionDate:{lte:at}},_sum:{quantity:true}}),
    db.medicineDistribution.aggregate({where:{medicineId,destinationUptId:uptId,distributionDate:{lte:at}},_sum:{quantity:true}}),
    db.medicineIssue.aggregate({where:{medicineId,uptId,issueDate:{lte:at}},_sum:{quantity:true}})
  ]);
  return Number(opening?.quantity||0)+Number(receipt._sum.quantity||0)+Number(inbound._sum.quantity||0)+Number(inDist._sum.quantity||0)-Number(outDist._sum.quantity||0)-Number(issue._sum.quantity||0);
}

async function runMedicineImport(db:DbClient, opts:{buf:Buffer;fileName:string;fileId:string;uptId:string;periodId:string}){
  const wb=XLSX.read(opts.buf,{type:'buffer',cellDates:true});
  const issues:ImportIssue[]=[]; let valid=0,warnings=0,errors=0;
  const warn=(sheet:string,row:number,message:string,code='W-MO-IMPORT')=>{issues.push({level:'WARNING',code,message,sheet,row});warnings++;};
  const err=(sheet:string,row:number,message:string,code='E-MO-IMPORT')=>{issues.push({level:'ERROR',code,message,sheet,row});errors++;};
  const saveSource=async(sheet:string,row:number,raw:any[],normalized:any,status:ValidationStatus=ValidationStatus.VALID,msg?:string)=>db.sourceRecord.create({data:baseSource(opts.fileId,sheet,row,raw,normalized,status,msg)});
  const findUpt=async(code:string)=>db.masterUPT.findUnique({where:{kodeUpt:norm(code)}});
  const findMed=async(code:string)=>db.medicineMaster.findUnique({where:{code:norm(code)}});
  const skipRow=(row:any[])=>row.every(v=>!norm(v)) || row.some(v=>/HAPUS BARIS CONTOH/i.test(norm(v)));

  // Master obat: create/update only master records; UPT tetap harus berasal dari master SIPRIMA.
  const master=wb.SheetNames.find(x=>key(x)==='master_obat');
  if(master){
    const rows=rowsForSheet(wb,master); const h=findTemplateHeader(rows,['kode obat','nama obat']);
    if(h<0){err(master,1,'Header MASTER_OBAT tidak ditemukan.');}
    else {
      const map=headersAt(rows,h); const ix=(terms:string[])=>col(map,terms);
      for(let r=h+1;r<rows.length;r++){ const row=rows[r]; if(skipRow(row)) continue; const code=text(row[ix(['kode obat','kode'])]); const name=text(row[ix(['nama obat','nama'])]); const unit=text(row[ix(['satuan','unit'])]);
        if(!code){err(master,r+1,'Kode obat wajib diisi.','E-MO-001');continue;} if(!name){err(master,r+1,`Nama obat untuk ${code} wajib diisi.`,'E-MO-003');continue;} if(!unit){err(master,r+1,`Satuan obat ${code} wajib diisi.`,'E-MO-004');continue;}
        const min=int(row[ix(['stok minimum','minimum','min'] )]) ?? 0; const max=int(row[ix(['stok maksimum','maksimum','max'])]); if(min<0 || (max!==null&&max<min)){err(master,r+1,`Batas stok obat ${code} tidak valid.`,'E-MO-005');continue;}
        const activeRaw=text(row[ix(['aktif','status'])]); const active=activeRaw?['YA','AKTIF','TRUE','1'].includes(key(activeRaw).toUpperCase()):true;
        const data={name,dosageForm:text(row[ix(['bentuk sediaan','sediaan'])]),strength:text(row[ix(['kekuatan','strength'])]),unit,groupName:text(row[ix(['golongan','group'])]),category:text(row[ix(['kategori','category'])]),minStock:min,maxStock:max,active};
        const med=await db.medicineMaster.upsert({where:{code},create:data as any,update:data as any});
        await saveSource(master,r+1,row,{medicineId:med.id,code,...data}); valid++;
      }
    }
  }

  const sheets=[
    {name:'PENERIMAAN',kind:'receipt'}, {name:'OBAT_MASUK',kind:'inbound'}, {name:'DISTRIBUSI',kind:'distribution'}, {name:'OBAT_KELUAR',kind:'issue'}, {name:'SALDO_AWAL',kind:'opening'}
  ] as const;
  for(const spec of sheets){
    const sn=wb.SheetNames.find(x=>key(x)===key(spec.name)); if(!sn) continue; const rows=rowsForSheet(wb,sn);
    const h=findTemplateHeader(rows, spec.kind==='distribution'?['kode upt asal','kode upt tujuan','kode obat']:spec.kind==='opening'?['kode upt','kode obat','tanggal saldo awal']:['kode upt','kode obat','jumlah']);
    if(h<0){err(sn,1,`Header ${spec.name} tidak ditemukan.`);continue;}
    const map=headersAt(rows,h); const ix=(terms:string[])=>col(map,terms);
    for(let r=h+1;r<rows.length;r++){
      const row=rows[r]; if(skipRow(row)) continue; const code=text(row[ix(['kode obat'])]); if(!code){err(sn,r+1,'Kode obat wajib diisi.');continue;}
      const med=await findMed(code); if(!med){err(sn,r+1,`Kode obat ${code} tidak ditemukan pada MASTER_OBAT SIPRIMA.`,'E-PR-002');continue;} if(!med.active){err(sn,r+1,`Obat ${code} berstatus nonaktif.`);continue;}
      const unit=text(row[ix(['satuan','unit'])]); if(!unit){err(sn,r+1,`Satuan obat ${code} wajib diisi.`);continue;} if(key(unit)!==key(med.unit)){err(sn,r+1,`Satuan ${unit} tidak sesuai master obat ${code} (${med.unit}).`);continue;}
      const qty=int(row[ix(['jumlah','qty','kuantitas'])]); if(qty===null || (spec.kind==='opening'?qty<0:qty<=0)){err(sn,r+1,`Jumlah ${spec.name} tidak valid.`);continue;}
      const date=excelDate(row[ix(spec.kind==='receipt'?['tanggal penerimaan','tanggal']:spec.kind==='inbound'?['tanggal obat masuk','tanggal masuk','tanggal']:spec.kind==='distribution'?['tanggal distribusi','tanggal']:spec.kind==='issue'?['tanggal keluar','tanggal']:['tanggal saldo awal','tanggal saldo'])]);
      if(!date){err(sn,r+1,'Tanggal transaksi tidak valid.');continue;}
      if(spec.kind==='distribution'){
        const from=text(row[ix(['kode upt asal'])]), to=text(row[ix(['kode upt tujuan'] )]); const source=from?await findUpt(from):null; const dest=to?await findUpt(to):null;
        if(!source||!dest){err(sn,r+1,'UPT asal dan tujuan harus terdaftar pada master SIPRIMA.');continue;} if(source.id===dest.id){err(sn,r+1,'UPT asal dan tujuan harus berbeda.','E-DI-003');continue;}
        const stock=await medicineStockBefore(db,med.id,source.id,date); if(stock<qty){err(sn,r+1,`Stok obat ${code} di UPT asal tidak cukup. Tersedia ${stock}, diminta ${qty}.`,'E-DI-008');continue;}
        const data={medicineId:med.id,sourceUptId:source.id,destinationUptId:dest.id,distributionDate:date,documentNumber:text(row[ix(['nomor dokumen','dokumen'])]),batchNumber:text(row[ix(['nomor batch','batch'])]),quantity:qty,unit:med.unit,notes:text(row[ix(['keterangan','catatan'])])};
        const x=await db.medicineDistribution.create({data}); const sr=await saveSource(sn,r+1,row,{transactionType:'DISTRIBUSI',recordId:x.id,...data}); valid++; continue;
      }
      const uptCode=text(row[ix(['kode upt'])]) || (opts.uptId?null:null); const upt=uptCode?await findUpt(uptCode):await db.masterUPT.findUnique({where:{id:opts.uptId}}); if(!upt){err(sn,r+1,'UPT tidak ditemukan.');continue;}
      if(spec.kind==='opening'){
        const x=await db.medicineStockOpening.upsert({where:{medicineId_uptId_asOfDate:{medicineId:med.id,uptId:upt.id,asOfDate:date}},create:{medicineId:med.id,uptId:upt.id,asOfDate:date,quantity:qty,notes:text(row[ix(['keterangan','catatan'])])},update:{quantity:qty,notes:text(row[ix(['keterangan','catatan'])])}}); await saveSource(sn,r+1,row,{transactionType:'SALDO_AWAL',recordId:x.id,medicineId:med.id,uptId:upt.id,quantity:qty}); valid++; continue;
      }
      const common:any={medicineId:med.id,uptId:upt.id,quantity:qty,unit:med.unit};
      let x:any;
      if(spec.kind==='receipt') x=await db.medicineReceipt.create({data:{...common,receiptDate:date,documentNumber:text(row[ix(['nomor dokumen','dokumen'])]),source:text(row[ix(['sumber','asal'])]),batchNumber:text(row[ix(['nomor batch','batch'])]),expiryDate:excelDate(row[ix(['tanggal kedaluwarsa','kedaluwarsa','expiry'])]),price:int(row[ix(['harga'])]) as any,notes:text(row[ix(['keterangan','catatan'])])}});
      if(spec.kind==='inbound') x=await db.medicineInbound.create({data:{...common,inboundDate:date,documentNumber:text(row[ix(['nomor dokumen','dokumen'])]),batchNumber:text(row[ix(['nomor batch','batch'])]),expiryDate:excelDate(row[ix(['tanggal kedaluwarsa','kedaluwarsa','expiry'])]),source:text(row[ix(['sumber','asal'])]),notes:text(row[ix(['keterangan','catatan'])])}});
      if(spec.kind==='issue'){ const stock=await medicineStockBefore(db,med.id,upt.id,date); if(stock<qty){err(sn,r+1,`Stok obat ${code} tidak cukup. Tersedia ${stock}, diminta ${qty}.`,'E-OK-006');continue;} x=await db.medicineIssue.create({data:{...common,issueDate:date,batchNumber:text(row[ix(['nomor batch','batch'])]),purpose:text(row[ix(['tujuan penggunaan','tujuan'])]),notes:text(row[ix(['keterangan','catatan'])])}}); }
      await saveSource(sn,r+1,row,{transactionType:spec.kind.toUpperCase(),recordId:x.id,medicineId:med.id,uptId:upt.id,quantity:qty}); valid++;
    }
  }
  return {valid,warnings,errors,issues,sourceRecords:[]};
}


export async function runImport(db:DbClient, opts:{buf:Buffer;fileName:string;fileId:string;uptId:string;periodId:string;type:DetectedType}){
  if(opts.type==='MEDICINE') return runMedicineImport(db,opts);
  const wb=XLSX.read(opts.buf,{type:'buffer',cellDates:true});
  const issues:ImportIssue[]=[]; let valid=0,warnings=0,errors=0;
  const addWarn=(i:ImportIssue)=>{issues.push(i);warnings++}; const addErr=(i:ImportIssue)=>{issues.push(i);errors++};
  const sourceRecords:any[]=[];
  const saveSource=async(sheet:string,row:number,raw:any[],normalized:any,status:ValidationStatus=ValidationStatus.VALID,msg?:string)=>{
    return db.sourceRecord.create({data:baseSource(opts.fileId,sheet,row,raw,normalized,status,msg)});
  };

  if(opts.type==='PTM'){
    for(const sn of wb.SheetNames){
      if(!/lap\s+/i.test(sn)) continue;
      const rows=rowsForSheet(wb,sn); const h=findHeader(rows,['nama satker']); if(h<0){addWarn({level:'WARNING',code:'W004',message:'Header PTM tidak ditemukan; sheet dilewati.',sheet:sn});continue;}
      const groupRow=rows[h]||[], diseaseRow=rows[h+1]||[], statusRow=rows[h+2]||[]; let currentGroup='Tidak ditentukan';
      for(let c=2;c<Math.max(groupRow.length,diseaseRow.length,statusRow.length);c++){
        const g=text(groupRow[c]); if(g) currentGroup=g;
        const disease=text(diseaseRow[c]); const status=key(statusRow[c]).toUpperCase();
        if(!disease || !['LAMA','BARU'].includes(status)) continue;
        for(let r=h+3;r<rows.length;r++){
          const satker=text(rows[r]?.[1]); if(!satker || /total/i.test(satker)) continue;
          const n=int(rows[r]?.[c]);
          if(n===null){ if(rows[r]?.[c]!==null&&rows[r]?.[c]!=='' ) addWarn({level:'WARNING',code:'W002',message:`Nilai tidak numerik untuk ${disease}/${status}.`,sheet:sn,row:r+1}); continue; }
          const upt=await db.masterUPT.findFirst({where:{OR:[{namaUpt:{equals:satker,mode:'insensitive'}},{namaUpt:{contains:satker,mode:'insensitive'}},{kodeUpt:{equals:satker,mode:'insensitive'}}]}}) || {id:opts.uptId};
          const sr=await saveSource(sn,r+1,rows[r],{diseaseGroup:currentGroup,diseaseName:disease,caseStatus:status,caseCount:n,satker},ValidationStatus.VALID); sourceRecords.push(sr.id);
          await db.ptmCaseSummary.create({data:{uptId:upt.id,periodId:opts.periodId,diseaseGroup:currentGroup,diseaseName:disease,caseStatus:status as CaseStatus,caseCount:n,sourceRecordId:sr.id}}); valid++;
        }
      }
    }
  } else if(opts.type==='INFECTIOUS') {
    // Aturan SIPRIMA PAS: untuk Penyakit Menular hanya membaca sheet Rekapitulasi (Otomatis).
    const sn=wb.SheetNames.find(x=>key(x)==='rekapitulasi (otomatis)');
    if(!sn){
      addErr({level:'ERROR',code:'E-IM-001',message:'Sheet Rekapitulasi (Otomatis) tidak ditemukan pada laporan Penyakit Menular.'});
    } else {
      const rows=rowsForSheet(wb,sn);
      const diseaseNames=['Hep A','Hep B','Hep C','Skabies','TBC','HIV','IMS','Lepra','ISPA','Pneumonia','DBD','Demam Tifoid','Malaria','Diare','Infeksi Pernapasan','Infeksi Endemik'];
      const headerPath=(c:number)=>{
        const parts:string[]=[];
        for(let r=3;r<8;r++){ const v=text(rows[r]?.[c]); if(v && !parts.includes(v)) parts.push(v); }
        return parts;
      };
      const diseaseFromPath=(parts:string[])=>{
        const hit=parts.find(x=>diseaseNames.some(d=>key(x).includes(key(d))));
        if(!hit) return parts.find(x=>diseaseNames.some(d=>key(x).includes(key(d)))) || parts[1] || parts[0] || 'Penyakit Menular';
        const d=diseaseNames.find(d=>key(hit).includes(key(d))); return d||hit;
      };
      const columnMeta:any[]=[];
      for(let c=5;c<Math.max(...rows.map(r=>r?.length||0));c++){
        const path=headerPath(c); if(path.length) columnMeta[c]={path,disease:diseaseFromPath(path)};
      }
      for(let r=8;r<rows.length;r++){
        const row=rows[r]||[];
        const satker=text(row[3]);
        if(!satker || /total|jumlah keseluruhan/i.test(satker)) continue;
        let rowUpt=opts.uptId;
        const found=await db.masterUPT.findFirst({where:{OR:[{namaUpt:{contains:satker,mode:'insensitive'}},{kodeUpt:{equals:satker,mode:'insensitive'}}]}});
        if(found) rowUpt=found.id;
        else addWarn({level:'WARNING',code:'W-IM-001',message:`UPT '${satker}' tidak dikenali; UPT import dipakai.`,sheet:sn,row:r+1});
        for(const [c,meta] of Object.entries(columnMeta) as any){
          const value=int(row[Number(c)]);
          if(value===null) continue;
          const path=meta.path as string[];
          const indicator=meta.disease as string;
          const category=path.slice(2).join(' > ') || null;
          const sr=await saveSource(sn,r+1,row,{satker,disease:indicator,category,value,headerPath:path},ValidationStatus.VALID); sourceRecords.push(sr.id);
          await db.infectiousDiseaseSummary.create({data:{uptId:rowUpt,periodId:opts.periodId,program:indicator,indicator,category,value,sourceRecordId:sr.id}});
          valid++;
        }
      }
    }
  } else {
    for(const sn of wb.SheetNames){
      if(/petunjuk|validasi|daftar list|format laporan|rekapitulasi \(otomatis\)/i.test(sn)) continue;
      const rows=rowsForSheet(wb,sn); if(rows.length<2) continue;
      const h=findHeader(rows,['no']); const header=h>=0?h:findHeader(rows,['nama']);
      if(header<0){addWarn({level:'WARNING',code:'W004',message:'Header data tidak ditemukan; sheet disimpan sebagai source tetapi tidak dinormalisasi.',sheet:sn}); continue;}
      const map=headersAt(rows,header); const idx=(terms:string[])=>col(map,terms); const month=monthFromSheet(sn);
      for(let r=header+1;r<rows.length;r++){
        const row=rows[r]; if(!row || row.every((v:any)=>!norm(v))) continue;
        const joined=row.map(key).join(' '); if(/^total$/.test(key(row[0]))||joined.includes('jumlah total')&&row.filter((v:any)=>v!==null).length<5) continue;
        const satker=text(row[idx(['satker','nama satker','upt'])]);
        let rowUpt=opts.uptId;
        if(satker){ const found=await db.masterUPT.findFirst({where:{OR:[{namaUpt:{contains:satker,mode:'insensitive'}},{kodeUpt:{equals:satker,mode:'insensitive'}}]}}); if(found) rowUpt=found.id; else addWarn({level:'WARNING',code:'W001',message:`UPT '${satker}' tidak dikenali; UPT import dipakai.`,sheet:sn,row:r+1}); }
        const name=text(row[idx(['nama wbp','nama','nama pasien','nama warga binaan'])]);
        const age=int(row[idx(['usia','umur'])]); const sex=text(row[idx(['jenis kelamin','kelamin','jk'])]);
        const legal=text(row[idx(['status hukum','status pemidanaan','status wbp'])]); const diagnosis=text(row[idx(['diagnosa primer','diagnosis','penyakit'])]);
        const date=excelDate(row[idx(['tanggal rujuk','tanggal dirujuk','tanggal kematian','tanggal'])]);
        const sr=await saveSource(sn,r+1,row,{satker,name,age,sex,legal,diagnosis,month},ValidationStatus.VALID); sourceRecords.push(sr.id);
        try{
          switch(opts.type){
            case 'DEATH':
              await db.deathRecord.create({data:{uptId:rowUpt,periodId:opts.periodId,personName:name,legalStatus:legal,sex,birthDate:excelDate(row[idx(['tanggal lahir'])]),deathDate:date,age,citizenship:text(row[idx(['kewarganegaraan'])]),country:text(row[idx(['negara'])]),crimeType:text(row[idx(['jenis kejahatan'])]),primaryDiagnosis:text(row[idx(['diagnosa primer','diagnosis'])]),secondaryDiagnosis1:text(row[idx(['diagnosa sekunder 1'])]),secondaryDiagnosis2:text(row[idx(['diagnosa sekunder 2'])]),notes:text(row[idx(['keterangan','catatan'])]),sourceRecordId:sr.id}}); break;
            case 'REFERRAL':
              await db.referral.create({data:{uptId:rowUpt,periodId:opts.periodId,personName:name,legalStatus:legal,age,sex,diagnosis,referralType:text(row[idx(['jenis rujukan','tipe rujukan'])]),destinationFacility:text(row[idx(['tujuan rujukan','rumah sakit','fasilitas tujuan'])]),referralDate:date,notes:text(row[idx(['keterangan','catatan'])]),sourceRecordId:sr.id}}); break;
            case 'BJMHS':
              await db.bjmhsScreening.create({data:{uptId:rowUpt,periodId:opts.periodId,personName:name,sex,legalStatus:legal,screeningResult:text(row[idx(['hasil interpretasi bjmhs','hasil interpretasi'])]),followUp:text(row[idx(['dirujuk perawat','tindak lanjut'])]),referralDateText:text(row[idx(['tanggal dirujuk'])]),diagnosis,diagnosisGroup:text(row[idx(['f00-f09','kelompok diagnosis'])]),pharmacologicalTreatment:text(row[idx(['tatalaksana farmakologi'])]),nonPharmacologicalTreatment:text(row[idx(['tatalaksana non-farmakologi'])]),followupNote:text(row[idx(['keterangan kontrol kembali','keterangan'])]),sourceRecordId:sr.id}}); break;
            case 'PALLIATIVE':
              await db.palliativeRecord.create({data:{uptId:rowUpt,periodId:opts.periodId,personName:name,legalStatus:legal,age,diagnosis,sex,careStatus:text(row[idx(['status perawatan','status'])]),sourceRecordId:sr.id}}); break;
            case 'MATERNAL':
              await db.maternalRecord.create({data:{uptId:rowUpt,periodId:opts.periodId,personName:name,age,legalStatus:legal,pregnancyStatus:text(row[idx(['status kehamilan','hamil'])]),gestationalAge:text(row[idx(['usia kehamilan','gestasi'])]),deliveryStatus:text(row[idx(['status melahirkan','melahirkan'])]),deliveryType:text(row[idx(['jenis persalinan'])]),breastfeedingStatus:text(row[idx(['status menyusui','menyusui'])]),feedingType:text(row[idx(['jenis pemberian'])]),referralStatus:text(row[idx(['status rujukan'])]),referralType:text(row[idx(['jenis rujukan'])]),sourceRecordId:sr.id}}); break;
            case 'KIE': {
              const topic=text(row[idx(['topik','materi','kegiatan'])]) || 'Tidak ditentukan';
              await db.kieActivitySummary.create({data:{uptId:rowUpt,periodId:opts.periodId,topic,participantCount:int(row[idx(['jumlah peserta','peserta'])])||0,counselorCount:int(row[idx(['jumlah penyuluh','penyuluh'])])||0,medicalProfessionalCount:int(row[idx(['medis','tenaga profesional medis'])])||0,nonMedicalProfessionalCount:int(row[idx(['non medis','tenaga profesional non medis'])])||0,internalInstitutionCount:int(row[idx(['satker pas','asal instansi dalam'])])||0,externalInstitutionCount:int(row[idx(['luar satker pas','asal instansi luar'])])||0,sourceRecordId:sr.id}}); break;
            }
            case 'SARPRAS': {
              const sem=/semester\s*2|juli.*desember/i.test(sn)?2:1;
              await db.clinicFacility.create({data:{uptId:rowUpt,year:2026,semester:sem,facilityItem:text(row[idx(['sarana','prasarana','item','jenis'])])||text(row[1])||'Tidak ditentukan',category:text(row[idx(['kategori'])]),quantity:int(row[idx(['jumlah','qty','kuantitas'])])||0,condition:text(row[idx(['kondisi'])]),availabilityStatus:text(row[idx(['ketersediaan','status'])]),notes:text(row[idx(['keterangan','catatan'])]),sourceRecordId:sr.id}}); break;
            }
          }
          valid++;
        }catch(e:any){ await db.sourceRecord.update({where:{id:sr.id},data:{validationStatus:ValidationStatus.ERROR,validationMessage:e.message}}); addErr({level:'ERROR',code:'E004',message:e.message,sheet:sn,row:r+1}); }
      }
    }
  }
  return {valid,warnings,errors,issues,sourceRecords};
}

export async function persistUpload(buf:Buffer,fileName:string,dir:string){
  await fs.mkdir(dir,{recursive:true}); const hash=crypto.createHash('sha256').update(buf).digest('hex'); const ext=path.extname(fileName)||'.xlsx'; const p=path.join(dir,`${hash}${ext}`); await fs.writeFile(p,buf); return {hash,path:p};
}
