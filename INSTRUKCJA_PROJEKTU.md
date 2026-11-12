# INSTRUKCJA PROJEKTU – GrafikPro

Aktualizacja: 2026-11-12

## 1. Cel i opis aplikacji

GrafikPro to lokalna aplikacja do zarządzania grafikami pracy pracowników, obsługi dostępności, stanowisk i raportów. Interfejs wykorzystuje React + TypeScript + Vite. Głównym docelowym środowiskiem jest samodzielna aplikacja Windows Electron z bazą SQLite w profilu użytkownika; w przeglądarce developerskiej nadal działa wersja z Dexie / IndexedDB.

Głównym celem systemu jest:
- planowanie i aktualizacja grafiku pracy,
- zarządzanie pracownikami i stanowiskami,
- śledzenie dostępności, urlopów i nieobecności,
- generowanie automatycznych grafików przy użyciu algorytmu heurystycznego,
- prezentacja statystyk i raportów,
- utrzymanie wygodnego, czarnego interfejsu administracyjnego.

Aplikacja nie wymaga serwera ani połączenia z internetem podczas użytkowania. Dane aplikacji desktopowej pozostają lokalnie na komputerze użytkownika; część widoków zachowuje tryb webowy do programowania i testów.

## 2. Dostępne funkcjonalności

W obecnym stanie projektu zaimplementowane są następujące obszary:

### 2.1. Dashboard / pulpit
- podsumowanie pracowników,
- liczba zaplanowanych zmian,
- łączne godziny pracy,
- nieobsadzone zmiany,
- wykresy godzin według dni i pracowników,
- podgląd najbliższych zmian.

### 2.2. Harmonogram grafiku pracy
- przegląd tygodniowego lub dziennego grafiku,
- dodawanie, edycja i usuwanie zmian,
- przypisywanie pracownika do konkretnej daty i zakresu godzin,
- wybór stanowiska i typu zmiany,
- obsługa godzin pracy z uwzględnieniem przerw.

### 2.3. Zarządzanie pracownikami
- dane personalne pracowników,
- przypisanie do stanowisk,
- rodzaj umowy, data zatrudnienia,
- wymiar etatu i preferowane godziny pracy,
- kolor identyfikacyjny,
- dodawanie z walidacją imienia, nazwiska i stanowiska oraz potwierdzeniem trwałego zapisu,
- usuwanie z aktywnej listy po potwierdzeniu, widok usuniętych pracowników i możliwość przywrócenia,
- podczas usuwania nierozpoczęte zmiany od bieżącego dnia znikają z grafiku, a rozpoczęte/zakończone zmiany i dostępność pozostają zachowane,
- usunięci pracownicy nie są wyświetlani w kalendarzu ani dostępni do nowych zmian i generowania grafiku.

### 2.4. Zarządzanie stanowiskami
- lista stanowisk,
- wymagane obsady na stanowisku,
- kolory i opisy stanowisk,
- powiązanie z pracownikami i grafikami.

### 2.5. Dostępność i nieobecności
- zapis dostępności pracowników,
- wpisy typu available, unavailable, dayOff, vacation,
- przypisanie dnia i zakresu godzin,
- wykorzystanie w generacji automatycznej.

### 2.6. Automatyczne układanie grafiku
- osobna sekcja w aplikacji: „Automatyczne układanie grafiku”,
- wybór typu zakresu (tydzień / miesiąc),
- wybór dat rozpoczęcia i zakończenia,
- konfiguracja dni roboczych,
- definiowanie szablonów zmiany (poranna, popołudniowa, nocna, całodniowa),
- uruchomienie realnego algorytmu generowania,
- podgląd wygenerowanego grafiku,
- zapis jako wersja robocza / zatwierdzenie / odrzucenie,
- ostrzeżenia o niemożliwości poprawnego wygenerowania grafiku.

### 2.7. Statystyki i raporty
- analiza godzin pracowników,
- rozkład godzin według stanowisk,
- eksport do PDF,
- eksport do Excela,
- eksport do CSV.

### 2.8. Ustawienia firmy i kopie zapasowe
- nazwa firmy,
- godziny otwarcia,
- dni robocze,
- domyślna przerwa,
- waluta,
- motyw aplikacji,
- podgląd lokalizacji bazy SQLite i katalogu kopii,
- eksport oraz walidowane przywracanie kopii zapasowej.

### 2.9. Aktualizacje aplikacji
- automatyczne sprawdzanie stabilnego wydania po uruchomieniu oraz sprawdzanie ręczne w Ustawieniach,
- wyświetlanie numeru bieżącej wersji, dostępnej wersji, postępu pobierania i błędów,
- pobieranie aktualizacji po potwierdzeniu przez użytkownika,
- wymuszona kopia SQLite przed instalacją; błąd kopii blokuje instalację,
- aktualizacje dystrybuowane jako publiczne GitHub Releases przez `electron-updater`,
- brak wysyłania bazy danych lub danych pracowników do serwera aktualizacji.

