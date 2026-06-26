# Book Vibe Voting

Full-stack kitap oylama uygulamasi: ASP.NET Core Web API + Angular + SQLite.

## Ozellikler

- Kullanici kaydi, demo onay kodu ve onaydan sonra giris
- JWT ile korunan kitap degerlendirme endpoint'i
- Kitap listesi ve kitap detay sayfasi
- 1-5 puan, yorum ve kitap vibe rengi secimi
- Hazir renk paleti ve custom color picker
- SQLite database ve seed kitaplar

## Calistirma

Backend:

```bash
cd BookVibe.Api
dotnet restore
dotnet run --urls http://localhost:5000
```

Frontend:

```bash
cd book-vibe-client
npm install
npm start
```

Angular uygulamasi `http://localhost:4200`, API `http://localhost:5000` adresinde calisir.

Kayit olduktan sonra API demo onay kodunu dondurur; ekrandaki kodla hesabi onaylayip giris yapabilirsiniz.
