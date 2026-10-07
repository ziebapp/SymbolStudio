# GROUP 24 — motion system: kadry + Higgsfield

Prototyp działa na oryginalnych ścieżkach z SVG (`svg/`). Podgląd na żywo: otwórz `index.html` w przeglądarce (scrub + wybór sceny). Render: `node render.js <scena>` → `out/<scena>.mp4`.

> **Brakuje:** SVG logo GROUP 24 (wordmark + sygnet). Sygnet w prototypie jest zastępczy (prostokąt / ćwiartka / koło) — po podmianie pliku wpinam prawdziwy.

---

## Zasady ruchu (gramatyka)

| Reguła | Wartość |
|---|---|
| Easing ruchu | expo-out (szybki start, twarde osadzenie) — wejścia; quint-in-out — przeloty i morfy |
| „24” | buduje się segment po segmencie L→P, każdy segment z 1-klatkowym mignięciem (wyświetlacz); znika P→L |
| Nazwa marki | litery wjeżdżają od dołu spod linii maski, stagger 0,09; wyjazd w górę |
| Znaczniki narożne | jedyny element, który **przechodzi** między markami — morf kształtu (kropka ↔ prostokąt ↔ ćwiartka) + pozycji |
| Hasło | pisane mono z kursorem ▌, kasowane wstecz |
| Siatka konstrukcyjna | 1 px, 35% krycia, rysuje się przed logo, znika przed holdem |
| Przejście tła | nigdy przenikanie (gradienty brudzą się na brąz) — pas otwierający się od osi logo lub twardy wipe ze scan-line |
| Hold końcowy | min. 1,2 s nieruchomego logo |

---

## A. Film systemowy — `out/film.mp4` (15 s, 16:9)

| # | Czas | Kadr | Ruch |
|---|---|---|---|
| A1 | 0,0–1,1 | Jasne tło `#E4E8E9`, centrum: sygnet ■ ◗ ● | Kształty wskakują po kolei (scale z zera, expo-out, co 0,12 s) |
| A2 | 1,1–2,0 | Sygnet rozpada się na 3 rzędy | ■ → 6 prostokątów KRAMAT, ◗ → 6 ćwiartek MS WAY, ● → 6 kropek HI-TEC. Rzędy wyrównane do prawej (jak na planszy systemu) |
| A3 | 1,5–3,2 | 3 logotypy budują się **równocześnie** | Siatka konstrukcyjna z etykietami (033, I—8, 025, 8—7) → „24” segmentami → nazwy od dołu. Stagger między rzędami 0,1 s — równa waga marek |
| A4 | 3,2–4,3 | Hold trzech marek | Siatka gaśnie |
| A5 | 4,3–5,3 | Scalenie | KRAMAT i MS WAY gaszą nazwy/24, ich znaczniki zjeżdżają i morfują w kropki HI-TEC; HI-TEC jedzie do centrum i rośnie. Od osi logo otwiera się pas z gradientem teal, logo przechodzi w biel |
| A6 | 5,3–7,0 | HI-TEC 24 + „IN THE RIGHT TEMPERATURE.” | Hasło pisane |
| A7 | 7,0–8,0 | HI-TEC → KRAMAT | Wipe L→P z białą scan-line; kropki morfują w prostokąty i przesuwają się na szerokość KRAMAT; HI-TEC wyjeżdża w górę, 24 gaśnie segmentami, KRAMAT wjeżdża |
| A8 | 8,0–9,2 | KRAMAT 24 + „IN THE RIGHT HANDS.” | Hold |
| A9 | 9,2–10,2 | KRAMAT → MS WAY | jw., prostokąty → ćwiartki |
| A10 | 10,2–11,4 | MS WAY 24 + „IN THE RIGHT TIME.” | Hold |
| A11 | 11,4–12,6 | Powrót do grupy | Nazwa i 24 gasną; pary znaczników L/Ś/P zbiegają się w ■ ◗ ●; pas zamyka się do linii, tło jasne, logo czarne |
| A12 | 12,6–15,0 | Sygnet + „LEADING ALL THE WAY.” | Hasło pisane, hold |

Kolejność marek w cyklu (HI-TEC → KRAMAT → MS WAY) to jedna zmienna — do akceptacji przez klienta (pierwsza = wygląda na wiodącą).

## B. Stingi marek — `out/sting-*.mp4` (3,4 s, wersja jasna i kolorowa)

| # | Czas | Ruch |
|---|---|---|
| B1 | 0,00–0,35 | Duży kształt marki (×4) w centrum, expo-out |
| B2 | 0,35–0,95 | Kształt mnoży się na 6 znaczników i rozjeżdża w narożniki (stagger 0,025) |
| B3 | 0,45–1,15 | Siatka konstrukcyjna |
| B4 | 0,80–1,35 | „24” segmentami |
| B5 | 1,05–1,70 | Nazwa od dołu |
| B6 | 1,65–2,25 | Hasło pisane; siatka gaśnie 1,9–2,3 |
| B7 | 2,25–3,40 | Hold |

Sting marki zaczyna się od **jej** kształtu, nie od historii grupy — klient HI-TEC nie ogląda całego systemu.

## C. Hero film z footage (15–20 s) — do złożenia w AE/Premiere

Grafika = prototyp z kodu (alfa / ProRes 4444 do zrobienia). Footage = Higgsfield. Przejścia footage ↔ footage używają **tego samego** wipe'u ze scan-line co w A7/A9, więc film i logo mówią jednym językiem.

| # | Czas | Kadr |
|---|---|---|
| C1 | 0–3 | A1–A3 skrócone (sygnet → 3 marki) na jasnym tle |
| C2 | 3–4 | Ramka „24” HI-TEC (narożne kropki) powiększa się na cały ekran — wnętrze ramki to już footage H1 |
| C3 | 4–8 | **H1** + logo HI-TEC 24 białe, lewy dół, hasło |
| C4 | 8–9 | Wipe ze scan-line → **H2**, znaczniki morfują w prostokąty, logo KRAMAT |
| C5 | 9–13 | **H2** + KRAMAT 24 |
| C6 | 13–14 | Wipe → **H3**, logo MS WAY |
| C7 | 14–17 | **H3** + MS WAY 24 |
| C8 | 17–20 | Ramka zamyka się do linii → A11–A12 (sygnet + LEADING ALL THE WAY.) |

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
- [ ] SVG GROUP 24 → podmiana sygnetu + wordmark GROUP w A1/A12
- [ ] Font hasła (teraz zastępczy mono) — podaj krój z brandbooka
- [ ] Akceptacja kolejności marek
- [ ] Wersje 9:16 i 1:1 (layout trio → pionowy stos)
- [ ] Eksport z alfą (ProRes 4444 / WebM) do kompozycji na footage
- [ ] Dźwięk: klik na segment „24”, ton na markę