### 2.10. Przewodnik po menu — do czego służy każda sekcja

Krótkie wyjaśnienie każdej sekcji jest również widoczne na górze jej ekranu w aplikacji.

1. **Dashboard** — szybki podgląd liczby pracowników, zmian, godzin i bieżącego dnia. Wykresy i karty są podsumowaniem, a nie formularzem do edycji grafiku. Ostrzeżenia o konfliktach nie są jeszcze wiarygodnym sprawdzaniem wszystkich konfliktów.
2. **Grafik pracy** — tygodniowy kalendarz aktywnych pracowników. Strzałkami przechodzi się między tygodniami, przyciskiem „Dzisiaj” wraca do obecnego tygodnia, a „Dodaj zmianę” lub „+ Dodaj” otwiera formularz. Kliknięcie istniejącej zmiany pozwala ją edytować albo usunąć. Formularz zawiera osobę, datę, godziny, stanowisko, typ zmiany, przerwę, kolor i uwagi.
3. **Pracownicy** — dodawanie osób oraz przeglądanie aktywnych i usuniętych pracowników. Można wyszukiwać po nazwisku i filtrować po stanowisku. „Usuń” wyłącza osobę z aktywnej listy i usuwa jej nierozpoczęte zmiany od bieżącego dnia; rozpoczęte i wcześniejsze zmiany oraz dostępność zostają zachowane. Usuniętą osobę można przywrócić.
4. **Stanowiska** — tworzenie kategorii pracy, np. „Kasjer” lub „Magazynier”. W formularzu podaje się nazwę, opis, kolor i wymaganą liczbę osób. Kolor pomaga odróżniać stanowiska; opis wyjaśnia ich zakres. Obecnie nie ma edycji istniejącego stanowiska. Usunięcie nie czyści automatycznie jego przypisań u pracowników i w historycznych zmianach, więc trzeba zachować ostrożność.
5. **Dostępność** — tygodniowe reguły dostępności danej osoby: dostępny, niedostępny, dzień wolny lub urlop, dla wybranego dnia tygodnia i godzin. Wpisy są wykorzystywane przez generator. To nie jest formularz urlopu przypisanego do konkretnych dat.
6. **Automatyczne układanie grafiku** — układa propozycję zmian dla wybranego zakresu dat i dni pracy na podstawie aktywnych pracowników, przypisanych stanowisk, dostępności, istniejących zmian oraz szablonów. „Generuj grafik” pokazuje podgląd i ostrzeżenia. Niepełnego wyniku nie można zapisać. Generator jest heurystyczny; nie jest gwarantowane znalezienie najlepszego rozwiązania. „Zapisz jako wersję roboczą” i „Zatwierdź grafik” obecnie zapisują zmiany do tej samej głównej listy — nie tworzą osobnych wersji. Ustawienia generatora nie są zapisywane jako szablon.
7. **Statystyki** — wykres godzin według pracownika i stanowiska. Obecnie sumuje zapisane zmiany bez wyboru okresu; nie jest to filtrowany raport miesięczny.
8. **Raporty** — pobieranie pliku PDF, Excel (XLSX) lub CSV z zapisanymi zmianami. Eksport obejmuje wszystkie zapisane zmiany; widoczna niżej lista „Aktywne zestawienia” jest opisowa i nie stanowi osobnych przycisków ani filtrów raportów.
9. **Ustawienia** — dane firmy, waluta, godziny otwarcia, domyślna przerwa i motyw; w aplikacji Windows także lokalizacja bazy/kopii, eksport i przywracanie bazy SQLite oraz sekcja aktualizacji. Przywracanie kopii zastępuje bieżące dane, ale przed operacją aplikacja tworzy kopię bezpieczeństwa. Aktualizacje wymagają internetu.

W górnym pasku ikona słońca/księżyca przełącza motyw. Ikona dzwonka jest obecnie tylko elementem wyglądu i nie otwiera działającego centrum powiadomień.

## 3. Struktura folderów i plików

Projekt ma następujący układ:

