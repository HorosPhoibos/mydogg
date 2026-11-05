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
| `js/world/` | Selimut, meja, taman luas, tema, dan bola |
| `js/audio.js` | Suara, musik, lagu ulang tahun, dan fitur mengulang ucapan |
| `js/lines.js`, `js/bubbles.js` | Kata-kata tokoh dan gelembung obrolannya |
| `js/photo.js` | Bingkai Foto keluarga |
| `js/world/fx.js` | Konfeti, kupu-kupu, kunang-kunang, awan, penanda tokoh |
| `js/ui.js`, `css/style.css` | Tampilan dan tombol |
| `photos/` | Foto asli. Ganti file di sini kalau mau memakai foto lain |
| `vendor/three/` | Three.js 0.169 (lisensi MIT), disimpan lokal agar situs tidak bergantung pada CDN |

## Mengubah sesuatu

Nama, deskripsi, dan warna ada di `js/dog/breeds.js`. Daftar tombol tingkah ada di bagian atas `js/ui.js`. Warna tampilan ada di bagian atas `css/style.css`.
