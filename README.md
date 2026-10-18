# BALLSTORM ✦

Neon siberpunk görünümüne sahip, tarayıcıda çalışan özgün bir tuğla kırma oyunu. Top fırlatma ve numaralı tuğla kırma türünden esinlenir; kendi adı, arayüzü ve koduyla hazırlanmıştır.

## Dosya yapısı

- `index.html` — Canvas ve arayüz
- `style.css` — Neon tasarım ve responsive yerleşim
- `script.js` — Oyun fiziği, piksel desenleri, ses sentezi ve oyun mantığı

## Nasıl oynanır?

1. **Oyuna Başla** düğmesine bas.
2. Oyun alanında alt taraftan yukarı doğru nişan alıp fareyi/parmağını sürükle ve bırak.
3. Her turda toplar 50 ms aralıkla sırayla fırlatılır. Topların tümü geri döndüğünde tuğlalar bir satır aşağı iner.
4. Tuğla üzerindeki sayı kalan canı gösterir. Can sıfıra inince tuğla parçacıklarla patlar.
5. Yeşil **+** bonusunu yakala ve sonraki atışlara bir top ekle.
6. Kırmızı taban çizgisine bir tuğla ulaşırsa oyun biter.

## Kontroller

- **Fare / Dokunmatik:** Nişan al ve ateş et.
- **SES AÇIK / SESSİZ:** Web Audio API ile üretilen synth müziği ve efektleri aç/kapat.
- **1× / 2× SPEED:** Oyun ve top fırlatma hızını değiştirir.
- **YENİDEN OYNA:** Oyunu sıfırlar.

## Özel tuğlalar

- **Bomba (✹):** Patladığında etrafındaki 3×3 tuğla alanını temizler.
- **Lazer:** Bulunduğu satırdaki tuğlaları temizler.

## GitHub Pages ile yayınlama

1. Bu dosyaların hepsini repository'nin kök dizinine ekle.
2. GitHub'da repository'ni aç ve **Settings → Pages** bölümüne gir.
3. **Build and deployment** altında **Deploy from a branch** seç.
4. Branch olarak **main**, klasör olarak **/(root)** seçip **Save** de.
5. Birkaç dakika sonra Pages sayfasında verilen site bağlantısını aç. Yeni sürümü görmek için gerekirse Ctrl+F5 yap.

## Notlar

- Yüksek skor bu tarayıcıda `localStorage` içinde tutulur.
- Ses, tarayıcıların otomatik oynatma kuralları nedeniyle kullanıcı oyuna tıkladıktan sonra başlatılır.
- Oyun tek başına HTML/CSS/JavaScript kullanır; harici görsel, MP3 veya kütüphane gerektirmez.