```text
grafikpro/
├── .github/
│   └── workflows/
│       └── blank.yml              # testy, build i automatyczna publikacja przy pushu do main
├── dist/                          # zbudowana wersja produkcyjna
├── electron/
│   ├── main.cjs                  # proces główny Electron i obsługa okna / IPC
│   ├── preload.cjs               # bezpieczny mostek IPC dla interfejsu
│   ├── database.cjs              # SQLite, kopie automatyczne i przywracanie
│   ├── updater.cjs               # sprawdzanie, pobieranie i instalacja aktualizacji
│   ├── database.test.cjs         # testy bazy, kopii i migracji
│   ├── updater.test.cjs          # testy przepływu aktualizacji
│   └── publisher.test.cjs        # testy kanału publikacji
├── build/
│   └── icon.ico                  # ikona Windows / instalatora
├── node_modules/                 # zależności projektu
├── public/                       # statyczne zasoby publiczne
├── src/
│   ├── App.tsx                  # główny komponent aplikacji, routing, UI, sekcje i logika
│   ├── App.css                  # style komponentów aplikacji (jeśli są wykorzystywane)
│   ├── index.css                # globalny CSS / styling projektu
│   ├── main.tsx                 # punkt wejścia aplikacji
│   ├── types.ts                 # modele danych aplikacji
│   ├── lib/
│   │   └── dexie.ts             # adapter Electron SQLite / przeglądarkowy Dexie, seed data
│   ├── electron.d.ts             # typy bezpiecznego mostka desktopowego
│   ├── services/
│   │   ├── employees.ts         # dodawanie, usuwanie z aktywnej listy i przywracanie
│   │   ├── employees.test.ts    # testy operacji pracowniczych
│   │   ├── scheduler.ts         # algorytm automatycznego układania grafiku
│   │   └── scheduler.test.ts   # testy automatyczne dla generatora grafików
│   ├── store/
│   │   ├── useAppStore.ts       # Zustand store, kolejka zapisu i persystencja
│   │   └── useAppStore.test.ts  # testy zapisu i błędów pracowniczych
│   └── assets/                  # grafiki i zasoby wizualne
├── .gitignore
├── .oxlintrc.json
├── index.html
├── package.json                 # zależności i skrypty npm
├── package-lock.json
├── electron-builder.config.cjs  # konfiguracja publicznych GitHub Releases
├── README.md                    # domyślna instrukcja szablonu Vite
├── INSTRUKCJA_PROJEKTU.md       # ta dokumentacja projektu
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── vite.config.ts
└── public/favicon.svg
```

## 4. Wykorzystane technologie i biblioteki

### 4.1. Frontend
- React 19
- TypeScript
- Vite
- React Router
- Zustand

### 4.2. Stylowanie i UI
- Tailwind CSS
- Lucide React (ikony)
- własne komponenty panelowe i karty statystyk w App.tsx

### 4.3. Dane lokalne
- Electron 45
- electron-updater z dostawcą publicznych GitHub Releases
- SQLite przez sql.js (WebAssembly, bez natywnego modułu)
- Dexie / IndexedDB jako tryb przeglądarkowy i źródło zgodności/migracji

### 4.4. Raporty i eksport
- jsPDF
- ExcelJS
- CSV generowane ręcznie

### 4.5. Wykresy i analiza
- Recharts

### 4.6. Daty i obliczenia godzin
- date-fns

### 4.7. Testowanie
- Vitest
- Node.js built-in test runner (`node --test`) dla testów bazy Electron

## 5. Opis bazy danych

Aplikacja desktopowa zapisuje dane w pliku `grafikpro.sqlite` w katalogu `userData` Electron (na Windows zwykle pod `%APPDATA%\grafikpro`). Dokładną ścieżkę można sprawdzić w **Ustawienia → Baza danych i kopie zapasowe**. Plik jest bazą SQLite i jest modyfikowany w procesie głównym aplikacji. Interfejs renderer nie otrzymuje bezpośredniego dostępu do systemu plików; operacje przechodzą przez ograniczony mostek IPC w `electron/preload.cjs`.

Główne tabele SQLite to:

### 5.1. employees
Zawiera dane pracowników:
- id
- firstName
- lastName
- phone
- email
- positionIds
- contractType
- hireDate
- fullTime
- monthlyHours
- preferredHours
- color
- notes
- active

### 5.2. positions
Zawiera dane stanowisk:
- id
- name
- description
- color
- required

### 5.3. shifts
Zawiera zapis zmian:
- id
- employeeId
- date
- start
- end
- positionId
- type
- color
- breakMinutes
- notes

### 5.4. availability
Zawiera wpisy dostępności pracownika:
- id
- employeeId
- day
- start
- end
- type

Typy dostępności:
- available
- unavailable
- dayOff
- vacation

### 5.5. settings
Zawiera ustawienia firmy:
- id
- companyName
- openingHoursStart
- openingHoursEnd
- workingDays
- defaultBreakMinutes
- currency
- dateFormat
- firstDayOfWeek
- theme

### 5.6. app_meta
Metadane formatu bazy: identyfikator aplikacji oraz wersja schematu. Aktualny schemat ma wersję 2. Migracje wykonują się sekwencyjnie w transakcji SQLite. Przed migracją istniejącej bazy program tworzy osobną kopię; nieznana wyższa lub nieprawidłowa wersja powoduje jawny błąd zamiast próby nadpisania bazy.

Migracja do wersji 2 dodaje tabelę `schema_migrations` oraz indeksy dla dat zmian i dostępności. Nie usuwa ani nie przepisuje danych aplikacji.

Wiersze tabel danych zawierają indeksowane klucze (`id`, a dla zmian data / dla dostępności pracownik) oraz pełny obiekt JSON w kolumnie `data`. Pozwala to zachować istniejące modele TypeScript bez utraty pól przy przeniesieniu z IndexedDB.

