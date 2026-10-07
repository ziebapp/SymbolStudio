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

## D. Reveal — prezentacja systemu — `out/reveal.mp4` (20 s, 16:9, 60 fps)

Lekka wersja: białe tło, linie włosowe, czerń i kolory marek tylko jako akcent. Film pojawia się tylko dookoła białego kształtu marki. Ruch ciągły (fazy na siebie zachodzą, cubic in-out, kamera +4%). Kolejność marek wszędzie: **HI-TEC → KRAMAT → MS WAY**.

| # | Czas | Akt | Kadr |
|---|---|---|---|
| D1 | 0,15–2,75 | Grupa | Trzy firmy jako trzy kształty: ● HI-TEC, ■ KRAMAT, ▛ MS WAY (gradienty marek), podpisy, linia łącząca, „3 COMPANIES — 1 GROUP”. Kształty zjeżdżają się w sygnet ■ ▛ ● (HI-TEC przechodzi łukiem pod spodem) |
| D2 | 2,6–4,0 | Logo grupy | Z ■ wysuwa się GROUP 24, z ● hasło; sygnet przechodzi z koloru w czerń |
| D3 | 4,15–5,55 | Stała | GROUP i hasło uciekają w górę pod maską, sygnet się chowa; samo „24” wychodzi na środek, rysuje się siatka 13×13 z opisami |
| D4 | 5,85 / 6,95 / 8,05 / 9,15 | Ewolucja | Linia skanująca (kolor marki) przerysowuje „24”: grupa → HI-TEC → KRAMAT → MS WAY → HI-TEC. Znaczniki w narożnikach siatki zmieniają kształt (kropki → kwadraty → ćwiartki), komórki ze zmieniającymi się detalami podświetlają się w kolorze marki; podpis z boku: nazwa + obietnica |
| D5 | 10,0–16,3 | Zachowanie | Biała strona kurczy się do białego ● HI-TEC, a dookoła odsłania się film (most i jadąca ciężarówka). W kształcie czarne logo ze znacznikami, „24” w kolorze marki, hasło w dwóch liniach wyrównane do lewej krawędzi logotypu. Kształt przechodzi płynnie w ■ KRAMAT (12,2), potem w ▛ MS WAY (14,2); znaczniki zmieniają kształt, treść wymienia się bez pustego momentu |
| D6 | 16,3–20,0 | Finał | Kształt otwiera się z powrotem w białą stronę. „24” MS WAY → cienkie „24” grupy, znaczniki składają się kolumnami w kolorowy sygnet ■ ▛ ●, z „24” wysuwa się GROUP, z ● hasło: pełne logo |

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
