import { escapeHtml } from "../utils/htmlEscape";

export interface ChasilTemplateData {
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
  recap: {
    id: number;
    total_registered_voters: number;
    total_verified_voters: number;
    total_valid_votes: number;
    total_invalid_votes: number;
    validation_status: string;
  };
  candidateTotals: Array<{
    ballotNumber: number;
    candidateName: string;
    viceCandidateName: string;
    coalitionName: string | null;
    voteTotal: number;
    voteTotalInWords: string;
  }>;
  documentId: number;
  status: string;
  generatedAt: string;
}

export function generateChasilHtml(data: ChasilTemplateData): string {
  const { election, tps, recap, candidateTotals, documentId, status, generatedAt } = data;

  const candidateRowsHtml = candidateTotals
    .map(
      (c) => `
    <tr>
      <td style="text-align: center; font-weight: bold; font-size: 1.1em;">${escapeHtml(c.ballotNumber)}</td>
      <td>
        <div style="font-weight: bold;">${escapeHtml(c.candidateName)}</div>
        <div style="font-size: 0.9em; color: #555;">Wakil: ${escapeHtml(c.viceCandidateName)}</div>
        <div style="font-size: 0.8em; color: #777; margin-top: 2px;">Koalisi: ${escapeHtml(c.coalitionName || "Independen")}</div>
      </td>
      <td style="text-align: center; font-size: 1.1em; font-weight: bold; font-family: monospace; letter-spacing: 1px;">
        ${escapeHtml(c.voteTotal)}
      </td>
      <td style="font-style: italic; text-transform: capitalize; font-size: 0.9em;">
        ${escapeHtml(c.voteTotalInWords)}
      </td>
    </tr>
  `
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>C.Hasil-KWK-inspired TPS Result Form - ${escapeHtml(tps.tps_code)}</title>
  <style>
    @page {
      size: A4;
      margin: 1.5cm;
    }
    body {
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      color: #1a1a1a;
      line-height: 1.4;
      margin: 0;
      padding: 0;
      background-color: #ffffff;
      font-size: 12px;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
    }
    header {
      text-align: center;
      margin-bottom: 15px;
      border-bottom: 3px double #1a1a1a;
      padding-bottom: 8px;
    }
    .logo-area {
      font-size: 1.8em;
      font-weight: 800;
      letter-spacing: 1px;
      margin-bottom: 5px;
      text-transform: uppercase;
    }
    .academic-disclaimer {
      background-color: #fff9db;
      border: 1px solid #f59f00;
      color: #f76707;
      padding: 8px 12px;
      margin-bottom: 15px;
      border-radius: 4px;
      font-weight: 600;
      font-size: 0.95em;
      text-align: center;
    }
    .section-title {
      font-size: 1.1em;
      font-weight: bold;
      text-transform: uppercase;
      background-color: #f1f3f5;
      padding: 4px 8px;
      margin: 15px 0 8px 0;
      border-left: 4px solid #1a1a1a;
    }
    .grid-metadata {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      margin-bottom: 10px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 10px;
    }
    table, th, td {
      border: 1px solid #333333;
    }
    th {
      background-color: #f8f9fa;
      font-weight: bold;
      padding: 6px 8px;
      text-align: left;
    }
    td {
      padding: 5px 8px;
      vertical-align: middle;
    }
    .tbl-narrow th, .tbl-narrow td {
      padding: 4px 6px;
    }
    .number-box {
      font-family: monospace;
      font-weight: bold;
      font-size: 1.1em;
    }
    .signature-container {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      margin-top: 25px;
      page-break-inside: avoid;
    }
    .signature-box {
      border: 1px solid #333333;
      padding: 10px;
      text-align: center;
      min-height: 120px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .signature-title {
      font-weight: bold;
      border-bottom: 1px solid #cccccc;
      padding-bottom: 4px;
      margin-bottom: 40px;
    }
    .signature-line {
      margin-top: 30px;
      border-top: 1px dashed #333333;
      display: inline-block;
      width: 80%;
    }
    .notes-box {
      border: 1px solid #333333;
      padding: 8px;
      min-height: 50px;
      margin-top: 10px;
      font-style: italic;
      color: #666;
    }
    .integrity-container {
      border: 1px solid #dee2e6;
      border-radius: 4px;
      padding: 10px;
      margin-top: 20px;
      background-color: #f8f9fa;
      page-break-inside: avoid;
    }
    .integrity-grid {
      display: grid;
      grid-template-columns: 120px 1fr;
      row-gap: 5px;
    }
    .integrity-label {
      font-weight: bold;
      color: #495057;
    }
    .integrity-value {
      font-family: monospace;
      word-break: break-all;
    }
    footer {
      margin-top: 30px;
      border-top: 1px solid #cccccc;
      padding-top: 8px;
      text-align: center;
      color: #868e96;
      font-size: 0.8em;
      font-style: italic;
      page-break-inside: avoid;
    }
    @media print {
      body {
        font-size: 11px;
      }
      .container {
        width: 100%;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="logo-area">C.Hasil-KWK-inspired TPS Result Form</div>
      <div style="font-weight: bold; font-size: 1.1em; text-transform: uppercase;">Sertifikat Hasil Penghitungan Suara di TPS</div>
    </header>

    <div class="academic-disclaimer">
      Dokumen ini merupakan formulir hasil TPS yang terinspirasi dari C.Hasil-KWK untuk kebutuhan prototipe akademik dan bukan formulir resmi KPU.
    </div>

    <div class="section-title">I. Informasi Pemilihan & TPS</div>
    <div class="grid-metadata">
      <div>
        <table class="tbl-narrow">
          <tr>
            <th style="width: 40%;">Pemilihan</th>
            <td>${escapeHtml(election.name)}</td>
          </tr>
          <tr>
            <th>Jenis Pemilihan</th>
            <td style="text-transform: capitalize;">${escapeHtml(election.election_type.toLowerCase())}</td>
          </tr>
          <tr>
            <th>Wilayah / Daerah</th>
            <td>${escapeHtml(election.region_name)}</td>
          </tr>
          <tr>
            <th>Tanggal Pemungutan</th>
            <td>${escapeHtml(election.voting_date)}</td>
          </tr>
        </table>
      </div>
      <div>
        <table class="tbl-narrow">
          <tr>
            <th style="width: 45%;">Kode TPS</th>
            <td class="number-box">${escapeHtml(tps.tps_code)}</td>
          </tr>
          <tr>
            <th>Nomor TPS</th>
            <td>TPS ${escapeHtml(tps.tps_number)}</td>
          </tr>
          <tr>
            <th>Desa/Kelurahan</th>
            <td>${escapeHtml(tps.village)}</td>
          </tr>
          <tr>
            <th>Kecamatan</th>
            <td>${escapeHtml(tps.district)}</td>
          </tr>
          <tr>
            <th>Kabupaten/Kota</th>
            <td>${escapeHtml(tps.city_regency)}</td>
          </tr>
        </table>
      </div>
    </div>
    <table class="tbl-narrow" style="margin-top: -5px;">
      <tr>
        <th style="width: 20%;">Alamat TPS</th>
        <td>${escapeHtml(tps.address || "-")}</td>
      </tr>
      <tr>
        <th>Waktu Pembuatan</th>
        <td>${escapeHtml(generatedAt)}</td>
      </tr>
    </table>

    <div class="section-title">II. Data Pemilih dan Penggunaan Hak Pilih</div>
    <table>
      <thead>
        <tr>
          <th style="width: 5%; text-align: center;">No</th>
          <th>Uraian</th>
          <th style="width: 25%; text-align: center;">Jumlah Suara/Pemilih</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="text-align: center;">1</td>
          <td>Pemilih Terdaftar dalam Daftar Pemilih Tetap (DPT)</td>
          <td style="text-align: center;" class="number-box">${escapeHtml(recap.total_registered_voters)}</td>
        </tr>
        <tr>
          <td style="text-align: center;">2</td>
          <td>Pemilih yang Datang & Terverifikasi oleh KPPS (Hak Pilih Digunakan)</td>
          <td style="text-align: center;" class="number-box">${escapeHtml(recap.total_verified_voters)}</td>
        </tr>
        <tr>
          <td style="text-align: center;">3</td>
          <td>Total Sesi Pemungutan Digital yang Diterbitkan</td>
          <td style="text-align: center;" class="number-box">${escapeHtml(recap.total_verified_voters)}</td>
        </tr>
        <tr>
          <td style="text-align: center;">4</td>
          <td>Total Sesi Pemungutan Digital yang Digunakan Pemilih</td>
          <td style="text-align: center;" class="number-box">${escapeHtml(recap.total_valid_votes)}</td>
        </tr>
        <tr>
          <td style="text-align: center;">5</td>
          <td>Status Validasi Rekapitulasi Suara Lokal</td>
          <td style="text-align: center; font-weight: bold; color: ${recap.validation_status === "VALID" ? "#2b8a3e" : "#c92a2a"};">
            ${escapeHtml(recap.validation_status)}
          </td>
        </tr>
      </tbody>
    </table>

    <div class="section-title">III. Rincian Perolehan Suara Pasangan Calon</div>
    <table>
      <thead>
        <tr>
          <th style="width: 8%; text-align: center;">No. Urut</th>
          <th>Pasangan Calon</th>
          <th style="width: 15%; text-align: center;">Jumlah Suara</th>
          <th>Suara Terbilang (Indonesian Words)</th>
        </tr>
      </thead>
      <tbody>
        ${candidateRowsHtml}
      </tbody>
    </table>

    <div class="section-title">IV. Pernyataan Hasil Pemilihan</div>
    <table>
      <thead>
        <tr>
          <th>Kategori Hasil</th>
          <th style="width: 25%; text-align: center;">Jumlah</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>A. Jumlah Suara Sah Seluruh Pasangan Calon</td>
          <td style="text-align: center;" class="number-box">${escapeHtml(recap.total_valid_votes)}</td>
        </tr>
        <tr>
          <td>B. Jumlah Suara Tidak Sah (E-Voting)</td>
          <td style="text-align: center;" class="number-box">${escapeHtml(recap.total_invalid_votes)}</td>
        </tr>
        <tr style="font-weight: bold; background-color: #f8f9fa;">
          <td>C. Total Suara Sah & Tidak Sah (A + B)</td>
          <td style="text-align: center;" class="number-box">${escapeHtml(recap.total_valid_votes + recap.total_invalid_votes)}</td>
        </tr>
      </tbody>
    </table>

    <div class="notes-box">
      <strong>Catatan/Keberatan Saksi & Catatan Kejadian Khusus:</strong><br>
      [ ] Tidak Ada Kejadian Khusus / Keberatan Saksi.<br>
      [ ] Terdapat catatan/keberatan terlampir pada sistem verifikasi saksi secara digital.
    </div>

    <div class="signature-container">
      <div class="signature-box">
        <div class="signature-title">KPPS (Kelompok Penyelenggara Pemungutan Suara)</div>
        <div style="font-size: 0.9em; color: #666;">KPPS DEMO / PETUGAS TPS</div>
        <div class="signature-line"></div>
        <div style="font-weight: bold;">( Tanda Tangan Basah )</div>
      </div>
      <div class="signature-box">
        <div class="signature-title">Saksi Pasangan Calon</div>
        <div style="font-size: 0.9em; color: #666;">Saksi Resmi TPS</div>
        <div class="signature-line"></div>
        <div style="font-weight: bold;">( Tanda Tangan Basah )</div>
      </div>
    </div>

    <div class="integrity-container">
      <div style="font-weight: bold; margin-bottom: 5px; font-size: 1.05em; border-bottom: 1px solid #dee2e6; padding-bottom: 3px;">
        Integrity & Security Metadata (Academic Prototype)
      </div>
      <div class="integrity-grid">
        <div class="integrity-label">Document ID:</div>
        <div class="integrity-value">${escapeHtml(documentId)}</div>

        <div class="integrity-label">Document Status:</div>
        <div class="integrity-value" style="font-weight: bold; color: #1c7ed6;">${escapeHtml(status)}</div>

        <div class="integrity-label">Document Hash:</div>
        <div class="integrity-value" style="color: #868e96; font-style: italic;">
          Will be generated after signed document upload
        </div>

        <div class="integrity-label">Tx Hash (On-Chain):</div>
        <div class="integrity-value" style="color: #868e96; font-style: italic;">
          Will be available after TPS finalization
        </div>
      </div>
    </div>

    <footer>
      Dokumen ini merupakan hasil keluaran sistem prototype akademik "Website E-Voting Pilkada Berbasis Blockchain".<br>
      Bukan merupakan dokumen hukum resmi dari Komisi Pemilihan Umum (KPU).
    </footer>
  </div>
</body>
</html>
`;
}
