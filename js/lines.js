// Kata-kata yang muncul di gelembung obrolan. Ubah sesuka hati di sini.

export const LINES = {
  kitty: ['Aku paling putih, kan?', 'Elus aku dong', 'Rebahan dulu ah', 'Bulu ini butuh perawatan', 'Tadi ada yang panggil?'],
  jenges: ['Keritingku asli lho', 'Ayo joget!', 'Ada yang bawa camilan?', 'Rapi kan aku hari ini?', 'Salim dulu dong'],
  gemoy: ['Aku gemoy, bukan gendut', 'Badanku panjang, kakiku santai', 'Bolanya mana?', 'Jalan pelan-pelan aja', 'Lihat kaki kodokku'],
  pompom: ['Aku yang paling tinggi', 'Loncengku bunyi nggak?', 'Surai ini mahal lho', 'Ayo main kejar-kejaran', 'Kupingku tegak terus'],
  mama: ['Sudah makan belum?', 'Jangan rebutan ya', 'Pinter semuanya!', 'Sini, Mama elus', 'Bulunya rapi banget'],
  bapak: ['Kuenya buat nanti ya', 'Ayo jalan-jalan', 'Siapa gigit sandal Bapak?', 'Yang nurut dapat kue', 'Pelan-pelan, jangan lari'],
};

export const pick = (list) => list[Math.floor(Math.random() * list.length)];
