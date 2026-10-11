# Membuat atau memperbarui repository RdpFree

Credit: KallAncrit. Ikuti [README aktif](README.md).

1. Gunakan template `xykal/XyRDP` dengan nama repository pilihanmu.
2. Aktifkan Actions, lalu isi `RDP_PASSWORD` dan `TAILSCALE_AUTH_KEY` di Actions secrets atau melalui Setup dashboard.
3. Akses hanya Tailscale. Login HP/PC ke tailnet yang sama dan izinkan TCP 3389 pada ACL tailnet.
4. Pilih pengaturan dan mulai sesi. Jangan mencetak atau menyimpan password sebagai artefak publik.
5. Untuk persiapan game, gunakan mesin Windows self-hosted khusus/disposable yang diizinkan, bukan GitHub-hosted gaming. Pastikan label runner `self-hosted`, `Windows`, `X64`, `rdpfree` dan baca efek perubahan sistem di README.

Repository lama perlu menyinkronkan workflow schema 2, scripts, dan assets bersama-sama. App hanya memiliki izin baca source sehingga tidak bisa memperbarui file tersebut secara otomatis. Template manual juga menyalin folder web; pemilik boleh menghapus `web`, `web-next`, dan `deploy` dari repository sesi jika tidak diperlukan.

Identitas login GitHub dan otorisasi GitHub App adalah dua proses terpisah. Persetujuan/install App hanya untuk repository yang kamu pilih. Tidak ada jaminan anti-suspend atau dukungan universal game/VM.