### 5.7. Dane startowe i zgodność
Po pierwszym uruchomieniu aplikacja inicjalizuje bazę przykładowymi danymi:
- przykładowi pracownicy,
- przykładowe stanowiska,
- przykładowe zmiany na bieżący tydzień,
- przykładowe wpisy dostępności.

Jeśli baza SQLite jest pusta, adapter przenosi istniejące dane Dexie (jeśli takie istnieją) do SQLite. Przy czystej instalacji nie tworzy przykładowych pracowników ani zmian: tworzy ustawienie „Moja firma”, puste grafiki i domyślne stanowiska. W wersji webowej nadal używana jest IndexedDB oraz dane demonstracyjne.

### 5.8. Kopie zapasowe
- automatyczna kopia SQLite jest tworzona maksymalnie raz dziennie przy pierwszym zapisie / uruchomieniu z zapisem,
- kopie są przechowywane w podfolderze `backups` obok bazy i automatycznie usuwane po 30 dniach,
- ekran **Ustawienia → Baza danych i kopie zapasowe** umożliwia zapis kopii w wybranym miejscu oraz przywrócenie istniejącego pliku,
- przed przywróceniem aplikacja sprawdza integralność pliku i identyfikator GrafikPro oraz tworzy kopię aktualnych danych,
- nieprawidłowa kopia nie zastępuje bazy.
- migracja schematu i instalacja aktualizacji wymuszają dodatkową kopię, niezależnie od dziennej kopii automatycznej.

### 5.9. Aktualizacje
Aktualizator działa tylko w spakowanej aplikacji Electron. Po uruchomieniu sprawdza aktualizacje po 10 sekundach; użytkownik może też sprawdzić je ręcznie w **Ustawienia → Aktualizacje**. Pobieranie i instalacja wymagają potwierdzenia. Przed `quitAndInstall` wykonywana jest dodatkowa kopia `grafikpro.sqlite`; błąd kopii uniemożliwia rozpoczęcie instalacji.

Aktualizacje korzystają z GitHub Releases i plików metadanych/hashy tworzonych przez electron-builder. Instalator aktualizuje pliki programu, natomiast baza pozostaje w katalogu `userData` Electron. Aktualizacje nie wysyłają zawartości bazy do GitHub.

## 6. Sposób działania kalendarza

Kalendarz aplikacji jest zbudowany na bazie danych przesyłanych do UI i obliczeń w React. Główne zasady:

- każda zmiana ma datę, godzinę rozpoczęcia i zakończenia,
- pracownik może wystąpić w wielu zmianach w różnych dniach,
- system sprawdza konfliktowanie zmian po pracowniku,
- aplikacja pokazuje listę zmian i podsumowanie godzin,
- zmiany są odczytywane z bazy i prezentowane w widoku harmonogramu,
- zapis zmiany odbywa się poprzez store Zustand: Electron zapisuje SQLite przez IPC, a przeglądarka używa IndexedDB,
- kalendarz pokazuje aktywnych pracowników; usunięci nie są w nim wyświetlani, ich historyczne zmiany pozostają w danych do raportów.

W praktyce działanie kalendarza obejmuje:
- wyświetlanie tygodnia lub bieżącego okresu,
- przechodzenie między dniami i tygodniami,
- przypisywanie pracowników do zakresu godzin,
- wykrywanie powtarzających się wpisów,
- eksport danych do raportów.

## 7. Sposób działania automatycznego generatora grafików

Generator grafiku znajduje się w module `src/services/scheduler.ts` i jest uruchamiany z poziomu formularza w `src/App.tsx` w sekcji „Automatyczne układanie grafiku”.

### 7.1. Założenia generatora
Generator odczytuje aktualne dane z:
- pracowników,
- stanowisk,
- dostępności,
- istniejących zmian.

Następnie tworzy zestaw zadań (tasków) na podstawie zdefiniowanych szablonów zmiany i dat roboczych. Dla każdego zadania próbuje dobrać odpowiedniego pracownika.

### 7.2. Obsługiwane typy zmian
Obecnie obsługiwane są szablony:
- poranna
- popołudniowa
- nocna
- całodniowa
- indywidualna (w modelu pojawia się jako rozszerzalny typ z definicji szablonu)

Przykładowe ustawienia domyślne:
- poranna: 06:00–14:00
- popołudniowa: 14:00–22:00
- nocna: 22:00–06:00
- całodniowa: 08:00–16:00

### 7.3. Ograniczenia "twarde"
Generator sprawdza podstawowe reguły:
- brak nakładania się nowych zmian na inne wygenerowane i już istniejące zmiany pracownika, również przy zmianach przechodzących przez północ,
- wpisy `available` zawężają dostępność do podanych godzin (jeśli dla danego dnia istnieje taki wpis),
- wpisy `unavailable`, `dayOff` i `vacation` blokują nakładające się godziny z danego dnia tygodnia,
- pracownik musi spełniać wymagane kwalifikacje stanowiskowe,
- wybierane stanowisko musi należeć do stanowisk pracownika i do stanowisk dopuszczonych w szablonie (jeśli szablon je określa),
- konfiguracja ogranicza maksymalną liczbę godzin w okresie, maksymalną liczbę zmian w tygodniu oraz maksymalną liczbę dni pracy z rzędu.

