# GrafikPro

GrafikPro to lokalna aplikacja do tworzenia grafików pracy, zarządzania pracownikami i raportami. Wersja desktopowa dla Windows działa offline i zapisuje dane w lokalnej bazie SQLite.

## Instalator Windows

Gotowy instalator znajduje się w:

```text
release/GrafikPro-Setup-0.1.1-x64.exe
```

Po instalacji aplikację uruchamia się z ikony na pulpicie albo z menu Start. Szczegółowa instrukcja dla użytkowniczki znajduje się w [INSTRUKCJA_DLA_MAMY.md](./INSTRUKCJA_DLA_MAMY.md).

## Dla programisty

Wymagany Node.js 20.19+ lub 22.12+ i npm:

```bash
npm install
npm run desktop:dev
npm test
npm run package:win
```

Skrypt `package:win` buduje instalator NSIS x64 ze skrótami na pulpicie i w menu Start. Aplikacja końcowa nie potrzebuje Node.js ani internetu.

Po wypchnięciu zmian do gałęzi `main` GitHub Actions automatycznie uruchamia testy, buduje i publikuje nowy instalator. Szczegóły pierwszego uruchomienia publikacji opisuje [INSTRUKCJA_PROJEKTU.md](./INSTRUKCJA_PROJEKTU.md).

Szczegóły architektury, bazy SQLite, kopii zapasowych i generatora opisuje [INSTRUKCJA_PROJEKTU.md](./INSTRUKCJA_PROJEKTU.md).
