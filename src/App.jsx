import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, set } from 'firebase/database';

// Konfigurasi otomatis dari data Firebase SPPG Jatibaru
const firebaseConfig = {
  apiKey: "AIzaSyBuTGMwbup_gwPI7V_DcqdpEZ_6tGq9elk",
  authDomain: "sppg-jatibaru.firebaseapp.com",
  databaseURL: "https://sppg-jatibaru-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "sppg-jatibaru",
  storageBucket: "sppg-jatibaru.firebasestorage.app",
  messagingSenderId: "493602789343",
  appId: "1:493602789343:web:a1db04a246cf89f01c966a",
  measurementId: "G-0R67S4R71Q"
};

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Data Edukasi Kandungan Gizi (Ramah Anak & Guru)
const giziDetails = {
  energi: {
    nama: 'Energi (Kalori)',
    icon: '⚡',
    badgeBg: 'bg-amber-100 text-amber-800 border-amber-300',
    headerGradient: 'from-amber-400 to-orange-400',
    apaItu: 'Tenaga utama yang dihasilkan tubuh dari makanan dan minuman yang kita konsumsi setiap hari.',
    untukApa: 'Membuat tubuh kuat, tidak mudah lemas, dan bersemangat saat belajar, bermain, maupun berolahraga di sekolah.',
    contoh: 'Nasi, lauk pauk, sayur, buah, dan susu.'
  },
  protein: {
    nama: 'Protein',
    icon: '🍗',
    badgeBg: 'bg-pink-100 text-pink-800 border-pink-300',
    headerGradient: 'from-pink-500 to-rose-400',
    apaItu: 'Zat pembangun tubuh yang berasal dari bahan makanan hewani maupun nabati.',
    untukApa: 'Membantu pertumbuhan tinggi badan, membentuk otot, memperbaiki sel tubuh yang rusak, dan menjaga daya tahan tubuh agar tidak mudah sakit.',
    contoh: 'Ayam, ikan, telur, daging, susu, tahu, tempe, dan kacang-kacangan.'
  },
  lemak: {
    nama: 'Lemak Sehat',
    icon: '🧀',
    badgeBg: 'bg-purple-100 text-purple-800 border-purple-300',
    headerGradient: 'from-purple-500 to-indigo-400',
    apaItu: 'Sumber cadangan energi dan pelindung organ penting di dalam tubuh.',
    untukApa: 'Membantu penyerapan vitamin (A, D, E, K), menjaga suhu tubuh tetap hangat, serta mendukung perkembangan otak dan konsentrasi belajar.',
    contoh: 'Ikan, kuning telur, keju, susu, alpukat, dan minyak nabati.'
  },
  karbohidrat: {
    nama: 'Karbohidrat',
    icon: '🍚',
    badgeBg: 'bg-sky-100 text-sky-800 border-sky-300',
    headerGradient: 'from-sky-500 to-blue-500',
    apaItu: 'Sumber bahan bakar utama dan tercepat bagi tubuh serta otak kita.',
    untukApa: 'Memberikan energi instan agar otak fokus berpikir saat menerima pelajaran dan tubuh aktif bergerak sepanjang hari.',
    contoh: 'Nasi putih/merah, roti, kentang, jagung, ubi, dan singkong.'
  },
  serat: {
    nama: 'Serat',
    icon: '🥦',
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    headerGradient: 'from-emerald-500 to-teal-500',
    apaItu: 'Bagian alami dari tumbuh-tumbuhan yang sangat baik untuk saluran pencernaan.',
    untukApa: 'Melancarkan buang air besar (mencegah sembelit), menjaga kesehatan usus, dan membuat perut kenyang lebih lama.',
    contoh: 'Sayur bayam, wortel, brokoli, buncis, pisang, pepaya, dan jeruk.'
  }
};

// Helper: ubah angka ke string agar mudah diedit (bisa dikosongkan & pakai koma)
const toEditableMenus = (menuList) =>
  menuList.map((m) => ({
    ...m,
    porsiKecil: Object.fromEntries(
      Object.entries(m.porsiKecil || {}).map(([k, v]) => [k, String(v ?? '')])
    ),
    porsiBesar: Object.fromEntries(
      Object.entries(m.porsiBesar || {}).map(([k, v]) => [k, String(v ?? '')])
    ),
  }));