### 7.4. Preferencje i „miękkie” reguły
Dodatkowo stosowane są elementy scoringowe:
- równomierny podział godzin,
- preferowane godziny pracy pracownika,
- priorytet dla pracownika, który nie osiągnął minimalnej liczby godzin,
- ograniczanie nadmiernego przydziału w ramach limitów.

Maksymalne limity są ograniczeniami twardymi i blokują kolejne przydziały. Minimalna liczba godzin jest celem punktacji, a nie gwarantowanym warunkiem wykonalności.

### 7.5. Wynik generatora
Funkcja `generateSchedule(...)` zwraca obiekt typu:
- feasible: czy grafika jest akceptowalna,
- warnings: ostrzeżenia i informacje o problemach,
- shifts: wygenerowane zmiany,
- summary: liczba zmian, łączne godziny, liczba pracowników z przypisaniem.

Niekompletny wynik pokazuje ostrzeżenia i nie może zostać zapisany ani zatwierdzony z widoku generatora.

### 7.6. Ograniczenia obecnej wersji
Wersja implementowana jest realnym algorytmem heurystycznym, ale nie jest pełnym rozwiązaniem opartym o OR-Tools / constraint programming. To oznacza, że:
- algorytm działa na bazie reguł i punktacji,
- dobrze sprawdza się w podstawowych scenariuszach,
- nie jest jeszcze pełnym enterprise-grade optimizerem do bardzo złożonych i dużych systemów.
- model dostępności zapisuje dzień tygodnia i godziny, a nie zakres konkretnych dat urlopu; urlop jest więc obecnie interpretowany jako reguła dla danego dnia tygodnia,
- `required` szablonu oznacza liczbę osób na zmianie; konfiguracja nie modeluje jeszcze niezależnego minimum dla każdego stanowiska,
- wygenerowana wersja robocza / zatwierdzona nie ma własnego trwałego modelu wersjonowania, a zapis używa bieżącej listy zmian.

## 8. Zasady obliczania godzin pracy

Godziny są liczone w `App.tsx` i `scheduler.ts` przez funkcje:
- `toMinutes(...)` – zamiana godziny HH:MM na minuty,
- `getDurationMinutes(...)` – obliczanie długości zmiany,
- `getShiftHours(...)` – obliczanie czasu pracy po odjęciu przerwy.

Przykład:
- 08:00–16:00 = 8 godzin
- jeśli przerwa to 30 minut, wynik to 7,5 godziny

W szczególności algorytm uwzględnia:
- różnice między zmianami długimi i krótkimi,
- zmiany przechodzące przez północ,
- możliwość pracy w godzinach nocnych i całodniowych,
- odjęcie `breakMinutes` od płatnego czasu pracy w statystykach i limitach generatora.

Przy generowaniu nowa zmiana ma obecnie domyślną przerwę 30 minut. Podsumowanie generatora przedstawia czas po odjęciu tej przerwy; pole `required` określa jednocześnie wymaganą liczbę osób na danym szablonie.

## 9. Opis wszystkich modułów

### 9.1. `src/App.tsx`
Najważniejszy moduł aplikacji. Zawiera:
- menu boczne,
- routowanie pomiędzy sekcjami,
- komponenty dashboardu,
- widok grafiku,
- zarządzanie pracownikami,
- sekcję automatycznego generatora,
- raporty,
- ustawienia.

### 9.2. `src/types.ts`
Definicje typów danych dla:
- pracownika,
- stanowiska,
- zmiany,
- dostępności,
- ustawień firmy,
- modelu danych aplikacji.

### 9.3. `src/lib/dexie.ts`
Warstwa zgodności danych. Odpowiada za:
- wybór SQLite w Electronie albo IndexedDB w przeglądarce,
- stworzenie tabel,
- dane testowe,
- migrację pustej bazy desktopowej ze starego IndexedDB,
- wczytywanie i zapisywanie danych.

### 9.4. `electron/main.cjs`, `electron/preload.cjs`, `electron/database.cjs`
- tworzenie okna aplikacji z ograniczoną izolacją procesów,
- ograniczony zestaw operacji IPC na danych i kopiach,
- lokalna baza SQLite z atomowym zapisem pliku,
- automatyczne kopie, retencja, eksport, walidacja i przywracanie kopii.

### 9.5. `electron/updater.cjs`
Zarządza sprawdzaniem, pobieraniem i instalacją aktualizacji przez `electron-updater`. Przed zamknięciem aplikacji i instalacją wymaga pomyślnego utworzenia wymuszonej kopii bazy.

