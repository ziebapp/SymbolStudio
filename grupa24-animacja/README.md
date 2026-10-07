# GRUPA 24 — animacja logo

Animacja pokazuje, skąd biorą się sygnety marek: KRAMAT wywodzi się z kanciastej apli „GRUPA”, MS WAY z pola „2”, a HI-TEC z koła „4”.
Kolejność klatek pochodzi z Figmy (plik `5om0DyfMnKFfTDrbqGwGy2`, strona „Logo 1”).

Otwórz `index.html` przez dowolny serwer HTTP, np. `python3 -m http.server` w tym katalogu.
Gotowy render jest w pliku `grupa24-animacja.mp4` (1840×928, 60 fps, 27 s).

## Plan animacji (każdy ruch wynika z poprzedniego)

Przez całą animację kamera bardzo powoli najeżdża na scenę, a kolejne ruchy na siebie zachodzą, więc obraz nigdy nie stoi.

| # | czas | co się dzieje |
|---|------|---------------|
| 1 | 0–1.9 s | Ciężarówka jedzie. Napisy GRUPA · 24 · hasło rysują się szeroko na wideo. |
| 2–3 | 1.9–4.6 s | Jeden ciągły przejazd: elementy schodzą się do środka, rozciąga się pas konstrukcyjny, a hasło odpala pionowe linie. Wideo skaluje się do środka. |
| 3 | 4.6–5.8 s | Po liniach rysują się obrysy emblematów: ścięta apla, kwadrat i koło. |
| 4 | 5.3–7.8 s | Wideo zjeżdża kolejno do apli, kwadratu i koła i jedzie dalej w masce logo. Znak odjeżdża w lewo, a pola 2 i 4 gasną do czerni. Wideo zostaje w apli pod GRUPA. |
| 5 | 8.3–10.3 s | Wideo w apli gaśnie do czerni. Z apli wysuwa się jej kopia, która morfuje w sygnet KRAMAT. |
| 6–7 | 10.6–13.4 s | Zapala się kolejno „2”, potem „4”, jak światła na skrzyżowaniu. Sygnet morfuje w MS WAY, a potem w HI-TEC. |
| 8–10 | 13.8–18.8 s | Logo wraca na środek, a wokół otwiera się ramka z wideo w kształcie sygnetu, która zmienia się razem z kolorem aktywnego elementu. |
| 11–12 | 19.4–22.4 s | Koło HI-TEC rozszerza się i wypycha wideo. Logo czernieje i przesuwa się w lewo. |
| 13 | 22.2–24.4 s | Z apli, „2” i „4” wylatują trzy sygnety i układają się w logotypy KRAMAT, MS WAY i HI-TEC. |

### Morfing kształtów

Każdy kontur jest próbkowany od nowa z kotwicami kątowymi: promienie ze środka kształtu co 15°, liczone w proporcjach jego obrysu.
Każdy wycinek ma tyle samo punktów, a narożniki są zachowane. Dzięki temu punkt „góra-lewo” jednego kształtu zawsze przechodzi w „górę-lewo” drugiego, a transformacja jest czysta i bez skręcania.
Ramki z otworem (KRAMAT, MS WAY, HI-TEC) to kontur zewnętrzny plus otwór, morfowane parami.

## Sterowanie

- spacja: odtwarzanie / pauza
- ← →: poprzednia / następna klatka z Figmy (przyciski 1–13 na pasku)
- `r`: od początku
- suwak: przewijanie (scena jest funkcją czasu, więc każda pozycja jest dokładna)
- parametry URL: `?clean` ukrywa pasek (do nagrywania), `?t=12` zaczyna od 12. sekundy, `?paused` startuje zatrzymane

## Prawdziwe wideo zamiast zdjęcia

Wrzuć plik `assets/truck.mp4`, a strona użyje go automatycznie (albo wskaż inny plik przez `?video=sciezka.mp4`).
Jeśli wideo nie istnieje, używane jest zdjęcie `assets/truck.jpg` z delikatnym ruchem kamery.
Wideo dostaje 50% przyciemnienia, tak jak w Figmie.

## Pliki

- `animacja.js`: oś czasu, morfing konturów i render
- `logo-data.js`: wektory z Figmy (logo GRUPA 24, logotypy marek, kształty ramek). Plik generowany, nie edytuj go ręcznie.
- `assets/truck.jpg`: kadr z ciężarówką z Figmy

Czasy wszystkich ruchów są zebrane w `animacja.js` (stałe `MOVES`, `T`, `CLIP`, `SLOT_*`, `FIN_*`), więc tempo można stroić w jednym miejscu.