// Helper: konversi string input (koma/titik) menjadi angka valid sebelum disimpan ke Firebase
const toNumericMenus = (menuList) =>
  menuList.map((m) => ({
    ...m,
    porsiKecil: Object.fromEntries(
      Object.entries(m.porsiKecil || {}).map(([k, v]) => {
        const parsed = parseFloat(String(v).replace(',', '.'));
        return [k, isNaN(parsed) ? 0 : parsed];
      })
    ),
    porsiBesar: Object.fromEntries(
      Object.entries(m.porsiBesar || {}).map(([k, v]) => {
        const parsed = parseFloat(String(v).replace(',', '.'));
        return [k, isNaN(parsed) ? 0 : parsed];
      })
    ),
  }));

export default function LabelMBG() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [showLogin, setShowLogin] = useState(false);
  const [menus, setMenus] = useState([]);
  const [draftMenus, setDraftMenus] = useState([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [saveNotif, setSaveNotif] = useState(false);
  const [selectedGiziDetail, setSelectedGiziDetail] = useState(null); // null | 'all' | 'energi' | 'protein' | 'lemak' | 'karbohidrat' | 'serat'
  const [activeDate, setActiveDate] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const menusRef = ref(database, 'sppgMenus');

    onValue(menusRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setMenus(data);
        setActiveDate((prev) => prev || data[0].tanggal);
      } else {
        const today = new Date().toISOString().split('T')[0];
        const defaultMenu = {
          id: Date.now(),
          tanggal: today,
          image: 'https://via.placeholder.com/300x400?text=Upload+Label+Menu',
          porsiKecil: { energi: 630, protein: 24.6, lemak: 20.1, karbohidrat: 58.0, serat: 2.5 },
          porsiBesar: { energi: 705, protein: 26.7, lemak: 22.3, karbohidrat: 67.8, serat: 2.6 }
        };
        setMenus([defaultMenu]);
        setActiveDate(defaultMenu.tanggal);
        set(ref(database, 'sppgMenus'), [defaultMenu]);
      }
      setIsLoading(false);
    });
  }, []);

  const saveMenus = (newMenus) => {
    set(ref(database, 'sppgMenus'), newMenus);
  };

  const displayedList = isAdmin ? draftMenus : menus;
  const activeMenu = displayedList.find((m) => m.tanggal === activeDate) || displayedList[0];

  const handleLogin = (e) => {
    e.preventDefault();
    if (pinInput === 'sudiro123456') {
      setDraftMenus(toEditableMenus(menus));
      setHasUnsavedChanges(false);
      setIsAdmin(true);
      setShowLogin(false);
      setPinInput('');
    } else {
      alert('PIN Salah!');
    }
  };

  const handleAddMenu = () => {
    const newDate = prompt("Masukkan tanggal baru (Format: YYYY-MM-DD)", new Date().toISOString().split('T')[0]);
    if (newDate) {
      if (draftMenus.find((m) => m.tanggal === newDate)) {
        alert("Menu untuk tanggal tersebut sudah ada!");
        return;
      }
      const newMenu = {
        id: Date.now(),
        tanggal: newDate,
        image: 'https://via.placeholder.com/300x400?text=Upload+Label+Baru',
        porsiKecil: { energi: 0, protein: 0, lemak: 0, karbohidrat: 0, serat: 0 },
        porsiBesar: { energi: 0, protein: 0, lemak: 0, karbohidrat: 0, serat: 0 }
      };
      const updatedNumeric = [...toNumericMenus(draftMenus), newMenu].sort(
        (a, b) => new Date(b.tanggal) - new Date(a.tanggal)
      );
      saveMenus(updatedNumeric);
      setDraftMenus(toEditableMenus(updatedNumeric));
      setActiveDate(newDate);
    }
  };

  const handleDeleteMenu = () => {
    if (draftMenus.length === 1) {
      alert("Tidak bisa menghapus data terakhir!");
      return;
    }
    if (window.confirm(`Yakin ingin menghapus menu tanggal ${activeDate}?`)) {
      const updatedNumeric = toNumericMenus(draftMenus).filter((m) => m.tanggal !== activeDate);
      saveMenus(updatedNumeric);
      setDraftMenus(toEditableMenus(updatedNumeric));
      setActiveDate(updatedNumeric[0].tanggal);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.src = reader.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 600;
          const scaleSize = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
          const updatedDraft = draftMenus.map((m) =>
            m.tanggal === activeDate ? { ...m, image: compressedBase64 } : m
          );
          setDraftMenus(updatedDraft);
          saveMenus(toNumericMenus(updatedDraft));
        };
      };
      reader.readAsDataURL(file);
    }
  };

  const handleInputChange = (porsi, field, rawValue) => {
    const cleaned = rawValue.replace(/[^0-9.,]/g, '');
    setDraftMenus((prev) =>
      prev.map((m) => {
        if (m.tanggal === activeDate) {
          return { ...m, [porsi]: { ...m[porsi], [field]: cleaned } };
        }
        return m;
      })
    );
    setHasUnsavedChanges(true);
  };

  const handleSaveData = () => {
    const normalized = toNumericMenus(draftMenus);
    saveMenus(normalized);
    setDraftMenus(toEditableMenus(normalized));
    setHasUnsavedChanges(false);
    setSaveNotif(true);
    setTimeout(() => setSaveNotif(false), 3000);
  };

  const handleConfirmExit = () => {
    const normalized = toNumericMenus(draftMenus);
    saveMenus(normalized);
    setHasUnsavedChanges(false);
    setShowExitConfirm(false);
    setIsAdmin(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-100 to-sky-100 flex flex-col items-center justify-center p-10">
        <div className="text-5xl animate-bounce mb-3">🍱</div>
        <div className="font-extrabold text-pink-600 text-lg animate-pulse">Memuat Data SPPG Jatibaru 3...</div>
      </div>
    );
  }

  // Daftar key yang akan ditampilkan di modal detail
  const detailKeysToRender =
    selectedGiziDetail === 'all'
      ? Object.keys(giziDetails)
      : selectedGiziDetail && giziDetails[selectedGiziDetail]
      ? [selectedGiziDetail]
      : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-100 to-sky-100 font-sans p-2 sm:p-4 flex justify-center">
      {/* Animasi Kustom */}
      <style>{`
        @keyframes floatSlow {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-5px); }
        }
        @keyframes wiggle {
          0%, 100% { transform: rotate(-4deg); }
          50% { transform: rotate(4deg); }
        }
        @keyframes popIn {
          0% { transform: scale(0.95) translateY(8px); }
          100% { transform: scale(1) translateY(0); }
        }
        .animate-float { animation: floatSlow 3s ease-in-out infinite; }
        .animate-float-delay { animation: floatSlow 3.5s ease-in-out 1.2s infinite; }
        .hover-wiggle:hover { animation: wiggle 0.4s ease-in-out infinite; }
        .animate-pop { animation: popIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>

      <div className="w-full max-w-2xl bg-white shadow-2xl rounded-3xl overflow-hidden border-2 border-pink-300 flex flex-col">
        
        {/* HEADER */}
        <div className="bg-gradient-to-r from-pink-500 via-rose-400 to-pink-500 text-white py-5 sm:py-6 shadow-md relative flex items-center justify-center px-4 min-h-[100px] overflow-hidden">
          <span className="absolute top-2 left-20 text-sm opacity-80 animate-pulse">✨</span>
          <span className="absolute bottom-2 right-20 text-sm opacity-80 animate-pulse">🌟</span>

          <div className="absolute left-3 sm:left-6 w-12 h-12 sm:w-16 sm:h-16 bg-white rounded-full overflow-hidden flex items-center justify-center shadow-lg border-2 border-pink-200 animate-float hover-wiggle">
            <img src="./assets/logo-yayasan.png" alt="Logo Yayasan" className="w-full h-full object-cover" />
          </div>

          <div className="text-center px-16 sm:px-24 z-10">
            <h1 className="text-xl sm:text-3xl font-extrabold tracking-wider drop-shadow-md leading-tight text-white">
              SPPG JATIBARU 3
            </h1>
            <div className="inline-block bg-white/25 px-3 py-0.5 rounded-full mt-1.5 border border-white/40">
              <h2 className="text-xs sm:text-sm font-bold tracking-wide text-white">
                🍱 MENU MAKAN BERGIZI GRATIS 🥛
              </h2>
            </div>
          </div>

          <div className="absolute right-3 sm:right-6 w-12 h-12 sm:w-16 sm:h-16 bg-white rounded-full overflow-hidden flex items-center justify-center shadow-lg border-2 border-pink-200 animate-float-delay hover-wiggle">
            <img src="./assets/logo-bgn.png" alt="Logo MBG" className="w-full h-full object-cover" />
          </div>
        </div>

        {/* TANGGAL & KONTROL ADMIN */}
        <div className="bg-gradient-to-r from-sky-400 via-blue-400 to-indigo-400 p-4 border-b-2 border-sky-200 flex flex-col sm:flex-row justify-between items-center gap-3 shadow-inner">
          <div className="flex items-center gap-2.5">
            <label className="font-extrabold text-white drop-shadow-sm flex items-center gap-1.5 text-sm sm:text-base">
              <span className="text-lg animate-bounce">📅</span> PILIH TANGGAL
            </label>
            <select 
              value={activeDate}
              onChange={(e) => setActiveDate(e.target.value)}
              className="px-3.5 py-1.5 border-2 border-white rounded-xl bg-white font-bold text-indigo-700 shadow-sm outline-none focus:ring-2 focus:ring-pink-300 cursor-pointer transition-transform hover:scale-105"
            >
              {displayedList.map((m) => (
                <option key={m.id} value={m.tanggal}>{m.tanggal}</option>
              ))}
            </select>
          </div>

          {isAdmin && (
            <div className="flex gap-2">
              <button onClick={handleAddMenu} className="px-3.5 py-1.5 bg-emerald-400 text-white rounded-xl text-sm font-extrabold hover:bg-emerald-500 shadow-md transition-all hover:scale-105 active:scale-95 border border-white/50">
                + Tambah Hari
              </button>
              <button onClick={handleDeleteMenu} className="px-3.5 py-1.5 bg-rose-500 text-white rounded-xl text-sm font-extrabold hover:bg-rose-600 shadow-md transition-all hover:scale-105 active:scale-95 border border-white/50">
                Hapus Data Ini
              </button>
            </div>
          )}
        </div>

        {/* KONTEN UTAMA */}
        <div key={activeDate} className="p-4 sm:p-6 flex-grow animate-pop">
          <div className="flex justify-center mb-8">
            <div className="relative group rounded-2xl overflow-hidden shadow-xl border-4 border-white ring-4 ring-purple-200 bg-gradient-to-b from-purple-50 to-pink-50 flex justify-center items-center transition-all duration-300 hover:scale-[1.03] hover:rotate-1 hover:ring-pink-300">
              <img src={activeMenu.image} alt={`Menu ${activeMenu.tanggal}`} className="w-full max-w-sm h-auto max-h-[400px] object-contain" />
              
              {isAdmin && (
                <label className="absolute inset-0 bg-purple-900 bg-opacity-60 flex flex-col items-center justify-center text-white cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg className="w-8 h-8 mb-2 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                  <span className="font-bold tracking-wide">Ganti Gambar Menu</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </label>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
            {/* PORSI KECIL */}
            <div className="bg-gradient-to-b from-pink-50 via-purple-50 to-white p-4 rounded-2xl border-2 border-pink-300 shadow-md transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl">
              <div className="bg-gradient-to-r from-pink-500 to-purple-500 text-white text-center py-2.5 rounded-t-xl -mx-4 -mt-4 mb-3 font-extrabold tracking-wide shadow-sm">
                🧒 PORSI KECIL
              </div>
              <table className="w-full text-sm sm:text-base">
                <tbody>
                  {Object.keys(activeMenu.porsiKecil).map((key) => (
                    <tr key={`kecil-${key}`} className="border-b border-pink-100 last:border-0 hover:bg-pink-100 transition-colors rounded-lg">
                      <td className="py-2.5 pl-1 font-bold text-gray-700 capitalize">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span>{giziDetails[key]?.icon || '✨'}</span>
                          <span>{key}</span>
                          <button
                            type="button"
                            onClick={() => setSelectedGiziDetail(key)}
                            title={`Penjelasan tentang ${key}`}
                            className="text-[10px] font-extrabold bg-white text-pink-600 border border-pink-300 hover:bg-pink-500 hover:text-white px-2 py-0.5 rounded-full shadow-sm transition-all cursor-pointer"
                          >
                            Detail
                          </button>
                        </div>
                      </td>
                      <td className="py-2.5 pr-1 text-right">
                        {isAdmin ? (
                          <input 
                            type="text"
                            inputMode="decimal"
                            placeholder="0"
                            value={activeMenu.porsiKecil[key]}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => handleInputChange('porsiKecil', key, e.target.value)}
                            className="w-24 px-2.5 py-1 text-right border-2 border-pink-300 rounded-lg focus:outline-none focus:border-pink-500 font-bold bg-white"
                          />
                        ) : (
                          <span className="inline-block font-extrabold text-pink-700 bg-pink-100 border border-pink-200 px-2.5 py-1 rounded-xl shadow-sm transition-transform hover:scale-105">
                            {activeMenu.porsiKecil[key]} {key === 'energi' ? 'Kkal' : 'gr'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* PORSI BESAR */}
            <div className="bg-gradient-to-b from-emerald-50 via-sky-50 to-white p-4 rounded-2xl border-2 border-emerald-300 shadow-md transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl">
              <div className="bg-gradient-to-r from-emerald-500 to-sky-500 text-white text-center py-2.5 rounded-t-xl -mx-4 -mt-4 mb-3 font-extrabold tracking-wide shadow-sm">
                🧑 PORSI BESAR
              </div>
              <table className="w-full text-sm sm:text-base">
                <tbody>
                  {Object.keys(activeMenu.porsiBesar).map((key) => (
                    <tr key={`besar-${key}`} className="border-b border-emerald-100 last:border-0 hover:bg-emerald-100 transition-colors rounded-lg">
                      <td className="py-2.5 pl-1 font-bold text-gray-700 capitalize">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span>{giziDetails[key]?.icon || '✨'}</span>
                          <span>{key}</span>
                          <button
                            type="button"
                            onClick={() => setSelectedGiziDetail(key)}
                            title={`Penjelasan tentang ${key}`}
                            className="text-[10px] font-extrabold bg-white text-emerald-700 border border-emerald-300 hover:bg-emerald-500 hover:text-white px-2 py-0.5 rounded-full shadow-sm transition-all cursor-pointer"
                          >
                            Detail
                          </button>
                        </div>
                      </td>
                      <td className="py-2.5 pr-1 text-right">
                        {isAdmin ? (
                          <input 
                            type="text"
                            inputMode="decimal"
                            placeholder="0"
                            value={activeMenu.porsiBesar[key]}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => handleInputChange('porsiBesar', key, e.target.value)}
                            className="w-24 px-2.5 py-1 text-right border-2 border-emerald-300 rounded-lg focus:outline-none focus:border-emerald-500 font-bold bg-white"
                          />
                        ) : (
                          <span className="inline-block font-extrabold text-emerald-700 bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-xl shadow-sm transition-transform hover:scale-105">
                            {activeMenu.porsiBesar[key]} {key === 'energi' ? 'Kkal' : 'gr'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* TOMBOL BUKA SEMUA DETAIL GIZI */}
          <div className="mt-5 flex justify-center">
            <button
              type="button"
              onClick={() => setSelectedGiziDetail('all')}
              className="px-5 py-2.5 bg-gradient-to-r from-purple-100 via-pink-100 to-sky-100 hover:from-purple-200 hover:to-pink-200 text-purple-900 border-2 border-purple-300 rounded-full text-xs sm:text-sm font-extrabold shadow-sm transition-all hover:scale-105 active:scale-95 flex items-center gap-2 cursor-pointer"
            >
              <span>📖</span> Pelajari Apa Itu Energi, Protein, Lemak, Karbo & Serat (Detail)
            </button>
          </div>

          {/* PANEL TOMBOL SIMPAN & KELUAR MODE ADMIN */}
          {isAdmin && (
            <div className="mt-6 p-4 rounded-2xl bg-gradient-to-r from-purple-50 via-pink-50 to-sky-50 border-2 border-purple-200 flex flex-col items-center gap-3 shadow-sm">
              {hasUnsavedChanges && (
                <p className="text-xs font-bold text-amber-600 bg-amber-100 px-3 py-1 rounded-full border border-amber-300">
                  ⚠️ Ada perubahan angka gizi yang belum disimpan
                </p>
              )}

              {saveNotif && (
                <p className="text-xs font-extrabold text-emerald-700 bg-emerald-100 px-4 py-1.5 rounded-full border border-emerald-300 animate-pop">
                  ✅ Data gizi berhasil disimpan!
                </p>
              )}

              <div className="flex flex-wrap justify-center gap-3 w-full">
                <button
                  onClick={handleSaveData}
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-full text-sm font-extrabold hover:from-emerald-600 hover:to-teal-600 shadow-lg transition-transform hover:scale-105 active:scale-95 flex items-center gap-1.5"
                >
                  💾 Simpan Data
                </button>
                <button
                  onClick={() => setShowExitConfirm(true)}
                  className="px-6 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full text-sm font-extrabold hover:from-purple-600 hover:to-pink-600 shadow-lg transition-transform hover:scale-105 active:scale-95 flex items-center gap-1.5"
                >
                  🚪 Keluar Mode Admin
                </button>
              </div>
            </div>
          )}
        </div>

        {/* QR CODE & LOGIN ADMIN */}
        <div className="bg-gradient-to-r from-purple-100 via-pink-50 to-sky-100 border-t-2 border-purple-200 p-5 flex flex-col items-center">
          <p className="text-sm font-bold text-purple-800 mb-3 text-center">
            📱 Scan barcode ini untuk memantau nilai gizi menu harian:
          </p>
          <div className="bg-white p-2.5 rounded-2xl shadow-md mb-4 border-2 border-purple-300 transition-transform duration-300 hover:scale-110">
            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(window.location.href)}`} alt="QR Code" className="w-24 h-24" />
          </div>
          
          {!isAdmin && (
            <button onClick={() => setShowLogin(true)} className="text-xs text-purple-600 hover:text-pink-600 underline font-bold transition-colors">
              🔒 Login Admin Operasional
            </button>
          )}
        </div>

        {/* FOOTER SOSIAL MEDIA */}
        <div className="bg-gradient-to-r from-pink-500 via-rose-400 to-pink-500 text-white p-5 flex flex-col items-center justify-center">
          <p className="text-sm font-bold mb-3 tracking-wide text-white drop-shadow-sm">
            ✨ Ikuti Dokumentasi Kegiatan Kami: ✨
          </p>
          <div className="flex gap-5 mb-3">
            {/* Instagram Icon */}
            <a href="https://www.instagram.com/sppg.jatibaru007?utm_source=ig_web_button_share_sheet&dlrf=ZDNlZDc0MzIxNw==" target="instagramsppgjatibaru3" rel="noreferrer" className="bg-white/25 border border-white/40 p-2.5 rounded-full hover:bg-white hover:text-pink-500 hover:-translate-y-1.5 hover:scale-110 transition-all shadow-md">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
              </svg>
            </a>
            {/* TikTok Icon */}
            <a href="https://www.tiktok.com/@sppg.jatibaru007?is_from_webapp=1&sender_device=pc" target="tiktoksppgjatibaru3" rel="noreferrer" className="bg-white/25 border border-white/40 p-2.5 rounded-full hover:bg-white hover:text-pink-500 hover:-translate-y-1.5 hover:scale-110 transition-all shadow-md">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"></path>
              </svg>
            </a>
          </div>
          <p className="text-[11px] text-white/95 font-medium">© 2026 SPPG Jatibaru 3. All rights reserved.</p>
        </div>

      </div>

      {/* MODAL DETAIL PENJELASAN GIZI */}
      {selectedGiziDetail && (
        <div
          onClick={() => setSelectedGiziDetail(null)}
          className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border-2 border-purple-200 animate-pop flex flex-col max-h-[85vh]"
          >
            {/* Header Modal */}
            <div className="bg-gradient-to-r from-pink-500 via-purple-500 to-sky-500 text-white px-5 py-4 flex items-center justify-between">
              <h3 className="text-base sm:text-lg font-extrabold flex items-center gap-2">
                <span>🎓</span> Info Kandungan Gizi
              </h3>
              <button
                type="button"
                onClick={() => setSelectedGiziDetail(null)}
                className="w-8 h-8 rounded-full bg-white/25 hover:bg-white hover:text-pink-600 font-extrabold flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Isi Penjelasan Gizi */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
              {detailKeysToRender.map((key) => {
                const info = giziDetails[key];
                return (
                  <div
                    key={key}
                    className="rounded-2xl border-2 border-purple-100 bg-gradient-to-b from-purple-50/60 to-white p-4 shadow-sm"
                  >
                    <div className="flex items-center justify-between mb-2.5">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs sm:text-sm font-extrabold border ${info.badgeBg}`}>
                        <span className="text-base">{info.icon}</span> {info.nama}
                      </span>
                    </div>

                    <div className="space-y-2 text-xs sm:text-sm text-gray-700 leading-relaxed">
                      <p>
                        <span className="font-extrabold text-purple-900">📌 Apa itu? </span>
                        {info.apaItu}
                      </p>
                      <p>
                        <span className="font-extrabold text-pink-700">💪 Untuk apa? </span>
                        {info.untukApa}
                      </p>
                      <p className="bg-sky-50 border border-sky-200 rounded-xl px-3 py-1.5 text-sky-900">
                        <span className="font-extrabold">🍽️ Contoh Makanan: </span>
                        {info.contoh}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer Modal */}
            <div className="bg-purple-50 px-5 py-3 border-t border-purple-100 flex justify-between items-center gap-2">
              {selectedGiziDetail !== 'all' ? (
                <button
                  type="button"
                  onClick={() => setSelectedGiziDetail('all')}
                  className="px-4 py-2 bg-purple-200 hover:bg-purple-300 text-purple-900 rounded-xl text-xs font-extrabold transition-colors"
                >
                  📖 Lihat Semua Gizi
                </button>
              ) : (
                <span className="text-[11px] font-bold text-purple-600">✨ Ayo makan bergizi setiap hari!</span>
              )}

              <button
                type="button"
                onClick={() => setSelectedGiziDetail(null)}
                className="px-5 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl text-xs sm:text-sm font-extrabold hover:from-pink-600 hover:to-purple-600 shadow-md transition-transform active:scale-95 ml-auto"
              >
                Mengerti 👍
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL LOGIN */}
      {showLogin && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-3xl shadow-2xl w-full max-w-xs transform transition-all scale-100 border-t-4 border-pink-500 animate-pop">
            <h3 className="text-xl font-extrabold text-center text-purple-900 mb-2">🔐 Akses Admin</h3>
            <p className="text-xs text-center text-gray-500 mb-5">Masukkan PIN untuk mengelola data gizi harian.</p>
            <form onSubmit={handleLogin}>
              <input
                type="password" placeholder="PASSWORD" value={pinInput} onChange={(e) => setPinInput(e.target.value)}
                className="w-full px-4 py-3 border-2 border-purple-200 rounded-2xl mb-4 text-center tracking-[0.5em] text-lg font-bold text-gray-800 focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-200"
                autoFocus
              />
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowLogin(false)} className="flex-1 px-4 py-2.5 bg-purple-100 text-purple-700 rounded-xl hover:bg-purple-200 font-bold transition-colors">Batal</button>
                <button type="submit" className="flex-1 px-4 py-2.5 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl hover:from-pink-600 hover:to-purple-600 font-extrabold shadow-md transition-transform active:scale-95">Masuk</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI KELUAR MODE ADMIN */}
      {showExitConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-3xl shadow-2xl w-full max-w-sm border-t-4 border-purple-500 animate-pop text-center">
            <div className="text-4xl mb-2">🧐</div>
            <h3 className="text-lg font-extrabold text-purple-900 mb-2">Konfirmasi Keluar Mode Admin</h3>
            <p className="text-sm text-gray-600 mb-3">
              Apakah data yang Anda masukkan sudah benar?
            </p>
            {hasUnsavedChanges && (
              <p className="text-xs font-bold text-amber-700 bg-amber-100 border border-amber-300 rounded-xl p-2.5 mb-4">
                ⚠️ Catatan: Ada perubahan angka yang belum disimpan. Jika lanjut keluar, perubahan akan otomatis disimpan.
              </p>
            )}
            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 px-4 py-2.5 bg-purple-100 text-purple-800 rounded-xl hover:bg-purple-200 font-bold transition-colors text-sm"
              >
                ✏️ Cek Lagi
              </button>
              <button
                type="button"
                onClick={handleConfirmExit}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-sky-500 text-white rounded-xl hover:from-emerald-600 hover:to-sky-600 font-extrabold shadow-md transition-transform active:scale-95 text-sm"
              >
                ✅ Sudah Benar & Keluar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}