### 9.6. `electron-builder.config.cjs`
Konfiguruje publiczny kanał GitHub Releases dla `michalrubin0-beep/Grafik`. Właściciela i repozytorium można nadpisać zmiennymi `GRAFIKPRO_GITHUB_OWNER` i `GRAFIKPRO_GITHUB_REPO`. Token wydawniczy `GH_TOKEN` jest potrzebny tylko do publikowania i nie jest pakowany z aplikacją.

### 9.7. `src/store/useAppStore.ts`
Store Zustand. Odpowiada za:
- stan aplikacji,
- synchronizację danych z bazą,
- asynchroniczne, trwałe dodawanie/aktualizację, usuwanie pracowników z aktywnej listy i przywracanie,
- kolejkę zapisów chroniącą przed nadpisaniem nowszych snapshotów,
- metody update/delete/add dla zmian i dostępności,
- persystencję po każdej zmianie,
- widoczny stan błędu odczytu / zapisu.

### 9.8. `src/services/employees.ts`
Zawiera czyste operacje na danych pracowników: dodawanie lub aktualizację po identyfikatorze, usunięcie z aktywnej listy wraz z usunięciem nierozpoczętych zmian oraz przywrócenie pracownika. Zmiany rozpoczęte/zakończone pozostają w historii.

### 9.9. `src/services/scheduler.ts`
Implementacja algorytmu planowania. Zawiera:
- typy konfiguracji,
- szablony zmiany,
- funkcję generacji grafiku,
- funkcje analizy dostępności,
- funkcje punktacji pracowników,
- wynik planowania z ostrzeżeniami.

### 9.10. Testy automatyczne
Testy Vitest i Node (`src/services/employees.test.ts`, `src/store/useAppStore.test.ts`, `src/services/scheduler.test.ts`, `electron/database.test.cjs`, `electron/updater.test.cjs`, `electron/publisher.test.cjs`) sprawdzają:
- dodanie i aktualizację pracownika bez duplikatów,
- trwałość zapisu i obsługę błędu zapisu bez aktualizacji listy,
- usuwanie przyszłych zmian, zachowanie historii i dostępności przy usunięciu pracownika,
- zachowanie dodanego i usuniętego pracownika po ponownym otwarciu SQLite,
- wykonanie kopii przed aktualizacją, migrację schematu i zachowanie danych,
- blokadę instalacji po błędzie kopii oraz konfigurację dostawcy publikacji,
- brak nakładania się zmian, respektowanie dostępności i kwalifikacji oraz wykrywanie niepełnych rozwiązań generatora.

## 10. Aktualnie ukończone funkcje

W projekcie są już zrealizowane następujące elementy:

- [x] inicjalizacja projektu React + TypeScript + Vite
- [x] pełna struktura aplikacji i router
- [x] lokalna baza danych IndexedDB
- [x] zarządzanie pracownikami, stanowiskami i dostępnymi zasobami
- [x] trwałe dodawanie pracowników z walidacją i obsługą błędów zapisu
- [x] usuwanie pracownika z aktywnej listy z potwierdzeniem, filtrem usuniętych i możliwością przywrócenia
- [x] usuwanie nierozpoczętych zmian pracownika z grafiku przy zachowaniu historii rozpoczętych/zakończonych zmian
- [x] ukrycie usuniętych pracowników w kalendarzu i wykluczenie z nowych zmian oraz generatora
- [x] grafiki pracy i podgląd zmian
- [x] eksport PDF / Excel / CSV
- [x] statystyki i wykresy
- [x] sekcja automatycznego układania grafiku
- [x] realny generator grafiku na bazie danych aplikacji
- [x] podstawowe testy automatyczne dla generatora
- [x] powłoka Electron z izolowanym preload i uruchamianiem aplikacji z plików lokalnych
- [x] lokalna baza SQLite i zgodność adaptera z istniejącym modelem danych
- [x] codzienne kopie automatyczne, retencja 30 dni, eksport i walidowane przywracanie
- [x] sprawdzanie aktualizacji, pobieranie i instalacja przez bezpieczny mostek Electron
- [x] wymuszona kopia przed aktualizacją i wersjonowane migracje SQLite
- [x] konfiguracja publikacji stabilnych wydań w publicznym GitHub Releases
- [x] automatyczna publikacja instalatora po pushu do gałęzi `main` przez GitHub Actions; poprawny workflow publikuje instalator, `latest.yml` i `.blockmap`
- [x] instalator Windows NSIS tworzący skróty na pulpicie i w menu Start
- [x] build projektu z powodzeniem
- [x] testy Vitest i Node dla SQLite
- [x] testy dodawania i usuwania pracowników, przyszłych zmian oraz trwałości danych po ponownym otwarciu bazy

## 11. Funkcje jeszcze do wykonania

Lista elementów, które wymagają dalszej pracy:

