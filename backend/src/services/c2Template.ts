import { escapeHtml } from "../utils/htmlEscape";

export interface C2WitnessObjection {
  witnessName: string;
  candidatePairName?: string;
  ballotNumber?: number;
  status: string; // 'REJECTED' or 'APPROVED'
  note?: string;
  timestamp?: string;
  evidenceFileName?: string;
}

export interface C2TemplateData {
  election: {
    name: string;
    election_type: string;
    region_name: string;
    voting_date: string;
  };
  tps: {
    tps_number: string;
    tps_code: string;
    province: string;
    city_regency: string;
    district: string;
    village: string;
    address: string;
  };
  objections: C2WitnessObjection[];
  kppsOfficer?: {
    name: string;
    nik: string;
  };
  hasObjections: boolean;
}

export function renderC2Template(data: C2TemplateData): string {
  const { election, tps, objections, kppsOfficer, hasObjections } = data;

  const formattedDate = election.voting_date
    ? new Date(election.voting_date).toLocaleDateString("id-ID", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Hari Pemungutan Suara";

  const objectionItemsHtml = hasObjections && objections.length > 0
    ? objections.map((obj, idx) => `
        <div style="margin-bottom: 12px; padding: 10px; border: 1px solid #cbd5e1; border-radius: 4px; background-color: #f8fafc;">
          <div style="font-weight: bold; color: #1e293b; font-size: 11pt;">
            ${idx + 1}. Saksi: ${escapeHtml(obj.witnessName)} 
            ${obj.candidatePairName ? `<span style="color: #2563eb; font-weight: normal;">(Saksi Paslon No. ${obj.ballotNumber || '-'} - ${escapeHtml(obj.candidatePairName)})</span>` : ''}
          </div>
          <div style="margin-top: 4px; color: #334155; font-size: 10.5pt; line-height: 1.5;">
            <strong>Uraian Keberatan / Catatan Kejadian Khusus:</strong><br/>
            <em>"${escapeHtml(obj.note || 'Tidak ada uraian tertulis.')}"</em>
          </div>
          ${obj.timestamp ? `<div style="margin-top: 4px; font-size: 9pt; color: #64748b; font-family: monospace;">Waktu Laporan: ${escapeHtml(obj.timestamp)} WIB</div>` : ''}
          ${obj.evidenceFileName ? `<div style="margin-top: 2px; font-size: 9pt; color: #166534;">✓ Lampiran Bukti Fisik: ${escapeHtml(obj.evidenceFileName)}</div>` : ''}
        </div>
      `).join("")
    : `<div style="text-align: center; padding: 40px 0; font-size: 24pt; font-weight: bold; letter-spacing: 6px; color: #1e293b; text-transform: uppercase;">
        - N I H I L -
       </div>
       <p style="text-align: center; color: #64748b; font-size: 10pt; margin-top: -10px;">
        (Tidak terdapat Kejadian Khusus dan/atau Pernyataan Keberatan oleh Saksi pada TPS ini)
       </p>`;

  const witnessSignaturesHtml = hasObjections && objections.length > 0
    ? objections.map(obj => `
        <div style="text-align: center; width: 45%; margin-bottom: 20px;">
          <div style="font-size: 10pt; font-weight: bold; color: #1e293b;">YANG MENGAJUKAN KEBERATAN</div>
          <div style="font-size: 9.5pt; color: #475569;">SAKSI PASLON ${obj.ballotNumber ? `NO. ${obj.ballotNumber}` : ''}</div>
          <div style="height: 60px; border-bottom: 1px dashed #94a3b8; margin: 10px auto 5px auto; width: 80%;"></div>
          <div style="font-weight: bold; text-decoration: underline; font-size: 10pt;">${escapeHtml(obj.witnessName)}</div>
        </div>
      `).join("")
    : `
        <div style="text-align: center; width: 45%;">
          <div style="font-size: 10pt; font-weight: bold; color: #1e293b;">YANG MENGAJUKAN KEBERATAN</div>
          <div style="font-size: 9.5pt; color: #475569;">SAKSI - SAKSI</div>
          <div style="height: 60px; border-bottom: 1px dashed #94a3b8; margin: 10px auto 5px auto; width: 80%;"></div>
          <div style="font-weight: bold; font-size: 10pt; color: #64748b;">( N I H I L )</div>
        </div>
      `;

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Model C.Kejadian Khusus Dan/Atau Keberatan Saksi-KPU</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 15mm;
    }
    body {
      font-family: Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 20px;
      font-size: 11pt;
      line-height: 1.4;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      border: 2px solid #0f172a;
      padding: 20px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 15px;
    }
    .header-table td {
      vertical-align: middle;
    }
    .logo {
      width: 70px;
      height: auto;
    }
    .title-box {
      text-align: center;
      padding: 0 10px;
    }
    .title-main {
      font-size: 12pt;
      font-weight: bold;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .title-sub {
      font-size: 11pt;
      font-weight: bold;
      text-transform: uppercase;
    }
    .model-badge {
      border: 2px solid #0f172a;
      padding: 6px 10px;
      font-size: 8pt;
      font-weight: bold;
      text-align: center;
      line-height: 1.2;
      background-color: #f8fafc;
    }
    .info-grid {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
      margin-bottom: 20px;
      font-size: 10.5pt;
    }
    .info-grid td {
      padding: 4px 6px;
      vertical-align: top;
    }
    .content-box {
      border: 1.5px solid #0f172a;
      min-height: 250px;
      padding: 15px;
      margin-bottom: 20px;
      background-color: #ffffff;
    }
    .content-header {
      font-weight: bold;
      font-size: 11pt;
      margin-bottom: 12px;
      border-b: 1px solid #cbd5e1;
      padding-bottom: 6px;
    }
    .signatures-container {
      margin-top: 30px;
      width: 100%;
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
    }
    .signature-box {
      width: 45%;
      text-align: center;
    }
    .notes-footer {
      margin-top: 30px;
      border-t: 1px solid #cbd5e1;
      padding-top: 10px;
      font-size: 8.5pt;
      color: #334155;
    }
    .notes-footer ol {
      margin: 4px 0 0 16px;
      padding: 0;
    }
    .no-print {
      margin-bottom: 15px;
      text-align: right;
    }
    @media print {
      .no-print { display: none; }
      .container { border: none; box-shadow: none; padding: 0; }
      body { padding: 0; }
    }
  </style>
</head>
<body>

  <div class="no-print">
    <button onclick="window.print()" style="background-color: #2563eb; color: white; border: none; padding: 8px 16px; font-weight: bold; border-radius: 4px; cursor: pointer;">
      🖨️ Cetak / Print Dokumen C2-KWK
    </button>
  </div>

  <div class="container">
    <!-- Header -->
    <table class="header-table">
      <tr>
        <td style="width: 15%;">
          <div style="text-align: center; font-size: 28pt; font-weight: bold; color: #b91c1c;">🗳️</div>
        </td>
        <td style="width: 60%;" class="title-box">
          <div class="title-main">KOMISI PEMILIHAN UMUM</div>
          <div class="title-sub">CATATAN KEJADIAN KHUSUS DAN/ATAU KEBERATAN SAKSI</div>
          <div style="font-size: 10pt; font-weight: bold; margin-top: 2px;">PEMUNGUTAN DAN PENGHITUNGAN SUARA PEMILIHAN UMUM</div>
        </td>
        <td style="width: 25%;">
          <div class="model-badge">
            MODEL C.KEJADIAN KHUSUS DAN/ATAU KEBERATAN SAKSI-KPU
          </div>
        </td>
      </tr>
    </table>

    <!-- Wilayah Info -->
    <table class="info-grid">
      <tr>
        <td style="width: 18%; font-weight: bold;">Nomor TPS</td>
        <td style="width: 2%;">:</td>
        <td style="width: 30%;">TPS ${escapeHtml(tps.tps_number)} (${escapeHtml(tps.tps_code)})</td>
        <td style="width: 18%; font-weight: bold;">Desa/Kelurahan *)</td>
        <td style="width: 2%;">:</td>
        <td style="width: 30%;">${escapeHtml(tps.village)}</td>
      </tr>
      <tr>
        <td style="font-weight: bold;">Kecamatan/Distrik *)</td>
        <td>:</td>
        <td>${escapeHtml(tps.district)}</td>
        <td style="font-weight: bold;">Kabupaten/Kota *)</td>
        <td>:</td>
        <td>${escapeHtml(tps.city_regency)}</td>
      </tr>
      <tr>
        <td style="font-weight: bold;">Provinsi</td>
        <td>:</td>
        <td colspan="4">${escapeHtml(tps.province)}</td>
      </tr>
    </table>

    <!-- Body Section -->
    <div class="content-box">
      <div class="content-header">
        Kejadian Khusus / pernyataan keberatan oleh Saksi *) sebagai berikut :
      </div>

      ${objectionItemsHtml}
    </div>

    <!-- Tanda Tangan Section -->
    <div style="text-align: right; margin-bottom: 15px; font-size: 10pt;">
      ${escapeHtml(tps.city_regency)}, ${formattedDate}
    </div>

    <div class="signatures-container">
      ${witnessSignaturesHtml}

      <div class="signature-box">
        <div style="font-size: 10pt; font-weight: bold; color: #1e293b;">KELOMPOK PENYELENGGARA PEMUNGUTAN SUARA</div>
        <div style="font-size: 9.5pt; color: #475569;">KETUA KPPS</div>
        <div style="height: 60px; border-bottom: 1px dashed #94a3b8; margin: 10px auto 5px auto; width: 80%;"></div>
        <div style="font-weight: bold; text-decoration: underline; font-size: 10pt;">${escapeHtml(kppsOfficer?.name || `Ketua KPPS ${tps.tps_code}`)}</div>
      </div>
    </div>

    <!-- Footer Notes -->
    <div class="notes-footer">
      <strong>*) Coret yang tidak perlu</strong><br/>
      <strong>Keterangan :</strong>
      <ol>
        <li>Apabila terdapat <em>Kejadian Khusus</em>, dicatat dan ditandatangani oleh Ketua KPPS;</li>
        <li>Apabila terdapat <em>Keberatan Saksi</em>, dicatat oleh Saksi dan ditandatangani bersama oleh Saksi dan Ketua KPPS pada hari pemungutan suara;</li>
        <li>Apabila tidak terdapat <em>Kejadian Khusus</em> dan/atau pernyataan <em>Keberatan Saksi</em>, dicatat dengan kalimat <strong>NIHIL</strong> dan ditandatangani oleh Ketua KPPS.</li>
      </ol>
    </div>

  </div>

</body>
</html>`;
}
