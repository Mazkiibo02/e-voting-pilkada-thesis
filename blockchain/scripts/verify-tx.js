const { ethers } = require("hardhat");

async function main() {
  const txHash = process.env.TX_HASH;

  if (!txHash) {
    console.error("❌ Mohon masukkan Hash Transaksi (Tx Hash).");
    console.error("Penggunaan: TX_HASH=<HASH> npx hardhat run scripts/verify-tx.js --network localhost");
    process.exit(1);
  }

  console.log(`\n🔍 Menganalisis Hash Transaksi: ${txHash}...`);

  try {
    const tx = await ethers.provider.getTransaction(txHash);

    if (!tx) {
      console.error("❌ Transaksi tidak ditemukan di jaringan (Mungkin jaringan salah atau hash salah).");
      process.exit(1);
    }

    const receipt = await ethers.provider.getTransactionReceipt(txHash);
    
    console.log(`\n✅ Transaksi Ditemukan di Block #${receipt.blockNumber}`);
    console.log(`⏱️ Waktu Konfirmasi: Terverifikasi dan Immutable (Permanen)`);
    
    // ABI for storeRecapHash function
    // function storeRecapHash(string _tpsId, string _chasilHash)
    const abi = ["function storeRecapHash(string _tpsId, string _chasilHash)"];
    const iface = new ethers.Interface(abi);

    try {
      const decodedData = iface.parseTransaction({ data: tx.data, value: tx.value });
      
      if (decodedData) {
        console.log(`\n======================================================`);
        console.log(`🧾 BUKTI PENAMBATAN DOKUMEN (IMMUTABILITY PROOF)`);
        console.log(`======================================================`);
        console.log(`🔹 ID TPS         : ${decodedData.args[0]}`);
        console.log(`🔹 Hash Dokumen   : ${decodedData.args[1]}`);
        console.log(`======================================================\n`);
        console.log(`💡 CARA UJI ANTI-FRAUD UNTUK DOSEN PEMBIMBING:`);
        console.log(`1. Buka file PDF asli yang diunduh dari aplikasi e-voting.`);
        console.log(`2. Jalankan perintah di komputer Anda untuk melihat Hash asli file tersebut:`);
        console.log(`   - Windows: certutil -hashfile <namafile>.pdf SHA256`);
        console.log(`   - Mac/Linux: shasum -a 256 <namafile>.pdf`);
        console.log(`3. Hash file tersebut akan SAMA PERSIS dengan Hash Dokumen di atas.`);
        console.log(`4. Silakan ubah isi PDF tersebut sedikit saja (misal tambah 1 spasi atau edit suara).`);
        console.log(`5. Cek lagi hash file PDF palsu tersebut dengan perintah yang sama.`);
        console.log(`6. Hasilnya, Hash akan BERUBAH dan TIDAK COCOK dengan catatan Blockchain ini!`);
        console.log(`7. Karena catatan di Blockchain ini tidak bisa diubah (Immutable), kecurangan langsung ketahuan.\n`);
      } else {
         console.log("⚠️ Data transaksi tidak cocok dengan fungsi storeRecapHash.");
      }
    } catch (e) {
      console.log("⚠️ Gagal mendekode data transaksi. Mungkin ini bukan transaksi penambatan C.Hasil.");
    }
    
  } catch (error) {
    console.error("❌ Terjadi kesalahan saat membaca blockchain:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