- [ ] pełne wersjonowanie wygenerowanych grafików i historii zmian,
- [ ] rozbudowanie generatora o szablony zapisane jako konfiguracje użytkownika,
- [ ] zaawansowany model warunków „hard vs soft” z lepszym rozdzieleniem priorytetów,
- [ ] obsługa wielu wariantów grafiku z porównaniem i wyborem najlepszej wersji,
- [ ] pełna integracja ręcznej edycji po wygenerowaniu z automatycznym przeliczaniem konfliktów,
- [ ] rozszerzenie generatora o weekendy, dni wolne, limity pracy pod rząd i dokładne preferencje pracowników,
- [ ] bardziej zaawansowany solver z wykorzystaniem optymalizacji lub biblioteki typu OR-Tools,
- [ ] pełne testy przypadków brzegowych i dużych zespołów,
- [ ] podpisywanie instalatorów certyfikatem Windows, aby ograniczyć ostrzeżenia SmartScreen.

## 12. Znane błędy i problemy

W chwili obecnej znane są następujące ograniczenia:

1. Generator ma charakter heurystyczny, nie jest pełnym solverem optymalizacyjnym.
2. Nie ma jeszcze kompletnej historii / wersji wygenerowanych grafików w modelu danych.
3. Interfejs generowania nie obejmuje wszystkie założenia specyfikacji w pełnym zakresie (np. wiele wariantów, pełna kontrola priorytetów, historia zatwierdzeń).
4. W przypadku bardzo trudnych konfiguracji, grafiki mogą nie być spełnione w pełni lub wygenerować ostrzeżenie zamiast rozwiązania.
5. Podczas builda Vite wskazuje ostrzeżenie o dużym rozmiarze bundle, co nie blokuje działania aplikacji, ale wymaga dalszej optymalizacji.
6. Wciąż istnieje potrzeba lepszego modelu „hard constraints” oraz rozbudowanego mechanizmu priorytetu dla złożonych grafików.
7. Typ `AvailabilityEntry` nie przechowuje konkretnych dat początku i końca urlopu; dokładne urlopy obejmujące zakres dat wymagają rozbudowy modelu i formularza.
8. Przy zapisie generatora zmiany trafiają do głównej kolekcji grafiku; draft i zatwierdzenie nie są jeszcze odseparowanymi wersjami, a funkcja odrzucenia usuwa tylko podgląd.
9. Instalator jest budowany bez podpisu cyfrowego; Windows może wyświetlić ostrzeżenie o nieznanym wydawcy. Dystrybucja publiczna wymaga certyfikatu podpisu kodu.
10. Build Vite nadal zgłasza ostrzeżenie o dużym bundlu. Nie blokuje to lokalnego działania aplikacji.
11. `npm audit --omit=dev` zgłasza dwa umiarkowane advisories w zależności `ExcelJS → uuid@8.3.2`; automatyczna naprawa npm wymagałaby wymuszonej, niezgodnej wersji ExcelJS i nie została zastosowana.
12. Starsze wydania 0.2.7 i 0.2.11 były niekompletne; aktualny release 0.2.12 zawiera instalator i pliki wymagane do aktualizacji. Nie należy instalować niekompletnych starszych wydań.
13. Zainstalowana dotąd wersja 0.1.0 nie zawiera aktualizatora. Trzeba ją jednorazowo zastąpić ręcznie instalatorem z obsługą aktualizacji; dopiero następne wersje będą instalowane z poziomu aplikacji.
14. Karta „Zmiany w tygodniu” na Dashboardzie pokazuje liczbę wszystkich zmian, nie tylko bieżącego tygodnia. Licznik „Konflikty” nie sprawdza poprawnie nakładania się godzin, a dwie pozycje w panelu ostrzeżeń są wpisane na stałe. Nie należy traktować ich jako aktualnej walidacji grafiku.
15. Licznik „Nieobsadzone zmiany” porównuje wymaganą liczbę osób na stanowisku z liczbą aktywnych pracowników mających to stanowisko, a nie z rzeczywistą obsadą każdej zmiany.
16. Usunięcie stanowiska nie usuwa ani nie aktualizuje powiązań w profilach pracowników i historycznych zmianach.
17. Generator ma uproszczone ograniczenia: minimalna liczba godzin wpływa na kolejność przydziałów, ale nie jest gwarantowana; wymagana liczba osób działa według szablonu zmiany. Ustawienie typu zakresu „Tydzień/Miesiąc” nie ustawia dat automatycznie — początek i koniec wybiera się osobno. Godziny otwarcia są tylko wyświetlane, a odpoczynek między zmianami nie jest walidowany. Priorytety i wyniki należy sprawdzić przed zapisaniem.
18. Przyciski „Zapisz jako wersję roboczą” i „Zatwierdź grafik” działają obecnie tak samo — zapisują zmiany do głównego grafiku. Brakuje osobnych wersji roboczych, historii zatwierdzeń, porównania wariantów i ręcznej edycji podglądu generatora.
19. Sekcja raportów nie ma filtrów według tygodnia, miesiąca ani pracownika; eksportuje wszystkie zapisane zmiany. Lista typów raportów widoczna na stronie jest obecnie tekstowym opisem.
20. Dostępność i urlopy są zapisane jako dzień tygodnia oraz zakres godzin, bez dat początku/końca nieobecności.

