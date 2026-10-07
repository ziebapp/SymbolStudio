# GRUPA 24 — animacja logo

Animacja pokazuje, skąd biorą się sygnety marek: KRAMAT wywodzi się z kanciastej apli „GRUPA”, MS WAY z pola „2”, a HI-TEC z koła „4”.
Kolejność klatek pochodzi z Figmy (plik `5om0DyfMnKFfTDrbqGwGy2`, strona „Logo 1”).

Otwórz `index.html` przez dowolny serwer HTTP, np. `python3 -m http.server` w tym katalogu.
Gotowy render jest w pliku `grupa24-animacja.mp4` (1840×928, 60 fps, 30 s).

## Plan animacji (każdy ruch wynika z poprzedniego)

| # | czas | co się dzieje |
|---|------|---------------|
| 1 | 0–2 s | Ciężarówka jedzie. Napisy GRUPA · 24 · hasło rysują się szeroko na wideo. |
| 2 | 2.4–3.8 s | Elementy schodzą się do środka, rozciąga się pas konstrukcyjny. |
| 3 | 4–6 s | Hasło odpala pionowe linie konstrukcyjne. Wideo skaluje się do środka, a pod napisami powstają apla oraz pola 2 i 4. |
| 4 | 6.6–8.6 s | Linie się zwijają, wideo kurczy się dokładnie w kształt apli: okazuje się, że wideo było aplą pod GRUPA. Logo odjeżdża w lewo. |
| 5 | 9.2–11.3 s | Wideo w apli gaśnie do czerni. Z apli wysuwa się jej kopia, która morfuje w sygnet KRAMAT, a obok pojawia się logotyp. |
| 6–7 | 12–15.2 s | Zapala się kolejno „2”, potem „4”, jak światła na skrzyżowaniu. Sygnet płynnie morfuje w MS WAY, a potem w HI-TEC. |
| 8–10 | 16–21.4 s | Logo wraca na środek. Wokół niego otwiera się ramka z wideo w kształcie sygnetu KRAMAT, która zmienia się w MS WAY i HI-TEC razem z kolorem aktywnego elementu. |
| 11–12 | 22.2–25.4 s | Koło HI-TEC rozszerza się i wypycha wideo z kadru. Logo czernieje i przesuwa się w lewo. |
| 13 | 25.2–27.3 s | Zestawienie: z apli, „2” i „4” wylatują trzy sygnety, które ustawiają się w logotypy KRAMAT, MS WAY i HI-TEC. |

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
