import { describe, expect, it } from 'vitest';
import XLSX from 'xlsx';
import { detectType, previewWorkbook } from './engine';

describe('SIPRIMA Excel Import Engine',()=>{
  it('detects report types from file names',()=>{
    expect(detectType('Laporan PTM Kanwil Banten.xlsx')).toBe('PTM');
    expect(detectType('Laporan Kematian Banten.xlsx')).toBe('DEATH');
    expect(detectType('UPT BANTEN - Laporan BJMHS.xlsx')).toBe('BJMHS');
    expect(detectType('SIPRIMA-PAS-Template-Import-Manajemen-Obat-V1.xlsx')).toBe('MEDICINE');
  });
  it('detects medicine template from workbook sheet names',()=>{
    const wb=XLSX.utils.book_new();
    for(const name of ['MASTER_OBAT','MASTER_UPT','PENERIMAAN','OBAT_MASUK','DISTRIBUSI','OBAT_KELUAR','SALDO_AWAL']) XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([['kode obat','nama obat','jumlah'],['OBT-001','Paracetamol',10]]),name);
    expect(detectType('template.xlsx',wb)).toBe('MEDICINE');
  });
  it('previews workbook sheets without saving data',async()=>{
    const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([['No','Nama Satker Pemasyarakatan','Hipertensi'],[1,'LPP Tangerang',2]]),'Lap Agustus 2026');
    const buf=XLSX.write(wb,{type:'buffer',bookType:'xlsx'}) as Buffer;
    const r=await previewWorkbook(buf,'Laporan PTM Kanwil Banten.xlsx');
    expect(r.type).toBe('PTM'); expect(r.sheets[0].month).toBe(8); expect(r.fileHash).toHaveLength(64);
  });
});
