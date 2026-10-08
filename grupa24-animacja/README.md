# GRUPA 24 — animacja logo

Animacja pokazuje, skąd biorą się sygnety marek: KRAMAT wywodzi się z kanciastej apli „GRUPA”, MS WAY z pola „2”, a HI-TEC z koła „4”. Submarki nie wylatują z GRUPY, tylko budują się obok przez konstrukcję.
Kolejność klatek pochodzi z Figmy (plik `5om0DyfMnKFfTDrbqGwGy2`, strona „Logo 1”).

Otwórz `index.html` przez dowolny serwer HTTP, np. `python3 -m http.server` w tym katalogu.
Gotowy render jest w pliku `grupa24-animacja.mp4` (1840×928, 60 fps, 28 s).

## Plan animacji (każdy ruch wynika z poprzedniego)

Przez całą animację kamera bardzo powoli najeżdża na scenę i lekko „oddycha”, a kolejne ruchy na siebie zachodzą, więc obraz nigdy nie stoi. Apla, 2 i 4 jadą razem jako jedna maska, hasło lekko się spóźnia, a litery wjeżdżają po kolei. Wszystkie obrysy konstrukcyjne sygnetów mają stałe 2 px.

| # | czas | co się dzieje |
|---|------|---------------|
| 1 | 0–1.9 s | Ciężarówka jedzie. Napisy GRUPA · 24 · hasło rysują się szeroko na wideo. |
| 2–3 | 1.9–4.6 s | Jeden ciągły przejazd: elementy schodzą się do środka, rozciąga się pas konstrukcyjny, a hasło odpala pionowe linie. Ramka wideo zmniejsza się razem z obrazem (jedna skala). |
| 3 | 4.6–5.8 s | Po liniach rysują się obrysy emblematów: ścięta apla, kwadrat i koło. |
| 4 | 5.75–7.8 s | Ramka wideo nabiera prędkości, a obraz skaluje się razem z nią, bez dopasowania do kształtów. Gdy ramka zmaleje do rozmiaru logo, z rozpędu wpada w nie: od tej chwili maską są kształty logo, a obraz dalej hamuje w tej samej skali. Znak odjeżdża w lewo, a pola 2 i 4 gasną do czerni. Wideo zostaje w apli pod GRUPA. |
| 5 | 8.3–10.3 s | Wideo w apli gaśnie do czerni, apla „się zapala”. Obok wjeżdża typografia KRAMAT, pojawia się „24”, sygnet rysuje się obrysem i wypełnia kolorem. |
| 6–7 | 10.6–13.8 s | Zapala się kolejno „2”, potem „4”, jak światła na skrzyżowaniu. „24” zostaje w miejscu i zmienia kolor. Poprzedni sygnet przybliża się i szybko gaśnie, a na jego miejsce wjeżdża następny (obrys, potem kolor) razem z typografią. |
| 8–10 | 13.8–19.5 s | Logo wraca na środek. Wokół niego rysuje się po ścieżce (trim path) cienki obrys wielkiego sygnetu KRAMAT w docelowej skali, potem znika tak samo, a w jego miejsce rysują się kolejno MS WAY i HI-TEC. Środek jest biały, a logo GRUPA jest maską wideo. Aktywna część przejmuje kolor marki, od której pochodzi: apla jest pomarańczowa, „2” zielone, „4” turkusowe. |
| 11–12 | 20.3–23 s | Obrys HI-TEC znika po ścieżce. Logo czernieje i przesuwa się w lewo. |
| 13 | 22.9–25.1 s | Kolumna submarek buduje się kaskadowo od góry do dołu: typografia, „24”, obrys sygnetu, kolor. |

### Kształty

Kontury są próbkowane z kotwicami kątowymi: promienie ze środka kształtu co 15°, liczone w proporcjach jego obrysu, z zachowaniem narożników.
Każdy obrys zaczyna się w tym samym miejscu (po lewej) i biegnie zgodnie z ruchem wskazówek zegara, więc rysowanie i znikanie po ścieżce jest spójne dla wszystkich sygnetów.

## Sterowanie

- spacja: odtwarzanie / pauza
- ← →: poprzednia / następna klatka z Figmy (przyciski 1–13 na pasku)
- `r`: od początku
- suwak: przewijanie (scena jest funkcją czasu, więc każda pozycja jest dokładna)
- parametry URL: `?clean` ukrywa pasek (do nagrywania), `?t=12` zaczyna od 12. sekundy, `?paused` startuje zatrzymane

## Wideo

Tło to ujęcie z drona: `assets/truck.webm` (VP9, dla Chrome i Firefox) oraz `assets/truck.mp4` (H.264, dla Safari).
Ma 10 s i jest widoczne w dwóch odcinkach animacji (0–8.8 s i 14.2–21.4 s). Każdy odcinek ma własny start w materiale, więc w kadrze nie ma cięcia.
Wideo jest zsynchronizowane z osią czasu (przewijanie, pętla). Do eksportu MP4 strona przyjmuje parametr `?frames=katalog` z klatkami JPG wyciętymi z wideo (`ffmpeg -i assets/truck.mp4 -q:v 2 katalog/f%04d.jpg`). Wtedy każda klatka animacji dostaje dokładnie swoją klatkę wideo, bo przeglądarka bez okna nie odświeża pewnie obrazu `<video>` po przewinięciu.
`assets/truck.jpg` to pierwsza klatka, która zostaje jako zapas, gdy wideo się nie wczyta. Inny plik można wskazać przez `?video=sciezka.mp4`.
Przyciemnienie pod biały napis wynosi 20%.

## Pliki

- `animacja.js`: oś czasu, morfing konturów i render
- `logo-data.js`: wektory z Figmy (logo GRUPA 24, logotypy marek, kształty ramek). Plik generowany, nie edytuj go ręcznie.
- `assets/truck.webm`, `assets/truck.mp4`: wideo z drona
- `assets/truck.jpg`: pierwsza klatka wideo (zapas)

Czasy wszystkich ruchów są zebrane w `animacja.js` (stałe `MOVES`, `T`, `CLIP`, `SLOT_*`, `FIN_*`), więc tempo można stroić w jednym miejscu.
