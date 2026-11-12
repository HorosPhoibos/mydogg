# MYDOGG

Kitty, Jenges, Gemoy, Pompom, Mama, dan Bapak dalam wujud boneka rajut 3D yang bisa diajak main langsung di browser.
Situs ini statis: tidak perlu Node, tidak perlu proses build, dan tidak perlu server khusus.

## Menerbitkan ke GitHub Pages

1. Buat repository baru di [github.com/new](https://github.com/new), misalnya bernama `mydogg`, dan pilih **Public**.
2. Di halaman repository, klik **Add file → Upload files**.
3. Buka folder `mydogg-rajut`, pilih semua isinya, lalu tarik ke halaman GitHub.
   Yang diunggah adalah isi foldernya, sehingga `index.html` berada di paling atas.
4. Klik **Commit changes**.
5. Buka **Settings → Pages**. Pada **Branch**, pilih `main` dan folder `/ (root)`, lalu klik **Save**.
6. Tunggu sekitar satu menit. Alamat situsnya: `https://NAMA-AKUN-KAMU.github.io/mydogg/`

Finder di Mac menyembunyikan file `.nojekyll` dan `.gitignore`. Tekan `Cmd + Shift + .` di Finder supaya keduanya terlihat dan ikut terunggah. Situs tetap berjalan kalau keduanya tertinggal.

Kalau lebih suka lewat Terminal:

```bash
cd mydogg-rajut
```

```bash
git init -b main
```

```bash
git add .
```

```bash
git commit -m "Situs MYDOGG"
```

```bash
git remote add origin https://github.com/NAMA-AKUN-KAMU/mydogg.git
```

```bash
git push -u origin main
```

Lalu aktifkan Pages seperti langkah 5 di atas.

## Mencoba di komputer sendiri

Buka lewat server lokal, karena browser memblokir modul JavaScript kalau `index.html` dibuka langsung dengan klik dua kali.

```bash
cd mydogg-rajut && python3 -m http.server 4173
```

Setelah itu buka <http://localhost:4173>.

## Biar cantik saat dibagikan di WhatsApp

Setelah situsnya online, buka `index.html`, cari baris `og:image`, lalu ganti isinya dengan alamat lengkap, misalnya `https://NAMA-AKUN-KAMU.github.io/mydogg/photos/foto-2.jpg`. WhatsApp hanya bisa menampilkan gambar pratinjau dari alamat lengkap seperti itu.

## Yang bisa dilakukan

- **Rumah:** ruang tamu luas dengan sofa, TV, rak buku, jendela, dan foto anjing asli di dinding. Anjing bisa disuruh **Naik sofa**, Mama dan Bapak bisa **Duduk di sofa**. Ketuk TV untuk ganti saluran, ketuk mainan supaya anjing terpilih datang bermain.
- **Bulan:** dataran luas berkawah dengan roket, bumi, dan Saturnus di langit. Semua tokoh memakai helm astronaut, dan karena gravitasinya rendah, lompatannya jauh lebih tinggi.
- **Tokoh terpilih diam:** tokoh yang sedang dipilih atau disentuh langsung berhenti dan hanya bergerak kalau disuruh. Tokoh lain tetap jalan-jalan sendiri dengan santai.

- **Foto keluarga:** semua berkumpul dan melihat ke kamera, ada hitung mundur, lalu fotonya bisa disimpan atau dibagikan. Baju yang sedang dipakai ikut terfoto.
- **Pesta:** semua pakai topi pesta, Bapak membawa kue, konfeti turun, dan lagu ulang tahun berbunyi.
- **Gelembung obrolan:** tokoh berceloteh sendiri. Kata-katanya bisa diubah di `js/lines.js`.
- **Musik dan suara:** bisa dimatikan di bagian bawah panel.

- **Elus:** pilih anjing, tekan **Elus dari dekat**, lalu gosok dengan mouse atau jari. Lima hati penuh membuatnya guling-guling.
- **Mata mengikuti kursor:** semua tokoh melirik ke arah kursor, paling jelas di mode Elus.
- **Pencet hidung:** satu kali kaget, dua kali kesal, tiga kali marah dan menggonggong, lalu ngambek sebentar.
- **Mama dan Bapak:** pilih satu anjing atau semuanya, lalu suruh datang, duduk, salaman, atau menggonggong di depan mereka. Mereka juga bisa mengelus anjing, joget, kasih jempol, dan mengeluarkan kue ulang tahun.
- **Taman luas:** pilih **Taman**, lalu ketuk rumput untuk mengajak tokoh ke sana. Tombol panah atau WASD juga bisa, dan kamera mengikuti tokoh yang dipilih.
- **Main di ruangan:** ketuk selimut untuk melempar bola benang, lalu anjing terdekat akan mengejarnya.
- **Tingkah dan baju:** semua tokoh punya lemari sendiri: baju, kalung, topi, dan kacamata. Anjing juga bisa memakai jubah, sayap, atau ransel.
- **Bicara:** tekan **Bicara**, lalu ucapkan sesuatu. Anjing mengulanginya dengan nada lebih tinggi. Rekaman hanya diproses di browser dan tidak dikirim ke mana pun.
- **Foto asli:** lihat foto anjing dan pakai baju yang sama seperti di foto. Foto Mama dan Bapak tidak ikut terunggah, yang tampil hanya boneka rajutnya.

## Permainan (tombol Main)

| Permainan | Isinya |
| --- | --- |
| Petak umpet | Layar menutup sebentar, anjing bersembunyi di balik meja, pohon, roket, dan lainnya. Ketuk mereka secepat mungkin. Kalau lama, salah satu menggonggong memberi petunjuk. Rekor tercepat tersimpan. |
| Peragaan busana | Anjing tampil satu per satu dengan baju dan aksesori acak di bawah sorot lampu, Mama dan Bapak bertepuk tangan. Baju dari peragaan tetap dipakai sesudahnya. |
| Joget disko | Ruangan meredup, bola disko berputar, lampu warna-warni menyapu lantai, semua berjoget. |
| Hujan di taman | Pindah ke Taman, hujan turun, Mama dan Bapak membuka payung, anjing berteduh, lalu mengibaskan badan dan pelangi muncul. |
| Pesta ulang tahun | Topi pesta, kue berlilin, konfeti, dan lagu ulang tahun. |

Tombol **Berhenti** menghentikan permainan kapan saja. Mengganti dunia juga menghentikannya dengan rapi.

Di luar permainan, anjing juga bermain sendiri: kejar-kejaran, saling mengendus, atau ikut tidur kalau temannya tidur.

## Daftar kejutan (jangan bocorkan ke Mama dulu)

Panel menghitung berapa kejutan yang sudah ditemukan, dan hitungannya tersimpan di browser.

| Di mana | Ketuk apa | Yang terjadi |
| --- | --- | --- |
| Rumah | TV | Menyala, ganti saluran (Kartun, Bulan, Keluarga, Warna), lalu mati lagi |
| Rumah | Lampu berdiri | Lampu mati dan menyala |
| Rumah | Jendela | Gorden terbuka dan tertutup |
| Rumah | Foto di dinding | Bergoyang dan berganti foto |
| Rumah | Boneka beruang | Dipencet, berbunyi, dan bicara |
| Rumah | Rak buku | Satu buku melompat |
| Rumah | Tanaman | Bergoyang kegelian |
| Rumah | Mangkuk pink | Makanan diisi, dua anjing datang makan |
| Rumah | Bantal pink di sofa | Memantul |
| Rumah | Mainan di lantai | Anjing terpilih datang bermain |
| Taman | Pohon | Bergoyang, daun gugur, kadang apel jatuh |
| Taman | Semak | Kupu-kupu beterbangan |
| Taman | Bebek | Melompat berputar sambil berkwek |
| Taman | Kolam | Cipratan dan riak air |
| Bulan | Roket | Meluncur ke langit lalu mendarat lagi |
| Bulan | Bumi dan Saturnus | Berputar kencang |
| Bulan | Kawah | Alien kecil mengintip |
| Mana saja | Anjing 5 kali cepat | Kebut-kebutan memutar |
| Mana saja | Mama 3 kali cepat | Mama memanggil semua anjing, hati beterbangan |
| Mana saja | Bapak 3 kali cepat | Bapak mengeluarkan kue, konfeti turun |
| Mana saja | Tulisan MYDOGG | Paduan suara lolongan anjing |

Kalau semua sudah ketemu, ada perayaan kecil. Daftarnya ada di `js/eggs.js`.

## Isi folder

| Lokasi | Isi |
| --- | --- |
| `js/yarn/` | Mesin rajut: bentuk jahitan, material benang, dan penyusunan baris |
| `js/dog/breeds.js` | Data keempat anjing: warna, ukuran, dan teks |
| `js/dog/rig.js` | Merakit badan anjing dari bagian-bagian boneka |
| `js/dog/poses.js` | Semua pose dan ekspresi |
| `js/dog/dog.js` | Perpaduan gerak, kaki, telinga, dan ekor |
| `js/dog/squad.js` | Perilaku keluarga: jalan, kejar bola, dipanggil, istirahat |
| `js/people/people.js` | Boneka Mama dan Bapak beserta gerakannya |
| `js/dog/wardrobe.js` | Baju dan aksesori anjing |
| `js/dog/accessories.js` | Topi, kacamata, dan kalung yang dipakai bersama |
| `js/world/house.js` | Rumah: sofa, TV, mainan, dinding |
| `js/world/park.js` | Taman |
| `js/world/moon.js` | Bulan |
| `js/world/common.js`, `js/world/room.js` | Bahan bersama dan pengatur ketiga dunia |
| `js/audio.js` | Suara, musik, lagu ulang tahun, dan fitur mengulang ucapan |
| `js/lines.js`, `js/bubbles.js` | Kata-kata tokoh dan gelembung obrolannya |
| `js/games.js` | Petak umpet, peragaan busana, disko, dan hujan |
| `js/photo.js` | Bingkai Foto keluarga |
| `js/world/fx.js` | Konfeti, kupu-kupu, kunang-kunang, awan, penanda tokoh |
| `js/ui.js`, `css/style.css` | Tampilan dan tombol |
| `photos/` | Foto asli. Ganti file di sini kalau mau memakai foto lain |
| `vendor/three/` | Three.js 0.169 (lisensi MIT), disimpan lokal agar situs tidak bergantung pada CDN |

## Untuk pengembang dan agen

Situs ini punya dua mesin status utama. Keduanya bisa dibaca dari luar tanpa membuka kode.

**Mode layar** (`js/main.js`, konstanta `SCREEN`). Tepat satu yang aktif, dan tertulis di `<html data-screen="...">`.

| Mode | Arti | Keluar lewat |
| --- | --- | --- |
| `free` | Bermain bebas | — |
| `pet` | Mode Elus satu anjing | tombol Selesai, pilih tokoh lain, ganti dunia |
| `photo` | Foto keluarga: berkumpul, hitung mundur, jepret | tutup dialog foto, ganti dunia |
| `party` | Pesta ulang tahun | selesai sendiri setelah lagu, ganti dunia |
| `game` | Permainan dari menu Main; jenisnya di `<html data-game>` | tombol Berhenti, selesai sendiri, ganti dunia |

Aturannya: mode Elus boleh ditinggal kapan saja. Foto dan pesta harus selesai dulu, dan tombol lain akan memberi pesan "Tunggu … selesai dulu". Ganti dunia selalu mengakhiri mode yang sedang berjalan. Saat foto dan pesta, ketukan di kanvas diabaikan supaya barisan tidak berantakan.

**Mode otak tokoh** (`js/dog/squad.js`, konstanta `MODE`): `rest`, `go`, `turn`, `hop`, `driven`, `patting`, `eat`, `follow`. Permainan menggerakkan tokoh hanya lewat `moveTo`, `faceTo`, `perform`, dan `arrange`, sehingga aturan di bawah tetap berlaku.

- Setiap aksi baru selalu membersihkan penanda aksi sebelumnya lewat `#interrupt`.
- Lompatan naik dan turun sofa (`hop`) tidak bisa dipotong. Perintah yang datang di tengah lompatan diantre dan dijalankan setelah mendarat, jadi tidak ada tokoh yang melayang.
- Tokoh yang sedang dipilih tidak pernah pergi sendiri.

**Alat uji.** Buka situs dengan `?debug`, lalu di konsol browser:

- `mydogg.state()` memberi gambaran lengkap: mode layar, dunia, tokoh terpilih, jumlah kejutan, serta mode, pose, kursi, dan posisi setiap tokoh.
- `mydogg.step(5)` memajukan waktu 5 detik secara pasti, tanpa bergantung pada kecepatan layar. Berguna untuk menguji alur seperti pesta atau foto.

Atribut `data-screen`, `data-theme`, dan `data-active` di elemen `<html>` selalu tersedia, juga tanpa `?debug`.

## Mengubah sesuatu

Nama, deskripsi, dan warna ada di `js/dog/breeds.js`. Daftar tombol tingkah ada di bagian atas `js/ui.js`. Warna tampilan ada di bagian atas `css/style.css`.
