# GROUP 24 — motion system: kadry + Higgsfield

Prototyp działa na oryginalnych ścieżkach z SVG (`svg/`). Podgląd na żywo: otwórz `index.html` w przeglądarce (scrub + wybór sceny). Render: `node render.js <scena>` → `out/<scena>.mp4`.

---

## Zasada nadrzędna: ciągłość
Nic nie pojawia się znikąd i nic nie znika w pustkę. Każdy element **wychodzi z poprzedniego**:
punkt → linia → sygnet → (kwadrat wyciąga) GROUP 24 → sygnet wypuszcza marki → pole „24” rozszerza się w następną scenę → gradient zapada się z powrotem w ■.
Montaż jest „wewnętrzny”: zamiast cięć – match-cuty na elementach znaku. Kamera cały czas oddycha (push-in 3–5% na holdach, powrót na przejściach), żeby nie było martwych klatek.

## Zasady ruchu (gramatyka)

| Reguła | Wartość |
|---|---|
| Easing | expo-out na wejściach, quint-in-out na przelotach i morfach; kamera smoothstep |
| Render | 60 fps + motion blur (3 subklatki uśrednione) |
| „24” | segmenty rysują się **jeden z drugiego** (nakładające się wipe'y, jak pociągnięcie pióra) – poziome L→P, pionowe G→D |
| Nazwa marki | litery wyjeżdżają spod linii maski, stagger 0,09 |
| GROUP 24 | jest **wyciągany z kwadratu ■** (maska po lewej krawędzi kwadratu), hasło LEADING ALL THE WAY **z koła ●** |
| Znaczniki narożne | jedyny element, który przechodzi między scenami – morf kształtu (● ↔ ■ ↔ ◗/▛) + pozycji |
| Przejście między markami | pole „24” obecnej marki rośnie do pełnego ekranu w gradiencie następnej; znaczniki jadą na jego narożnikach do rogów ekranu i wracają jako nowe logo |
| Hold | ~1 s z push-in kamery; finał 1,5 s |

---

## A. Film systemowy — `out/film.mp4` (15,2 s, 16:9, 60 fps)

| # | Czas | Kadr / ruch | Z czego wychodzi |
|---|---|---|---|
| A1 | 0,00–0,28 | Punkt w centrum | — |
| A2 | 0,18–0,58 | Punkt rozciąga się w linię długości sygnetu | z punktu |
| A3 | 0,58–1,25 | Linia dzieli się na 3 odcinki, które pęcznieją w ■ ▛ ●; zostaje włosowa linia, która ucieka do krawędzi ekranu | z linii |
| A4 | 1,25–2,15 | Sygnet przesuwa się w prawo na pozycję lockupu; **kwadrat wyciąga GROUP 24**, koło wyciąga LEADING ALL THE WAY. | z kwadratu / koła |
| A5 | 2,15–2,75 | Hold lockupu grupy (push-in) | |
| A6 | 2,75–3,35 | GROUP chowa się z powrotem w kwadrat, sygnet wraca do centrum | |
| A7 | 3,25–4,10 | ■ → 6 znaczników KRAMAT, ▛ → 6 znaczników MS WAY, ● → 6 znaczników HI-TEC (3 rzędy) | z kształtów sygnetu |
| A8 | 3,60–4,90 | Siatka konstrukcyjna, „24” rysowane piórem, nazwy od dołu – 3 marki naraz | ze znaczników |
| A9 | 4,90–5,45 | Hold trzech marek | |
| A10 | 5,45–6,85 | Pole „24” HI-TEC rośnie do pełnego ekranu (teal), przykrywa resztę; kropki jadą do rogów ekranu i wracają jako duże HI-TEC 24 + hasło | z pola „24” |
| A11 | 6,85–7,65 | Hold HI-TEC | |
| A12 | 7,65–9,05 | Pole „24” HI-TEC → pełny ekran KRAMAT; kropki morfują w prostokąty w drodze do rogów | z pola „24” |
| A13 | 9,05–9,85 | Hold KRAMAT | |
| A14 | 9,85–11,25 | → MS WAY (prostokąty → ćwiartki) | z pola „24” |
| A15 | 11,25–12,05 | Hold MS WAY | |
| A16 | 12,05–13,10 | Nazwa i 24 wychodzą; **zielony ekran zapada się w kwadrat ■** (kolor → czerń); pary znaczników składają się w ▛ i ● | gradient → ■ |
| A17 | 13,05–13,95 | Kwadrat znów wyciąga GROUP 24, koło – hasło | z kwadratu / koła |
| A18 | 13,95–15,20 | Hold finałowy lockupu grupy | |

Kolejność marek to jedna zmienna w kodzie – do akceptacji przez klienta.

## B. Stingi marek — `out/sting-*.mp4` (3,4 s, wersja jasna i kolorowa)

| # | Czas | Ruch |
|---|---|---|
| B1 | 0,00–0,35 | Duży kształt marki (×4) w centrum, expo-out |
| B2 | 0,35–0,95 | Kształt mnoży się na 6 znaczników i rozjeżdża w narożniki (stagger 0,025) |
| B3 | 0,45–1,15 | Siatka konstrukcyjna |
| B4 | 0,80–1,35 | „24” rysowane piórem (segment z segmentu) |
| B5 | 1,05–1,70 | Nazwa od dołu |
| B6 | 1,65–2,25 | Hasło pisane; siatka gaśnie 1,9–2,3 |
| B7 | 2,25–3,40 | Hold |

Sting marki zaczyna się od **jej** kształtu, nie od historii grupy — klient HI-TEC nie ogląda całego systemu.

## C. Hero film z footage (15–20 s) — do złożenia w AE/Premiere

Grafika = prototyp z kodu (alfa / ProRes 4444 do zrobienia). Footage = Higgsfield. Przejścia footage ↔ footage używają **tego samego** mechanizmu co A10–A14: pole „24” rośnie do pełnego ekranu, a w jego wnętrzu jest już kolejne ujęcie (maska zamiast gradientu). Film i logo mówią jednym językiem.

| # | Czas | Kadr |
|---|---|---|
| C1 | 0–3 | A1–A3 skrócone (sygnet → 3 marki) na jasnym tle |
| C2 | 3–4 | Ramka „24” HI-TEC (narożne kropki) powiększa się na cały ekran — wnętrze ramki to już footage H1 |
| C3 | 4–8 | **H1** + logo HI-TEC 24 białe, lewy dół, hasło |
| C4 | 8–9 | Pole „24” rośnie → wewnątrz **H2**, znaczniki morfują w prostokąty, logo KRAMAT |
| C5 | 9–13 | **H2** + KRAMAT 24 |
| C6 | 13–14 | Pole „24” rośnie → **H3**, logo MS WAY |
| C7 | 14–17 | **H3** + MS WAY 24 |
| C8 | 17–20 | Ujęcie zapada się w kwadrat ■ → A16–A18 (GROUP 24 wyciągany z kwadratu) |

## D. Reveal — prezentacja systemu — `out/reveal.mp4` (21 s, 16:9, 60 fps)

Zasada: jedna rzecz naraz, czyste krzywe, ruch ciągły. Kolejność marek w tym filmie jak w sygnecie: **■ KRAMAT → ▛ MS WAY → ● HI-TEC**, więc kształty nigdy nie zamieniają się miejscami.
„24” jest konstrukcją parametryczną na siatce 5×5 komórek na cyfrę (te same kawałki, inna grubość i narożniki), więc każda klatka morfingu to czysty kształt.

| # | Czas | Kadr |
|---|---|---|
| D1 | 0,15–0,95 | Białe tło, wjeżdża GROUP. Logo ustawione tak, że ■ jest na środku kadru; przez całe otwarcie delikatny zoom-out |
| D2 | 0,55–2,05 | „24” rysuje się ścieżką (trim path): 2 od lewego górnego rogu w dół, potem 4 |
| D3 | 2,1–2,95 | ■, ▛, ● spadają z góry jeden po drugim, bez odbicia |
| D4 | 2,85–3,45 | Dojeżdża claim w dwóch liniach |
| D5 | 3,8–5,45 | ■ rośnie i wciąga bryły, claim i „24”. „24” zostaje na środku i robi się białe, w prostokącie otwiera się film, prostokąt rośnie do pełnego kadru i wypycha GROUP poza ekran |
| D6 | 5,3–9,5 | „24” wchodzi na siatkę, przelatują style: grupa → KRAMAT → MS WAY → HI-TEC; opisy techniczne, podświetlone detale |
| D7 | 9,6–11,85 | Napisy znikają; siatka zjeżdża w lewo (i wraca do KRAMAT), wciąga siatkę MS WAY, potem obie wciągają HI-TEC; trzy siatki obok siebie na całą szerokość |
| D8 | 12,0–12,4 | Podświetlają się ścięcia i narożniki w kolorach marek (porównanie) |
| D9 | 13,0–13,9 | Każde „24” maleje i zjeżdża na prawo w swoim gridzie, wchodzi nazwa marki: pełne logo w każdej siatce |
| D10 | 14,0–15,3 | Na krawędziach siatek rysują się obrysy ■ ▛ ● (proporcje jak w sygnecie: ■ od krawędzi do krawędzi); siatki znikają |
| D11 | 15,4–16,7 | Po każdym obrysie przechodzi impuls światła w kolorze marki |
| D12 | 16,5–17,1 | Logotypy marek znikają, film poza kształtami gaśnie do czerni; trzy kształty to jedna złożona maska na film |
| D13 | 17,1–18,2 | Szybki, płynny zoom-out (przyspieszenie i hamowanie) maski z filmem prosto do skali sygnetu (cienka biała krawędź, film rozjaśnia się) |
| D14 | 18,0–18,8 | Dolatują GROUP 24 (z lewej) i claim (z prawej) |
| D15 | 18,9–20,2 | Logo (białe na czerni, sygnet z filmem) podjeżdża do góry, pod nim pojawiają się logotypy KRAMAT, MS WAY, HI-TEC |

---

## Higgsfield — prompty do footage

Ustawienia wspólne: **image-to-video** (start frame = Wasze zdjęcia z dronów z plansz, żeby zachować kolorystykę), 16:9, 5 s, 24 fps. Najlepiej generować 2–3 warianty i ciąć najlepsze 4 s.

**Negative prompt (wszystkie):** `text, letters, logo, watermark, signage, lettering on truck, people close-up, cartoon, oversaturated, fisheye, warped geometry, flicker, cuts`

Ciężarówki zawsze z **pustą białą zabudową** — livery i logo komponujesz w postprodukcji, AI nie utrzyma geometrii znaku.

**H1 — HI-TEC (chłodnia, „right temperature”)**
```
Cinematic aerial drone shot, slow steady dolly forward and slight tilt down, a white refrigerated semi-truck with a blank plain box trailer drives across a tall concrete viaduct above a misty pine forest valley, early morning cold blue-teal light, soft fog between hills, clean minimal composition, the truck stays in the lower third, crisp details, high-end automotive commercial, muted teal colour grade, no text
```
Kamera: *Dolly In* / *Drone forward*, siła niska.

**H2 — KRAMAT („right hands”)**
```
Top-down aerial drone shot, camera tracking smoothly in the direction of travel, a white semi-truck with a blank plain trailer drives diagonally along an empty asphalt road through dry Mediterranean scrubland, warm late afternoon orange sunlight, long hard shadows, geometric composition with the road as a strong diagonal line, high-end logistics commercial, warm orange-red colour grade, no text
```
Kamera: *Overhead / Bird's eye*, tracking.

**H3 — MS WAY („right time”)**
```
Cinematic aerial drone shot, slow lateral truck move parallel to a long highway bridge on tall pillars over a green forested valley, a white semi-truck with a blank plain trailer crosses the bridge at steady speed, fresh morning sunlight, light haze, calm precise movement, high-end logistics commercial, fresh green colour grade, no text
```
Kamera: *Truck left / Lateral*, siła niska.

**H4 (opcjonalnie) — ujęcie otwierające pod grupę**
```
Wide establishing aerial drone shot rising slowly over a winding mountain highway at dawn, three white semi-trucks with blank plain trailers spaced evenly along the road, soft neutral grey morning light, minimal clean composition, premium corporate commercial, desaturated neutral grade, no text
```
Kamera: *Crane up*.

**Wskazówki:** wybieraj ujęcia z niską prędkością kamery (łatwiej trackować logo/livery w AE); unikaj kadrów, w których ciężarówka wychodzi poza kadr w trakcie 4 s; ten sam grade w AE na wszystkich trzech, tylko tint wg marki.

---

## Do zrobienia
- [ ] Font hasła (teraz zastępczy mono) — podaj krój z brandbooka
- [ ] Akceptacja kolejności marek
- [ ] Wersje 9:16 i 1:1 (layout trio → pionowy stos)
- [ ] Eksport z alfą (ProRes 4444 / WebM) do kompozycji na footage
- [ ] Dźwięk: klik na segment „24”, ton na markę
