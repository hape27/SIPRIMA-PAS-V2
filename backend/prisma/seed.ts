import 'dotenv/config';
import { PrismaClient, RoleName, PeriodType } from '@prisma/client';
import bcrypt from 'bcryptjs';
const db = new PrismaClient();
const adminEmail = process.env.ADMIN_EMAIL!;
const adminPassword = process.env.ADMIN_PASSWORD!;
if(!adminEmail || !adminPassword || adminPassword.length < 12) throw new Error('ADMIN_EMAIL dan ADMIN_PASSWORD (minimal 12 karakter) wajib diisi saat seed.');
const upts = [
['LPT_TANGERANG','Lembaga Pemasyarakatan Kelas I Tangerang','Lapas','I','Tangerang'],
['LPKA_TANGERANG','Lembaga Pembinaan Khusus Anak Kelas I Tangerang','LPKA','I','Tangerang'],
['LPP_TANGERANG','Lembaga Pemasyarakatan Perempuan Kelas IIA Tangerang','Lapas','IIA','Tangerang'],
['LPP_MUDA_TANGERANG','Lembaga Pemasyarakatan Pemuda Kelas IIA Tangerang','Lapas','IIA','Tangerang'],
['LAPAS_IIA_TANGERANG','Lembaga Pemasyarakatan Kelas IIA Tangerang','Lapas','IIA','Tangerang'],
['LAPAS_SERANG','Lembaga Pemasyarakatan Kelas IIA Serang','Lapas','IIA','Serang'],
['LAPAS_CILEGON','Lembaga Pemasyarakatan Kelas IIA Cilegon','Lapas','IIA','Cilegon'],
['LAPTER_CIANGIR','Lembaga Pemasyarakatan Terbuka Kelas IIB Ciangir','Lapas Terbuka','IIB','Tangerang'],
['LAPAS_RANGKASBITUNG','Lembaga Pemasyarakatan Kelas III Rangkasbitung','Lapas','III','Lebak'],
['RUTAN_TANGERANG','Rumah Tahanan Negara Kelas I Tangerang','Rutan','I','Tangerang'],
['RUTAN_SERANG','Rumah Tahanan Negara Kelas IIB Serang','Rutan','IIB','Serang'],
['RUTAN_PANDEGLANG','Rumah Tahanan Negara Kelas IIB Pandeglang','Rutan','IIB','Pandeglang']
] as const;
const types = [['PTM','Penyakit Tidak Menular','MONTHLY'],['INFECTIOUS','Penyakit Menular','MONTHLY'],['REFERRAL','Laporan Rujukan','MONTHLY'],['DEATH','Laporan Kematian','MONTHLY'],['BJMHS','BJMHS','MONTHLY'],['MATERNAL','Ibu Hamil, Melahirkan dan Menyusui','MONTHLY'],['PALLIATIVE','Paliatif','MONTHLY'],['KIE','KIE','MONTHLY'],['SARPRAS','Sarana Prasarana Klinik','SEMESTERLY'],['MEDICINE','Manajemen Obat','MONTHLY']] as const;
async function main(){
 const hash=await bcrypt.hash(adminPassword,12); await db.user.upsert({where:{email:adminEmail},update:{passwordHash:hash},create:{name:'Administrator SIPRIMA',email:adminEmail,passwordHash:hash,role:RoleName.ADMIN}});
 for(const [kodeUpt,namaUpt,jenisUpt,kelasUpt,kabupatenKota] of upts) await db.masterUPT.upsert({where:{kodeUpt},update:{namaUpt,jenisUpt,kelasUpt,kabupatenKota,kanwil:'Banten'},create:{kodeUpt,namaUpt,jenisUpt,kelasUpt,kabupatenKota,kanwil:'Banten'}});
 for(const [code,name,periodicity] of types) await db.reportType.upsert({where:{code},update:{name,periodicity},create:{code,name,periodicity}});
 for(const semester of [1,2]){ const start=new Date(Date.UTC(2026,semester===1?0:6,1)); const end=new Date(Date.UTC(2026,semester===1?6:12,0,23,59,59)); const existing=await db.reportPeriod.findFirst({where:{tahun:2026,tipePeriode:PeriodType.SEMESTERAN,semester,bulan:null}}); const data={label:`Semester ${semester} 2026`,startDate:start,endDate:end}; if(existing) await db.reportPeriod.update({where:{id:existing.id},data}); else await db.reportPeriod.create({data:{tahun:2026,tipePeriode:PeriodType.SEMESTERAN,semester,label:data.label,startDate:start,endDate:end}}); }
 for(const month of [1,2,3,4,5,6,7,8,9,10,11,12]){ const start=new Date(Date.UTC(2026,month-1,1)); const end=new Date(Date.UTC(2026,month,0,23,59,59)); const existing=await db.reportPeriod.findFirst({where:{tahun:2026,tipePeriode:PeriodType.BULANAN,bulan:month,semester:null}}); const data={label:start.toLocaleString('id-ID',{month:'long',year:'numeric'}),startDate:start,endDate:end}; if(existing) await db.reportPeriod.update({where:{id:existing.id},data}); else await db.reportPeriod.create({data:{tahun:2026,tipePeriode:PeriodType.BULANAN,bulan:month,label:data.label,startDate:start,endDate:end}}); }
 console.log(`Seed selesai. Admin: ${adminEmail}`);
}
main().finally(()=>db.$disconnect());
