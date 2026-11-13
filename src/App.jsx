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

export default function LabelMBG() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [showLogin, setShowLogin] = useState(false);
  const [menus, setMenus] = useState([]);
  const [activeDate, setActiveDate] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const menusRef = ref(database, 'sppgMenus');
    
    onValue(menusRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setMenus(data);
        setActiveDate(prev => prev || data[0].tanggal);
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

  const activeMenu = menus.find(m => m.tanggal === activeDate) || menus[0];

  const handleLogin = (e) => {
    e.preventDefault();
    if (pinInput === 'sudiro123456') {
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
      if (menus.find(m => m.tanggal === newDate)) {
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
      saveMenus([...menus, newMenu].sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal)));
      setActiveDate(newDate);
    }
  };

  const handleDeleteMenu = () => {
    if (menus.length === 1) {
      alert("Tidak bisa menghapus data terakhir!");
      return;
    }
    if (window.confirm(`Yakin ingin menghapus menu tanggal ${activeDate}?`)) {
      const newMenus = menus.filter(m => m.tanggal !== activeDate);
      saveMenus(newMenus);
      setActiveDate(newMenus[0].tanggal);
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
          const newMenus = menus.map(m => m.tanggal === activeDate ? { ...m, image: compressedBase64 } : m);
          saveMenus(newMenus);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleInputChange = (porsi, field, value) => {
    const newMenus = menus.map(m => {
      if (m.tanggal === activeDate) {
        return { ...m, [porsi]: { ...m[porsi], [field]: parseFloat(value) || 0 } };
      }
      return m;
    });
    saveMenus(newMenus);
  };

  if (isLoading) return <div className="text-center p-10 font-bold text-orange-600">Memuat Data SPPG Jatibaru 3...</div>;

  return (
    <div className="min-h-screen bg-orange-50 font-sans p-2 sm:p-4 flex justify-center">
      <div className="w-full max-w-2xl bg-white shadow-2xl rounded-2xl overflow-hidden border border-orange-200">
        
        <div className="bg-orange-600 text-white py-4 sm:py-5 shadow-inner relative flex items-center justify-center px-4 min-h-[90px]">
          <div className="absolute left-3 sm:left-6 w-12 h-12 sm:w-16 sm:h-16 bg-white rounded-full overflow-hidden flex items-center justify-center shadow-md border-2 border-white">
            <img src="./assets/logo-yayasan.png" alt="Logo Yayasan" className="w-full h-full object-cover" />
          </div>
          
          <div className="text-center px-16 sm:px-24">
            <h1 className="text-xl sm:text-3xl font-extrabold tracking-wider drop-shadow-md leading-tight">SPPG JATIBARU 3</h1>
            <h2 className="text-xs sm:text-lg font-medium opacity-90 mt-1">MENU MAKAN BERGIZI GRATIS</h2>
          </div>
          
          <div className="absolute right-3 sm:right-6 w-12 h-12 sm:w-16 sm:h-16 bg-white rounded-full overflow-hidden flex items-center justify-center shadow-md border-2 border-white">
            <img src="./assets/logo-bgn.png" alt="Logo MBG" className="w-full h-full object-cover" />
          </div>
        </div>

        <div className="bg-orange-100 p-4 border-b border-orange-200 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="font-semibold text-orange-900">Pilih Tanggal:</label>
            <select 
              value={activeDate}
              onChange={(e) => setActiveDate(e.target.value)}
              className="px-3 py-1.5 border-2 border-orange-300 rounded-lg bg-white font-medium text-gray-700 outline-none focus:border-orange-500"
            >
              {menus.map(m => (
                <option key={m.id} value={m.tanggal}>{m.tanggal}</option>
              ))}
            </select>
          </div>

          {isAdmin && (
            <div className="flex gap-2">
              <button onClick={handleAddMenu} className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm font-bold hover:bg-green-600 shadow">+ Tambah Hari</button>
              <button onClick={handleDeleteMenu} className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm font-bold hover:bg-red-600 shadow">Hapus Data Ini</button>
            </div>
          )}
        </div>

        <div className="p-4 sm:p-6">
          <div className="flex justify-center mb-8">
            <div className="relative group rounded-xl overflow-hidden shadow-lg border-4 border-white ring-2 ring-orange-200 bg-gray-50 flex justify-center items-center">
              <img src={activeMenu.image} alt={`Menu ${activeMenu.tanggal}`} className="w-full max-w-sm h-auto max-h-[400px] object-contain" />
              
              {isAdmin && (
                <label className="absolute inset-0 bg-black bg-opacity-60 flex flex-col items-center justify-center text-white cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                  <span className="font-bold tracking-wide">Ganti Gambar Menu</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </label>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div className="bg-gradient-to-b from-blue-50 to-white p-4 rounded-xl border border-blue-200 shadow-sm">
              <div className="bg-blue-600 text-white text-center py-2 rounded-t-lg -mx-4 -mt-4 mb-3 font-bold tracking-wide">PORSI KECIL</div>
              <table className="w-full text-sm sm:text-base">
                <tbody>
                  {Object.keys(activeMenu.porsiKecil).map((key) => (
                    <tr key={`kecil-${key}`} className="border-b border-blue-100 last:border-0 hover:bg-blue-50">
                      <td className="py-2.5 font-semibold text-gray-700 capitalize">{key}</td>
                      <td className="py-2.5 text-right">
                        {isAdmin ? (
                          <input 
                            type="number" step="0.1" value={activeMenu.porsiKecil[key]}
                            onChange={(e) => handleInputChange('porsiKecil', key, e.target.value)}
                            className="w-20 px-2 py-1 text-right border-2 border-blue-300 rounded focus:outline-none focus:border-blue-600"
                          />
                        ) : (
                          <span className="font-bold text-gray-900 bg-blue-100 px-2 py-1 rounded">{activeMenu.porsiKecil[key]} {key === 'energi' ? 'Kkal' : 'gr'}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-gradient-to-b from-green-50 to-white p-4 rounded-xl border border-green-200 shadow-sm">
              <div className="bg-green-600 text-white text-center py-2 rounded-t-lg -mx-4 -mt-4 mb-3 font-bold tracking-wide">PORSI BESAR</div>
              <table className="w-full text-sm sm:text-base">
                <tbody>
                  {Object.keys(activeMenu.porsiBesar).map((key) => (
                    <tr key={`besar-${key}`} className="border-b border-green-100 last:border-0 hover:bg-green-50">
                      <td className="py-2.5 font-semibold text-gray-700 capitalize">{key}</td>
                      <td className="py-2.5 text-right">
                        {isAdmin ? (
                          <input 
                            type="number" step="0.1" value={activeMenu.porsiBesar[key]}
                            onChange={(e) => handleInputChange('porsiBesar', key, e.target.value)}
                            className="w-20 px-2 py-1 text-right border-2 border-green-300 rounded focus:outline-none focus:border-green-600"
                          />
                        ) : (
                          <span className="font-bold text-gray-900 bg-green-100 px-2 py-1 rounded">{activeMenu.porsiBesar[key]} {key === 'energi' ? 'Kkal' : 'gr'}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="bg-gray-100 border-t p-5 flex flex-col items-center">
          <p className="text-sm font-semibold text-gray-600 mb-3 text-center">Scan barcode ini untuk memantau nilai gizi menu harian:</p>
          <div className="bg-white p-2 rounded-xl shadow-md mb-4 border border-gray-200">
            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(window.location.href)}`} alt="QR Code" className="w-24 h-24" />
          </div>
          
          {!isAdmin ? (
            <button onClick={() => setShowLogin(true)} className="text-xs text-gray-400 hover:text-orange-600 underline font-medium">Login Admin Operasional</button>
          ) : (
            <button onClick={() => setIsAdmin(false)} className="px-6 py-2 bg-gray-800 text-white rounded-full text-sm font-bold hover:bg-black shadow-lg transition-transform hover:scale-105">Keluar Mode Admin</button>
          )}
        </div>

        {showLogin && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-xs transform transition-all scale-100 border-t-4 border-orange-500">
              <h3 className="text-xl font-bold text-center text-gray-800 mb-2">Akses Admin</h3>
              <p className="text-xs text-center text-gray-500 mb-5">Masukkan PIN untuk mengelola data gizi harian.</p>
              <form onSubmit={handleLogin}>
                <input
                  type="password" placeholder="MASUKAN PIN" value={pinInput} onChange={(e) => setPinInput(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl mb-4 text-center tracking-[0.5em] text-lg font-bold text-gray-800 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                  autoFocus
                />
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowLogin(false)} className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-semibold transition-colors">Batal</button>
                  <button type="submit" className="flex-1 px-4 py-2.5 bg-orange-600 text-white rounded-xl hover:bg-orange-700 font-bold shadow-md transition-colors">Masuk</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}