## 13. Instrukcja uruchamiania aplikacji

### 13.1. Wymagania
- Node.js 20.19+ lub 22.12+ (wyłącznie komputer developerski)
- npm

Osoba korzystająca z instalatora Windows nie potrzebuje Node.js, npm, edytora kodu ani dostępu do internetu.

### 13.2. Instalacja zależności
W katalogu projektu uruchom:

```bash
npm install
```

### 13.3. Uruchomienie aplikacji w trybie deweloperskim
```bash
npm run dev
```

Po wykonaniu polecenia aplikacja uruchamia się lokalnie w przeglądarce, zwykle pod adresem `http://localhost:5173`.

### 13.4. Uruchomienie developerskiej wersji desktopowej
```bash
npm run desktop:dev
```

### 13.5. Budowa instalatora Windows
Na komputerze developerskim (Windows x64) uruchom:
```bash
npm run package:win
```

Konfiguracja korzysta domyślnie z publicznego repozytorium `michalrubin0-beep/Grafik`; można ją nadpisać zmiennymi `GRAFIKPRO_GITHUB_OWNER` i `GRAFIKPRO_GITHUB_REPO`. Gotowy plik instalacyjny `.exe` powstaje w katalogu `release`. Użytkowniczka końcowa nie potrzebuje Node.js, npm ani Visual Studio Code. Instalator tworzy skróty na pulpicie i w menu Start.

Aktualny artefakt z klientem aktualizacji: `release/GrafikPro-Setup-0.1.1-x64.exe`.

### 13.6. Automatyczne publikowanie aktualizacji
1. Projekt jest już w gałęzi `main` publicznego repozytorium `michalrubin0-beep/Grafik`.
2. Workflow `.github/workflows/blank.yml` uruchamia testy, ustawia unikalną wersję `0.2.<numer uruchomienia>`, buduje instalator NSIS i publikuje jednym poleceniem GitHub CLI instalator, `latest.yml` oraz `.blockmap`.
3. Uprawnienie `contents: write` pozwala workflow użyć wbudowanego `GITHUB_TOKEN`; nie trzeba umieszczać sekretu w kodzie ani konfigurować go ręcznie.
4. Sprawdź zakładkę **Actions** w GitHub. Po zakończeniu workflow wydanie powinno pojawić się w **Releases** i zawierać trzy pliki: `.exe`, `latest.yml` oraz `.blockmap`. Nie usuwaj ani nie zmieniaj ich nazw.
5. Zainstalowana dotąd wersja 0.1.0 nie ma klienta aktualizacji. Należy ją jednorazowo zastąpić instalatorem z kompletnego wydania 0.2.12 lub nowszego; kolejne wersje można pobierać z poziomu Ustawień.
6. Potem każda zmiana wypchnięta do `main` automatycznie uruchomi testy, zbuduje i opublikuje nowszą wersję. Nie trzeba ręcznie zmieniać numeru wersji.

Do ręcznego publikowania z komputera developerskiego można nadal użyć `npm run publish:win`; wymaga ono `GH_TOKEN` z uprawnieniami do publikowania w repozytorium.

Publikowanie wymaga internetu na komputerze wydawniczym i tokenu GitHub; sprawdzanie oraz pobieranie wymaga internetu na komputerze użytkowniczki. Praca z lokalnymi danymi pozostaje offline.

### 13.7. Budowanie wersji webowej
```bash
npm run build
```

### 13.8. Uruchamianie testów
```bash
npm test
```

### 13.9. Podgląd builda webowego
```bash
npm run preview
```

## 14. Wskazówki dla dalszego rozwoju

Przy dalszej pracy nad projektem warto kierować się poniższymi zasadami:

- nie niszczyć istniejącego projektu i jego funkcji bazowych,
- utrzymywać kompatybilność adaptera SQLite / Dexie,
- rozszerzać model danych o nowe elementy w sposób bezpieczny,
- traktować generator grafików jako realny moduł biznesowy, a nie tylko panel wizualny,
- dodawać testy dla każdej nowej reguły ograniczającej,
- dokumentować każdą zmianę w tym pliku `INSTRUKCJA_PROJEKTU.md`.

## 15. Podsumowanie

GrafikPro jest już aplikacją działającą z lokalną bazą danych, interfejsem grafiki pracy i realnym algorytmem automatycznego układania zmian. Projekt zachowuje charakter MVP / prototypu funkcjonalnego z rozszerzalnym modułem generowania grafików. W dalszym rozwoju powinien zostać dopracowany pod kątem pełnej optymalizacji, większej liczby reguł, wersjonowania i analizy konfliktów.

Dokumentacja ta ma służyć jako punkt wyjścia do kontynuacji pracy po ponownym otwarciu projektu bez konieczności odtwarzania całej wcześniejszej rozmowy.
